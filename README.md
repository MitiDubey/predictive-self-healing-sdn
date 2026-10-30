# Cornerstone SDN

Cornerstone is an OS-Ken/OpenFlow 1.3 traffic-monitoring project with a
reproducible ML pipeline, controlled mitigation, and automatic recovery over a
redundant Mininet topology.

## Layout

- `controller/`: the Day 6 monitoring base and current ML-enabled controller entry point
- `topology/`: Mininet topology definitions
- `ml/`: preprocessing, training, model comparison, and inference modules
- `data/`: raw capture, cleaned data, and stratified train/test splits
- `logs/`: runtime event logs (created by later controller days)
- `results/`: experiment outputs (created by later evaluation days)
- `tests/`: validation tests for ML inference and Day 11 controller behavior
- `docs/`: implementation diagrams and supporting documentation

## Run Days 7-10

Activate the project environment, then run from the project root:

```bash
. .venv/bin/activate
python ml/preprocess_dataset.py
python ml/train_model.py
python ml/compare_models.py
python ml/predict.py --packet-count 10 --byte-count 700 --traffic-rate 100 --switch-id 1
```

The final model is written to `ml/best_model.joblib` and its feature order to
`ml/feature_order.json`. The inference module can also be imported by a later
controller integration:

```python
from ml.predict import predict

result = predict({
    "packet_count": 10,
    "byte_count": 700,
    "traffic_rate": 100,
    "switch_id": 1,
})
```

## Run the integrated controller

Ensure the model exists, then start the controller before Mininet:

```bash
. .venv/bin/activate
python ml/preprocess_dataset.py
python ml/compare_models.py
python controller/run_controller.py
sudo mn --custom topology/basic_topology.py --topo basic \
    --controller=remote,ip=127.0.0.1,port=6633 \
    --switch ovs,protocols=OpenFlow13
```

The controller prints each valid flow-rate feature vector, ML label, and
confidence. Missing models, invalid input, or low-confidence results leave
forwarding running and use the threshold label as an observation fallback.

## Validation tests

Run the dedicated Day 7–11 validation tests from the project root:

```bash
. .venv/bin/activate
python -m unittest discover -s tests -p 'test_*.py'
```

For the redundant topology and automatic recovery demo:

```bash
sudo mn --custom topology/redundant_topology.py --topo redundant \
    --controller=remote,ip=127.0.0.1,port=6633 \
    --switch ovs,protocols=OpenFlow13
mininet> pingall
mininet> link s1 s2 down
mininet> ping h1 h4
mininet> link s1 s2 up
```

The controller detects the port event, removes the failed edge from its graph,
installs bidirectional h1-h4 rules along the alternate path, and appends the
result to `logs/recovery_events.csv`. The log records the path before and after
failure, recovery time, final rule count, and a packet-loss field reserved for
the traffic experiment's measured value.

The controller-to-model data flow is documented in
[docs/controller-ml-data-flow.md](docs/controller-ml-data-flow.md).

## Day 15 final evaluation

Generate the final dataset summary, selected-model metrics, confusion matrix,
and recovery-time chart with:

```bash
python -m evaluation.final_evaluation
```

The final report and viva preparation are in
[docs/FINAL_REPORT.md](docs/FINAL_REPORT.md) and
[docs/VIVA_QUESTIONS.md](docs/VIVA_QUESTIONS.md). Recovery measurements remain
empty until the live redundant-topology experiment has been completed; the
evaluator reports that state instead of fabricating network results.

## Analytical dashboard

The `dashboard/` directory contains a Next.js dashboard that polls the
controller and evaluation CSV/JSON files every five seconds. It displays
recovery history, alternate paths, failure events, security observations,
traffic-rate trends, and ML metrics.

Run it from the repository root:

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000`. Keep the controller running separately; new
failure and recovery events will appear automatically after the next refresh.

After a successful Mininet recovery check:

```bash
h1 ping -c 5 10.0.0.4
python scripts/verify_recovery.py --success
```

The dashboard treats route calculation, rule installation, and connectivity
verification as separate states. Green verification appears only after the
successful ping is explicitly recorded.