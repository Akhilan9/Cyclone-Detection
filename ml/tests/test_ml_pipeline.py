"""
Machine Learning Unit Tests.
Verifies tensor dimensions, sequence sliding window construction,
strict cyclone-level split leakage prevention, and metric calculations.
"""

import os
import sys
import numpy as np
import pytest
import torch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.architectures.cnn_spatial import CycloneSpatialCNN
from ml.architectures.convlstm_temporal import CycloneConvLSTMNet
from ml.architectures.baselines import PersistenceForecaster, LinearExtrapolationForecaster
from ml.pipelines.preprocessor import CycloneDataPreprocessor
from ml.pipelines.sequence_builder import SpatiotemporalSequenceBuilder
from ml.pipelines.dataset import train_val_test_split_by_cyclone
from ml.training.evaluate import (
    evaluate_trajectory_predictions,
    evaluate_intensity_regression,
    evaluate_classification,
)


def test_cnn_spatial_tensor_shapes():
    """Verify CycloneSpatialCNN input and output shapes."""
    model = CycloneSpatialCNN(in_channels=1, num_classes=7)
    model.eval()

    # Input: batch of 4 satellite images of size (1, 64, 64)
    dummy_input = torch.randn(4, 1, 64, 64)
    with torch.no_grad():
        out = model(dummy_input)

    assert "presence_prob" in out
    assert "class_logits" in out
    assert "wind_speed_kts" in out

    assert out["presence_prob"].shape == (4, 1)
    assert out["class_logits"].shape == (4, 7)
    assert out["wind_speed_kts"].shape == (4, 1)
    assert (out["presence_prob"] >= 0.0).all() and (out["presence_prob"] <= 1.0).all()
    assert (out["wind_speed_kts"] >= 0.0).all()


def test_convlstm_temporal_tensor_shapes():
    """Verify CycloneConvLSTMNet spatiotemporal forecasting shapes."""
    seq_len = 4
    model = CycloneConvLSTMNet(in_channels=1, hidden_dim=64, seq_len=seq_len)
    model.eval()

    batch_size = 2
    dummy_imgs = torch.randn(batch_size, seq_len, 1, 64, 64)
    dummy_coords = torch.randn(batch_size, seq_len, 2)
    dummy_winds = torch.randn(batch_size, seq_len, 1)

    with torch.no_grad():
        out = model(dummy_imgs, dummy_coords, dummy_winds)

    assert "predicted_coords" in out
    assert "predicted_wind" in out
    assert out["predicted_coords"].shape == (batch_size, 2)
    assert out["predicted_wind"].shape == (batch_size, 1)


def test_data_leakage_prevention():
    """Verify cyclone-level dataset splitting guarantees 0 overlap."""
    cyclones = [
        {"cyclone_id": f"STORM_{i}", "name": f"STORM_{i}", "track_points": [{"lat": 10 + i, "lon": 80 + i}] * 8}
        for i in range(10)
    ]
    train_c, val_c, test_c = train_val_test_split_by_cyclone(cyclones, train_ratio=0.6, val_ratio=0.2, random_seed=42)

    train_ids = {c["cyclone_id"] for c in train_c}
    val_ids = {c["cyclone_id"] for c in val_c}
    test_ids = {c["cyclone_id"] for c in test_c}

    # Strict isolation: intersection must be completely empty
    assert len(train_ids.intersection(val_ids)) == 0
    assert len(train_ids.intersection(test_ids)) == 0
    assert len(val_ids.intersection(test_ids)) == 0
    assert len(train_ids) + len(val_ids) + len(test_ids) == len(cyclones)


def test_preprocessor_haversine_distance():
    """Verify Haversine geodesic distance calculation."""
    # Distance between Chennai (13.08°N, 80.27°E) and Visakhapatnam (17.68°N, 83.21°E) is ~600 km
    dist = CycloneDataPreprocessor.haversine_distance_km(13.08, 80.27, 17.68, 83.21)
    assert 580.0 <= dist <= 630.0

    # Distance to identical point is 0.0
    zero_dist = CycloneDataPreprocessor.haversine_distance_km(15.0, 85.0, 15.0, 85.0)
    assert abs(zero_dist) < 1e-4


def test_sequence_builder_integrity():
    """Verify sequence sliding window construction strictly respects storm boundary."""
    cyclones_data = [
        {
            "cyclone_id": "CYCLONE_A",
            "track_points": [
                {"latitude": 10.0 + i, "longitude": 80.0 + i, "wind_speed_kts": 30.0 + i * 5}
                for i in range(6)
            ],
        },
        {
            "cyclone_id": "CYCLONE_B",
            "track_points": [
                {"latitude": 12.0 + i, "longitude": 70.0 + i, "wind_speed_kts": 40.0 + i * 5}
                for i in range(5)
            ],
        },
    ]
    builder = SpatiotemporalSequenceBuilder(sequence_length=4, forecast_horizon_steps=1)
    seqs = builder.build_sequences_from_cyclone_records(cyclones_data)

    assert "X_images" in seqs
    assert "X_coords" in seqs
    assert "y_future_coords" in seqs

    # CYCLONE_A (len 6): (6 - (4+1) + 1) = 2 sequences
    # CYCLONE_B (len 5): (5 - (4+1) + 1) = 1 sequence
    # Total = 3 sequences
    assert len(seqs["X_coords"]) == 3
    assert seqs["X_coords"].shape == (3, 4, 2)
    assert seqs["y_future_coords"].shape == (3, 2)


def test_baselines_accuracy():
    """Verify Persistence and Linear Extrapolation baseline outputs."""
    past_coords = np.array([
        [[10.0, 80.0], [11.0, 81.0], [12.0, 82.0], [13.0, 83.0]]
    ], dtype=np.float32)
    past_winds = np.array([
        [[30.0], [35.0], [40.0], [45.0]]
    ], dtype=np.float32)

    persistence = PersistenceForecaster()
    p_out = persistence.predict(past_coords, past_winds)
    # Persistence predicts last step [13.0, 83.0] and 45.0
    np.testing.assert_allclose(p_out["pred_coords"], np.array([[13.0, 83.0]]))
    np.testing.assert_allclose(p_out["pred_wind"], np.array([[45.0]]))

    linear = LinearExtrapolationForecaster(step_multiplier=1.0)
    l_out = linear.predict(past_coords, past_winds)
    # Velocity was +1.0 in lat and +1.0 in lon -> projects to [14.0, 84.0]
    np.testing.assert_allclose(l_out["pred_coords"], np.array([[14.0, 84.0]]))
    np.testing.assert_allclose(l_out["pred_winds"], np.array([[50.0]]))
