import tempfile
import unittest
from unittest.mock import patch

from controller.cornerstone_controller_ml import CornerstoneController
from controller.path_manager import PathManager


class ControllerMLTests(unittest.TestCase):
    def setUp(self):
        self.controller = CornerstoneController.__new__(CornerstoneController)
        self.controller.model_available = True

    def test_threshold_label_is_used_when_model_is_unavailable(self):
        self.controller.model_available = False

        self.assertEqual(self.controller._classify({}), None)
        self.assertEqual(self.controller._threshold_label(1001), "high")
        self.assertEqual(self.controller._threshold_label(1000), "normal")

    @patch("controller.cornerstone_controller_ml.predict")
    def test_classifies_valid_features(self, predict):
        predict.return_value = {
            "prediction": "high",
            "confidence": 0.95,
        }

        result = self.controller._classify(
            {
                "packet_count": 10,
                "byte_count": 700,
                "traffic_rate": 100,
                "switch_id": 1,
            }
        )

        self.assertEqual(result["prediction"], "high")
        predict.assert_called_once()

    @patch("controller.cornerstone_controller_ml.predict")
    def test_disables_model_and_falls_back_after_inference_error(self, predict):
        predict.side_effect = ValueError("invalid feature")

        result = self.controller._classify({})

        self.assertIsNone(result)
        self.assertFalse(self.controller.model_available)
        self.assertEqual(self.controller._threshold_label(1500), "high")

    @patch("controller.cornerstone_controller_ml.predict")
    def test_keeps_low_confidence_prediction_for_observation(self, predict):
        predict.return_value = {
            "prediction": "high",
            "confidence": 0.5,
        }

        result = self.controller._classify({})

        self.assertEqual(result["prediction"], "high")
        self.assertTrue(self.controller.model_available)

    def test_path_manager_uses_backup_route_after_link_failure(self):
        manager = PathManager()
        manager.remove_link(1, 2)

        self.assertEqual(manager.shortest_path(1, 4), [1, 3, 4])
        self.assertFalse(manager.has_link(1, 2))

    def test_recovery_log_records_verified_rule_installation(self):
        with tempfile.TemporaryDirectory() as directory:
            controller = CornerstoneController.__new__(CornerstoneController)
            controller.recovery_log_file = f"{directory}/recovery.csv"
            controller._initialise_recovery_log()
            controller._install_path_flows = lambda path: len(path) * 2

            result = controller._reroute_affected_flows(
                failed_link=(1, 2),
                before_path=[1, 2, 4],
                alternate_path=[1, 3, 4],
                detected_at=0,
            )

            self.assertEqual(result["status"], "recovered")
            self.assertEqual(result["final_flow_rules"], 6)
            with open(controller.recovery_log_file) as recovery_log:
                rows = recovery_log.read().splitlines()
            self.assertEqual(len(rows), 2)
            self.assertIn("1->3->4", rows[1])


if __name__ == "__main__":
    unittest.main()
