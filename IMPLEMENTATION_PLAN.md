# Implementation Plan - Tropical Cyclone AI/ML Major Project

## Project Title
**A Deep Learning Framework for Multi-Source Satellite-Based Tropical Cyclone Detection, Classification, and Prediction**

## 1. System Architecture & Objectives
This project implements an end-to-end research-grade machine learning system and operational web platform for:
1. Multi-source satellite image preprocessing (Infrared / Geostationary imagery) and historical track observation synchronization (IMD / NOAA IBTrACS).
2. Deep learning spatial feature extraction (CNN) for cyclone detection and intensity category classification.
3. Spatiotemporal forecasting (ConvLSTM) for future cyclone trajectory (latitude, longitude) and central intensity estimation (maximum sustained wind speed, central pressure).
4. Statistically sound baseline comparisons (Persistence, Statistical/Linear, Spatial-only CNN vs. Spatiotemporal ConvLSTM).
5. Enterprise-grade FastAPI backend with PostgreSQL/SQLite database support, Alembic migrations, Pydantic validation, and comprehensive scientific endpoints.
6. Modern React + Vite + TypeScript dashboard featuring interactive Leaflet mapping, intensity timeline charts, model performance metrics, PDF/CSV report generation, and data-source management.
7. Strict adherence to scientific integrity: strict cyclone-level data splitting (zero data leakage), reproducible manifests, genuine metrics, and explicit labeling of demonstration fixtures versus real observations.

---

## 2. Phased Execution Roadmap

### Phase 1: Environment Audit & Project Scaffolding
- [x] Audit Python 3.13, Node 24, npm, git, CPU/GPU capabilities.
- [x] Initialize Git repository.
- [x] Scaffold directory structure: `backend/`, `frontend/`, `ml/`, `data/`, `docs/`.
- [x] Establish tracking files: `IMPLEMENTATION_PLAN.md`, `IMPLEMENTATION_LOG.md`, `FINAL_STATUS.md`, `FINAL_TEST_REPORT.md`, `.env.example`, `.gitignore`.

### Phase 2: Scientific Data Pipeline & Dataset Manifests
- [x] Document authoritative sources: NOAA IBTrACS (North Indian Ocean), NASA GIBS (MODIS / VIIRS Thermal IR Band 31), INSAT-3D/3DR (IMD/MOSDAC).
- [x] Create `data/README.md`, `data/data_sources.json`, and schema definitions.
- [x] Implement and execute data acquisition script `download_noaa_ibtracs.py` downloading full official archive (58,580 real track points across 1,855 cyclones).
- [x] Implement real satellite downloader `download_real_satellite_images.py` acquiring genuine Thermal IR Band 31 (11.03 µm) and Visible imagery from NASA GIBS for all benchmark cyclones.
- [x] Implement robust preprocessing pipeline: coordinate validation, time-series alignment, image normalization, sequence generation.
- [x] Build cyclone-level dataset splitting (`train`, `val`, `test` by distinct storm ID) to strictly prevent spatial/temporal leakage.

### Phase 3: Machine Learning Framework
- [x] Implement CNN Spatial Architecture (`CycloneSpatialCNN`, `cnn_spatial_best.pt` - 6.0 MB).
- [x] Implement ConvLSTM Spatiotemporal Forecasting Architecture (`CycloneConvLSTMNet`, `convlstm_temporal_best.pt` - 1.5 MB).
- [x] Implement Baseline Forecasting Models (Persistence Baseline, Linear Kinematic Extrapolation).
- [x] Implement Great-Circle Geodesic Distance (Haversine) metric for trajectory evaluation.
- [x] Implement model artifact serialization with full metadata (`model_metadata.json`).
- [x] Execute model training and baseline evaluation on real/sample benchmark data and record exact metrics.

### Phase 4: Model Evaluation & Benchmark Analysis
- [x] Classification metrics: Precision, Recall, Macro-F1, Confusion Matrix.
- [x] Regression metrics: MAE, RMSE, Mean Bias.
- [x] Trajectory metrics: Mean Along-Track / Cross-Track Error, Mean Absolute Geographic Distance (km).
- [x] Save machine-readable evaluation results (`ml/artifacts/evaluation_metrics.json`).

### Phase 5: FastAPI Backend Development
- [x] Core configuration, logging, CORS, database session management.
- [x] Database layer: SQLite/PostgreSQL with SQLAlchemy declarative models (`CycloneModel`, `TrackPointModel`, `PredictionRunModel`, `ReportModel`).
- [x] Pydantic v2 schemas for all requests, responses, and validations.
- [x] Prediction and Inference service loading trained PyTorch weights.
- [x] Satellite Service (`backend/app/services/satellite_service.py`) supporting dynamic on-the-fly NASA GIBS tile streaming and real image ingestion.
- [x] Comprehensive scientific REST endpoints: status, models, data sources, cyclones, predictions (detect, classify, intensity, track, analyze), satellite preview, dynamic tiles, metrics, and reports.
- [x] Research-grade PDF and CSV report generation service (ReportLab).

### Phase 6: Database Seeding & Verification
- [x] Provide database seed script populating verified historical North Indian Ocean cyclones (Fani, Amphan, Tauktae, Biparjoy, Michaung, Vardah, Nada) with real historical coordinates, pressure, wind speed, and linked real satellite images.
- [x] Seed SQLite database (`cyclone_dev.db`).

### Phase 7: React + TypeScript + Vite Dashboard
- [x] Modern scientific UI matching professional meteorological standards.
- [x] Dynamic real NASA satellite imagery viewer with channel switching (IRWIN Thermal IR Band 31, Visible, Fused View).
- [x] Live on-the-fly dynamic tile streaming button querying NASA GIBS in real time.
- [x] Interactive Leaflet Map with layer switching between OSM, ESRI World Imagery, and NASA GIBS Real Space Observations.
- [x] Real-time AI prediction execution, dynamic confidence scoring (calibrated from softmax probabilities), trajectory forecasting, and IMD intensity gauge.
- [x] Evaluation metrics page, data sources catalog, and PDF/CSV report download.

### Phase 8: Comprehensive Automated Testing & Validation
- [x] Backend test suite: pytest for API endpoints, schemas, database persistence, and error handling.
- [x] ML test suite: tensor shapes, data loader, sequence generation, metric calculations.
- [x] Frontend test & build: `npm run build` production bundle successfully compiled.

### Phase 9: Documentation & Deliverables
- [x] Comprehensive documentation: `README.md`, `ARCHITECTURE.md`, `DATASET_DOCUMENTATION.md`, `MODEL_DOCUMENTATION.md`, `EXPERIMENTS.md`, `API_DOCUMENTATION.md`, `DEPLOYMENT.md`, `TROUBLESHOOTING.md`, `LIMITATIONS.md`.
- [x] Final Status and Test Reports: `FINAL_STATUS.md`, `FINAL_TEST_REPORT.md`.
