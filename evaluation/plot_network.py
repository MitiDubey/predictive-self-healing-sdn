import os
import pandas as pd
import matplotlib.pyplot as plt


# Create output directory
os.makedirs("results/plots", exist_ok=True)

# Load network results
file_path = "results/network_results.csv"

if not os.path.exists(file_path):
    raise FileNotFoundError(
        f"Could not find {file_path}"
    )

df = pd.read_csv(file_path)

# Check required columns
required_columns = [
    "scenario",
    "latency_ms",
    "packet_loss_pct",
    "throughput_mbps",
    "configured_bandwidth_mbps"
]

missing = [
    col for col in required_columns
    if col not in df.columns
]

if missing:
    raise ValueError(
        f"Missing columns: {missing}"
    )

# Convert numeric columns
numeric_columns = [
    "latency_ms",
    "packet_loss_pct",
    "throughput_mbps",
    "configured_bandwidth_mbps"
]

for col in numeric_columns:
    df[col] = pd.to_numeric(
        df[col],
        errors="coerce"
    )

# Remove incomplete rows
df = df.dropna(
    subset=required_columns
)

if df.empty:
    raise ValueError(
        "No valid data found in network_results.csv"
    )

scenarios = df["scenario"]


# =========================================================
# 1. LATENCY COMPARISON
# =========================================================

plt.figure(figsize=(8, 5))

plt.bar(
    scenarios,
    df["latency_ms"]
)

plt.xlabel("Scenario")
plt.ylabel("Average Latency (ms)")
plt.title("Latency Comparison")

plt.xticks(rotation=20)
plt.tight_layout()

plt.savefig(
    "results/plots/latency_comparison.png",
    dpi=300,
    bbox_inches="tight"
)

plt.close()


# =========================================================
# 2. PACKET LOSS COMPARISON
# =========================================================

plt.figure(figsize=(8, 5))

plt.bar(
    scenarios,
    df["packet_loss_pct"]
)

plt.xlabel("Scenario")
plt.ylabel("Packet Loss (%)")
plt.title("Packet Loss Comparison")

plt.xticks(rotation=20)
plt.tight_layout()

plt.savefig(
    "results/plots/packet_loss_comparison.png",
    dpi=300,
    bbox_inches="tight"
)

plt.close()


# =========================================================
# 3. THROUGHPUT COMPARISON
# =========================================================

plt.figure(figsize=(8, 5))

plt.bar(
    scenarios,
    df["throughput_mbps"]
)

plt.xlabel("Scenario")
plt.ylabel("Throughput (Mbps)")
plt.title("Throughput Comparison")

plt.xticks(rotation=20)
plt.tight_layout()

plt.savefig(
    "results/plots/throughput_comparison.png",
    dpi=300,
    bbox_inches="tight"
)

plt.close()


# =========================================================
# 4. BANDWIDTH UTILIZATION
# =========================================================

df["utilization_pct"] = (
    df["throughput_mbps"]
    / df["configured_bandwidth_mbps"]
) * 100

plt.figure(figsize=(8, 5))

plt.bar(
    scenarios,
    df["utilization_pct"]
)

plt.xlabel("Scenario")
plt.ylabel("Bandwidth Utilization (%)")
plt.title("Bandwidth Utilization Comparison")

plt.xticks(rotation=20)
plt.tight_layout()

plt.savefig(
    "results/plots/bandwidth_utilization.png",
    dpi=300,
    bbox_inches="tight"
)

plt.close()


print("Network charts generated successfully.")

print("\nGenerated files:")
print("1. results/plots/latency_comparison.png")
print("2. results/plots/packet_loss_comparison.png")
print("3. results/plots/throughput_comparison.png")
print("4. results/plots/bandwidth_utilization.png")