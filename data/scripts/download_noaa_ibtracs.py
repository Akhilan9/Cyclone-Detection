"""
Data Acquisition Script: NOAA IBTrACS North Indian Ocean (v04r01)
Downloads and extracts official best-track tropical cyclone records from NOAA NCEI.
"""

import os
import sys
import logging
import urllib.request
import pandas as pd
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("download_ibtracs")

NOAA_NI_URL = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv"
RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "raw")
OUTPUT_CSV = os.path.join(RAW_DATA_DIR, "ibtracs_ni_raw.csv")
PARSED_CSV = os.path.join(RAW_DATA_DIR, "ibtracs_ni_cleaned.csv")


def download_ibtracs(url: str = NOAA_NI_URL, target_path: str = OUTPUT_CSV) -> bool:
    """Download NOAA IBTrACS North Indian Ocean CSV file."""
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    logger.info(f"Downloading NOAA IBTrACS NI archive from {url}...")
    try:
        urllib.request.urlretrieve(url, target_path)
        logger.info(f"Download complete! Saved to {target_path} ({os.path.getsize(target_path)} bytes)")
        return True
    except Exception as e:
        logger.error(f"Failed to download NOAA IBTrACS archive: {e}")
        return False


def classify_imd_stage(wind_kts: Optional[float]) -> str:
    """Classify intensity using India Meteorological Department (IMD) standards."""
    if wind_kts is None or pd.isna(wind_kts):
        return "Unknown"
    w = float(wind_kts)
    if w < 17:
        return "Low Pressure Area"
    elif 17 <= w <= 27:
        return "Depression (D)"
    elif 28 <= w <= 33:
        return "Deep Depression (DD)"
    elif 34 <= w <= 47:
        return "Cyclonic Storm (CS)"
    elif 48 <= w <= 63:
        return "Severe Cyclonic Storm (SCS)"
    elif 64 <= w <= 89:
        return "Very Severe Cyclonic Storm (VSCS)"
    elif 90 <= w <= 119:
        return "Extremely Severe Cyclonic Storm (ESCS)"
    else:
        return "Super Cyclonic Storm (SuCS)"


def parse_and_clean_ibtracs(raw_path: str = OUTPUT_CSV, out_path: str = PARSED_CSV) -> pd.DataFrame:
    """
    Parse NOAA IBTrACS CSV, handle second-row units header, filter North Indian Ocean storms,
    standardize coordinates, wind speed and pressure.
    """
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"Raw IBTrACS file not found at {raw_path}")

    logger.info("Parsing raw IBTrACS data...")
    # NOAA IBTrACS CSV has row 0 as header, row 1 as units description
    df = pd.read_csv(raw_path, skiprows=[1], low_memory=False)

    # Required columns
    col_map = {
        "SID": "cyclone_id",
        "NAME": "cyclone_name",
        "SEASON": "season_year",
        "ISO_TIME": "timestamp_utc",
        "LAT": "latitude",
        "LON": "longitude",
        "WMO_WIND": "wmo_wind_kts",
        "WMO_PRES": "wmo_pres_hpa",
        "USA_WIND": "jtwc_wind_kts",
        "USA_PRES": "jtwc_pres_hpa",
        "BASIN": "basin",
        "SUBBASIN": "subbasin",
        "NATURE": "nature",
    }

    avail_cols = [c for c in col_map.keys() if c in df.columns]
    df = df[avail_cols].rename(columns=col_map)

    # Clean numeric fields
    for col in ["latitude", "longitude", "wmo_wind_kts", "wmo_pres_hpa", "jtwc_wind_kts", "jtwc_pres_hpa"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Combine wind and pressure preferring WMO/IMD with fallback to JTWC/USA
    if "wmo_wind_kts" in df.columns and "jtwc_wind_kts" in df.columns:
        df["wind_speed_kts"] = df["wmo_wind_kts"].fillna(df["jtwc_wind_kts"])
    elif "wmo_wind_kts" in df.columns:
        df["wind_speed_kts"] = df["wmo_wind_kts"]
    else:
        df["wind_speed_kts"] = df.get("jtwc_wind_kts", None)

    if "wmo_pres_hpa" in df.columns and "jtwc_pres_hpa" in df.columns:
        df["central_pressure_hpa"] = df["wmo_pres_hpa"].fillna(df["jtwc_pres_hpa"])
    elif "wmo_pres_hpa" in df.columns:
        df["central_pressure_hpa"] = df["wmo_pres_hpa"]
    else:
        df["central_pressure_hpa"] = df.get("jtwc_pres_hpa", None)

    # Drop observations without valid coordinates
    df = df.dropna(subset=["latitude", "longitude", "timestamp_utc"])
    
    # Filter for standard North Indian Ocean bounds (0 to 35 N, 45 to 105 E)
    df = df[(df["latitude"] >= 0.0) & (df["latitude"] <= 35.0)]
    df = df[(df["longitude"] >= 45.0) & (df["longitude"] <= 105.0)]

    # Add IMD Intensity Stage
    df["imd_stage"] = df["wind_speed_kts"].apply(classify_imd_stage)

    # Sort chronologically by cyclone and time
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], errors="coerce")
    df = df.dropna(subset=["timestamp_utc"]).sort_values(by=["cyclone_id", "timestamp_utc"])

    logger.info(f"Cleaned dataset contains {len(df)} track points across {df['cyclone_id'].nunique()} cyclones.")
    df.to_csv(out_path, index=False)
    logger.info(f"Cleaned dataset saved to {out_path}")
    return df


if __name__ == "__main__":
    success = download_ibtracs()
    if success:
        parse_and_clean_ibtracs()
    else:
        sys.exit(1)
