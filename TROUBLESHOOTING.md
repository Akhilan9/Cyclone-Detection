# Troubleshooting Guide

## 1. Common Issues and Resolutions

### Issue 1: "Trained models not loaded / 503 Service Unavailable"
- **Cause**: The model checkpoint files `cnn_spatial_best.pt` or `convlstm_temporal_best.pt` have not been generated yet.
- **Resolution**:
  Execute the training pipeline to generate the serialized weights:
  ```bash
  python ml/training/train_models.py
  ```
  Verify that `ml/artifacts/cnn_spatial_best.pt` and `ml/artifacts/convlstm_temporal_best.pt` exist.

### Issue 2: "Database connection failed / psql not found"
- **Cause**: PostgreSQL service is not running locally.
- **Resolution**:
  The application is pre-configured with a zero-dependency SQLite fallback (`cyclone_dev.db`).
  In `.env`, set:
  ```env
  DATABASE_URL=sqlite:///./cyclone_dev.db
  ```
  Run `python backend/app/db/seed.py` to initialize tables and populate sample cyclones.

### Issue 3: "Port 8000 already in use"
- **Cause**: A previous Uvicorn process is occupying port 8000.
- **Resolution**:
  On Windows PowerShell:
  ```powershell
  Get-Process -Name python | Stop-Process -Force
  ```
  Then re-launch `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`.

### Issue 4: "Frontend fails to communicate with backend (CORS or network error)"
- **Cause**: Backend is not running or CORS origins do not include `http://localhost:5173`.
- **Resolution**:
  1. Verify backend responds at `http://127.0.0.1:8000/health`.
  2. Confirm `CORS_ORIGINS` in `.env` contains `"http://localhost:5173,http://127.0.0.1:5173"`.
  3. Ensure Vite proxy in `frontend/vite.config.ts` points to `http://127.0.0.1:8000`.

### Issue 5: "Leaflet map CSS not rendering properly"
- **Cause**: Leaflet stylesheet not imported.
- **Resolution**:
  Leaflet styles are included via `@import "leaflet/dist/leaflet.css";` in `frontend/src/index.css`. Ensure `npm install leaflet` was executed in the frontend directory.
