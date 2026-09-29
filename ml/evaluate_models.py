import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix
)
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier


DATA_FILE = "traffic_data.csv"
RESULT_DIR = "results"
MODEL_DIR = "ml"

FEATURES = [
    "packet_count",
    "byte_count",
    "traffic_rate"
]

TEST_SIZE = 0.20
RANDOM_STATE = 42


def load_data():

    df = pd.read_csv(DATA_FILE)

    # Remove extra spaces and normalize label text
    df["label"] = (
        df["label"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    print("Labels found in dataset:")
    print(df["label"].value_counts())

    # Convert text labels to numbers
    label_map = {
        "normal": 0,
        "high": 1
    }

    df["label"] = df["label"].map(label_map)

    # Check for unexpected labels
    if df["label"].isna().any():
        print("\nUnexpected labels found:")
        print(df[df["label"].isna()])
        raise ValueError(
            "Dataset contains labels other than 'normal' or 'high'."
        )

    # Convert to integer
    df["label"] = df["label"].astype(int)

    # Remove rows with missing feature values
    df = df.dropna(
        subset=FEATURES
    )

    return df


def main():

    os.makedirs(RESULT_DIR, exist_ok=True)

    df = load_data()

    X = df[FEATURES]
    y = df["label"]

    print("Dataset shape:", df.shape)
    print("\nClass distribution:")
    print(y.value_counts())

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )

    models = {

        "Decision Tree":
            DecisionTreeClassifier(
                random_state=RANDOM_STATE,
                class_weight="balanced"
            ),

        "Logistic Regression":
            Pipeline([
                ("scaler", StandardScaler()),
                ("model", LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced"
                ))
            ]),

        "Random Forest":
            RandomForestClassifier(
                n_estimators=200,
                random_state=RANDOM_STATE,
                class_weight="balanced"
            )
    }

    results = []

    for name, model in models.items():

        print(f"\nTraining {name}...")

        model.fit(X_train, y_train)

        predictions = model.predict(X_test)

        accuracy = accuracy_score(
            y_test,
            predictions
        )

        precision = precision_score(
            y_test,
            predictions,
            pos_label=1,
            zero_division=0
        )

        recall = recall_score(
            y_test,
            predictions,
            pos_label=1,
            zero_division=0
        )

        f1 = f1_score(
            y_test,
            predictions,
            pos_label=1,
            zero_division=0
        )

        cm = confusion_matrix(
            y_test,
            predictions
        )

        print(
            f"Accuracy:  {accuracy:.4f}\n"
            f"Precision: {precision:.4f}\n"
            f"Recall:    {recall:.4f}\n"
            f"F1:        {f1:.4f}"
        )

        print("Confusion Matrix:")
        print(cm)

        results.append({
            "model": name,
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": f1
        })

        filename = name.lower().replace(
            " ",
            "_"
        )

        joblib.dump(
            model,
            f"{MODEL_DIR}/{filename}.joblib"
        )

    results_df = pd.DataFrame(results)

    results_df.to_csv(
        f"{RESULT_DIR}/ml_metrics.csv",
        index=False
    )

    print(
        "\nSaved:"
        "\nresults/ml_metrics.csv"
    )


if __name__ == "__main__":
    main()