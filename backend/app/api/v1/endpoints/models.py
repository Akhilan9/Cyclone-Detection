"""
Model Metadata & Registry Endpoint.
"""

import json
import os
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.schemas.schemas import ModelsListResponse, ModelMetadataItem
from backend.app.services.inference_service import InferenceEngine

router = APIRouter()


@router.get("/models", response_model=ModelsListResponse)
def get_available_models():
    """Retrieve catalog of machine learning models and baselines."""
    meta_path = os.path.join(settings.ML_MODELS_DIR, "model_metadata.json")
    models = []
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            data = json.load(f)
            models = [ModelMetadataItem(**item) for item in data.get("models", [])]
    else:
        engine = InferenceEngine.get_instance()
        status_str = "ready" if engine.models_loaded else "uninitialized"
        models = [
            ModelMetadataItem(
                model_id="cnn_spatial_v1",
                name="Spatial Feature Extractor & Intensity Classifier",
                architecture="CNN Multi-Head",
                task="Presence Detection & IMD Intensity Stage Classification",
                status=status_str,
            ),
            ModelMetadataItem(
                model_id="convlstm_spatiotemporal_v1",
                name="ConvLSTM Spatiotemporal Trajectory & Intensity Forecaster",
                architecture="ConvLSTM + Kinematic Fusion",
                task="+6h to +24h Trajectory & Intensity Forecasting",
                status=status_str,
            ),
            ModelMetadataItem(
                model_id="baseline_persistence",
                name="Persistence Kinematic Baseline",
                architecture="Rule-based Persistence",
                task="Benchmark Comparison",
                status="ready",
            ),
            ModelMetadataItem(
                model_id="baseline_linear",
                name="Linear Velocity Extrapolation Baseline",
                architecture="Kinematic Extrapolation",
                task="Benchmark Comparison",
                status="ready",
            ),
        ]

    return ModelsListResponse(
        models=models,
        active_spatial_model="cnn_spatial_v1",
        active_temporal_model="convlstm_spatiotemporal_v1",
    )
