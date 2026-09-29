"""Train and evaluate the Day 8 Random Forest baseline."""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MODEL_DIR = ROOT / "ml"


def main() -> None:
    x_train = pd.read_csv(DATA / "X_train.csv")
    x_test = pd.read_csv(DATA / "X_test.csv")
    y_train = pd.read_csv(DATA / "y_train.csv").iloc[:, 0]
    y_test = pd.read_csv(DATA / "y_test.csv").iloc[:, 0]
    model = RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced")
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    metrics = {
        "accuracy": accuracy_score(y_test, predictions),
        "precision_high": precision_score(y_test, predictions, pos_label="high", zero_division=0),
        "recall_high": recall_score(y_test, predictions, pos_label="high", zero_division=0),
        "f1_high": f1_score(y_test, predictions, pos_label="high", zero_division=0),
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=["normal", "high"]).tolist(),
        "classification_report": classification_report(y_test, predictions, zero_division=0),
    }
    joblib.dump(model, MODEL_DIR / "model_v1.joblib")
    (MODEL_DIR / "model_v1_metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps({key: value for key, value in metrics.items() if key != "classification_report"}, indent=2))


if __name__ == "__main__":
    main()