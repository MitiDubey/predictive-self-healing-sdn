"""Standalone, validated inference for the saved Cornerstone model."""

import argparse
import json
from pathlib import Path
from typing import Mapping

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "ml" / "best_model.joblib"
FEATURE_ORDER_PATH = ROOT / "ml" / "feature_order.json"


def predict(features: Mapping[str, object], model_path: Path = MODEL_PATH) -> dict:
    feature_order = json.loads(FEATURE_ORDER_PATH.read_text())
    missing = [name for name in feature_order if name not in features]
    if missing:
        raise ValueError(f"Missing features: {', '.join(missing)}")
    values = {}
    for name in feature_order:
        try:
            values[name] = float(features[name])
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Feature {name!r} must be numeric") from exc
        if values[name] < 0:
            raise ValueError(f"Feature {name!r} must be non-negative")
    model = joblib.load(model_path)
    frame = pd.DataFrame([values], columns=feature_order)
    label = str(model.predict(frame)[0])
    result = {"prediction": label}
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(frame)[0]
        result["confidence"] = float(max(probabilities))
        result["probabilities"] = {str(class_name): float(probability) for class_name, probability in zip(model.classes_, probabilities)}
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet-count", type=float, default=10)
    parser.add_argument("--byte-count", type=float, default=700)
    parser.add_argument("--traffic-rate", type=float, default=100)
    parser.add_argument("--switch-id", type=float, default=1)
    args = parser.parse_args()
    print(json.dumps(predict(vars(args)), indent=2))


if __name__ == "__main__":
    main()