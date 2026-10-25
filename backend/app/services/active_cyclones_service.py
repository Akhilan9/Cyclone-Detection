"""
Real-Time Active Cyclones Feed.
Aggregates live tropical cyclone data from public meteorological APIs and RSS feeds
(JTWC, NOAA/NHC, RSMC New Delhi) to provide current active storm information.
"""

import logging
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import httpx
from pydantic import BaseModel

logger = logging.getLogger("active_cyclones")


class ActiveCyclone(BaseModel):
    """Schema for a currently-active tropical cyclone."""
    storm_id: str
    name: str
    basin: str
    category: str
    latitude: float
    longitude: float
    max_wind_kts: float
    central_pressure_hpa: Optional[float] = None
    movement_dir: Optional[str] = None
    movement_speed_kts: Optional[float] = None
    source: str
    advisory_time_utc: str
    is_active: bool = True
    forecast_track: Optional[List[dict]] = None


# ─── Cache ──────────────────────────────────────────────────────────────────────
_cache: dict = {"data": [], "fetched_at": None, "ttl_seconds": 300}


async def _fetch_jtwc_active() -> List[ActiveCyclone]:
    """Fetch active tropical cyclone warnings from JTWC (Joint Typhoon Warning Center).
    Uses the JTWC ATCF best track / warning summary page."""
    results: List[ActiveCyclone] = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            # JTWC active tropical cyclone warnings (JSON summary)
            resp = await client.get(
                "https://www.metoc.navy.mil/jtwc/rss/jtwc.rss",
                headers={"User-Agent": "CycloFusion-Research/1.0"},
            )
            if resp.status_code == 200:
                text = resp.text
                # Parse RSS items for active tropical cyclone warnings
                items = re.findall(r"<item>(.*?)</item>", text, re.DOTALL)
                for item in items:
                    title_m = re.search(r"<title>(.*?)</title>", item)
                    desc_m = re.search(r"<description>(.*?)</description>", item, re.DOTALL)
                    if not title_m:
                        continue
                    title = title_m.group(1).strip()
                    desc = desc_m.group(1).strip() if desc_m else ""

                    # Extract storm name and basin from title
                    name_match = re.search(r"(?:Tropical\s+(?:Storm|Cyclone|Depression)|Typhoon|Hurricane|Super\s+Typhoon)\s+(\w+)", title, re.IGNORECASE)
                    storm_name = name_match.group(1).upper() if name_match else title[:20].upper()

                    # Try to extract lat/lon from description
                    latlon_match = re.search(r"(\d+\.?\d*)\s*([NS])\s+(\d+\.?\d*)\s*([EW])", desc)
                    lat, lon = 0.0, 0.0
                    if latlon_match:
                        lat = float(latlon_match.group(1)) * (1 if latlon_match.group(2) == 'N' else -1)
                        lon = float(latlon_match.group(3)) * (1 if latlon_match.group(4) == 'E' else -1)

                    wind_match = re.search(r"(\d+)\s*(?:KT|kts|knots)", desc)
                    wind = float(wind_match.group(1)) if wind_match else 0.0

                    basin = "Western Pacific"
                    if "Indian" in title or "IO" in title:
                        basin = "North Indian Ocean"
                    elif "Atlantic" in title or "AL" in title:
                        basin = "North Atlantic"

                    results.append(ActiveCyclone(
                        storm_id=f"JTWC_{storm_name}_{datetime.now(timezone.utc).strftime('%Y')}",
                        name=storm_name,
                        basin=basin,
                        category=title,
                        latitude=lat,
                        longitude=lon,
                        max_wind_kts=wind,
                        source="JTWC",
                        advisory_time_utc=datetime.now(timezone.utc).isoformat(),
                    ))
    except Exception as e:
        logger.warning(f"JTWC feed unavailable: {e}")

    return results


async def _fetch_nhc_active() -> List[ActiveCyclone]:
    """Fetch active Atlantic/Eastern Pacific storms from NOAA NHC GIS feed."""
    results: List[ActiveCyclone] = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(
                "https://www.nhc.noaa.gov/CurrentSummary.json",
                headers={"User-Agent": "CycloFusion-Research/1.0"},
            )
            if resp.status_code == 200:
                data = resp.json()
                for storm in data.get("activeStorms", []):
                    results.append(ActiveCyclone(
                        storm_id=storm.get("id", f"NHC_{storm.get('name', 'UNKNOWN')}"),
                        name=storm.get("name", "UNNAMED").upper(),
                        basin=storm.get("basin", "North Atlantic"),
                        category=storm.get("classification", "Tropical Storm"),
                        latitude=float(storm.get("lat", 0)),
                        longitude=float(storm.get("lon", 0)),
                        max_wind_kts=float(storm.get("intensity", 0)),
                        central_pressure_hpa=float(storm.get("pressure", 0)) or None,
                        movement_dir=storm.get("movementDir"),
                        movement_speed_kts=float(storm.get("movementSpeed", 0)) or None,
                        source="NOAA NHC",
                        advisory_time_utc=storm.get("lastUpdate", datetime.now(timezone.utc).isoformat()),
                    ))
    except Exception as e:
        logger.warning(f"NHC feed unavailable: {e}")

    return results


async def _fetch_imd_active() -> List[ActiveCyclone]:
    """Attempt to fetch active cyclone data from IMD (India Meteorological Department).
    IMD doesn't have a public JSON API, so we fall back to parsing their bulletin page."""
    results: List[ActiveCyclone] = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            # Try IMD cyclone page
            resp = await client.get(
                "https://mausam.imd.gov.in/imd_latest/contents/cyclone.php",
                headers={"User-Agent": "CycloFusion-Research/1.0"},
            )
            if resp.status_code == 200:
                text = resp.text
                # Look for active cyclone mentions
                cyclone_match = re.search(
                    r"(?:Cyclonic Storm|Depression|Severe Cyclonic Storm|Very Severe|Extremely Severe|Super Cyclonic)\s+['\"]?(\w+)['\"]?",
                    text, re.IGNORECASE
                )
                if cyclone_match:
                    name = cyclone_match.group(1).upper()
                    lat_m = re.search(r"(\d+\.?\d*)\s*°?\s*N", text)
                    lon_m = re.search(r"(\d+\.?\d*)\s*°?\s*E", text)
                    lat = float(lat_m.group(1)) if lat_m else 15.0
                    lon = float(lon_m.group(1)) if lon_m else 85.0

                    results.append(ActiveCyclone(
                        storm_id=f"IMD_{name}_{datetime.now(timezone.utc).strftime('%Y')}",
                        name=name,
                        basin="North Indian Ocean",
                        category=cyclone_match.group(0),
                        latitude=lat,
                        longitude=lon,
                        max_wind_kts=0.0,
                        source="IMD RSMC New Delhi",
                        advisory_time_utc=datetime.now(timezone.utc).isoformat(),
                    ))
    except Exception as e:
        logger.warning(f"IMD feed unavailable: {e}")

    return results


async def get_active_cyclones(force_refresh: bool = False) -> List[ActiveCyclone]:
    """
    Aggregate active cyclones from all available sources.
    Uses a 5-minute cache to avoid excessive API calls.
    """
    global _cache

    # Check cache validity
    if (
        not force_refresh
        and _cache["fetched_at"] is not None
        and (datetime.now(timezone.utc) - _cache["fetched_at"]).total_seconds() < _cache["ttl_seconds"]
    ):
        return _cache["data"]

    all_active: List[ActiveCyclone] = []

    # Fetch from all sources concurrently
    import asyncio
    jtwc_task = asyncio.create_task(_fetch_jtwc_active())
    nhc_task = asyncio.create_task(_fetch_nhc_active())
    imd_task = asyncio.create_task(_fetch_imd_active())

    jtwc_results, nhc_results, imd_results = await asyncio.gather(
        jtwc_task, nhc_task, imd_task, return_exceptions=True
    )

    if isinstance(jtwc_results, list):
        all_active.extend(jtwc_results)
    if isinstance(nhc_results, list):
        all_active.extend(nhc_results)
    if isinstance(imd_results, list):
        all_active.extend(imd_results)

    # Deduplicate by storm name
    seen_names = set()
    deduplicated: List[ActiveCyclone] = []
    for storm in all_active:
        if storm.name not in seen_names:
            seen_names.add(storm.name)
            deduplicated.append(storm)

    # Update cache
    _cache["data"] = deduplicated
    _cache["fetched_at"] = datetime.now(timezone.utc)

    logger.info(f"Fetched {len(deduplicated)} active cyclones from live feeds.")
    return deduplicated
