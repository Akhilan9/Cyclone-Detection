# Dataset Documentation & Provenance

## 1. Domain & Scope
This project focuses on tropical cyclones in the **North Indian Ocean (NIO)** basin, comprising the **Bay of Bengal (BOB)** and the **Arabian Sea (ARB)**, bounded geographically between $0^\circ\text{N}$ to $40^\circ\text{N}$ latitude and $45^\circ\text{E}$ to $110^\circ\text{E}$ longitude.

---

## 2. Authoritative Data Sources

### 2.1 NOAA IBTrACS North Indian Ocean (v04r01)
- **Source**: National Centers for Environmental Information (NCEI), National Oceanic and Atmospheric Administration (NOAA).
- **Public Archive**: `https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv`
- **License**: U.S. Government Open Data (Public Domain).
- **Temporal Resolution**: Standardized 3-hourly and 6-hourly synoptic observations.
- **Fields Extracted**:
  - `SID`: Unique storm identifier (e.g., `2019117N12089`).
  - `NAME`: Storm name (e.g., `FANI`, `AMPHAN`, `TAUKTAE`, `BIPARJOY`, `MICHAUNG`).
  - `SEASON`: Year of storm genesis.
  - `ISO_TIME`: Timestamp in UTC format.
  - `LAT`, `LON`: Center coordinate position in decimal degrees.
  - `WMO_WIND` / `USA_WIND`: Maximum sustained surface wind speed in knots.
  - `WMO_PRES` / `USA_PRES`: Minimum central surface pressure in hPa.
  - `NATURE`: Storm nature (e.g., Tropical, Subtropical, Extratropical).

### 2.2 India Meteorological Department (IMD) Standard
The operational regional specialized meteorological center (RSMC) New Delhi classifies tropical disturbances using 3-minute maximum sustained surface wind (MSW):

| Stage Code | Category Name | Wind Speed (knots) | Wind Speed (km/h) |
|---|---|---|---|
| **D** | Depression | 17 – 27 kt | 31 – 49 km/h |
| **DD** | Deep Depression | 28 – 33 kt | 50 – 61 km/h |
| **CS** | Cyclonic Storm | 34 – 47 kt | 62 – 88 km/h |
| **SCS** | Severe Cyclonic Storm | 48 – 63 kt | 89 – 117 km/h |
| **VSCS** | Very Severe Cyclonic Storm | 64 – 89 kt | 118 – 165 km/h |
| **ESCS** | Extremely Severe Cyclonic Storm | 90 – 119 kt | 166 – 221 km/h |
| **SuCS** | Super Cyclonic Storm | $\ge 120$ kt | $\ge 222$ km/h |

### 2.3 Real Satellite Infrared Imagery (NASA GIBS / MODIS & INSAT-3D TIR)
- **Primary Live Sensor**: NASA Terra / Aqua MODIS Thermal Infrared Band 31 (11.03 $\mu\text{m}$), operating at the exact physical central wavelength channel as INSAT-3D TIR-1 (10.8 $\mu\text{m}$).
- **Visible Sensor**: NASA MODIS Corrected Reflectance True Color (250 m spatial resolution).
- **Service Integration**: Direct dynamic streaming via NASA GIBS WMS/WMTS endpoints (`https://gibs.earthdata.nasa.gov/`) with automated local caching in `data/raw/satellite_images/` and `data/processed/satellite_imagery/`.
- **Spatial Normalization**: Real satellite pixels are ingested via OpenCV, resized to synoptic grids ($64 \times 64 \times 1$), and normalized into $[0.0, 1.0]$ brightness temperature tensors for PyTorch CNN and ConvLSTM forward inference.

---

## 3. Data Leakage Prevention Guarantee
To guarantee scientific honesty:
1. **Storm-Level Splitting**: Observations are grouped strictly by Storm ID (`SID`). Every time-step observation of a cyclone belongs exclusively to one partition.
2. **Zero Temporal Cross-Contamination**: Sequences from adjacent hours of the same storm are never split across train and test.
3. **Partition Summary**:
   - **Training Storms (3)**: Cyclone Tauktae (`2021134N10072`), Cyclone Michaung (`2023335N10085`), Cyclone Amphan (`2020137N10087`).
   - **Validation Storms (1)**: Cyclone Fani (`2019117N12089`).
   - **Held-Out Test Storms (1)**: Cyclone Biparjoy (`2023157N13066`).
   - **Set Intersection**: $\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$. Verified via automated tests in `ml/tests/test_ml_pipeline.py`.

---

## 4. Automated Acquisition & Validation Scripts
- Full NOAA IBTrACS Downloader: `python data/scripts/download_noaa_ibtracs.py` (Downloads & parses 58,580 records across 1,855 cyclones).
- Real NASA Satellite Downloader: `python data/scripts/download_real_satellite_images.py` (Downloads real Thermal IR Band 31 & Visible imagery from space).
- Preprocessor: `ml/pipelines/preprocessor.py`
- Sequence Builder: `ml/pipelines/sequence_builder.py`
- Satellite Service: `backend/app/services/satellite_service.py`
- Manifest Builder: `ml/pipelines/dataset.py`
- Manifest Artifact: `data/dataset_manifest.csv`
