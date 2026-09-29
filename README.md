# Cornerstone SDN

Cornerstone is an OS-Ken/OpenFlow 1.3 traffic-monitoring project with a
reproducible ML pipeline and Day 11 live controller inference.

## Layout

- `controller/`: historical controllers and the current ML-enabled controller entry point
- `topology/`: Mininet topology definitions
- `ml/`: preprocessing, training, model comparison, and inference modules
- `data/`: raw capture, cleaned data, and stratified train/test splits
- `logs/`: runtime event logs (created by later controller days)
- `results/`: experiment outputs (created by later evaluation days)

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

## Run Day 11

Ensure the Day 10 model exists, then start the controller before Mininet:

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
confidence. It does not block traffic in Day 11; missing models, invalid input,
or low-confidence results leave forwarding running and use the threshold label
as an observation fallback.