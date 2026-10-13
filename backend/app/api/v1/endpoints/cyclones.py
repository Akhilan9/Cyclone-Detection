"""
Cyclones & Historical Tracks API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.schemas import CycloneRead, CycloneDetail
from backend.app.services.cyclone_service import CycloneService

router = APIRouter()


@router.get("/cyclones", response_model=List[CycloneRead])
def list_cyclones(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    season_year: Optional[int] = Query(None, ge=1900, le=2100),
    db: Session = Depends(get_db),
):
    """Retrieve list of historical tropical cyclones."""
    cyclones = CycloneService.get_all_cyclones(db, skip=skip, limit=limit, season_year=season_year)
    return cyclones


@router.get("/cyclones/{cyclone_id}", response_model=CycloneDetail)
def get_cyclone_details(
    cyclone_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve complete metadata and chronological track points for a cyclone."""
    cyclone = CycloneService.get_cyclone_by_id(db, cyclone_id=cyclone_id)
    if not cyclone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cyclone with identifier '{cyclone_id}' was not found in database.",
        )
    return cyclone
