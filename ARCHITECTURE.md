# System Architecture & Technical Design

## 1. Executive Architecture Summary
The system is an end-to-end meteorological deep learning platform engineered for tropical cyclone convective presence detection, 7-stage intensity categorization (India Meteorological Department standard), and multi-horizon (+6h, +12h, +18h, +24h) trajectory and central intensity forecasting in the North Indian Ocean (Bay of Bengal and Arabian Sea).

The system integrates:
- **FastAPI Python Backend** with SQLAlchemy 2.0 ORM, Alembic migrations, Pydantic v2 schemas, ReportLab PDF generation, and streaming CSV exports.
- **Deep Learning Pipelines**:
  - Spatial Multi-Head CNN (extracts hierarchical cloud morphology from satellite thermal infrared imagery).
  - Spatiotemporal ConvLSTM (fuses convective rotational memory from sequential frames $T=4$ with kinematic track observations).
- **Relational Storage**: PostgreSQL production target with zero-configuration SQLite local development and test fallback.
- **Interactive React 19 + TypeScript + Vite Dashboard** with Leaflet mapping, SVG intensity profiles, benchmark comparison charts, and one-click report downloads.

---

## 2. System Architecture Diagram

```mermaid
graph TD
    subgraph Data Sources
        DS1[NOAA IBTrACS NIO Best-Track]
        DS2[IMD RSMC New Delhi Bulletins]
        DS3[INSAT-3D/3DR Geostationary TIR]
        DS4[Benchmark Test Fixtures]
    end

    subgraph Data Ingestion & Preprocessing
        P1[Coordinate & Timestamp Validator]
        P2[Haversine Geodesic Distance Engine]
        P3[Thermal IR Normalizer 64x64]
        P4[Sliding Sequence Builder T=4, H=1..4]
        P5[Cyclone-Level Stratified Splitter]
    end

    subgraph Deep Learning Engine
        CNN[CycloneSpatialCNN Multi-Head]
        ConvLSTM[CycloneConvLSTMNet Spatiotemporal]
        BASE1[Persistence Kinematic Baseline]
        BASE2[Linear Velocity Extrapolation]
    end

    subgraph FastAPI Backend
        API_H[Health & Status Endpoints]
        API_C[Cyclones & Track Points API]
        API_P[Predictions & Analysis Service]
        API_M[Metrics & Benchmarks API]
        API_R[ReportLab PDF & CSV Generator]
    end

    subgraph Relational Database
        DB[(PostgreSQL / SQLite)]
        T1[cyclones]
        T2[track_points]
        T3[prediction_runs]
        T4[prediction_results]
        T5[reports]
    end

    subgraph React 19 Frontend Dashboard
        UI_O[Dashboard Overview]
        UI_A[Live Cyclone Analysis]
        UI_M[Leaflet Geospatial Map]
        UI_I[Intensity Timeline]
        UI_E[Model Evaluation & Confusion Matrix]
        UI_R[Reports Archive & Downloads]
        UI_D[Data Sources Catalog]
    end

    DS1 & DS2 & DS3 & DS4 --> P1 --> P2 --> P3 --> P4 --> P5
    P5 --> CNN & ConvLSTM & BASE1 & BASE2
    CNN & ConvLSTM --> API_P
    API_C & API_P & API_R <--> DB
    API_H & API_C & API_P & API_M & API_R <--> UI_O & UI_A & UI_M & UI_I & UI_E & UI_R & UI_D
```

---

## 3. Data Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Meteorologist / Researcher
    participant UI as React Dashboard
    participant API as FastAPI Backend
    participant IE as Inference Engine
    participant DB as SQLite / PostgreSQL
    participant ML as PyTorch / Keras Models

    User->>UI: Selects Cyclone (e.g., FANI) & Lead Time (+12h)
    UI->>API: POST /api/v1/predictions/analyze
    API->>DB: Query historical track points & metadata
    DB-->>API: Return chronological track sequence (T=4)
    API->>IE: Process sequence (Images + Coordinates + Sustained Winds)
    IE->>ML: Forward pass through CNN & ConvLSTM
    ML-->>IE: Predicted Class, MSW Wind, Future (Lat, Lon)
    IE->>DB: Persist PredictionRun & PredictionResult records
    API-->>UI: 200 OK (Multi-head JSON payload)
    UI->>UI: Render Leaflet projected track, uncertainty cone & intensity curve
    User->>UI: Click "Download Scientific Report (PDF)"
    UI->>API: POST /api/v1/reports (report_type='pdf')
    API->>API: Compile PDF with ReportLab (Tables + Disclaimers)
    API-->>UI: 201 Created (Report ID & download URL)
    UI->>API: GET /api/v1/reports/{id}/download
    API-->>User: Stream binary PDF file
```

---

## 4. Component Diagram

```mermaid
classDiagram
    class CycloneDataPreprocessor {
        +target_image_size: Tuple
        +channels: int
        +preprocess_image(input) np.ndarray
        +validate_coordinates(lat, lon) bool
        +haversine_distance_km(lat1, lon1, lat2, lon2) float
        +imd_category_to_index(stage) int
        +index_to_imd_category(idx) str
    }

    class SpatiotemporalSequenceBuilder {
        +sequence_length: int
        +forecast_horizon_steps: int
        +build_sequences_from_cyclone_records(records) Dict
    }

    class CycloneSpatialCNN {
        +features: Sequential
        +shared_dense: Sequential
        +presence_head: Sequential
        +classification_head: Sequential
        +wind_regression_head: Sequential
        +forward(x) Dict
    }

    class CycloneConvLSTMNet {
        +frame_encoder: Sequential
        +convlstm: ConvLSTMCell
        +kinematic_encoder: Sequential
        +fusion: Sequential
        +trajectory_head: Sequential
        +intensity_head: Sequential
        +forward(img_seq, coord_seq, wind_seq) Dict
    }

    class InferenceEngine {
        -_instance: InferenceEngine
        +cnn_model: CycloneSpatialCNN
        +convlstm_model: CycloneConvLSTMNet
        +detect_presence(img) Dict
        +classify_category(img) Dict
        +forecast_track_and_intensity(coords, winds, horizon) Dict
    }

    CycloneDataPreprocessor <.. SpatiotemporalSequenceBuilder
    CycloneSpatialCNN <.. InferenceEngine
    CycloneConvLSTMNet <.. InferenceEngine
```

---

## 5. Deployment Diagram

```mermaid
graph LR
    subgraph Client Device
        Browser[Modern Web Browser - Desktop/Mobile]
    end

    subgraph Docker Host / Local Machine
        Nginx[Nginx Reverse Proxy / Vite Dev Server :5173]
        FastAPI[Uvicorn ASGI Python Server :8000]
        Postgres[(PostgreSQL Database :5432)]
        FileSystem[Local Disk - ML Artifacts & Reports]
    end

    Browser -- HTTP/REST :5173 --> Nginx
    Nginx -- Proxy /api --> FastAPI
    FastAPI -- SQL / TCP :5432 --> Postgres
    FastAPI -- Read Checkpoints / Write Reports --> FileSystem
```
