"""
Real-Time Satellite Cyclone Detection & Trajectory Prediction API.

Analyzes real-time infrared and multi-source satellite observations
to detect new cyclone formations, classify convective patterns and intensity,
predict trajectories, and output early warning bulletins.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.schemas import (
    NewCycloneDetectionRequest,
    NewCycloneDetectionResponse,
)
from backend.app.services.detection_scanner_service import (
    DetectionScannerService,
    SURVEILLANCE_SECTORS,
)
from backend.app.services.satellite_service import SatelliteService

router = APIRouter()


@router.get("/scanner/sectors")
def list_surveillance_sectors():
    """
    List active satellite surveillance sectors and monitoring sensors
    (INSAT-3DR, NASA MODIS, NOAA AVHRR, Himawari-9).
    """
    sectors = []
    for name, cfg in SURVEILLANCE_SECTORS.items():
        sectors.append({
            "sector_name": name,
            "basin": cfg["basin"],
            "subbasin": cfg["subbasin"],
            "satellite_source": cfg["default_satellite"],
            "sensor_band": cfg["sensor_band"],
            "center_coordinates": [cfg["center_lat"], cfg["center_lon"]],
            "target_coastal_zone": cfg["coastal_sector"],
            "status": "OPERATIONAL_STREAMING",
        })
    return {"sectors": sectors, "total": len(sectors)}


@router.post("/scanner/detect-new", response_model=NewCycloneDetectionResponse)
def detect_new_cyclone_and_predict_trajectory(
    request: NewCycloneDetectionRequest,
    db: Session = Depends(get_db),
):
    """
    Deep Learning Detection, Classification & Trajectory Prediction Pipeline:
    1. Ingests real-time or simulated thermal infrared satellite imagery.
    2. Runs Spatial CNN to detect cyclone formation / cyclogenesis.
    3. Classifies pattern (Curved Banding, CDO, Eye) and IMD intensity stage (D, DD, CS, SCS, etc.).
    4. Runs Spatiotemporal ConvLSTM to predict multi-step trajectory (+6h to +48h).
    5. Evaluates coastal landfall hazard & Rapid Intensification (RI) risk.
    6. Outputs Early Warning Decision Support Advisory & registers new storm.
    """
    try:
        return DetectionScannerService.scan_and_detect(request, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cyclone detection & prediction failed: {str(e)}",
        )


@router.post("/scanner/live-infrared-scan", response_model=NewCycloneDetectionResponse)
def scan_live_infrared_satellite(
    lat: float = Query(14.8, description="Center latitude of satellite scan region"),
    lon: float = Query(87.2, description="Center longitude of satellite scan region"),
    sector: str = Query("Bay of Bengal", description="Surveillance Sector"),
    register: bool = Query(True, description="Auto-register newly detected storm in database"),
    db: Session = Depends(get_db),
):
    """
    On-Demand Live Infrared Scan:
    Pulls real-time NASA GIBS MODIS Thermal Infrared Band 31 observation,
    runs the deep learning detector, and computes expected 48-hour ConvLSTM trajectory.
    """
    # Fetch real live tile if accessible
    image_b64 = None
    try:
        from datetime import datetime, timezone
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        img_bytes, _ = SatelliteService.fetch_dynamic_satellite_tile(
            lat=lat,
            lon=lon,
            date_str=today_str,
            layer="MODIS_Terra_Brightness_Temp_Band31_Day",
            box_deg=3.5,
        )
        import base64
        image_b64 = f"data:image/png;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
    except Exception:
        # Fall back to high-resolution physical synthesis if upstream GIBS latency is high
        image_b64 = None

    req = NewCycloneDetectionRequest(
        satellite_source="NASA GIBS MODIS Band 31 / INSAT-3DR TIR",
        basin="North Indian Ocean" if lon < 100 and lat > 0 else "Western Pacific",
        sector_name=sector,
        scan_coordinates=[lat, lon],
        image_base64=image_b64,
        forecast_horizon_hours=48,
        register_in_system=register,
    )

    return DetectionScannerService.scan_and_detect(req, db)
