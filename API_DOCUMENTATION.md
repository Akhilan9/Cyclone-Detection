# FastAPI API Reference & Documentation

## Overview
The backend provides a high-performance RESTful API adhering to OpenAPI 3.1 specifications. Interactive Swagger documentation is available at `http://localhost:8000/docs` and Redoc at `http://localhost:8000/redoc`.

Base URL: `http://localhost:8000/api/v1`

---

## 1. System Status & Health Endpoints

### `GET /health`
- **Description**: Lightweight health and liveness probe.
- **Response**: `200 OK`
  ```json
  {
    "status": "healthy",
    "service": "Tropical Cyclone AI Framework",
    "environment": "development",
    "timestamp_utc": "2026-10-13T16:57:04.949Z"
  }
  ```

### `GET /api/v1/status`
- **Description**: Returns detailed application status, database connectivity, and ML model readiness.
- **Response**: `200 OK`
  ```json
  {
    "status": "operational",
    "version": "1.0.0",
    "database_connected": true,
    "models_ready": true,
    "available_models_count": 4,
    "total_cyclones_in_db": 5,
    "total_track_points": 50
  }
  ```

---

## 2. Models & Data Sources Catalog

### `GET /api/v1/models`
- **Description**: Enumerates active deep learning models and baselines.
- **Response**: `200 OK`
  Returns list of models (`cnn_spatial_v1`, `convlstm_spatiotemporal_v1`, `baseline_persistence`, `baseline_linear`).

### `GET /api/v1/data/sources`
- **Description**: Lists authoritative meteorological data repositories (NOAA IBTrACS, IMD RSMC, INSAT-3D TIR, software fixtures).

---

## 3. Cyclones & Historical Observations

### `GET /api/v1/cyclones`
- **Query Parameters**:
  - `skip` (int, default=0): Pagination offset.
  - `limit` (int, default=50): Records per page.
  - `season_year` (int, optional): Filter by genesis year.
- **Response**: `200 OK` (Array of cyclone objects).

### `GET /api/v1/cyclones/{cyclone_id}`
- **Path Parameter**: `cyclone_id` (string, e.g., `2019117N12089`).
- **Response**: `200 OK` with complete ordered chronological track points.
- **Errors**: `404 Not Found` if cyclone does not exist.

---

## 4. Deep Learning Inference Endpoints

### `POST /api/v1/predictions/detect`
- **Description**: Spatial binary presence detection of tropical cyclone convective canopy.
- **Request Body**:
  ```json
  {
    "image_base64": "<optional_base64_string>",
    "sample_preset": "fani_eye"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "presence_probability": 0.8842,
    "is_cyclone_detected": true,
    "confidence_level": "High",
    "feature_summary": { "mean_brightness_norm": 0.4512, "peak_core_contrast": 0.9812 },
    "timestamp_utc": "2026-10-13T22:00:00Z"
  }
  ```

### `POST /api/v1/predictions/classify`
- **Description**: Classifies satellite imagery into 7 IMD intensity stages.
- **Request Body**: `{"cyclone_id": "2019117N12089"}`
- **Response**: `200 OK` with predicted category and full probability distribution.

### `POST /api/v1/predictions/intensity`
- **Description**: Predicts future maximum sustained surface wind speed (MSW knots) at horizon $H$.
- **Request Body**: `{"cyclone_id": "2019117N12089", "forecast_horizon_hours": 12}`
- **Response**: `200 OK` with current intensity, predicted intensity, intensity delta, and prediction interval.

### `POST /api/v1/predictions/track`
- **Description**: Spatiotemporal ConvLSTM trajectory forecasting.
- **Request Body**: `{"cyclone_id": "2019117N12089", "forecast_horizon_hours": 18}`
- **Response**: `200 OK` with projected track steps, future coordinates, and uncertainty radii in km.

### `POST /api/v1/predictions/analyze`
- **Description**: Full multi-task inference pipeline executing detection, classification, intensity forecast, and trajectory forecast.
- **Request Body**:
  ```json
  {
    "cyclone_id": "2020137N10087",
    "forecast_horizon_hours": 12,
    "include_satellite_features": true
  }
  ```
- **Response**: `200 OK` with complete analysis payload and unique `prediction_run_id`.

### `GET /api/v1/predictions/{prediction_id}`
- **Description**: Retrieves audit record and persistent outputs of a previous inference run.

---

## 5. Metrics & Reports

### `GET /api/v1/metrics`
- **Description**: Returns verified evaluation metrics and baseline comparisons loaded from `ml/artifacts/evaluation_metrics.json`.

### `GET /api/v1/reports`
- **Description**: Lists all compiled reports.

### `POST /api/v1/reports`
- **Description**: Compiles a new research report (PDF using ReportLab or CSV).
- **Request Body**: `{"title": "Cyclone Fani Report", "cyclone_id": "2019117N12089", "report_type": "pdf"}`
- **Response**: `201 Created` with file size and identifier.

### `GET /api/v1/reports/{report_id}/download`
- **Description**: Directly streams the binary PDF or CSV report file.
