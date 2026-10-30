# 🚀 CORNERSTONE
### AI-Powered Self-Healing Software Defined Networking (SDN)

**Cornerstone** is an intelligent Software Defined Networking (SDN) system designed to monitor network traffic, detect abnormal behavior using Machine Learning, and support automated network recovery through alternate path calculation.

The project combines SDN, Machine Learning, traffic analysis, and network resilience to build a smarter and more reliable network infrastructure.

---

## 📌 Project Overview

Traditional networks often require manual intervention to identify traffic anomalies and recover from network failures.

Cornerstone aims to address these challenges through an intelligent SDN controller that:

- Monitors real-time network traffic.
- Detects abnormal traffic patterns using Machine Learning.
- Identifies potential network threats.
- Calculates alternate paths when network links fail.
- Supports intelligent traffic mitigation.
- Provides an analytical dashboard for monitoring network performance and recovery events.

## ✨ Key Features

### 1. Traffic Monitoring
- Collects network flow statistics.
- Monitors packet count, byte count, and traffic rate.
- Tracks traffic behavior across network switches.

### 2. Machine Learning-Based Detection
- Classifies network traffic as Normal or High.
- Uses trained ML models for traffic classification.
- Compares Decision Tree, Logistic Regression, and Random Forest models.
- Evaluates model performance using accuracy, precision, recall, and F1-score.

### 3. Security Monitoring
- Detects suspicious traffic patterns.
- Maintains security event logs.
- Supports intelligent mitigation decisions.
- Uses confidence thresholds and repeated detection before recommending mitigation.

### 4. Self-Healing Network
- Detects link failures through port-status events.
- Maintains network topology information.
- Calculates alternate routes using path management.
- Supports forwarding-rule installation through a route installer.
- Maintains failure and recovery event logs.

### 5. Analytical Dashboard
- Overview of network activity.
- Traffic analytics and distribution.
- ML model performance comparison.
- Security monitoring.
- Network performance analysis.
- Recovery and topology visualization.

---

## 🏗️ System Architecture

```text
                  Network Traffic
                        |
                        v
                 Mininet Topology
                        |
                        v
                Open vSwitch (OVS)
                        |
                        v
                  OS-Ken Controller
                        |
             +----------+----------+
             |                     |
             v                     v
       Traffic Monitoring     Failure Detection
             |                     |
             v                     v
       Feature Extraction      Path Manager
             |                     |
             v                     v
       ML Classification     Alternate Route
             |                     |
             v                     v
       Security Decision     Route Installer
             |                     |
             v                     v
       Mitigation Logic       Network Recovery
             |
             v
          CSV Logs
             |
             v
       Analytical Dashboard
```

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Programming Language | Python, JavaScript |
| SDN Controller | OS-Ken |
| Network Emulator | Mininet |
| Switching | Open vSwitch |
| Network Protocol | OpenFlow 1.3 |
| Machine Learning | Scikit-learn |
| Data Processing | Pandas, NumPy |
| Visualization | Matplotlib, Plotly |
| Frontend | React / Vite |
| Backend | Python |
| Version Control | Git, GitHub |

---

## 📂 Project Structure

```text
CORNERSTONE/
│
├── controller/
│   ├── cornerstone_controller_day6.py
│   ├── cornerstone_controller_ml.py
│   ├── decision_engine.py
│   ├── failure_detector.py
│   ├── path_manager.py
│   └── route_installer.py
│
├── ml/
│   ├── train.py
│   ├── predict.py
│   └── evaluate_models.py
│
├── topology/
│   ├── redundant_topology.py
│   └── benchmark_topology.py
│
├── dashboard/
│   └── [Dashboard source files]
│
├── evaluation/
│   ├── plot_ml.py
│   ├── plot_network.py
│   └── plot_traffic_rate.py
│
├── results/
│   ├── ml_metrics.csv
│   ├── network_results.csv
│   └── plots/
│
├── logs/
│   ├── security_events.csv
│   ├── failure_events.csv
│   └── README.md
│
├── traffic_data.csv
├── requirements.txt
└── README.md
```

*Adjust the structure above to match the actual files in your repository.*

---

## ⚙️ Installation and Setup

### Prerequisites

- Python 3.x
- Mininet
- Open vSwitch
- OS-Ken
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd CORNERSTONE
```

### 2. Install Python Dependencies

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Start the SDN Controller

```bash
osken-manager controller/cornerstone_controller_ml.py
```

### 4. Launch the Network Topology

In another terminal:

```bash
sudo python3 topology/redundant_topology.py
```

### 5. Start the Dashboard

Navigate to your frontend directory:

```bash
cd dashboard
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

---

## 📊 Performance Evaluation

Cornerstone evaluates network behavior using multiple performance indicators.

| Metric | Purpose |
|---|---|
| Latency | Measures packet delivery delay |
| Packet Loss | Measures lost packets |
| Throughput | Measures successful data transfer rate |
| Bandwidth Utilization | Measures network capacity usage |
| Accuracy | Evaluates ML classification |
| Precision | Measures correct positive predictions |
| Recall | Measures detection capability |
| F1-Score | Balances precision and recall |
| Recovery Time | Measures time taken to restore connectivity |

---

## 🔄 Self-Healing Workflow

1. A network link failure occurs.
2. The SDN controller detects the port-status change.
3. The failure detector records the event.
4. The path manager removes the failed link from its topology graph.
5. An alternate route is calculated.
6. The route installer attempts to install forwarding rules.
7. Network connectivity is verified.
8. Recovery events are recorded for analysis.

*Successful self-healing requires actual forwarding-rule installation and connectivity verification.*

---

## 🔐 Safety and Monitoring

Cornerstone includes a decision-engine mechanism to evaluate suspicious traffic before mitigation.

During development, mitigation can operate in **Dry Run Mode**, where recommended actions are logged without executing actual traffic-blocking rules.

This helps prevent unintended network disruption during testing.

---

## 🎯 Project Objectives

- Develop an intelligent SDN-based network monitoring system.
- Integrate Machine Learning into SDN traffic analysis.
- Improve network security through anomaly detection.
- Implement alternate-path calculation for network resilience.
- Reduce manual intervention in network failure handling.
- Visualize network intelligence through an analytical dashboard.

---

## 🚀 Future Enhancements

- Advanced anomaly detection using deep learning.
- Dynamic traffic-aware routing.
- Automated recovery verification.
- Improved real-time network visualization.
- Adaptive mitigation strategies.
- Large-scale network testing and optimization.

---

## 👨‍💻 Contributors

**Cornerstone – Self-Healing SDN**

Developed as an academic engineering project.

---

## 📄 License

This project is intended for educational and research purposes.
