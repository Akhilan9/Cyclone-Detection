"""
Data Sources Metadata Endpoint.
"""

import json
import os
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.schemas.schemas import DataSourcesResponse, DataSourceItem

router = APIRouter()


@router.get("/data/sources", response_model=DataSourcesResponse)
def get_data_sources():
    """Retrieve catalog of authoritative data sources (NOAA, IMD, INSAT-3D, fixtures)."""
    sources_path = os.path.join(settings.DATA_DIR, "data_sources.json")
    if os.path.exists(sources_path):
        with open(sources_path, "r") as f:
            data = json.load(f)
            sources = [
                DataSourceItem(
                    id=s["id"],
                    name=s["name"],
                    organization=s["organization"],
                    basin=s["basin"],
                    access=s["access"],
                    url=s["url"],
                    format=s["format"],
                    status=s["status"],
                )
                for s in data.get("data_sources", [])
            ]
            return DataSourcesResponse(sources=sources, total_sources=len(sources))

    return DataSourcesResponse(sources=[], total_sources=0)
