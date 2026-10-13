# Cyclone Datasets and Ingestion Pipeline

## Overview
This directory contains the dataset catalog, acquisition scripts, validation utilities, and processed manifests for tropical cyclone detection, classification, and spatiotemporal trajectory/intensity forecasting in the North Indian Ocean (Bay of Bengal and Arabian Sea).

## Directory Structure
```
data/
├── README.md                  # This documentation
├── data_sources.json          # Structured metadata catalog of meteorological sources
├── dataset_manifest.csv       # Manifest linking cyclone IDs, timestamps, tracks, and image paths
├── raw/                       # Raw downloads (NOAA IBTrACS CSVs, satellite images)
├── processed/                 # Preprocessed normalized arrays and sequence tensors
├── fixtures/                  # Clearly labeled test fixtures for automated testing only
└── scripts/
    ├── download_noaa_ibtracs.py     # Automated downloader for NOAA IBTrACS NIO
    ├── validate_dataset.py          # Data schema & coordinate validation script
    └── build_manifest.py            # Manifest generator with storm-level train/val/test split
```

## Primary Meteorological Data Sources
1. **NOAA IBTrACS (v04r01) North Indian Ocean (`ibtracs.NI.list.v04r01.csv`)**:
   - Primary authoritative source for historical best-track observations in the Bay of Bengal and Arabian Sea.
   - Publicly accessible without authentication from NOAA NCEI.
   - Contains IMD (`newdelhi_*`) synoptic parameters, JTWC observations, storm name, central pressure (hPa), maximum sustained wind speed (knots), and center coordinates.

2. **India Meteorological Department (IMD) Classification Standard**:
   - Depressions (D): 17-27 kt
   - Deep Depression (DD): 28-33 kt
   - Cyclonic Storm (CS): 34-47 kt
   - Severe Cyclonic Storm (SCS): 48-63 kt
   - Very Severe Cyclonic Storm (VSCS): 64-89 kt
   - Extremely Severe Cyclonic Storm (ESCS): 90-119 kt
   - Super Cyclonic Storm (SuCS): >= 120 kt

3. **Geostationary Thermal Infrared Imagery (INSAT-3D/3DR / Met Office / NOAA GOES)**:
   - Centered on storm eye coordinates, resampled to standardized spatial dimensions ($128 \times 128 \times 1$ or $64 \times 64 \times 1$).
   - Normalized brightness temperature representing deep convective cloud canopy and eye-wall structures.

## Data Leakage Prevention Strategy
To ensure scientifically defensible model evaluation:
- **Storm-Level Splitting**: Observations are grouped strictly by Storm Identifier (`SID`). All chronological observations of a cyclone belong exclusively to either Train, Validation, or Test set.
- **Held-Out Testing**: Cyclones from recent years (e.g. Cyclone Biparjoy 2023, Cyclone Michaung 2023, Cyclone Remal 2024) serve as held-out evaluation sets.
- Adjacent time-steps from the same storm are never mixed across splits.

## Verification & Honesty Rules
- **Real Observations**: Real tracks from NOAA/IMD are stored in `data/raw/` and processed into `data/dataset_manifest.csv`.
- **Test Fixtures**: Lightweight synthetic matrices in `data/fixtures/` are used exclusively for automated test suites (e.g., verifying tensor shapes, API serialization, and UI rendering without requiring multi-gigabyte downloads). Synthetic fixtures are explicitly tagged with `is_synthetic: true` and are never reported as real scientific performance.
