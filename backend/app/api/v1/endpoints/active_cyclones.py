"""
Active Cyclones API Endpoint.
Provides real-time active tropical cyclone data from JTWC, NHC, and IMD feeds.
"""

from typing import List
from fastapi import APIRouter, Query

from backend.app.services.active_cyclones_service import (
    ActiveCyclone,
    get_active_cyclones,
)

router = APIRouter()


@router.get("/active-cyclones", response_model=List[ActiveCyclone])
async def list_active_cyclones(
    force_refresh: bool = Query(False, description="Force re-fetch from upstream sources bypassing cache"),
):
    """
    Retrieve currently active tropical cyclones worldwide from live meteorological feeds.

    Sources aggregated:
    - **JTWC** (Joint Typhoon Warning Center) – Western Pacific, Indian Ocean
    - **NOAA NHC** (National Hurricane Center) – Atlantic, Eastern Pacific
    - **IMD RSMC** (India Meteorological Department) – North Indian Ocean

    Results are cached for 5 minutes to avoid excessive upstream requests.
    """
    return await get_active_cyclones(force_refresh=force_refresh)
