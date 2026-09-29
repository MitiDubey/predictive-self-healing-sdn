import csv
import time
from os_ken.base import app_manager
from os_ken.controller import ofp_event
from os_ken.controller.handler import (
    CONFIG_DISPATCHER,
    MAIN_DISPATCHER,
    DEAD_DISPATCHER,
    set_ev_cls
)
from os_ken.ofproto import ofproto_v1_3
from os_ken.lib.packet import packet, ethernet
from os_ken.lib import hub


class CornerstoneController(app_manager.OSKenApp):

    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    TRAFFIC_THRESHOLD = 1000
    DATASET_LABEL = 0

    def __init__(self, *args, **kwargs):
        super(CornerstoneController, self).__init__(*args, **kwargs)

        self.mac_to_port = {}
        self.datapaths = {}
        self.previous_stats = {}
        self.csv_file = "traffic_data.csv"

        with open(self.csv_file, "a", newline="") as f:
            writer = csv.writer(f)
        self.mitigated_flows = set()

        self.monitor_thread = hub.spawn(self._monitor)

    # ---------------- SWITCH CONNECTION ----------------

    @set_ev_cls(
        ofp_event.EventOFPSwitchFeatures,
        CONFIG_DISPATCHER
    )
    def switch_features_handler(self, ev):

        datapath = ev.msg.datapath
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        match = parser.OFPMatch()

        actions = [
            parser.OFPActionOutput(
                ofproto.OFPP_CONTROLLER,
                ofproto.OFPCML_NO_BUFFER
            )
        ]

        instructions = [
            parser.OFPInstructionActions(
                ofproto.OFPIT_APPLY_ACTIONS,
                actions
            )
        ]

        flow = parser.OFPFlowMod(
            datapath=datapath,
            priority=0,
            match=match,
            instructions=instructions
        )

        datapath.send_msg(flow)

        print(f"Switch connected: {datapath.id}")

    # ---------------- PACKET HANDLING ----------------

    @set_ev_cls(
        ofp_event.EventOFPPacketIn,
        MAIN_DISPATCHER
    )
    def packet_in_handler(self, ev):

        msg = ev.msg
        datapath = msg.datapath
        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        dpid = datapath.id
        in_port = msg.match["in_port"]

        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocol(ethernet.ethernet)

        if eth is None:
            return

        src = eth.src
        dst = eth.dst

        self.mac_to_port.setdefault(dpid, {})
        self.mac_to_port[dpid][src] = in_port

        out_port = self.mac_to_port[dpid].get(
            dst,
            ofproto.OFPP_FLOOD
        )

        actions = [
            parser.OFPActionOutput(out_port)
        ]

        if out_port != ofproto.OFPP_FLOOD:

            match = parser.OFPMatch(
                in_port=in_port,
                eth_dst=dst
            )

            instructions = [
                parser.OFPInstructionActions(
                    ofproto.OFPIT_APPLY_ACTIONS,
                    actions
                )
            ]

            flow = parser.OFPFlowMod(
                datapath=datapath,
                priority=10,
                match=match,
                instructions=instructions
            )

            datapath.send_msg(flow)

        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=msg.data
        )

        datapath.send_msg(out)

    # ---------------- SWITCH MONITORING ----------------

    @set_ev_cls(
        ofp_event.EventOFPStateChange,
        [MAIN_DISPATCHER, DEAD_DISPATCHER]
    )
    def state_change_handler(self, ev):

        datapath = ev.datapath

        if ev.state == MAIN_DISPATCHER:
            self.datapaths[datapath.id] = datapath
            print(f"Monitoring switch: {datapath.id}")

        elif ev.state == DEAD_DISPATCHER:
            self.datapaths.pop(datapath.id, None)
            print(f"Removed switch: {datapath.id}")

    def _monitor(self):

        while True:

            for datapath in self.datapaths.values():
                self._request_flow_stats(datapath)

            hub.sleep(5)

    def _request_flow_stats(self, datapath):

        request = datapath.ofproto_parser.OFPFlowStatsRequest(
            datapath
        )

        datapath.send_msg(request)

    # ---------------- TRAFFIC MONITORING ----------------

    @set_ev_cls(
        ofp_event.EventOFPFlowStatsReply,
        MAIN_DISPATCHER
    )
    def flow_stats_reply_handler(self, ev):

        datapath = ev.msg.datapath

        for stat in ev.msg.body:

            current_bytes = stat.byte_count
            current_packets = stat.packet_count

            flow_key = (
                datapath.id,
                stat.priority,
                str(stat.match)
            )

            now = time.time()

            if flow_key not in self.previous_stats:

                self.previous_stats[flow_key] = (
                    current_bytes,
                    now
                )

                continue

            previous_bytes, previous_time = \
                self.previous_stats[flow_key]

            byte_difference = current_bytes - previous_bytes
            time_difference = now - previous_time

            self.previous_stats[flow_key] = (
                current_bytes,
                now
            )

            if time_difference <= 0:
                continue

            traffic_rate = (
                byte_difference / time_difference
            )
            
            if byte_difference <= 0:
                continue

            label = "high" if traffic_rate > self.TRAFFIC_THRESHOLD else "normal"
            print(f"DEBUG CSV: writing {datapath.id}, {traffic_rate:.2f}, {label}")
            with open(self.csv_file, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    time.time(),
                    datapath.id,
                    current_packets,
                    current_bytes,
                    round(traffic_rate, 2),
                    label
                ])

            print(
                f"Switch {datapath.id} | "
                f"Packets: {current_packets} | "
                f"Bytes: {current_bytes} | "
                f"Rate: {traffic_rate:.2f} bytes/sec"
            )

            if traffic_rate > self.TRAFFIC_THRESHOLD:

                print(
                    f"⚠ HIGH TRAFFIC DETECTED | "
                    f"Switch {datapath.id} | "
                    f"Rate: {traffic_rate:.2f}"
                )

                # if flow_key not in self.mitigated_flows:

                #     self._block_flow(
                #         datapath,
                #         stat.match,
                #         stat.priority
                #     )

                #     self.mitigated_flows.add(flow_key)

    # ---------------- MITIGATION ----------------

    def _block_flow(
        self,
        datapath,
        match,
        priority
    ):

        flow = datapath.ofproto_parser.OFPFlowMod(
            datapath=datapath,
            priority=priority + 100,
            match=match,
            instructions=[]
        )

        datapath.send_msg(flow)

        print(
            f"🚫 Flow blocked on switch "
            f"{datapath.id}"
        )
