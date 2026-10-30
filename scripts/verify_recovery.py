"""Record an end-to-end recovery verification after a successful Mininet ping.

Run after Mininet reports successful connectivity:
    python scripts/verify_recovery.py --success
"""

import argparse
import csv
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RECOVERY_LOG = ROOT / "logs" / "recovery_events.csv"
VERIFICATION_LOG = ROOT / "logs" / "recovery_verification.csv"
FIELDS = [
    "verification_timestamp",
    "source_recovery_timestamp",
    "connectivity_verified",
    "recovery_time_ms",
    "packet_loss_packets",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--success", action="store_true", required=True)
    parser.add_argument("--packet-loss", type=int, default=0)
    args = parser.parse_args()

    with RECOVERY_LOG.open(newline="") as recovery_file:
        rows = list(csv.DictReader(recovery_file))
    candidates = [row for row in rows if row.get("alternate_path")]
    if not candidates:
        raise SystemExit("No calculated recovery route is available to verify.")

    latest = candidates[-1]
    verified_at = time.time()
    detected_at = float(latest["timestamp"])
    VERIFICATION_LOG.parent.mkdir(parents=True, exist_ok=True)
    write_header = not VERIFICATION_LOG.exists() or VERIFICATION_LOG.stat().st_size == 0
    with VERIFICATION_LOG.open("a", newline="") as verification_file:
        writer = csv.DictWriter(verification_file, fieldnames=FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow({
            "verification_timestamp": round(verified_at, 3),
            "source_recovery_timestamp": latest["timestamp"],
            "connectivity_verified": "true",
            "recovery_time_ms": round((verified_at - detected_at) * 1000, 3),
            "packet_loss_packets": args.packet_loss,
        })
    print(f"Connectivity verified for recovery event {latest['timestamp']}")
    print(f"Recovery time: {round((verified_at - detected_at) * 1000, 3)} ms")


if __name__ == "__main__":
    main()
