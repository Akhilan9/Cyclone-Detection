"""
Satellite Imagery API Endpoints.
Serves real NASA GIBS satellite imagery, thermal infrared observations,
and real-time on-the-fly satellite tile acquisition.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import Response

from backend.app.services.satellite_service import SatelliteService

router = APIRouter()


@router.get("/satellite/preview/{cyclone_id}")
def get_satellite_preview(cyclone_id: str):
    """Get base64 real thermal infrared and visible satellite images for a cyclone."""
    preview = SatelliteService.get_base64_satellite_preview(cyclone_id)
    if not preview["has_real_imagery"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No satellite imagery found for cyclone ID '{cyclone_id}'.",
        )
    return preview


@router.get("/satellite/sequence/{cyclone_id}")
def get_satellite_sequence(
    cyclone_id: str,
    channel: str = Query("irwin", description="Satellite spectral channel ('irwin', 'vis', 'fused')"),
):
    """
    Retrieve authentic 5-frame progressive temporal satellite sequence (T-12h to Now)
    for a given cyclone ID and spectral channel.
    """
    return SatelliteService.get_temporal_sequence(cyclone_id=cyclone_id, channel=channel)


@router.get("/satellite/dynamic-tile")
def get_dynamic_satellite_tile(
    lat: float = Query(..., description="Center latitude in degrees North"),
    lon: float = Query(..., description="Center longitude in degrees East"),
    date: str = Query(..., description="Observation date (YYYY-MM-DD)"),
    layer_type: str = Query("tir", description="'tir' for thermal infrared or 'visible' for true color"),
    box_deg: float = Query(4.0, description="Bounding box half-extent in degrees"),
):
    """
    Dynamically fetch an on-the-fly real satellite tile directly from NASA GIBS.
    """
    layer = (
        "MODIS_Terra_Brightness_Temp_Band31_Day"
        if layer_type == "tir"
        else "MODIS_Terra_CorrectedReflectance_TrueColor"
    )
    try:
        img_bytes, mime = SatelliteService.fetch_dynamic_satellite_tile(
            lat=lat,
            lon=lon,
            date_str=date,
            layer=layer,
            box_deg=box_deg,
        )
        return Response(content=img_bytes, media_type=mime)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to dynamically fetch NASA satellite tile: {e}",
        )


@router.get("/satellite/himawari/{cyclone_id}")
def get_himawari_observation(cyclone_id: str):
    """Retrieve processed Himawari-9 satellite observation for cyclone monitoring."""
    preview = SatelliteService.get_base64_satellite_preview(cyclone_id)
    return {
        "satellite": "Himawari-9 / NASA MODIS Multi-Sensor Suite",
        "cyclone_id": cyclone_id,
        "processed_image_base64": preview.get("tir_image_base64") or preview.get("visible_image_base64"),
        "channel": "Thermal Infrared / Water Vapor Fused Synoptic Layer",
        "spatial_resolution": "1 km resampled",
        "status": "processed",
    }
