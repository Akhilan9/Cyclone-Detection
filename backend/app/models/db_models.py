"""
Database Models for Tropical Cyclone Historical Observations, Predictions, and Reports.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from backend.app.db.base import Base


class CycloneModel(Base):
    """Historical cyclone metadata."""

    __tablename__ = "cyclones"

    cyclone_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(64), nullable=False, index=True)
    season_year = Column(Integer, nullable=False, index=True)
    basin = Column(String(64), default="North Indian Ocean")
    subbasin = Column(String(64), default="Bay of Bengal")
    nature = Column(String(32), default="Tropical")
    max_wind_speed_kts = Column(Float, nullable=True)
    min_central_pressure_hpa = Column(Float, nullable=True)
    highest_imd_stage = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    track_points = relationship(
        "TrackPointModel",
        back_populates="cyclone",
        cascade="all, delete-orphan",
        order_by="TrackPointModel.timestamp_utc",
    )


class TrackPointModel(Base):
    """Synoptic track observation points."""

    __tablename__ = "track_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cyclone_id = Column(String(64), ForeignKey("cyclones.cyclone_id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp_utc = Column(String(32), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    wind_speed_kts = Column(Float, nullable=True)
    central_pressure_hpa = Column(Float, nullable=True)
    imd_stage = Column(String(64), nullable=True)
    image_path = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    cyclone = relationship("CycloneModel", back_populates="track_points")


class PredictionRunModel(Base):
    """Audit log of prediction/inference runs."""

    __tablename__ = "prediction_runs"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    model_id = Column(String(64), nullable=False)
    model_version = Column(String(32), default="v1.0")
    forecast_horizon_hours = Column(Integer, default=6)
    input_type = Column(String(32), default="satellite_image")
    cyclone_id = Column(String(64), nullable=True)
    status = Column(String(32), default="completed")  # 'completed', 'failed'
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Float, default=0.0)

    results = relationship("PredictionResultModel", back_populates="run", cascade="all, delete-orphan")


class PredictionResultModel(Base):
    """Detailed outputs produced by a prediction run."""

    __tablename__ = "prediction_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_run_id = Column(String(64), ForeignKey("prediction_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    cyclone_id = Column(String(64), nullable=True)
    target_timestamp_utc = Column(String(32), nullable=True)
    predicted_latitude = Column(Float, nullable=True)
    predicted_longitude = Column(Float, nullable=True)
    predicted_wind_kts = Column(Float, nullable=True)
    predicted_imd_stage = Column(String(64), nullable=True)
    presence_probability = Column(Float, nullable=True)
    track_error_km = Column(Float, nullable=True)

    run = relationship("PredictionRunModel", back_populates="results")


class ReportModel(Base):
    """Stored report metadata."""

    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(128), nullable=False)
    cyclone_id = Column(String(64), nullable=True)
    prediction_run_id = Column(String(64), nullable=True)
    report_type = Column(String(16), nullable=False)  # 'pdf', 'csv'
    file_path = Column(String(256), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
