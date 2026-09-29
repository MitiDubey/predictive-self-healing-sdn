import os
import pandas as pd
import matplotlib.pyplot as plt


os.makedirs("results/plots", exist_ok=True)

df = pd.read_csv("traffic_data.csv")

df["timestamp"] = pd.to_datetime(
    df["timestamp"],
    unit="s"
)

# -------- RATE DISTRIBUTION --------

normal = df[
    df["label"].astype(str).str.lower() == "normal"
]["traffic_rate"]

high = df[
    df["label"].astype(str).str.lower() == "high"
]["traffic_rate"]

plt.figure(figsize=(8, 5))

plt.boxplot(
    [normal, high],
    tick_labels=["Normal", "High"]
)

plt.ylabel("Traffic Rate (bytes/sec)")
plt.xlabel("Traffic Class")
plt.title(
    "Traffic Rate Distribution: Normal vs High"
)

plt.tight_layout()

plt.savefig(
    "results/plots/traffic_rate_distribution.png",
    dpi=300
)

plt.close()


# -------- TRAFFIC RATE OVER TIME --------

df = df.sort_values("timestamp")

plt.figure(figsize=(10, 5))

plt.plot(
    df["timestamp"],
    df["traffic_rate"]
)

plt.xlabel("Time")
plt.ylabel("Traffic Rate (bytes/sec)")
plt.title("Traffic Rate Over Time")

plt.xticks(rotation=30)

plt.tight_layout()

plt.savefig(
    "results/plots/traffic_rate_over_time.png",
    dpi=300
)

plt.close()

print("Traffic-rate charts generated.")