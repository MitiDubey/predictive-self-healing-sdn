"""Clean the controller capture and create reproducible train/test CSV files."""

import argparse
import shutil
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parents[1]
FEATURES = ["packet_count", "byte_count", "traffic_rate", "switch_id"]
LABEL = "label"
REQUIRED_COLUMNS = ["timestamp", "switch_id", "packet_count", "byte_count", "traffic_rate", LABEL]


def preprocess(input_path: Path, output_dir: Path, test_size: float = 0.2, seed: int = 42) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    raw = pd.read_csv(input_path)
    missing = sorted(set(REQUIRED_COLUMNS) - set(raw.columns))
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    frame = raw[REQUIRED_COLUMNS].copy()
    for column in FEATURES:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame[LABEL] = frame[LABEL].astype("string").str.strip().str.lower()
    frame = frame.dropna().drop_duplicates()
    frame = frame[frame[LABEL].isin(["normal", "high"])]
    frame = frame[(frame[FEATURES] >= 0).all(axis=1)]
    if frame[LABEL].nunique() < 2:
        raise ValueError("Both normal and high labels are required")
    if frame[LABEL].value_counts().min() < 2:
        raise ValueError("Each class needs at least two samples for a stratified split")

    clean_path = output_dir / "traffic_data_clean.csv"
    frame.to_csv(clean_path, index=False)
    x_train, x_test, y_train, y_test = train_test_split(
        frame[FEATURES],
        frame[LABEL],
        test_size=test_size,
        random_state=seed,
        stratify=frame[LABEL],
    )
    x_train.to_csv(output_dir / "X_train.csv", index=False)
    x_test.to_csv(output_dir / "X_test.csv", index=False)
    y_train.to_csv(output_dir / "y_train.csv", index=False, header=True)
    y_test.to_csv(output_dir / "y_test.csv", index=False, header=True)

    print(f"Clean samples: {len(frame)}")
    print(f"Class distribution: {frame[LABEL].value_counts().to_dict()}")
    print(f"Wrote dataset files to {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "traffic_data.csv")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    raw_copy = args.output_dir / "traffic_data.csv"
    if args.input.resolve() != raw_copy.resolve():
        shutil.copy2(args.input, raw_copy)
    preprocess(args.input, args.output_dir)


if __name__ == "__main__":
    main()