import json
import os
import time
from fastapi import APIRouter, HTTPException, status
import httpx

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


@router.get("/data/sources/{source_id}/ping")
async def ping_data_source(source_id: str):
    """
    Execute real HTTP round-trip ping to authoritative meteorological data provider.
    Measures genuine DNS resolution, TCP handshake, and HTTP response latency in milliseconds.
    """
    sources_path = os.path.join(settings.DATA_DIR, "data_sources.json")
    target_url = None
    if os.path.exists(sources_path):
        with open(sources_path, "r") as f:
            data = json.load(f)
            for s in data.get("data_sources", []):
                if s["id"] == source_id:
                    target_url = s["url"]
                    break

    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data source '{source_id}' not found in registry.",
        )

    t0 = time.perf_counter()
    status_ok = True
    status_code = 200

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CycloVision-Monitor/1.0"}
    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True, verify=False) as client:
            try:
                res = await client.head(target_url, headers=headers)
                status_code = res.status_code
                status_ok = res.status_code < 400
            except Exception:
                res = await client.get(target_url, headers={**headers, "Range": "bytes=0-100"})
                status_code = res.status_code
                status_ok = res.status_code < 400
    except Exception as e:
        status_ok = False
        status_code = 503

    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    return {
        "source_id": source_id,
        "url": target_url,
        "ok": status_ok,
        "status_code": status_code,
        "latency_ms": latency_ms,
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
