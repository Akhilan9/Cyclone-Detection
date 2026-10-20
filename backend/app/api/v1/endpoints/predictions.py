"""
Inference & Prediction Endpoints.
Covers Detection, Classification, Intensity Forecasting, Track Prediction, Full Analysis, and Audit Retrieval.
"""

from datetime import datetime, timezone
import time
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.db_models import PredictionRunModel, PredictionResultModel, CycloneModel
from backend.app.schemas.schemas import (
    DetectionRequest,
    DetectionResponse,
    ClassificationRequest,
    ClassificationResponse,
    IntensityRequest,
    IntensityResponse,
    TrackForecastRequest,
    TrackForecastResponse,
    CycloneAnalysisRequest,
    CycloneAnalysisResponse,
    PredictionRunRead,
    GradCAMRequest,
    GradCAMResponse,
    UploadAnalyzeRequest,
    UploadAnalyzeResponse,
    LandfallHazardRequest,
    LandfallHazardResponse,
    RapidIntensificationResponse,
)
from backend.app.services.cyclone_service import CycloneService
from backend.app.services.inference_service import InferenceEngine
from backend.app.services.satellite_service import SatelliteService
from backend.app.services.ri_service import RapidIntensificationService

router = APIRouter()


@router.post("/predictions/detect", response_model=DetectionResponse)
def detect_cyclone(request: DetectionRequest):
    """Detect presence of tropical cyclone convective pattern in satellite imagery."""
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained Spatial CNN model checkpoint is not loaded. Please train or initialize models.",
        )
    img_array = engine.decode_image_input(request.image_base64, request.sample_preset)
    result = engine.detect_presence(img_array)
    return DetectionResponse(**result)


@router.post("/predictions/classify", response_model=ClassificationResponse)
def classify_cyclone_intensity(
    request: ClassificationRequest,
    db: Session = Depends(get_db),
):
    """Classify cyclone into one of 7 IMD intensity stages."""
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained Spatial CNN model checkpoint is not loaded.",
        )

    preset = None
    if request.cyclone_id:
        cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
        if cyclone:
            preset = cyclone.name.lower()

    img_array = engine.decode_image_input(request.image_base64, preset=preset)
    result = engine.classify_category(img_array)
    return ClassificationResponse(**result)


@router.post("/predictions/intensity", response_model=IntensityResponse)
def forecast_cyclone_intensity(
    request: IntensityRequest,
    db: Session = Depends(get_db),
):
    """Predict future maximum sustained wind speed (knots) and IMD stage at forecast horizon."""
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained forecasting model is not available.",
        )

    current_wind = request.current_wind_speed_kts
    past_coords = []
    past_winds = []

    if request.cyclone_id:
        cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
        if cyclone and cyclone.track_points:
            pts = cyclone.track_points
            past_coords = [[p.latitude, p.longitude] for p in pts]
            past_winds = [p.wind_speed_kts or 35.0 for p in pts]
            if current_wind is None and past_winds:
                current_wind = past_winds[-1]

    if current_wind is None:
        current_wind = 45.0
        past_coords = [[15.0, 85.0], [15.4, 85.2], [15.9, 85.5], [16.5, 85.8]]
        past_winds = [35.0, 40.0, 45.0, 45.0]

    fc_result = engine.forecast_track_and_intensity(
        past_coords=past_coords,
        past_winds=past_winds,
        forecast_horizon_hours=request.forecast_horizon_hours,
    )
    final_step = fc_result["projected_track"][-1]
    pred_wind = final_step["predicted_wind_kts"]

    return IntensityResponse(
        cyclone_id=request.cyclone_id,
        forecast_horizon_hours=request.forecast_horizon_hours,
        current_intensity_kts=round(current_wind, 1),
        predicted_intensity_kts=round(pred_wind, 1),
        intensity_delta_kts=round(pred_wind - current_wind, 1),
        predicted_imd_stage=final_step["predicted_imd_stage"],
        prediction_interval_kts=[round(pred_wind - 8.0, 1), round(pred_wind + 8.0, 1)],
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/predictions/track", response_model=TrackForecastResponse)
def forecast_cyclone_track(
    request: TrackForecastRequest,
    db: Session = Depends(get_db),
):
    """Spatiotemporally forecast cyclone trajectory coordinates."""
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained ConvLSTM model is not available.",
        )

    past_coords = request.historical_coordinates
    past_winds = request.historical_winds
    latest_time_str = None

    if request.cyclone_id and not past_coords:
        cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
        if cyclone and cyclone.track_points:
            pts = cyclone.track_points
            past_coords = [[p.latitude, p.longitude] for p in pts]
            past_winds = [p.wind_speed_kts or 35.0 for p in pts]
            latest_time_str = pts[-1].timestamp_utc

    if not past_coords:
        past_coords = [[14.0, 85.0], [14.6, 85.3], [15.3, 85.8], [16.1, 86.2]]
        past_winds = [35.0, 45.0, 55.0, 65.0]

    fc = engine.forecast_track_and_intensity(
        past_coords=past_coords,
        past_winds=past_winds or [45.0] * len(past_coords),
        forecast_horizon_hours=request.forecast_horizon_hours,
        latest_timestamp_str=latest_time_str,
    )
    return TrackForecastResponse(cyclone_id=request.cyclone_id, **fc)


@router.post("/predictions/analyze", response_model=CycloneAnalysisResponse)
def analyze_cyclone_comprehensively(
    request: CycloneAnalysisRequest,
    db: Session = Depends(get_db),
):
    """End-to-end multi-task analysis executing spatial detection, classification, and spatiotemporal forecasting."""
    start_time = time.time()
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained models are not loaded. Run model training pipeline first.",
        )

    cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
    if not cyclone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cyclone '{request.cyclone_id}' was not found.",
        )

    pts = cyclone.track_points
    if not pts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cyclone '{cyclone.name}' has no recorded track points to analyze.",
        )

    past_coords = [[p.latitude, p.longitude] for p in pts]
    past_winds = [p.wind_speed_kts or 35.0 for p in pts]
    latest_pt = pts[-1]

    # Ingest real NASA satellite imagery (Thermal IR Band 31) if available, with physical pattern fallback
    real_sat_path = SatelliteService.get_real_satellite_image_path(cyclone.cyclone_id, "tir")
    if real_sat_path:
        img_array = SatelliteService.load_preprocessed_tensor(cyclone.cyclone_id)
    else:
        img_array = engine.seq_builder._generate_vortex_pattern(
            lat=latest_pt.latitude,
            lon=latest_pt.longitude,
            wind_kts=latest_pt.wind_speed_kts or 45.0,
        )

    # 1. Detection
    detect_res = engine.detect_presence(img_array)
    # 2. Classification
    class_res = engine.classify_category(img_array)
    # 3. Trajectory & Intensity
    track_fc = engine.forecast_track_and_intensity(
        past_coords=past_coords,
        past_winds=past_winds,
        forecast_horizon_hours=request.forecast_horizon_hours,
        latest_timestamp_str=latest_pt.timestamp_utc,
    )

    final_fc_step = track_fc["projected_track"][-1]
    int_res = IntensityResponse(
        cyclone_id=cyclone.cyclone_id,
        forecast_horizon_hours=request.forecast_horizon_hours,
        current_intensity_kts=round(past_winds[-1], 1),
        predicted_intensity_kts=final_fc_step["predicted_wind_kts"],
        intensity_delta_kts=round(final_fc_step["predicted_wind_kts"] - past_winds[-1], 1),
        predicted_imd_stage=final_fc_step["predicted_imd_stage"],
        prediction_interval_kts=[
            round(final_fc_step["predicted_wind_kts"] - 7.5, 1),
            round(final_fc_step["predicted_wind_kts"] + 7.5, 1),
        ],
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
    )

    latency = round((time.time() - start_time) * 1000, 2)

    # Persist Prediction Run
    run_id = str(uuid.uuid4())
    run_record = PredictionRunModel(
        id=run_id,
        model_id="convlstm_spatial_ensemble_v1",
        model_version="1.0.0",
        forecast_horizon_hours=request.forecast_horizon_hours,
        input_type="multi_source_sequence",
        cyclone_id=cyclone.cyclone_id,
        status="completed",
        latency_ms=latency,
    )
    db.add(run_record)

    result_record = PredictionResultModel(
        prediction_run_id=run_id,
        cyclone_id=cyclone.cyclone_id,
        target_timestamp_utc=final_fc_step["forecast_timestamp_utc"],
        predicted_latitude=final_fc_step["predicted_latitude"],
        predicted_longitude=final_fc_step["predicted_longitude"],
        predicted_wind_kts=final_fc_step["predicted_wind_kts"],
        predicted_imd_stage=final_fc_step["predicted_imd_stage"],
        presence_probability=detect_res["presence_probability"],
    )
    db.add(result_record)
    db.commit()

    sat_preview = SatelliteService.get_base64_satellite_preview(cyclone.cyclone_id)

    return CycloneAnalysisResponse(
        cyclone_id=cyclone.cyclone_id,
        cyclone_name=cyclone.name,
        analysis_timestamp_utc=datetime.now(timezone.utc).isoformat(),
        detection=DetectionResponse(**detect_res),
        classification=ClassificationResponse(**class_res),
        intensity=int_res,
        track_forecast=TrackForecastResponse(cyclone_id=cyclone.cyclone_id, **track_fc),
        historical_points=pts,
        prediction_run_id=run_id,
        satellite_imagery=sat_preview,
    )


@router.get("/predictions/{prediction_id}", response_model=PredictionRunRead)
def get_prediction_run(
    prediction_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve audit record and outputs of a previous prediction run."""
    run = db.query(PredictionRunModel).filter(PredictionRunModel.id == prediction_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction run with ID '{prediction_id}' was not found.",
        )
    return run


@router.post("/predictions/gradcam", response_model=GradCAMResponse)
def get_gradcam_attention(
    request: GradCAMRequest,
    db: Session = Depends(get_db),
):
    """
    Generate Explainable AI (Grad-CAM) saliency attention heatmap
    for spatial CNN feature visualization.
    """
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained Spatial CNN model checkpoint is not loaded.",
        )

    preset = None
    if request.cyclone_id:
        cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
        if cyclone:
            preset = cyclone.name.lower()

    img_array = engine.decode_image_input(request.image_base64, preset=preset)
    gradcam_res = engine.generate_gradcam(img_array, target_class=request.target_class)
    return GradCAMResponse(**gradcam_res)


@router.post("/predictions/upload-analyze", response_model=UploadAnalyzeResponse)
def analyze_custom_uploaded_image(request: UploadAnalyzeRequest):
    """
    Run full end-to-end AI detection, classification, wind speed estimation,
    and Explainable AI (Grad-CAM) on an arbitrary user-uploaded satellite image.
    """
    engine = InferenceEngine.get_instance()
    if not engine.models_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Trained AI models are not loaded.",
        )

    if not request.image_base64 or len(request.image_base64) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image payload. Please provide a valid base64-encoded satellite image.",
        )

    try:
        res = engine.analyze_uploaded_image(request.image_base64)
        return UploadAnalyzeResponse(
            is_cyclone_detected=res["is_cyclone_detected"],
            presence_probability=res["presence_probability"],
            predicted_category=res["predicted_category"],
            category_index=res["category_index"],
            category_probabilities=res["category_probabilities"],
            estimated_wind_speed_kts=res["estimated_wind_speed_kts"],
            estimated_pressure_hpa=res["estimated_pressure_hpa"],
            confidence=res["confidence"],
            gradcam=GradCAMResponse(**res["gradcam"]),
            eyewall_bounding_box=res["eyewall_bounding_box"],
            timestamp_utc=res["timestamp_utc"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error processing uploaded satellite image: {str(e)}",
        )


@router.post("/predictions/landfall-hazard", response_model=LandfallHazardResponse)
def get_coastal_landfall_hazard(
    request: LandfallHazardRequest,
    db: Session = Depends(get_db),
):
    """
    Compute projected coastal landfall sector, ETA, danger radii,
    and official IMD Disaster Warning color codes.
    """
    engine = InferenceEngine.get_instance()
    cyclone_name = request.cyclone_name or "Cyclone"
    curr_lat = request.current_latitude or 14.0
    curr_lon = request.current_longitude or 82.0
    pred_lat = request.predicted_latitude or (curr_lat + 1.2)
    pred_lon = request.predicted_longitude or (curr_lon - 1.5)
    wind_kts = request.wind_speed_kts or 65.0

    if request.cyclone_id:
        cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
        if cyclone:
            cyclone_name = cyclone.name
            if cyclone.track_points:
                last_pt = cyclone.track_points[-1]
                curr_lat = last_pt.latitude
                curr_lon = last_pt.longitude
                wind_kts = last_pt.wind_speed_kts or cyclone.max_wind_speed_kts or 65.0

    res = engine.compute_landfall_and_hazard(
        cyclone_name=cyclone_name,
        current_lat=curr_lat,
        current_lon=curr_lon,
        wind_speed_kts=wind_kts,
        predicted_lat=pred_lat,
        predicted_lon=pred_lon,
        forecast_hours=request.forecast_hours or 6,
    )
    return LandfallHazardResponse(**res)


@router.get("/predictions/rapid-intensification/{cyclone_id}", response_model=RapidIntensificationResponse)
def get_rapid_intensification_diagnostics(cyclone_id: str):
    """
    Evaluate Rapid Intensification (RI) risk, 24h wind surge threshold (+30 kts),
    central pressure drop rate, SST thermal energy, and operational alert protocol.
    """
    res = RapidIntensificationService.evaluate_cyclone_ri(cyclone_id)
    return RapidIntensificationResponse(**res)

