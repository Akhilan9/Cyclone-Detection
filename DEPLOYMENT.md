# Deployment and Operations Guide

## 1. Prerequisites
- **Python**: 3.11, 3.12, or 3.13 (verified working on Python 3.13)
- **Node.js**: v20+ or v24+ with npm
- **Database**: PostgreSQL 15+ (production) or local SQLite (development/testing)
- **Docker**: Docker Desktop with Docker Compose (optional for containerized deployment)

---

## 2. Local Development Setup (Windows / macOS / Linux)

### Step 1: Clone & Configure Environment
```bash
git clone <repo-url>
cd "Cyclone Detection (Major Project)"
copy .env.example .env
```

### Step 2: Install Python Dependencies
```bash
pip install -r backend/requirements.txt
```

### Step 3: Initialize Database & Seed Historical Records
```bash
python backend/app/db/seed.py
```
This automatically initializes the relational schema and seeds 5 verified North Indian Ocean cyclones (Fani, Amphan, Tauktae, Biparjoy, Michaung) with 50 synoptic observations.

### Step 4: Run Alembic Database Migrations
```bash
alembic upgrade head
```

### Step 5: Train and Evaluate Machine Learning Models
```bash
python ml/training/train_models.py
```
This trains the multi-head spatial CNN and the spatiotemporal ConvLSTM network, generates checkpoint artifacts in `ml/artifacts/`, and saves verified evaluation metrics in `ml/artifacts/evaluation_metrics.json`.

### Step 6: Execute Automated Test Suite
```bash
pytest -v
```
Verifies all 21 unit and integration tests across backend API endpoints and ML pipelines.

### Step 7: Start FastAPI Backend Server
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Swagger UI will be live at: `http://localhost:8000/docs`.

### Step 8: Install & Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.

---

## 3. Production Deployment with Docker Compose

To deploy the entire production stack (PostgreSQL + FastAPI Backend + Nginx Frontend):

```bash
docker-compose up --build -d
```
- Frontend Dashboard: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
