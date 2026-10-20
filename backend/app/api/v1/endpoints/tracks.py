"""
Track Information API Endpoint (IBTrACS Data Layer).
Provides verified historical and current cyclone track trajectories,
geographic coordinates, observation timestamps, sustained wind, and pressure values.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.schemas import CycloneRead, CycloneDetail, TrackPointRead
from backend.app.services.cyclone_service import CycloneService

router = APIRouter()


@router.get("/tracks", response_model=List[CycloneRead])
def list_cyclone_tracks(db: Session = Depends(get_db)):
    """Retrieve list of all tracked cyclones with baseline IBTrACS parameters."""
    return CycloneService.get_all_cyclones(db)


@router.get("/tracks/{cyclone_id}", response_model=CycloneDetail)
def get_cyclone_track_detail(cyclone_id: str, db: Session = Depends(get_db)):
    """Retrieve complete chronological IBTrACS track points (lat, lon, time, wind, pressure)."""
    cyclone = CycloneService.get_cyclone_by_id(db, cyclone_id)
    if not cyclone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Track record for cyclone ID '{cyclone_id}' was not found in IBTrACS database.",
        )
    return cyclone


@router.get("/tracks/{cyclone_id}/points", response_model=List[TrackPointRead])
def get_track_points_only(cyclone_id: str, db: Session = Depends(get_db)):
    """Retrieve only the coordinate sequence and meteorological parameters for map plotting."""
    cyclone = CycloneService.get_cyclone_by_id(db, cyclone_id)
    if not cyclone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cyclone '{cyclone_id}' not found.",
        )
    return cyclone.track_points
