"""
API v1 Router Inclusion.
"""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    status,
    models,
    data_sources,
    cyclones,
    predictions,
    metrics,
    reports,
    satellite,
    tracks,
    active_cyclones,
    scanner,
)

api_router = APIRouter()

api_router.include_router(status.router, tags=["System Status"])
api_router.include_router(models.router, tags=["Models"])
api_router.include_router(data_sources.router, tags=["Data Sources"])
api_router.include_router(cyclones.router, tags=["Cyclones & Tracks"])
api_router.include_router(tracks.router, tags=["IBTrACS Tracks"])
api_router.include_router(active_cyclones.router, tags=["Active Cyclones (Live)"])
api_router.include_router(scanner.router, tags=["Satellite Cyclone Scanner & Early Warning"])
api_router.include_router(predictions.router, tags=["Predictions & Inference"])
api_router.include_router(metrics.router, tags=["Model Metrics & Evaluation"])
api_router.include_router(reports.router, tags=["Reports"])
api_router.include_router(satellite.router, tags=["Satellite Imagery"])
