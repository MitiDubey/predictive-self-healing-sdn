import os
import pandas as pd
import matplotlib.pyplot as plt


os.makedirs("results/plots", exist_ok=True)

df = pd.read_csv("results/ml_metrics.csv")

models = df["model"]

# ---------------- ACCURACY ----------------

plt.figure(figsize=(8, 5))
plt.bar(models, df["accuracy"] * 100)

plt.ylabel("Accuracy (%)")
plt.xlabel("ML Model")
plt.title("ML Model Accuracy Comparison")
plt.xticks(rotation=15)

plt.ylim(0, 100)
plt.tight_layout()

plt.savefig(
    "results/plots/ml_accuracy_comparison.png",
    dpi=300
)

plt.close()


# -------- PRECISION / RECALL / F1 ---------

x = range(len(models))
width = 0.25

plt.figure(figsize=(9, 5))

plt.bar(
    [i - width for i in x],
    df["precision"] * 100,
    width=width,
    label="Precision"
)

plt.bar(
    x,
    df["recall"] * 100,
    width=width,
    label="Recall"
)

plt.bar(
    [i + width for i in x],
    df["f1"] * 100,
    width=width,
    label="F1-score"
)

plt.xticks(
    list(x),
    models,
    rotation=15
)

plt.ylabel("Score (%)")
plt.xlabel("ML Model")
plt.title(
    "Precision, Recall and F1-score Comparison"
)

plt.ylim(0, 100)
plt.legend()
plt.tight_layout()

plt.savefig(
    "results/plots/ml_metrics_comparison.png",
    dpi=300
)

plt.close()

print("ML charts generated.")