class DecisionEngine:

    def __init__(
        self,
        confidence_threshold=0.80,
        required_confirmations=3,
        dry_run=True
    ):
        self.confidence_threshold = confidence_threshold
        self.required_confirmations = required_confirmations
        self.dry_run = dry_run

        self.high_counts = {}
        self.mitigated_flows = set()
        self.dry_run_reported = set()

    def evaluate(self, flow_key, prediction, confidence=None):

        label = str(prediction).strip().lower()

        if label in ("0", "normal"):
            self.high_counts[flow_key] = 0

            return {
                "action": "allow",
                "reason": "Normal traffic predicted"
            }

        if label not in ("1", "high", "attack", "malicious"):
            return {
                "action": "monitor",
                "reason": "Unknown prediction label"
            }

        # Do not automatically block without confidence.
        if confidence is None:
            return {
                "action": "monitor",
                "reason": "Confidence unavailable"
            }

        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            return {
                "action": "monitor",
                "reason": "Invalid confidence value"
            }

        if not 0 <= confidence <= 1:
            return {
                "action": "monitor",
                "reason": "Confidence must be between 0 and 1"
            }

        if confidence < self.confidence_threshold:
            self.high_counts[flow_key] = 0

            return {
                "action": "monitor",
                "reason": "Confidence below threshold"
            }

        # Require repeated high-risk predictions.
        self.high_counts[flow_key] = (
            self.high_counts.get(flow_key, 0) + 1
        )

        count = self.high_counts[flow_key]

        if count < self.required_confirmations:
            return {
                "action": "monitor",
                "reason": (
                    f"High-risk confirmation {count}/"
                    f"{self.required_confirmations}"
                )
            }

        if flow_key in self.mitigated_flows:
            return {
                "action": "already_mitigated",
                "reason": "Flow was already mitigated"
            }

        if self.dry_run:
            self.dry_run_reported.add(flow_key)

            return {
                "action": "would_mitigate",
                "reason": "Confirmed high-risk; dry-run mode"
            }

        return {
            "action": "mitigate",
            "reason": "Repeated high-risk predictions confirmed"
        }

    def mark_mitigated(self, flow_key):
        self.mitigated_flows.add(flow_key)