"""Build reproducible Day 15 evaluation artifacts.

Run from the repository root with:
    .venv/bin/python -m evaluation.final_evaluation
"""

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)


DATA = ROOT / "data"
RESULTS = ROOT / "results"
PLOTS = RESULTS / "plots"
FEATURES = ["packet_count", "byte_count", "traffic_rate", "switch_id"]


def _save_dataset_summary(frame):
    summary = pd.DataFrame(
        [
            {
                "metric": "sample_count",
                "value": len(frame),
            },
            {
                "metric": "duplicate_rows",
                "value": int(frame.duplicated().sum()),
            },
            {
                "metric": "normal_samples",
                "value": int((frame["label"] == "normal").sum()),
            },
            {
                "metric": "high_samples",
                "value": int((frame["label"] == "high").sum()),
            },
        ]
    )
    summary.to_csv(RESULTS / "dataset_summary.csv", index=False)
    return summary


def _evaluate_model():
    from ml.compare_models import main as train_and_compare

    train_and_compare()
    x_test = pd.read_csv(DATA / "X_test.csv")
    y_test = pd.read_csv(DATA / "y_test.csv").iloc[:, 0]

    import joblib

    model = joblib.load(ROOT / "ml" / "best_model.joblib")
    predictions = model.predict(x_test)
    labels = ["normal", "high"]
    matrix = confusion_matrix(y_test, predictions, labels=labels)
    pd.DataFrame(
        matrix,
        index=[f"actual_{label}" for label in labels],
        columns=[f"predicted_{label}" for label in labels],
    ).to_csv(RESULTS / "confusion_matrix.csv")

    plt.figure(figsize=(5, 4))
    plt.imshow(matrix, cmap="Blues")
    plt.colorbar(label="Samples")
    plt.xticks(range(len(labels)), labels)
    plt.yticks(range(len(labels)), labels)
    plt.xlabel("Predicted label")
    plt.ylabel("Actual label")
    plt.title("Final Model Confusion Matrix")
    for row in range(len(labels)):
        for column in range(len(labels)):
            plt.text(column, row, matrix[row, column], ha="center", va="center")
    plt.tight_layout()
    plt.savefig(PLOTS / "confusion_matrix.png", dpi=300)
    plt.close()

    return {
        "accuracy": accuracy_score(y_test, predictions),
        "precision_high": precision_score(
            y_test, predictions, pos_label="high", zero_division=0
        ),
        "recall_high": recall_score(
            y_test, predictions, pos_label="high", zero_division=0
        ),
        "f1_high": f1_score(
            y_test, predictions, pos_label="high", zero_division=0
        ),
    }


def _recovery_artifacts():
    source = ROOT / "logs" / "recovery_events.csv"
    columns = [
        "timestamp",
        "failed_link",
        "affected_flow",
        "before_path",
        "alternate_path",
        "recovery_time_ms",
        "packet_loss_packets",
        "final_flow_rules",
        "status",
    ]
    if source.exists():
        recovery = pd.read_csv(source)
        recovery = recovery.reindex(columns=columns)
        recovery["recovery_time_ms"] = pd.to_numeric(
            recovery["recovery_time_ms"], errors="coerce"
        )
        measured = recovery.dropna(subset=["recovery_time_ms"])
    else:
        measured = pd.DataFrame(columns=columns)

    measured.to_csv(RESULTS / "recovery_time.csv", index=False)
    plt.figure(figsize=(7, 4))
    if measured.empty:
        plt.text(
            0.5,
            0.5,
            "No measured recovery run yet\nRun the Mininet Day 15 demo",
            ha="center",
            va="center",
        )
        plt.axis("off")
    else:
        plt.plot(
            range(1, len(measured) + 1),
            measured["recovery_time_ms"],
            marker="o",
        )
        plt.xlabel("Recovery run")
        plt.ylabel("Recovery time (ms)")
        plt.title("Automatic Recovery Time")
        plt.xticks(range(1, len(measured) + 1))
        plt.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    plt.savefig(PLOTS / "recovery_time.png", dpi=300)
    plt.close()
    return {
        "source_available": source.exists(),
        "measured_runs": len(measured),
    }


def main():
    RESULTS.mkdir(exist_ok=True)
    PLOTS.mkdir(parents=True, exist_ok=True)
    frame = pd.read_csv(DATA / "traffic_data_clean.csv")
    missing = sorted(set(FEATURES + ["label"]) - set(frame.columns))
    if missing:
        raise ValueError(f"Clean dataset is missing columns: {', '.join(missing)}")
    frame["label"] = frame["label"].astype(str).str.strip().str.lower()
    _save_dataset_summary(frame)
    model_metrics = _evaluate_model()
    recovery = _recovery_artifacts()

    report = {
        "dataset_samples": len(frame),
        "class_distribution": frame["label"].value_counts().to_dict(),
        "model_metrics": model_metrics,
        "recovery": recovery,
        "artifacts": [
            "results/dataset_summary.csv",
            "results/confusion_matrix.csv",
            "results/plots/confusion_matrix.png",
            "results/recovery_time.csv",
            "results/plots/recovery_time.png",
        ],
    }
    (RESULTS / "final_evaluation.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
