"""
Cyclone Data Access & Query Service.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.db_models import CycloneModel, TrackPointModel


class CycloneService:
    @staticmethod
    def get_all_cyclones(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        season_year: Optional[int] = None,
    ) -> List[CycloneModel]:
        """Fetch all cyclone records with optional season filter and pagination."""
        query = db.query(CycloneModel)
        if season_year is not None:
            query = query.filter(CycloneModel.season_year == season_year)
        return query.order_by(CycloneModel.season_year.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_cyclone_by_id(db: Session, cyclone_id: str) -> Optional[CycloneModel]:
        """Fetch cyclone record and its ordered chronological track observations."""
        return db.query(CycloneModel).filter(CycloneModel.cyclone_id == cyclone_id).first()

    @staticmethod
    def get_cyclone_track_points(db: Session, cyclone_id: str) -> List[TrackPointModel]:
        """Fetch track points for a cyclone."""
        return (
            db.query(TrackPointModel)
            .filter(TrackPointModel.cyclone_id == cyclone_id)
            .order_by(TrackPointModel.timestamp_utc.asc())
            .all()
        )
