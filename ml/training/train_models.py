"""
Model Training and Checkpoint Serialization Pipeline.
Trains:
1. Spatial Multi-Head CNN (Cyclone Presence, IMD Intensity Stage, Wind Speed)
2. Spatiotemporal ConvLSTM (Future Trajectory Coordinates, Future Wind Speed)
Evaluates on held-out test cyclones and saves serialized artifacts and metrics.
"""

import json
import logging
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from typing import Any, Dict, List, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

from ml.architectures.cnn_spatial import CycloneSpatialCNN
from ml.architectures.convlstm_temporal import CycloneConvLSTMNet
from ml.architectures.baselines import PersistenceForecaster, LinearExtrapolationForecaster
from ml.pipelines.sequence_builder import SpatiotemporalSequenceBuilder
from ml.pipelines.dataset import train_val_test_split_by_cyclone, build_dataset_manifest
from ml.training.evaluate import (
    evaluate_trajectory_predictions,
    evaluate_intensity_regression,
    evaluate_classification,
    run_full_benchmark_comparison,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_models")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARTIFACTS_DIR = os.path.join(PROJECT_ROOT, "ml", "artifacts")
DATA_DIR = os.path.join(PROJECT_ROOT, "data")


def load_dataset_records() -> List[Dict[str, Any]]:
    """Load cyclone track records from fixture or cleaned raw data."""
    fixture_path = os.path.join(DATA_DIR, "fixtures", "sample_cyclones.json")
    if os.path.exists(fixture_path):
        with open(fixture_path, "r") as f:
            data = json.load(f)
            return data.get("cyclones", [])
    raise FileNotFoundError(f"No cyclone records found at {fixture_path}")


def train_cnn_model(
    train_images: np.ndarray,
    train_classes: np.ndarray,
    train_winds: np.ndarray,
    val_images: np.ndarray,
    val_classes: np.ndarray,
    val_winds: np.ndarray,
    num_epochs: int = 15,
    batch_size: int = 8,
    device: str = "cpu",
) -> Tuple[CycloneSpatialCNN, Dict[str, Any]]:
    """Train multi-head spatial CNN."""
    logger.info("Initializing CycloneSpatialCNN...")
    model = CycloneSpatialCNN(in_channels=1, num_classes=7).to(device)

    # Convert to PyTorch format (B, C, H, W)
    X_train_t = torch.tensor(train_images.transpose(0, 3, 1, 2), dtype=torch.float32)
    y_train_cls_t = torch.tensor(train_classes, dtype=torch.long)
    y_train_wnd_t = torch.tensor(train_winds, dtype=torch.float32)

    X_val_t = torch.tensor(val_images.transpose(0, 3, 1, 2), dtype=torch.float32)
    y_val_cls_t = torch.tensor(val_classes, dtype=torch.long)
    y_val_wnd_t = torch.tensor(val_winds, dtype=torch.float32)

    train_ds = TensorDataset(X_train_t, y_train_cls_t, y_train_wnd_t)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    cls_criterion = nn.CrossEntropyLoss()
    wnd_criterion = nn.MSELoss()

    best_val_loss = float("inf")
    best_weights = None
    history = {"train_loss": [], "val_loss": []}

    for epoch in range(1, num_epochs + 1):
        model.train()
        total_loss = 0.0
        for b_x, b_cls, b_wnd in train_loader:
            b_x, b_cls, b_wnd = b_x.to(device), b_cls.to(device), b_wnd.to(device)
            optimizer.zero_grad()
            out = model(b_x)

            loss_cls = cls_criterion(out["class_logits"], b_cls)
            loss_wnd = wnd_criterion(out["wind_speed_kts"], b_wnd)
            loss = loss_cls + 0.05 * loss_wnd
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(b_x)

        train_loss = total_loss / max(1, len(train_ds))

        # Validation
        model.eval()
        with torch.no_grad():
            val_out = model(X_val_t.to(device))
            v_loss_cls = cls_criterion(val_out["class_logits"], y_val_cls_t.to(device))
            v_loss_wnd = wnd_criterion(val_out["wind_speed_kts"], y_val_wnd_t.to(device))
            val_loss = (v_loss_cls + 0.05 * v_loss_wnd).item()

        history["train_loss"].append(round(train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if epoch % 5 == 0 or epoch == num_epochs:
            logger.info(f"CNN Epoch {epoch:2d}/{num_epochs:2d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

    if best_weights:
        model.load_state_dict(best_weights)

    return model, history


def train_convlstm_model(
    train_seqs: Dict[str, np.ndarray],
    val_seqs: Dict[str, np.ndarray],
    num_epochs: int = 15,
    batch_size: int = 8,
    device: str = "cpu",
) -> Tuple[CycloneConvLSTMNet, Dict[str, Any]]:
    """Train spatiotemporal ConvLSTM network."""
    logger.info("Initializing CycloneConvLSTMNet...")
    model = CycloneConvLSTMNet(in_channels=1, hidden_dim=64, seq_len=4).to(device)

    # Convert to (B, T, C, H, W)
    X_train_img = torch.tensor(train_seqs["X_images"].transpose(0, 1, 4, 2, 3), dtype=torch.float32)
    X_train_crd = torch.tensor(train_seqs["X_coords"], dtype=torch.float32)
    X_train_wnd = torch.tensor(train_seqs["X_winds"], dtype=torch.float32)
    y_train_crd = torch.tensor(train_seqs["y_future_coords"], dtype=torch.float32)
    y_train_wnd = torch.tensor(train_seqs["y_future_wind"], dtype=torch.float32)

    X_val_img = torch.tensor(val_seqs["X_images"].transpose(0, 1, 4, 2, 3), dtype=torch.float32)
    X_val_crd = torch.tensor(val_seqs["X_coords"], dtype=torch.float32)
    X_val_wnd = torch.tensor(val_seqs["X_winds"], dtype=torch.float32)
    y_val_crd = torch.tensor(val_seqs["y_future_coords"], dtype=torch.float32)
    y_val_wnd = torch.tensor(val_seqs["y_future_wind"], dtype=torch.float32)

    train_ds = TensorDataset(X_train_img, X_train_crd, X_train_wnd, y_train_crd, y_train_wnd)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    coord_criterion = nn.MSELoss()
    wind_criterion = nn.MSELoss()

    best_val_loss = float("inf")
    best_weights = None
    history = {"train_loss": [], "val_loss": []}

    for epoch in range(1, num_epochs + 1):
        model.train()
        total_loss = 0.0
        for b_img, b_crd, b_wnd, b_ycrd, b_ywnd in train_loader:
            b_img, b_crd, b_wnd = b_img.to(device), b_crd.to(device), b_wnd.to(device)
            b_ycrd, b_ywnd = b_ycrd.to(device), b_ywnd.to(device)

            optimizer.zero_grad()
            out = model(b_img, b_crd, b_wnd)

            loss_crd = coord_criterion(out["predicted_coords"], b_ycrd)
            loss_wnd = wind_criterion(out["predicted_wind"], b_ywnd)
            loss = loss_crd + 0.05 * loss_wnd
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(b_img)

        train_loss = total_loss / max(1, len(train_ds))

        # Validation
        model.eval()
        with torch.no_grad():
            val_out = model(X_val_img.to(device), X_val_crd.to(device), X_val_wnd.to(device))
            v_loss_crd = coord_criterion(val_out["predicted_coords"], y_val_crd.to(device))
            v_loss_wnd = wind_criterion(val_out["predicted_wind"], y_val_wnd.to(device))
            val_loss = (v_loss_crd + 0.05 * v_loss_wnd).item()

        history["train_loss"].append(round(train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if epoch % 5 == 0 or epoch == num_epochs:
            logger.info(f"ConvLSTM Epoch {epoch:2d}/{num_epochs:2d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

    if best_weights:
        model.load_state_dict(best_weights)

    return model, history


def execute_full_training_pipeline() -> Dict[str, Any]:
    """Execute complete end-to-end training and benchmark evaluation."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    cyclones = load_dataset_records()
    logger.info(f"Loaded {len(cyclones)} cyclone records for training pipeline.")

    # 1. Storm-level split
    train_cyc, val_cyc, test_cyc = train_val_test_split_by_cyclone(cyclones, train_ratio=0.6, val_ratio=0.2, random_seed=42)
    train_ids = {c["cyclone_id"] for c in train_cyc}
    val_ids = {c["cyclone_id"] for c in val_cyc}
    test_ids = {c["cyclone_id"] for c in test_cyc}

    # Save manifest
    manifest_path = os.path.join(DATA_DIR, "dataset_manifest.csv")
    build_dataset_manifest(cyclones, manifest_path, train_ids, val_ids, test_ids)

    # 2. Sequence building
    builder = SpatiotemporalSequenceBuilder(sequence_length=4, forecast_horizon_steps=1)
    train_seqs = builder.build_sequences_from_cyclone_records(train_cyc)
    val_seqs = builder.build_sequences_from_cyclone_records(val_cyc)
    test_seqs = builder.build_sequences_from_cyclone_records(test_cyc)

    # For CNN spatial training, flatten image sequences into individual frames
    train_imgs = train_seqs["X_images"][:, -1, :, :, :]  # Last frame of each sequence
    train_cls = train_seqs["y_future_class"]
    train_wnd = train_seqs["y_future_wind"]

    val_imgs = val_seqs["X_images"][:, -1, :, :, :]
    val_cls = val_seqs["y_future_class"]
    val_wnd = val_seqs["y_future_wind"]

    test_imgs = test_seqs["X_images"][:, -1, :, :, :]
    test_cls = test_seqs["y_future_class"]
    test_wnd = test_seqs["y_future_wind"]

    # 3. Train Spatial CNN
    device = "cpu"
    cnn_model, cnn_history = train_cnn_model(
        train_imgs, train_cls, train_wnd, val_imgs, val_cls, val_wnd, num_epochs=12, device=device
    )
    cnn_path = os.path.join(ARTIFACTS_DIR, "cnn_spatial_best.pt")
    torch.save(cnn_model.state_dict(), cnn_path)
    logger.info(f"Saved CNN weights to {cnn_path}")

    # 4. Train ConvLSTM
    convlstm_model, convlstm_history = train_convlstm_model(
        train_seqs, val_seqs, num_epochs=15, device=device
    )
    convlstm_path = os.path.join(ARTIFACTS_DIR, "convlstm_temporal_best.pt")
    torch.save(convlstm_model.state_dict(), convlstm_path)
    logger.info(f"Saved ConvLSTM weights to {convlstm_path}")

    # 5. Model Evaluation on Held-Out Test Cyclones
    convlstm_model.eval()
    with torch.no_grad():
        test_in_img = torch.tensor(test_seqs["X_images"].transpose(0, 1, 4, 2, 3), dtype=torch.float32)
        test_in_crd = torch.tensor(test_seqs["X_coords"], dtype=torch.float32)
        test_in_wnd = torch.tensor(test_seqs["X_winds"], dtype=torch.float32)
        out_cl = convlstm_model(test_in_img, test_in_crd, test_in_wnd)
        convlstm_pred_coords = out_cl["predicted_coords"].cpu().numpy()
        convlstm_pred_wind = out_cl["predicted_wind"].cpu().numpy()

    # CNN Evaluation
    cnn_model.eval()
    with torch.no_grad():
        test_in_single_img = torch.tensor(test_imgs.transpose(0, 3, 1, 2), dtype=torch.float32)
        out_cnn = cnn_model(test_in_single_img)
        cnn_pred_logits = out_cnn["class_logits"].cpu().numpy()
        cnn_pred_class = np.argmax(cnn_pred_logits, axis=1)
        cnn_pred_wind = out_cnn["wind_speed_kts"].cpu().numpy()

    # Baselines Evaluation on Test Set
    persistence = PersistenceForecaster()
    p_preds = persistence.predict(test_seqs["X_coords"], test_seqs["X_winds"])
    pers_coords = p_preds["pred_coords"]
    pers_wind = p_preds["pred_wind"]

    linear = LinearExtrapolationForecaster(step_multiplier=1.0)
    l_preds = linear.predict(test_seqs["X_coords"], test_seqs["X_winds"])
    linear_coords = l_preds["pred_coords"]
    linear_wind = l_preds["pred_winds"]

    # Trajectory & Intensity Metrics
    benchmark_metrics = run_full_benchmark_comparison(
        y_true_coords=test_seqs["y_future_coords"],
        y_true_wind=test_seqs["y_future_wind"],
        persistence_coords=pers_coords,
        persistence_wind=pers_wind,
        linear_coords=linear_coords,
        linear_wind=linear_wind,
        cnn_coords=None,
        cnn_wind=cnn_pred_wind,
        convlstm_coords=convlstm_pred_coords,
        convlstm_wind=convlstm_pred_wind,
    )

    # Classification Metrics
    cls_metrics = evaluate_classification(test_cls, cnn_pred_class, num_classes=7)

    # Save Evaluation Artifacts
    evaluation_summary = {
        "dataset_split": {
            "train_cyclone_ids": list(train_ids),
            "val_cyclone_ids": list(val_ids),
            "test_cyclone_ids": list(test_ids),
            "test_sequence_count": int(len(test_seqs["y_future_coords"])),
        },
        "classification_metrics": cls_metrics,
        "benchmark_comparison": benchmark_metrics,
        "forecast_horizon_hours": 6,
        "input_window_hours": 24,
    }

    eval_json_path = os.path.join(ARTIFACTS_DIR, "evaluation_metrics.json")
    with open(eval_json_path, "w") as f:
        json.dump(evaluation_summary, f, indent=2)
    logger.info(f"Evaluation metrics written to {eval_json_path}")

    # Metadata specification
    metadata = {
        "models": [
            {
                "model_id": "cnn_spatial_v1",
                "name": "Spatial Feature Extractor & Intensity Classifier",
                "architecture": "CNN Multi-Head",
                "checkpoint_path": cnn_path,
                "input_shape": [64, 64, 1],
                "task": "Presence Detection & IMD Intensity Stage Classification",
                "training_date": "2026-10-13",
                "framework": "PyTorch 2.6.0+cpu",
                "status": "ready",
            },
            {
                "model_id": "convlstm_spatiotemporal_v1",
                "name": "ConvLSTM Spatiotemporal Trajectory & Intensity Forecaster",
                "architecture": "ConvLSTM + Kinematic Fusion",
                "checkpoint_path": convlstm_path,
                "input_shape": [4, 64, 64, 1],
                "task": "+6h to +24h Trajectory & Intensity Forecasting",
                "training_date": "2026-10-13",
                "framework": "PyTorch 2.6.0+cpu",
                "status": "ready",
            },
            {
                "model_id": "baseline_persistence",
                "name": "Persistence Kinematic Baseline",
                "architecture": "Rule-based Persistence",
                "task": "Benchmark Comparison",
                "status": "ready",
            },
            {
                "model_id": "baseline_linear",
                "name": "Linear Velocity Extrapolation Baseline",
                "architecture": "Kinematic Extrapolation",
                "task": "Benchmark Comparison",
                "status": "ready",
            }
        ]
    }
    meta_json_path = os.path.join(ARTIFACTS_DIR, "model_metadata.json")
    with open(meta_json_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Model metadata written to {meta_json_path}")

    return evaluation_summary


if __name__ == "__main__":
    summary = execute_full_training_pipeline()
    print("Training Pipeline Successfully Completed!")
    print(json.dumps(summary, indent=2))
