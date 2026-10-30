import csv
import os
import time


class FailureDetector:
    """Record switch-port status changes received by OS-Ken."""

    def __init__(self, log_file="logs/failure_events.csv"):
        self.log_file = log_file
        os.makedirs(os.path.dirname(log_file), exist_ok=True)

        if (
            not os.path.exists(log_file)
            or os.path.getsize(log_file) == 0
        ):
            with open(log_file, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp",
                    "switch_id",
                    "port",
                    "status",
                    "reason"
                ])

    def process_port_status(self, msg):
        """Interpret an OpenFlow port-status message."""

        datapath = msg.datapath
        ofproto = datapath.ofproto

        reason_names = {
            ofproto.OFPPR_ADD: "ADD",
            ofproto.OFPPR_DELETE: "DELETE",
            ofproto.OFPPR_MODIFY: "MODIFY",
        }

        reason = reason_names.get(msg.reason, "UNKNOWN")

        if msg.reason == ofproto.OFPPR_DELETE:
            status = "removed"
        elif msg.desc.state & ofproto.OFPPS_LINK_DOWN:
            status = "down"
        else:
            status = "up"

        port = msg.desc.port_no

        with open(self.log_file, "a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                round(time.time(), 3),
                datapath.id,
                port,
                status,
                reason
            ])

        return status, reason
