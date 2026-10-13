"""
Pydantic Schemas for API Requests, Responses, and Validations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# Track Points
class TrackPointRead(BaseModel):
    id: int
    cyclone_id: str
    timestamp_utc: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    wind_speed_kts: Optional[float] = None
    central_pressure_hpa: Optional[float] = None
    imd_stage: Optional[str] = None
    image_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Cyclones
class CycloneRead(BaseModel):
    cyclone_id: str
    name: str
    season_year: int
    basin: str
    subbasin: str
    nature: str
    max_wind_speed_kts: Optional[float] = None
    min_central_pressure_hpa: Optional[float] = None
    highest_imd_stage: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CycloneDetail(CycloneRead):
    track_points: List[TrackPointRead] = []

    model_config = ConfigDict(from_attributes=True)


# Prediction Requests & Responses
class DetectionRequest(BaseModel):
    image_base64: Optional[str] = None
    sample_preset: Optional[str] = None  # e.g., 'fani_eye', 'biparjoy_developing'


class DetectionResponse(BaseModel):
    presence_probability: float = Field(..., ge=0.0, le=1.0)
    is_cyclone_detected: bool
    confidence_level: str
    feature_summary: Dict[str, Any] = {}
    timestamp_utc: str


class ClassificationRequest(BaseModel):
    image_base64: Optional[str] = None
    cyclone_id: Optional[str] = None


class ClassificationResponse(BaseModel):
    predicted_category: str
    category_index: int
    category_probabilities: Dict[str, float]
    estimated_wind_speed_kts: float
    timestamp_utc: str


class IntensityRequest(BaseModel):
    cyclone_id: Optional[str] = None
    current_wind_speed_kts: Optional[float] = Field(None, ge=10.0, le=200.0)
    current_pressure_hpa: Optional[float] = Field(None, ge=870.0, le=1025.0)
    forecast_horizon_hours: int = Field(6, ge=6, le=72)


class IntensityResponse(BaseModel):
    cyclone_id: Optional[str] = None
    forecast_horizon_hours: int
    current_intensity_kts: float
    predicted_intensity_kts: float
    intensity_delta_kts: float
    predicted_imd_stage: str
    prediction_interval_kts: List[float] = []
    timestamp_utc: str


class TrackForecastRequest(BaseModel):
    cyclone_id: Optional[str] = None
    sequence_length: int = Field(4, ge=2, le=12)
    forecast_horizon_hours: int = Field(6, ge=6, le=48)
    historical_coordinates: Optional[List[List[float]]] = None  # List of [lat, lon]
    historical_winds: Optional[List[float]] = None


class PredictedTrackPoint(BaseModel):
    step_hours: int
    forecast_timestamp_utc: str
    predicted_latitude: float
    predicted_longitude: float
    predicted_wind_kts: float
    predicted_imd_stage: str
    uncertainty_radius_km: float


class TrackForecastResponse(BaseModel):
    cyclone_id: Optional[str] = None
    forecast_horizon_hours: int
    current_coordinates: List[float]
    predicted_coordinates: List[float]
    projected_track: List[PredictedTrackPoint]
    model_name: str
    timestamp_utc: str


class CycloneAnalysisRequest(BaseModel):
    cyclone_id: str
    forecast_horizon_hours: int = Field(6, ge=6, le=48)
    include_satellite_features: bool = True


class CycloneAnalysisResponse(BaseModel):
    cyclone_id: str
    cyclone_name: str
    analysis_timestamp_utc: str
    detection: DetectionResponse
    classification: ClassificationResponse
    intensity: IntensityResponse
    track_forecast: TrackForecastResponse
    historical_points: List[TrackPointRead]
    prediction_run_id: str


class PredictionResultRead(BaseModel):
    id: int
    prediction_run_id: str
    cyclone_id: Optional[str] = None
    target_timestamp_utc: Optional[str] = None
    predicted_latitude: Optional[float] = None
    predicted_longitude: Optional[float] = None
    predicted_wind_kts: Optional[float] = None
    predicted_imd_stage: Optional[str] = None
    presence_probability: Optional[float] = None
    track_error_km: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class PredictionRunRead(BaseModel):
    id: str
    timestamp_utc: datetime
    model_id: str
    model_version: str
    forecast_horizon_hours: int
    input_type: str
    cyclone_id: Optional[str] = None
    status: str
    latency_ms: float
    results: List[PredictionResultRead] = []

    model_config = ConfigDict(from_attributes=True)


# Status & System Responses
class SystemStatusResponse(BaseModel):
    status: str
    version: str
    environment: str
    database_connected: bool
    models_ready: bool
    available_models_count: int
    total_cyclones_in_db: int
    total_track_points: int
    timestamp_utc: str


class ModelMetadataItem(BaseModel):
    model_id: str
    name: str
    architecture: str
    task: str
    status: str
    framework: Optional[str] = None
    training_date: Optional[str] = None


class ModelsListResponse(BaseModel):
    models: List[ModelMetadataItem]
    active_spatial_model: str
    active_temporal_model: str


class DataSourceItem(BaseModel):
    id: str
    name: str
    organization: str
    basin: str
    access: str
    url: str
    format: str
    status: str


class DataSourcesResponse(BaseModel):
    sources: List[DataSourceItem]
    total_sources: int


class EvaluationMetricsResponse(BaseModel):
    dataset_split: Dict[str, Any]
    classification_metrics: Dict[str, Any]
    benchmark_comparison: Dict[str, Any]
    forecast_horizon_hours: int
    input_window_hours: int


# Reports
class ReportCreateRequest(BaseModel):
    title: str
    cyclone_id: str
    prediction_run_id: Optional[str] = None
    report_type: str = Field("pdf", pattern="^(pdf|csv)$")


class ReportRead(BaseModel):
    id: str
    title: str
    cyclone_id: Optional[str] = None
    prediction_run_id: Optional[str] = None
    report_type: str
    file_size_bytes: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
