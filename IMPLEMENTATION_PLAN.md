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
- [ ] Scaffold directory structure: `backend/`, `frontend/`, `ml/`, `data/`, `docs/`.
- [ ] Establish initial tracking files: `IMPLEMENTATION_PLAN.md`, `IMPLEMENTATION_LOG.md`, `FINAL_STATUS.md`, `FINAL_TEST_REPORT.md`, `.env.example`, `.gitignore`.

### Phase 2: Scientific Data Pipeline & Dataset Manifests
- [ ] Document authoritative sources: NOAA IBTrACS (North Indian Ocean / Global), INSAT-3D/3DR (IMD/MOSDAC), and geostationary satellite infrared archives.
- [ ] Create `data/README.md`, `data/data_sources.json`, and schema definitions.
- [ ] Implement data acquisition scripts for NOAA IBTrACS North Indian Ocean (NI) subset (freely accessible public NOAA archive).
- [ ] Implement robust preprocessing pipeline: coordinate validation, time-series alignment, image normalization, sequence generation (time window $T=4$, forecast horizon $H=+6\text{h}/+12\text{h}/+24\text{h}$).
- [ ] Build cyclone-level dataset splitting (`train`, `val`, `test` by distinct storm ID) to strictly prevent spatial/temporal leakage.
- [ ] Create verified software test fixtures (`data/fixtures/`) clearly labeled for automated unit tests.

### Phase 3: Machine Learning Framework
- [ ] Implement CNN Spatial Architecture:
  - Input: $(B, H, W, C)$ satellite image.
  - Heads: (1) Binary Cyclone Detection, (2) Intensity Classification (IMD 7-stage / Saffir-Simpson), (3) Wind Speed Regression.
- [ ] Implement ConvLSTM Spatiotemporal Forecasting Architecture:
  - Input: $(B, T, H, W, C)$ sequence of satellite observations + past coordinates.
  - Heads: (1) Trajectory Forecast $(\Delta\text{lat}, \Delta\text{lon})$, (2) Future Wind Speed (knots).
- [ ] Implement Baseline Forecasting Models:
  - Baseline 1: Persistence model (current trajectory & intensity held constant).
  - Baseline 2: Linear extrapolation baseline.
  - Baseline 3: Spatial CNN-only baseline.
- [ ] Implement Great-Circle Geodesic Distance (Haversine) metric for trajectory evaluation.
- [ ] Implement model artifact serialization with full metadata (hash, config, input shapes, validation metrics).
- [ ] Execute model training and baseline evaluation on real/sample benchmark data and record exact metrics.

### Phase 4: Model Evaluation & Benchmark Analysis
- [ ] Classification metrics: Precision, Recall, Macro-F1, Confusion Matrix.
- [ ] Regression metrics: MAE, RMSE, Mean Bias.
- [ ] Trajectory metrics: Mean Along-Track / Cross-Track Error, Mean Absolute Geographic Distance (km) at +6h, +12h, +24h.
- [ ] Save machine-readable evaluation results (`ml/artifacts/evaluation_metrics.json`).

### Phase 5: FastAPI Backend Development
- [ ] Core configuration (`config.py`, logging, CORS, security, rate-limiting).
- [ ] Database layer: SQLAlchemy 2.0 async/sync engine, declarative models (`Cyclones`, `Tracks`, `SatelliteImages`, `Predictions`, `Models`, `Reports`).
- [ ] Alembic migration environment and initial schema migrations.
- [ ] Pydantic v2 schemas for all requests, responses, and validations.
- [ ] Prediction and Inference service loading trained artifacts or reporting clean 503 if uninitialized.
- [ ] Endpoints implementation:
  - `GET /health`
  - `GET /api/v1/status`
  - `GET /api/v1/models`
  - `GET /api/v1/data/sources`
  - `GET /api/v1/cyclones` & `GET /api/v1/cyclones/{id}`
  - `POST /api/v1/predictions/detect`
  - `POST /api/v1/predictions/classify`
  - `POST /api/v1/predictions/intensity`
  - `POST /api/v1/predictions/track`
  - `POST /api/v1/predictions/analyze`
  - `GET /api/v1/predictions/{id}`
  - `GET /api/v1/metrics`
  - `GET /api/v1/reports/{id}` & `GET /api/v1/reports/{id}/download`
- [ ] Report generation service with ReportLab (PDF) and CSV streaming.

### Phase 6: Database Seeding & Verification
- [ ] Provide database seed script populating verified historical North Indian Ocean cyclones (e.g. Cyclone Fani, Amphan, Tauktae, Biparjoy, Michaung) with real historical coordinates, pressure, and wind speed.
- [ ] Run Alembic migrations and seed database.

### Phase 7: React + TypeScript + Vite Dashboard
- [ ] Initialize frontend application with Vite + TypeScript.
- [ ] Setup modern scientific UI design system (dark/light themes, sleek meteorological styling, responsive layout).
- [ ] Build central API client with axios/fetch handling errors and loading states.
- [ ] Implement Dashboard Overview (cyclone stats, system health, model status, latest runs).
- [ ] Implement Cyclone Analysis page (image upload, model selection, live inference invocation).
- [ ] Implement Interactive Leaflet Map (observed vs predicted track lines, markers, forecast cones, coordinates popup).
- [ ] Implement Intensity Visualization (Recharts/Chart.js showing observed vs forecast wind speed & pressure).
- [ ] Implement Model Evaluation page (real metrics tables, confusion matrix, baseline comparison).
- [ ] Implement Reports page (history of generated reports, dynamic PDF/CSV download).
- [ ] Implement Data Sources Management page (IMD, NOAA IBTrACS, satellite feeds, status).

### Phase 8: Comprehensive Automated Testing
- [ ] Backend test suite: pytest for API endpoints, schemas, database persistence, and error handling.
- [ ] ML test suite: tensor shapes, data loader, sequence generation, metric calculations.
- [ ] Frontend test & build: TypeScript type-checking, component validation, `npm run build` production bundle verification.

### Phase 9: Documentation & Deliverables
- [ ] Comprehensive documentation: `README.md`, `ARCHITECTURE.md` (with Mermaid diagrams), `DATASET_DOCUMENTATION.md`, `MODEL_DOCUMENTATION.md`, `EXPERIMENTS.md`, `API_DOCUMENTATION.md`, `DEPLOYMENT.md`, `TROUBLESHOOTING.md`, `LIMITATIONS.md`.
- [ ] Final Status and Test Reports: `FINAL_STATUS.md`, `FINAL_TEST_REPORT.md`.
- [ ] Verification of demonstration workflow and final report.
