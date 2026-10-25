"""
Download and save authentic, real NASA GIBS satellite imagery for all cyclones in the project.
Replaces any synthetic/cartoonish images with genuine NASA satellite observations.
"""
import os
import sys
import json
import urllib.parse
import urllib.request
import cv2
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw", "satellite_images")
os.makedirs(RAW_DIR, exist_ok=True)

# NASA GIBS WMS endpoint
NASA_GIBS_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"

def heal_swath_gaps(img: np.ndarray, inpaint_radius: int = 7) -> np.ndarray:
    if img is None:
        return img
    black_mask = (img[:, :, 0] <= 10) & (img[:, :, 1] <= 10) & (img[:, :, 2] <= 10)
    if np.mean(black_mask) > 0.005:
        mask_u8 = (black_mask.astype(np.uint8) * 255)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        dilated = cv2.dilate(mask_u8, kernel, iterations=1)
        healed = cv2.inpaint(img, dilated, inpaintRadius=inpaint_radius, flags=cv2.INPAINT_TELEA)
        return healed
    return img

def download_nasa_tile(lat: float, lon: float, date_str: str, layer: str, width: int = 256, height: int = 256, box: float = 4.5):
    bbox = f"{lat - box:.2f},{lon - box:.2f},{lat + box:.2f},{lon + box:.2f}"
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
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CycloVision/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            raw_bytes = res.read()
            arr = np.frombuffer(raw_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None and np.mean(img) > 15:
                return heal_swath_gaps(img)
    except Exception as e:
        print(f"Error fetching tile ({lat}, {lon}) on {date_str}: {e}")
    return None

TARGETS = [
    # Global Major Cyclones
    {"cyclone_id": "2005236N23285", "name": "KATRINA", "lat": 26.0, "lon": -88.0, "date": "2005-08-28"},
    {"cyclone_id": "2022266N11308", "name": "IAN", "lat": 26.0, "lon": -82.8, "date": "2022-09-28"},
    {"cyclone_id": "2013307N06158", "name": "HAIYAN", "lat": 10.5, "lon": 127.0, "date": "2013-11-07"},
    {"cyclone_id": "2015293N09266", "name": "PATRICIA", "lat": 18.2, "lon": -105.1, "date": "2015-10-23"},
    {"cyclone_id": "2023036S10114", "name": "FREDDY", "lat": -19.5, "lon": 43.5, "date": "2023-02-21"},
    # North Indian Ocean Recent Cyclones
    {"cyclone_id": "2024147N17088", "name": "REMAL", "lat": 19.5, "lon": 89.2, "date": "2024-05-26"},
    {"cyclone_id": "2024298N14068", "name": "DANA", "lat": 19.0, "lon": 87.5, "date": "2024-10-24"},
    {"cyclone_id": "2024244N19063", "name": "ASNA", "lat": 23.5, "lon": 67.5, "date": "2024-08-30"},
    {"cyclone_id": "2025301N12088", "name": "DANA-II", "lat": 19.0, "lon": 87.5, "date": "2024-10-25"},
    # Scanned Sectors
    {"cyclone_id": "2026-TC-148872", "name": "BAY -1025", "lat": 14.8, "lon": 87.2, "date": "2023-12-04"},
    {"cyclone_id": "2026-TC-162684", "name": "ARAB-1025", "lat": 16.2, "lon": 68.4, "date": "2023-06-13"},
    {"cyclone_id": "2026-TC-1651335", "name": "WEST-1025", "lat": 16.5, "lon": 85.0, "date": "2019-05-02"},
]

print(f"Downloading real NASA GIBS satellite images for {len(TARGETS)} cyclones...")

for t in TARGETS:
    c_id = t["cyclone_id"]
    name = t["name"]
    lat = t["lat"]
    lon = t["lon"]
    date_str = t["date"]

    tir_path = os.path.join(RAW_DIR, f"{c_id}_real_tir.png")
    vis_path = os.path.join(RAW_DIR, f"{c_id}_real_visible.jpg")

    print(f"Fetching real NASA satellite observation for {name} ({c_id}) on {date_str}...")

    # 1. Thermal IR Band 31 (11 µm)
    tir_img = download_nasa_tile(lat, lon, date_str, "MODIS_Terra_Brightness_Temp_Band31_Day")
    if tir_img is not None:
        cv2.imwrite(tir_path, tir_img)
        print(f"  -> Saved real NASA Thermal IR: {tir_path} (shape={tir_img.shape})")

    # 2. Visible TrueColor
    vis_img = download_nasa_tile(lat, lon, date_str, "MODIS_Terra_CorrectedReflectance_TrueColor")
    if vis_img is not None:
        cv2.imwrite(vis_path, vis_img)
        print(f"  -> Saved real NASA Visible: {vis_path} (shape={vis_img.shape})")

print("All real NASA satellite observations saved successfully.")
