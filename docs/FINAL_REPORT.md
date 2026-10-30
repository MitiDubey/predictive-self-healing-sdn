# Cornerstone Final Report

## Objective

Cornerstone monitors OpenFlow traffic, classifies traffic conditions with a
reproducible ML model, records controlled mitigation decisions, detects
inter-switch failures, and reroutes the protected h1-h4 flow over a redundant
path without restarting the controller.

## Final architecture

1. Mininet hosts and Open vSwitch provide the OpenFlow 1.3 network.
2. OS-Ken collects flow statistics and port-status events.
3. `ml/predict.py` validates the four-feature inference contract and returns a
   label plus confidence.
4. `DecisionEngine` requires three high-confidence observations before
   mitigation and keeps mitigation separate from physical recovery.
5. `FailureDetector` records link events.
6. `PathManager` removes failed edges and selects the deterministic shortest
   alternate route.
7. The integrated controller installs bidirectional h1-h4 rules and records
   recovery time and final rule count.

## Features and model evaluation

The model uses `packet_count`, `byte_count`, `traffic_rate`, and `switch_id`.
The dataset is cleaned and stratified by `ml/preprocess_dataset.py`. The
selected model is retrained deterministically by
`evaluation/final_evaluation.py` using the checked-in train/test split.

Run the final evaluator:

```bash
. .venv/bin/activate
python -m evaluation.final_evaluation
```

It writes dataset statistics, model metrics, a confusion matrix, and recovery
artifacts under `results/`. Recovery values are only populated after a live
Mininet run; the evaluator does not fabricate network measurements.

## Reproducible final demo

Terminal 1:

```bash
python controller/run_controller.py
```

Terminal 2:

```bash
sudo mn --custom topology/redundant_topology.py --topo redundant \
  --controller=remote,ip=127.0.0.1,port=6633 \
  --switch ovs,protocols=OpenFlow13
```

In Mininet:

```text
pingall
iperf h1 h4
link s1 s2 down
ping h1 h4
sh ovs-ofctl -O OpenFlow13 dump-flows s1
sh ovs-ofctl -O OpenFlow13 dump-flows s3
link s1 s2 up
```

Repeat the failure test three times and preserve
`logs/failure_events.csv`, `logs/recovery_events.csv`, and the flow-table
outputs. Then rerun `python -m evaluation.final_evaluation`.

## Evidence checklist

- Dataset and class distribution: `results/dataset_summary.csv`
- Model metrics and confusion matrix: `results/final_evaluation.json`,
  `results/confusion_matrix.csv`, and `results/plots/confusion_matrix.png`
- Traffic and network graphs: `results/plots/`
- Failure detection: `logs/failure_events.csv`
- Recovery timing and final rules: `results/recovery_time.csv`
- Security decisions: `logs/security_events.csv`
