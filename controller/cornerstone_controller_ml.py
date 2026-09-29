"""Day 11 controller: live flow statistics with ML classification."""

import csv
import time

from os_ken.controller import ofp_event
from os_ken.controller.handler import MAIN_DISPATCHER, set_ev_cls

from controller.cornerstone_controller_day6 import CornerstoneController as Day6Controller
from ml.predict import predict


class CornerstoneController(Day6Controller):
    """Keep Day 6 forwarding and monitoring, adding non-blocking ML inference."""

    ML_CONFIDENCE_THRESHOLD = 0.80

    def __init__(self, *args, **kwargs):
        super(CornerstoneController, self).__init__(*args, **kwargs)
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
