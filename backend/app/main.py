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
from fastapi.responses import JSONResponse

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
