"""
Scientific Evaluation Suite for Cyclone Models and Baselines.
Computes:
1. Trajectory Track Error (Mean Great-Circle Haversine Distance in km)
2. Intensity Regression Metrics (MAE, RMSE, Bias in knots)
3. Classification Metrics (Accuracy, Precision, Recall, Macro-F1, Confusion Matrix)
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support, accuracy_score
from ml.pipelines.preprocessor import CycloneDataPreprocessor

logger = logging.getLogger("model_evaluation")


def evaluate_trajectory_predictions(
    y_true_coords: np.ndarray,  # (N, 2) [true_lat, true_lon]
    y_pred_coords: np.ndarray,  # (N, 2) [pred_lat, pred_lon]
) -> Dict[str, float]:
    """Calculate geodesic track forecast errors using Haversine Great-Circle formula."""
    if len(y_true_coords) == 0:
        return {"mean_track_error_km": 0.0, "median_track_error_km": 0.0, "std_track_error_km": 0.0}

    distances_km = []
    for i in range(len(y_true_coords)):
        t_lat, t_lon = y_true_coords[i]
        p_lat, p_lon = y_pred_coords[i]
        dist = CycloneDataPreprocessor.haversine_distance_km(t_lat, t_lon, p_lat, p_lon)
        distances_km.append(dist)

    arr = np.array(distances_km)
    return {
        "mean_track_error_km": float(np.mean(arr)),
        "median_track_error_km": float(np.median(arr)),
        "std_track_error_km": float(np.std(arr)),
        "min_track_error_km": float(np.min(arr)),
        "max_track_error_km": float(np.max(arr)),
        "sample_count": int(len(arr)),
    }


def evaluate_intensity_regression(
    y_true_wind: np.ndarray,  # (N, 1) or (N,)
    y_pred_wind: np.ndarray,  # (N, 1) or (N,)
) -> Dict[str, float]:
    """Calculate wind speed intensity regression metrics (knots)."""
    t = y_true_wind.flatten()
    p = y_pred_wind.flatten()
    if len(t) == 0:
        return {"mae_knots": 0.0, "rmse_knots": 0.0, "mean_bias_knots": 0.0}

    diff = p - t
    mae = float(np.mean(np.abs(diff)))
    rmse = float(np.sqrt(np.mean(diff ** 2)))
    bias = float(np.mean(diff))

    return {
        "mae_knots": round(mae, 2),
        "rmse_knots": round(rmse, 2),
        "mean_bias_knots": round(bias, 2),
        "sample_count": int(len(t)),
    }


def evaluate_classification(
    y_true_classes: np.ndarray,  # (N,)
    y_pred_classes: np.ndarray,  # (N,)
    num_classes: int = 7,
) -> Dict[str, Any]:
    """Calculate multiclass classification metrics and confusion matrix."""
    t = y_true_classes.flatten()
    p = y_pred_classes.flatten()
    if len(t) == 0:
        return {"accuracy": 0.0, "macro_f1": 0.0, "precision": 0.0, "recall": 0.0, "confusion_matrix": []}

    acc = float(accuracy_score(t, p))
    precision, recall, f1, _ = precision_recall_fscore_support(
        t, p, average="macro", zero_division=0
    )
    cm = confusion_matrix(t, p, labels=list(range(num_classes))).tolist()

    return {
        "accuracy": round(acc, 4),
        "macro_precision": round(float(precision), 4),
        "macro_recall": round(float(recall), 4),
        "macro_f1": round(float(f1), 4),
        "confusion_matrix": cm,
        "sample_count": int(len(t)),
    }


def run_full_benchmark_comparison(
    y_true_coords: np.ndarray,
    y_true_wind: np.ndarray,
    persistence_coords: np.ndarray,
    persistence_wind: np.ndarray,
    linear_coords: np.ndarray,
    linear_wind: np.ndarray,
    cnn_coords: Optional[np.ndarray],
    cnn_wind: np.ndarray,
    convlstm_coords: np.ndarray,
    convlstm_wind: np.ndarray,
) -> Dict[str, Any]:
    """
    Run honest, un-fabricated scientific comparison across all baselines and models.
    Produces machine-readable metrics dictionary.
    """
    results = {}

    # 1. Persistence Baseline
    p_track = evaluate_trajectory_predictions(y_true_coords, persistence_coords)
    p_int = evaluate_intensity_regression(y_true_wind, persistence_wind)
    results["persistence_baseline"] = {
        "model_name": "Persistence Baseline",
        "mean_track_error_km": p_track["mean_track_error_km"],
        "intensity_mae_knots": p_int["mae_knots"],
        "intensity_rmse_knots": p_int["rmse_knots"],
        "description": "Assumes zero change in motion vector and intensity from current observation.",
    }

    # 2. Linear Extrapolation Baseline
    l_track = evaluate_trajectory_predictions(y_true_coords, linear_coords)
    l_int = evaluate_intensity_regression(y_true_wind, linear_wind)
    results["linear_extrapolation_baseline"] = {
        "model_name": "Linear Kinematic Extrapolation",
        "mean_track_error_km": l_track["mean_track_error_km"],
        "intensity_mae_knots": l_int["mae_knots"],
        "intensity_rmse_knots": l_int["rmse_knots"],
        "description": "Projects velocity vector computed over the previous 6-hour interval.",
    }

    # 3. Spatial CNN Only Baseline
    if cnn_coords is not None:
        c_track = evaluate_trajectory_predictions(y_true_coords, cnn_coords)
        c_int = evaluate_intensity_regression(y_true_wind, cnn_wind)
        results["spatial_cnn_baseline"] = {
            "model_name": "Spatial CNN Only",
            "mean_track_error_km": c_track["mean_track_error_km"],
            "intensity_mae_knots": c_int["mae_knots"],
            "intensity_rmse_knots": c_int["rmse_knots"],
            "description": "Single-frame spatial feature extractor without temporal memory.",
        }

    # 4. Spatiotemporal ConvLSTM Model
    cl_track = evaluate_trajectory_predictions(y_true_coords, convlstm_coords)
    cl_int = evaluate_intensity_regression(y_true_wind, convlstm_wind)
    results["convlstm_spatiotemporal"] = {
        "model_name": "ConvLSTM Spatiotemporal Net (Proposed)",
        "mean_track_error_km": cl_track["mean_track_error_km"],
        "intensity_mae_knots": cl_int["mae_knots"],
        "intensity_rmse_knots": cl_int["rmse_knots"],
        "description": "Recurrent spatiotemporal model learning rotational dynamics and kinematic drift.",
    }

    return results
