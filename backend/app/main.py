"""
FastAPI Application Entrypoint for Tropical Cyclone AI Framework.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import sys

# Ensure backend directory and project root are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging, logger
from backend.app.db.seed import seed_database
from backend.app.services.inference_service import InferenceEngine
from backend.app.api.v1.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Initializing Tropical Cyclone AI Backend Application...")
    # Initialize database tables and seed if empty
    try:
        seed_database(force_recreate=False)
    except Exception as e:
        logger.error(f"Database initialization warning: {e}")

    # Load ML models into singleton memory
    try:
        InferenceEngine.get_instance()
    except Exception as e:
        logger.error(f"Error initializing Inference Engine: {e}")

    logger.info(f"{settings.APP_NAME} started successfully!")
    yield
    logger.info("Shutting down Tropical Cyclone AI Backend Application...")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "A Deep Learning Framework for Multi-Source Satellite-Based "
        "Tropical Cyclone Detection, Classification, and Prediction (North Indian Ocean Basin)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse, tags=["Root"])
def root_landing_page():
    """Root landing page directing users to the frontend dashboard and API docs."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CycloFusion AI/ML - Backend API Active</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .card {
            background: rgba(30, 41, 59, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            padding: 40px;
            border-radius: 20px;
            max-width: 620px;
            width: 90%;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
            text-align: center;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.4);
            padding: 5px 14px;
            border-radius: 9999px;
            font-size: 0.82rem;
            font-weight: 700;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 2rem;
            margin: 0 0 10px;
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        p {
            color: #94a3b8;
            font-size: 0.96rem;
            line-height: 1.5;
            margin: 0 0 30px;
        }
        .btn-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }
        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 20px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 0.95rem;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .btn-primary {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: #ffffff;
            grid-column: span 2;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
        }
        .btn-secondary {
            background: rgba(51, 65, 85, 0.7);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .btn-secondary:hover {
            background: rgba(71, 85, 105, 0.9);
            color: #ffffff;
        }
        .endpoints {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 0.82rem;
            color: #64748b;
        }
        .endpoints a {
            color: #38bdf8;
            text-decoration: none;
            margin: 0 6px;
        }
        .endpoints a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399; display: inline-block;"></span>
            Backend API Active & Healthy
        </div>
        <h1>CycloFusion AI Framework</h1>
        <p>You have accessed the FastAPI REST backend server on port 8000. To use the full interactive web dashboard, open the frontend on port 5173.</p>

        <div class="btn-grid">
            <a href="http://127.0.0.1:5173/" class="btn btn-primary">
                🚀 Open Interactive Web Dashboard (Port 5173)
            </a>
            <a href="/docs" class="btn btn-secondary">
                📖 Swagger API Docs
            </a>
            <a href="/redoc" class="btn btn-secondary">
                📄 Redoc API Specs
            </a>
        </div>

        <div class="endpoints">
            Quick Endpoints:
            <a href="/api/v1/cyclones">/api/v1/cyclones</a> •
            <a href="/api/v1/status">/api/v1/status</a> •
            <a href="/api/v1/metrics">/api/v1/metrics</a> •
            <a href="/health">/health</a>
        </div>
    </div>
</body>
</html>"""


@app.get("/health", tags=["System Health"])
def health_check():
    """Liveness probe and system health status."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


# Include v1 API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please consult backend logs."},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
