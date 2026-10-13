"""
Evaluation Metrics & Benchmark Comparison Endpoint.
"""

import json
import os
from fastapi import APIRouter, HTTPException, status
from backend.app.core.config import settings
from backend.app.schemas.schemas import EvaluationMetricsResponse

router = APIRouter()


@router.get("/metrics", response_model=EvaluationMetricsResponse)
def get_model_evaluation_metrics():
    """Retrieve verified evaluation metrics and benchmark comparisons across held-out test cyclones."""
    metrics_file = os.path.join(settings.ML_MODELS_DIR, "evaluation_metrics.json")
    if not os.path.exists(metrics_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verified model evaluation metrics found. Please execute the training and evaluation pipeline.",
        )

    with open(metrics_file, "r") as f:
        data = json.load(f)

    return EvaluationMetricsResponse(
        dataset_split=data.get("dataset_split", {}),
        classification_metrics=data.get("classification_metrics", {}),
        benchmark_comparison=data.get("benchmark_comparison", {}),
        forecast_horizon_hours=data.get("forecast_horizon_hours", 6),
        input_window_hours=data.get("input_window_hours", 24),
    )
