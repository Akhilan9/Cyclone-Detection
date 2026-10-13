"""
Report Generation & Download API Endpoints.
Supports research-grade PDF and CSV report downloads.
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.db_models import ReportModel, CycloneModel
from backend.app.schemas.schemas import ReportRead, ReportCreateRequest
from backend.app.services.cyclone_service import CycloneService
from backend.app.services.inference_service import InferenceEngine
from backend.app.services.report_service import ReportService

router = APIRouter()


@router.get("/reports", response_model=List[ReportRead])
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all generated analysis reports."""
    return db.query(ReportModel).order_by(ReportModel.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/reports", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(
    request: ReportCreateRequest,
    db: Session = Depends(get_db),
):
    """Generate a new PDF or CSV evaluation report for a cyclone."""
    cyclone = CycloneService.get_cyclone_by_id(db, request.cyclone_id)
    if not cyclone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cyclone '{request.cyclone_id}' was not found.",
        )

    pts = cyclone.track_points
    if request.report_type == "csv":
        report_record = ReportService.generate_csv_report(
            cyclone=cyclone,
            track_points=pts,
            prediction_run_id=request.prediction_run_id,
        )
    else:
        # For PDF report, optionally include forecast analysis if available
        engine = InferenceEngine.get_instance()
        analysis_data = None
        if engine.models_loaded and pts:
            past_coords = [[p.latitude, p.longitude] for p in pts]
            past_winds = [p.wind_speed_kts or 35.0 for p in pts]
            fc = engine.forecast_track_and_intensity(
                past_coords=past_coords,
                past_winds=past_winds,
                forecast_horizon_hours=24,
                latest_timestamp_str=pts[-1].timestamp_utc,
            )
            analysis_data = {"track_forecast": fc}

        report_record = ReportService.generate_pdf_report(
            cyclone=cyclone,
            track_points=pts,
            analysis_data=analysis_data,
            prediction_run_id=request.prediction_run_id,
        )

    db.add(report_record)
    db.commit()
    db.refresh(report_record)
    return report_record


@router.get("/reports/{report_id}", response_model=ReportRead)
def get_report_metadata(
    report_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve metadata of a specific report."""
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' was not found.",
        )
    return report


@router.get("/reports/{report_id}/download")
def download_report_file(
    report_id: str,
    db: Session = Depends(get_db),
):
    """Download generated PDF or CSV report file."""
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' was not found.",
        )

    if not os.path.exists(report.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report file on disk was not found for ID '{report_id}'.",
        )

    media_type = "application/pdf" if report.report_type == "pdf" else "text/csv"
    filename = os.path.basename(report.file_path)

    return FileResponse(
        path=report.file_path,
        media_type=media_type,
        filename=filename,
    )
