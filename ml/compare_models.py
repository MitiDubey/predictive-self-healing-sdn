"""Compare simple classifiers and save the best Day 9 model."""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MODEL_DIR = ROOT / "ml"


def main() -> None:
    x_train = pd.read_csv(DATA / "X_train.csv")
    x_test = pd.read_csv(DATA / "X_test.csv")
    y_train = pd.read_csv(DATA / "y_train.csv").iloc[:, 0]
    y_test = pd.read_csv(DATA / "y_test.csv").iloc[:, 0]
    models = {
        "random_forest": RandomForestClassifier(n_estimators=200, random_state=42, class_weight="balanced"),
        "logistic_regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, class_weight="balanced")),
        "decision_tree": DecisionTreeClassifier(max_depth=5, random_state=42, class_weight="balanced"),
    }
    results = []
    fitted = {}
    for name, model in models.items():
        model.fit(x_train, y_train)
        prediction = model.predict(x_test)
        results.append({
            "model": name,
            "accuracy": accuracy_score(y_test, prediction),
            "precision_high": precision_score(y_test, prediction, pos_label="high", zero_division=0),
            "recall_high": recall_score(y_test, prediction, pos_label="high", zero_division=0),
            "f1_high": f1_score(y_test, prediction, pos_label="high", zero_division=0),
        })
        fitted[name] = model
    best = max(results, key=lambda result: (result["f1_high"], result["recall_high"], result["accuracy"]))
    joblib.dump(fitted[best["model"]], MODEL_DIR / "best_model.joblib")
    (MODEL_DIR / "feature_order.json").write_text(json.dumps(list(x_train.columns), indent=2) + "\n")
    (MODEL_DIR / "model_comparison.json").write_text(json.dumps({"results": results, "selected": best}, indent=2) + "\n")
    print(json.dumps({"selected": best, "results": results}, indent=2))


if __name__ == "__main__":
    main()