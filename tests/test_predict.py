import tempfile
import unittest
from pathlib import Path

import joblib
from sklearn.dummy import DummyClassifier

from ml import predict as predict_module


class PredictTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.model_path = Path(self.temp_dir.name) / "model.joblib"
        model = DummyClassifier(strategy="most_frequent")
        model.fit(
            [[1, 10, 100, 1], [2, 20, 200, 1]],
            ["normal", "normal"],
        )
        joblib.dump(model, self.model_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_returns_prediction_and_confidence(self):
        result = predict_module.predict(
            {
                "packet_count": 10,
                "byte_count": 700,
                "traffic_rate": 100,
                "switch_id": 1,
            },
            model_path=self.model_path,
        )

        self.assertEqual(result["prediction"], "normal")
        self.assertEqual(result["confidence"], 1.0)
        self.assertEqual(result["probabilities"]["normal"], 1.0)

    def test_rejects_missing_features(self):
        with self.assertRaisesRegex(ValueError, "Missing features: switch_id"):
            predict_module.predict(
                {
                    "packet_count": 10,
                    "byte_count": 700,
                    "traffic_rate": 100,
                },
                model_path=self.model_path,
            )

    def test_rejects_non_numeric_features(self):
        with self.assertRaisesRegex(ValueError, "must be numeric"):
            predict_module.predict(
                {
                    "packet_count": "invalid",
                    "byte_count": 700,
                    "traffic_rate": 100,
                    "switch_id": 1,
                },
                model_path=self.model_path,
            )

    def test_rejects_negative_features(self):
        with self.assertRaisesRegex(ValueError, "must be non-negative"):
            predict_module.predict(
                {
                    "packet_count": 10,
                    "byte_count": -1,
                    "traffic_rate": 100,
                    "switch_id": 1,
                },
                model_path=self.model_path,
            )


if __name__ == "__main__":
    unittest.main()
