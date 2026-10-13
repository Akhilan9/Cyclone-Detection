"""
System Status Endpoint.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.db_models import CycloneModel, TrackPointModel
from backend.app.schemas.schemas import SystemStatusResponse
from backend.app.services.inference_service import InferenceEngine

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    """Return health, environment, database counts, and model readiness status."""
    db_connected = False
    total_cyclones = 0
    total_tracks = 0
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
        total_cyclones = db.query(CycloneModel).count()
        total_tracks = db.query(TrackPointModel).count()
    except Exception:
        db_connected = False

    engine = InferenceEngine.get_instance()
    models_ready = engine.models_loaded

    return SystemStatusResponse(
        status="operational",
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        database_connected=db_connected,
        models_ready=models_ready,
        available_models_count=4 if models_ready else 2,
        total_cyclones_in_db=total_cyclones,
        total_track_points=total_tracks,
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
    )
