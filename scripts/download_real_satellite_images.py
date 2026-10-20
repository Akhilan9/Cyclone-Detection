"""
Real Satellite Imagery Downloader from NASA GIBS (Global Imagery Browse Services).
Downloads genuine Thermal Infrared (TIR Band 31, 11 µm) and Corrected Reflectance
satellite imagery for verified North Indian Ocean cyclones directly from space observations.
"""

import os
import sys
import logging
import urllib.request
import urllib.parse
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("download_satellite")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SATELLITE_DIR = os.path.join(PROJECT_ROOT, "data", "raw", "satellite_images")
os.makedirs(SATELLITE_DIR, exist_ok=True)

# Cyclone registry with peak dates and geographic coordinates (lat, lon)
CYCLONE_SATELLITE_TARGETS = [
    {
        "cyclone_id": "2019117N12089",
        "name": "FANI",
        "date": "2019-05-02",
        "lat": 16.5,
        "lon": 85.0,
        "box_size": 4.5,
    },
    {
        "cyclone_id": "2020137N10087",
        "name": "AMPHAN",
        "date": "2020-05-19",
        "lat": 18.2,
        "lon": 86.8,
        "box_size": 4.5,
    },
    {
        "cyclone_id": "2021134N10072",
        "name": "TAUKTAE",
        "date": "2021-05-17",
        "lat": 18.5,
        "lon": 71.5,
        "box_size": 4.5,
    },
    {
        "cyclone_id": "2023157N13066",
        "name": "BIPARJOY",
        "date": "2023-06-13",
        "lat": 21.0,
        "lon": 66.5,
        "box_size": 4.5,
    },
    {
        "cyclone_id": "2023335N10085",
        "name": "MICHAUNG",
        "date": "2023-12-04",
        "lat": 14.5,
        "lon": 80.5,
        "box_size": 4.5,
    },
    {
        "cyclone_id": "2016341N10095",
        "name": "VARDAH",
        "date": "2016-12-11",
        "lat": 13.2,
        "lon": 83.2,
        "box_size": 4.5,
    },
    {
        "cyclone_id": "2016334N08086",
        "name": "NADA",
        "date": "2016-11-30",
        "lat": 9.8,
        "lon": 83.0,
        "box_size": 4.5,
    },
]


def download_nasa_gibs_image(
    layer: str,
    date_str: str,
    bbox: str,
    width: int,
    height: int,
    fmt: str = "image/png",
) -> bytes:
    """Download satellite image tile from NASA GIBS WMS endpoint."""
    base_url = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": layer,
        "FORMAT": fmt,
        "TRANSPARENT": "TRUE",
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "CRS": "EPSG:4326",
        "BBOX": bbox,
        "TIME": date_str,
    }
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return response.read()


def fetch_all_cyclone_satellite_imagery():
    """Fetch genuine satellite imagery (TIR Band 31 & True Color) for all storms."""
    logger.info("Starting acquisition of real satellite imagery from NASA GIBS...")

    for target in CYCLONE_SATELLITE_TARGETS:
        cid = target["cyclone_id"]
        cname = target["name"]
        date_str = target["date"]
        lat = target["lat"]
        lon = target["lon"]
        d = target["box_size"]

        # BBOX in EPSG:4326 WMS 1.3.0 is minLat, minLon, maxLat, maxLon
        bbox = f"{lat - d:.2f},{lon - d:.2f},{lat + d:.2f},{lon + d:.2f}"

        tir_path = os.path.join(SATELLITE_DIR, f"{cid}_real_tir.png")
        vis_path = os.path.join(SATELLITE_DIR, f"{cid}_real_visible.jpg")

        # 1. Download Thermal Infrared (MODIS Band 31, 11 µm brightness temp)
        try:
            logger.info(f"Downloading Real Thermal IR Satellite Image for Cyclone {cname} ({date_str})...")
            tir_bytes = download_nasa_gibs_image(
                layer="MODIS_Terra_Brightness_Temp_Band31_Day",
                date_str=date_str,
                bbox=bbox,
                width=256,
                height=256,
                fmt="image/png",
            )
            with open(tir_path, "wb") as f:
                f.write(tir_bytes)
            logger.info(f"Saved Real TIR: {tir_path} ({len(tir_bytes)} bytes)")
        except Exception as e:
            logger.error(f"Failed to fetch TIR for {cname}: {e}")

        # 2. Download True-Color / Reflectance
        try:
            logger.info(f"Downloading Real Visible Satellite Image for Cyclone {cname} ({date_str})...")
            vis_bytes = download_nasa_gibs_image(
                layer="MODIS_Terra_CorrectedReflectance_TrueColor",
                date_str=date_str,
                bbox=bbox,
                width=512,
                height=512,
                fmt="image/jpeg",
            )
            with open(vis_path, "wb") as f:
                f.write(vis_bytes)
            logger.info(f"Saved Real Visible: {vis_path} ({len(vis_bytes)} bytes)")
        except Exception as e:
            logger.error(f"Failed to fetch Visible for {cname}: {e}")

    logger.info("Real satellite imagery acquisition complete.")


if __name__ == "__main__":
    fetch_all_cyclone_satellite_imagery()
