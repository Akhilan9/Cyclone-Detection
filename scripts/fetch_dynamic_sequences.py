"""
Dynamic NASA GIBS Satellite Sequence Cacher.
Pre-caches multi-temporal NASA GIBS satellite tiles (Thermal IR and Visible)
for all benchmark cyclones along their historical IBTrACS trajectories.
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("satellite_cacher")

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(PROJECT_ROOT, "data", "processed", "satellite_imagery")
FIXTURES_PATH = os.path.join(PROJECT_ROOT, "data", "fixtures", "sample_cyclones.json")
os.makedirs(CACHE_DIR, exist_ok=True)

NASA_GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"


def fetch_tile(lat: float, lon: float, date_str: str, layer: str, width: int = 256, height: int = 256):
    box_deg = 4.0
    bbox = f"{lat - box_deg:.2f},{lon - box_deg:.2f},{lat + box_deg:.2f},{lon + box_deg:.2f}"
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": layer,
        "FORMAT": "image/png" if "Brightness" in layer else "image/jpeg",
        "TRANSPARENT": "TRUE",
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "CRS": "EPSG:4326",
        "BBOX": bbox,
        "TIME": date_str,
    }
    url = f"{NASA_GIBS_WMS}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CycloVision/1.0"},
    )
    with urllib.request.urlopen(req, timeout=12) as res:
        return res.read()


def main():
    with open(FIXTURES_PATH, "r") as f:
        data = json.load(f)

    cyclones = data.get("cyclones", [])
    logger.info(f"Loaded {len(cyclones)} cyclones from {FIXTURES_PATH}")

    total_downloaded = 0

    for cyc in cyclones:
        c_id = cyc["cyclone_id"]
        name = cyc["name"]
        pts = cyc.get("track_points", [])
        if not pts:
            continue

        # Choose 5 progressive points
        n = len(pts)
        if n >= 5:
            step_indices = [0, n // 4, n // 2, 3 * n // 4, n - 1]
        else:
            step_indices = list(range(n)) + [n - 1] * (5 - n)

        logger.info(f"Processing Cyclone {name} ({c_id}) - selected step indices: {step_indices}")

        for i, idx in enumerate(step_indices):
            pt = pts[idx]
            lat = float(pt["latitude"])
            lon = float(pt["longitude"])
            date_str = pt["timestamp_utc"][:10]

            # 1. Thermal IR
            tir_cache = os.path.join(CACHE_DIR, f"{c_id}_tir_frame{i}.png")
            if not os.path.exists(tir_cache):
                try:
                    logger.info(f"Fetching TIR [{i+1}/5] {name} {date_str} ({lat}, {lon})...")
                    img_bytes = fetch_tile(lat, lon, date_str, "MODIS_Terra_Brightness_Temp_Band31_Day")
                    if len(img_bytes) > 1000:
                        with open(tir_cache, "wb") as f_out:
                            f_out.write(img_bytes)
                        total_downloaded += 1
                        logger.info(f" -> Saved {len(img_bytes)} bytes to {tir_cache}")
                    time.sleep(0.3)
                except Exception as e:
                    logger.warning(f"Failed to fetch TIR tile for {name} step {i}: {e}")

            # 2. Visible TrueColor
            vis_cache = os.path.join(CACHE_DIR, f"{c_id}_visible_frame{i}.jpg")
            if not os.path.exists(vis_cache):
                try:
                    logger.info(f"Fetching VIS [{i+1}/5] {name} {date_str} ({lat}, {lon})...")
                    img_bytes = fetch_tile(lat, lon, date_str, "MODIS_Terra_CorrectedReflectance_TrueColor")
                    if len(img_bytes) > 1000:
                        with open(vis_cache, "wb") as f_out:
                            f_out.write(img_bytes)
                        total_downloaded += 1
                        logger.info(f" -> Saved {len(img_bytes)} bytes to {vis_cache}")
                    time.sleep(0.3)
                except Exception as e:
                    logger.warning(f"Failed to fetch VIS tile for {name} step {i}: {e}")

    logger.info(f"Completed dynamic satellite sequence caching. Total new tiles downloaded: {total_downloaded}")


if __name__ == "__main__":
    main()
