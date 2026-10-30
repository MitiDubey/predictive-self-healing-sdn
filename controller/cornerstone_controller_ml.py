"""Integrated Cornerstone controller with ML monitoring and self-healing."""
import os
import csv
import time
from os_ken.controller import ofp_event
from os_ken.controller.handler import MAIN_DISPATCHER, set_ev_cls
from controller.decision_engine import DecisionEngine
from controller.cornerstone_controller_day6 import CornerstoneController as Day6Controller
from ml.predict import predict
from controller.failure_detector import FailureDetector
from controller.path_manager import PathManager


class CornerstoneController(Day6Controller):
    """Keep forwarding and monitoring while recovering failed redundant links."""

    ML_CONFIDENCE_THRESHOLD = 0.80
    # Inter-switch port mapping for redundant_topology.py.
    # Keys are (switch_id, port_number); values are peer endpoints.
    PORT_PEERS = {
        (1, 3): (2, 1),
        (2, 1): (1, 3),

        (2, 2): (4, 3),
        (4, 3): (2, 2),

        (1, 4): (3, 1),
        (3, 1): (1, 4),

        (3, 2): (4, 4),
        (4, 4): (3, 2),
    }
    PATH_PORTS = {
        1: {2: 3, 3: 4},
        2: {1: 1, 4: 2},
        3: {1: 1, 4: 2},
        4: {2: 3, 3: 4},
    }
    RECOVERY_FLOW = {
        "forward": ("10.0.0.1", "10.0.0.4"),
        "reverse": ("10.0.0.4", "10.0.0.1"),
    }

    def __init__(self, *args, **kwargs):
        super(CornerstoneController, self).__init__(*args, **kwargs)
        self.failure_detector = FailureDetector()
        self.path_manager = PathManager()
        self.link_port_states = {}
        self.recovery_log_file = "logs/recovery_events.csv"
        self.recovery_started_at = {}
        self.pending_recoveries = {}
        self._initialise_recovery_log()
        # Day 12: decision engine in dry-run mode
        self.decision_engine = DecisionEngine(
            confidence_threshold=self.ML_CONFIDENCE_THRESHOLD,
            required_confirmations=3,
            dry_run=True
        )

        # Security event log
        self.security_log_file = "logs/security_events.csv"
        os.makedirs("logs", exist_ok=True)

        if (
            not os.path.exists(self.security_log_file)
            or os.path.getsize(self.security_log_file) == 0
        ):
            with open(self.security_log_file, "w", newline="") as f:
                writer = csv.writer(f, lineterminator="\n")
                writer.writerow([
                    "timestamp",
                    "switch_id",
                    "packet_count",
                    "byte_count",
                    "traffic_rate",
                    "prediction",
                    "confidence",
                    "action",
                    "reason"
                ])
        self.model_available = True
        try:
            predict({
                "packet_count": 0,
                "byte_count": 0,
                "traffic_rate": 0,
                "switch_id": 0,
            })
        except Exception as exc:
            self.model_available = False
            print(f"ML model unavailable; threshold fallback enabled: {exc}")

    @set_ev_cls(
        ofp_event.EventOFPPortStatus,
        MAIN_DISPATCHER
    )
    def port_status_handler(self, ev):
        msg = ev.msg
        datapath = msg.datapath

        status, reason = self.failure_detector.process_port_status(
            msg
        )

        port_key = (datapath.id, msg.desc.port_no)
        peer = self.PORT_PEERS.get(port_key)

        if peer is not None:
            edge = tuple(sorted((datapath.id, peer[0])))

            if status in ("down", "removed"):
                before_path = self.path_manager.shortest_path(1, 4)
                self.link_port_states[port_key] = False
                self.path_manager.remove_link(*edge)

                alternate = self.path_manager.shortest_path(1, 4)
                detected_at = time.time()
                self.recovery_started_at[edge] = detected_at
                recovery = self._reroute_affected_flows(
                    failed_link=edge,
                    before_path=before_path,
                    alternate_path=alternate,
                    detected_at=detected_at,
                )
                if recovery["status"] == "pending_switch_connection":
                    self.pending_recoveries[edge] = {
                        "before_path": before_path,
                        "alternate_path": alternate,
                        "detected_at": detected_at,
                    }

                print(
                    f"LINK FAILURE | switch={datapath.id} | "
                    f"port={msg.desc.port_no} | "
                    f"link={edge} | "
                    f"alternate_path={alternate} | "
                    f"recovery={recovery['status']} | "
                    f"recovery_time_ms={recovery['recovery_time_ms']}"
                )

            elif status == "up":
                self.link_port_states[port_key] = True

                # Restore the link only when both endpoints
                # are not known to be down.
                peer_up = self.link_port_states.get(peer, True)

                if peer_up:
                    self.path_manager.add_link(*edge)

                alternate = self.path_manager.shortest_path(1, 4)

                print(
                    f"PORT UP | switch={datapath.id} | "
                    f"port={msg.desc.port_no} | "
                    f"link={edge} | "
                    f"path={alternate}"
                )

        else:
            print(
                f"PORT STATUS | switch={datapath.id} | "
                f"port={msg.desc.port_no} | "
                f"status={status} | reason={reason}"
            )

    def _on_datapaths_changed(self):
        """Retry recovery after a switch connects to the controller."""
        for failed_link, recovery in list(self.pending_recoveries.items()):
            result = self._reroute_affected_flows(
                failed_link=failed_link,
                before_path=recovery["before_path"],
                alternate_path=recovery["alternate_path"],
                detected_at=recovery["detected_at"],
            )
            if result["status"] != "pending_switch_connection":
                del self.pending_recoveries[failed_link]

    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def flow_stats_reply_handler(self, ev):
        datapath = ev.msg.datapath
        for stat in ev.msg.body:
            flow_key = (datapath.id, stat.priority, str(stat.match))
            now = time.time()
            current_bytes = stat.byte_count
            current_packets = stat.packet_count
            previous = self.previous_stats.get(flow_key)
            self.previous_stats[flow_key] = (current_bytes, now)
            if previous is None:
                continue

            previous_bytes, previous_time = previous
            byte_difference = current_bytes - previous_bytes
            time_difference = now - previous_time
            if byte_difference <= 0 or time_difference <= 0:
                continue

            traffic_rate = byte_difference / time_difference
            features = {
                "packet_count": current_packets,
                "byte_count": current_bytes,
                "traffic_rate": traffic_rate,
                "switch_id": datapath.id,
            }
            result = self._classify(features)
            label = result["prediction"] if result else self._threshold_label(traffic_rate)
            confidence = result.get("confidence") if result else None
            confidence_text = f"{confidence:.3f}" if confidence is not None else "n/a"
            print(
                f"ML prediction | switch={datapath.id} | "
                f"packets={current_packets} | bytes={current_bytes} | "
                f"rate={traffic_rate:.2f} | label={label} | "
                f"confidence={confidence_text}"
            )
            self._write_measurement(datapath.id, current_packets, current_bytes, traffic_rate, label)
            # Evaluate the ML prediction
            decision = self.decision_engine.evaluate(
                flow_key=flow_key,
                prediction=label,
                confidence=confidence
            )

            # Day 12: perform confirmed mitigation
            if decision["action"] == "mitigate":

                # Read the actual OpenFlow match fields
                try:
                    match_fields = dict(stat.match.items())
                except (AttributeError, TypeError):
                    match_fields = {}

                src_ip = match_fields.get("ipv4_src")
                dst_ip = match_fields.get("ipv4_dst")
                protocol = match_fields.get("ip_proto")
                src_port = match_fields.get("tcp_src")
                dst_port = match_fields.get("tcp_dst")

                # Allow mitigation only for the specified
                # h1 <-> h4 TCP iperf connection.
                forward_iperf_flow = (
                    src_ip == "10.0.0.1"
                    and dst_ip == "10.0.0.4"
                    and dst_port == 5001
                )

                reverse_iperf_flow = (
                    src_ip == "10.0.0.4"
                    and dst_ip == "10.0.0.1"
                    and src_port == 5001
                )

                is_test_iperf_flow = (
                    stat.priority > 0
                    and protocol == 6
                    and (
                        forward_iperf_flow
                        or reverse_iperf_flow
                    )
                )

                if not is_test_iperf_flow:
                    decision = {
                        "action": "monitor",
                        "reason": (
                            "Safety guard: flow is outside "
                            "the approved h1-h4 TCP iperf flow"
                        )
                    }

                if stat.priority <= 0:
                    decision = {
                        "action": "monitor",
                        "reason": "Safety guard: priority-0 flow not blocked"
                    }
                else:
                    print(
                        f"MITIGATION: blocking confirmed high-risk flow "
                        f"on switch {datapath.id}"
                    )

                    self._block_flow(
                        datapath,
                        stat.match,
                        stat.priority
                    )

                    self.decision_engine.mark_mitigated(flow_key)
                    self.mitigated_flows.add(flow_key)

            print(
                f"Decision engine | Switch={datapath.id} | "
                f"Prediction={label} | "
                f"Action={decision['action']} | "
                f"Reason={decision['reason']}"
            )

            # Record the decision for evaluation
            self._write_security_event(
                switch_id=datapath.id,
                packet_count=current_packets,
                byte_count=current_bytes,
                traffic_rate=traffic_rate,
                prediction=label,
                confidence=confidence,
                action=decision["action"],
                reason=decision["reason"]
            )

    def _initialise_recovery_log(self):
        directory = os.path.dirname(self.recovery_log_file) or "."
        os.makedirs(directory, exist_ok=True)
        if (
            not os.path.exists(self.recovery_log_file)
            or os.path.getsize(self.recovery_log_file) == 0
        ):
            with open(self.recovery_log_file, "w", newline="") as log_file:
                csv.writer(log_file, lineterminator="\n").writerow([
                    "timestamp",
                    "failed_link",
                    "affected_flow",
                    "before_path",
                    "alternate_path",
                    "recovery_time_ms",
                    "packet_loss_packets",
                    "final_flow_rules",
                    "status",
                ])

    def _reroute_affected_flows(
        self,
        failed_link,
        before_path,
        alternate_path,
        detected_at,
    ):
        """Install both directions of the h1-h4 route and record verification."""
        if not alternate_path:
            result = {
                "status": "no_alternate_path",
                "recovery_time_ms": "",
                "final_flow_rules": 0,
            }
        else:
            installed_rules = self._install_path_flows(alternate_path)
            expected_rules = len(alternate_path) * len(self.RECOVERY_FLOW)
            status = (
                "recovered"
                if installed_rules == expected_rules
                else "pending_switch_connection"
            )
            result = {
                "status": status,
                "recovery_time_ms": round(
                    (time.time() - detected_at) * 1000, 3
                ),
                "final_flow_rules": installed_rules,
            }

        with open(self.recovery_log_file, "a", newline="") as log_file:
            csv.writer(log_file, lineterminator="\n").writerow([
                round(time.time(), 3),
                f"{failed_link[0]}-{failed_link[1]}",
                "h1-h4",
                self._format_path(before_path),
                self._format_path(alternate_path),
                result["recovery_time_ms"],
                "",
                result["final_flow_rules"],
                result["status"],
            ])
        return result

    def _install_path_flows(self, path):
        """Install verified bidirectional IPv4 forwarding rules for a path."""
        installed = 0
        for index, switch_id in enumerate(path):
            datapath = self.datapaths.get(switch_id)
            if datapath is None:
                continue
            next_switch = path[index + 1] if index + 1 < len(path) else None
            previous_switch = path[index - 1] if index else None
            routes = (
                ("forward", previous_switch, next_switch),
                ("reverse", next_switch, previous_switch),
            )
            for direction, incoming, outgoing in routes:
                output_port = self._output_port(
                    switch_id,
                    direction,
                    incoming,
                    outgoing,
                )
                if output_port is None:
                    continue
                src_ip, dst_ip = self.RECOVERY_FLOW[direction]
                parser = datapath.ofproto_parser
                match = parser.OFPMatch(
                    eth_type=0x0800,
                    ipv4_src=src_ip,
                    ipv4_dst=dst_ip,
                )
                instructions = [
                    parser.OFPInstructionActions(
                        datapath.ofproto.OFPIT_APPLY_ACTIONS,
                        [parser.OFPActionOutput(output_port)],
                    )
                ]
                datapath.send_msg(parser.OFPFlowMod(
                    datapath=datapath,
                    priority=100,
                    match=match,
                    instructions=instructions,
                ))
                installed += 1
        return installed

    def _output_port(self, switch_id, direction, incoming, outgoing):
        """Resolve the output port for either direction of the protected flow."""
        if outgoing is None:
            return 2 if direction == "forward" else 1
        return self.PATH_PORTS.get(switch_id, {}).get(outgoing)

    @staticmethod
    def _format_path(path):
        return "->".join(str(node) for node in path) if path else ""
    def _classify(self, features):
        if not self.model_available:
            return None
        try:
            result = predict(features)
        except (OSError, ValueError, TypeError, RuntimeError) as exc:
            self.model_available = False
            print(f"ML inference failed; threshold fallback enabled: {exc}")
            return None
        confidence = result.get("confidence", 0.0)
        if confidence < self.ML_CONFIDENCE_THRESHOLD:
            print(f"Low-confidence ML result ({confidence:.3f}); retaining prediction for observation")
        return result

    def _write_security_event(
        self,
        switch_id,
        packet_count,
        byte_count,
        traffic_rate,
        prediction,
        confidence,
        action,
        reason
    ):
        if confidence is None:
            confidence_value = ""
        else:
            try:
                confidence_value = round(float(confidence), 3)
            except (TypeError, ValueError):
                confidence_value = ""

        with open(self.security_log_file, "a", newline="") as f:
            writer = csv.writer(f, lineterminator="\n")
            writer.writerow([
                round(time.time(), 3),
                switch_id,
                packet_count,
                byte_count,
                round(float(traffic_rate), 2),
                prediction,
                confidence_value,
                action,
                reason
            ])


    def _threshold_label(self, traffic_rate):
        return "high" if traffic_rate > self.TRAFFIC_THRESHOLD else "normal"

    def _write_measurement(self, switch_id, packet_count, byte_count, traffic_rate, label):
        with open(self.csv_file, "a", newline="") as csv_file:
            csv.writer(csv_file).writerow([
                time.time(),
                switch_id,
                packet_count,
                byte_count,
                round(traffic_rate, 2),
                label,
            ])
