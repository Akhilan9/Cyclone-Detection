"""
Automated Backend Test Suite for FastAPI Endpoints.
Verifies health, status, models, data sources, cyclones, predictions, metrics, and reports.
"""

import pytest
from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    """Verify GET /health endpoint."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Tropical Cyclone" in data["service"]


def test_system_status(client: TestClient):
    """Verify GET /api/v1/status endpoint."""
    res = client.get("/api/v1/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert data["database_connected"] is True
    assert data["models_ready"] is True
    assert data["total_cyclones_in_db"] >= 5


def test_get_models(client: TestClient):
    """Verify GET /api/v1/models catalog."""
    res = client.get("/api/v1/models")
    assert res.status_code == 200
    data = res.json()
    assert len(data["models"]) >= 4
    model_ids = [m["model_id"] for m in data["models"]]
    assert "cnn_spatial_v1" in model_ids
    assert "convlstm_spatiotemporal_v1" in model_ids
    assert "baseline_persistence" in model_ids


def test_get_data_sources(client: TestClient):
    """Verify GET /api/v1/data/sources."""
    res = client.get("/api/v1/data/sources")
    assert res.status_code == 200
    data = res.json()
    assert data["total_sources"] >= 3
    source_ids = [s["id"] for s in data["sources"]]
    assert "noaa_ibtracs_nio" in source_ids


def test_list_cyclones(client: TestClient):
    """Verify GET /api/v1/cyclones."""
    res = client.get("/api/v1/cyclones")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    names = [c["name"] for c in data]
    assert "FANI" in names
    assert "AMPHAN" in names


def test_get_cyclone_details_valid(client: TestClient):
    """Verify GET /api/v1/cyclones/{id} with valid cyclone."""
    res = client.get("/api/v1/cyclones/2019117N12089")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "FANI"
    assert len(data["track_points"]) >= 10
    assert data["highest_imd_stage"] == "Extremely Severe Cyclonic Storm (ESCS)"


def test_get_cyclone_details_not_found(client: TestClient):
    """Verify GET /api/v1/cyclones/{id} 404 for non-existent cyclone."""
    res = client.get("/api/v1/cyclones/NON_EXISTENT_CYCLONE_999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_prediction_detect(client: TestClient):
    """Verify POST /api/v1/predictions/detect."""
    payload = {"sample_preset": "fani_eye"}
    res = client.post("/api/v1/predictions/detect", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "presence_probability" in data
    assert 0.0 <= data["presence_probability"] <= 1.0
    assert isinstance(data["is_cyclone_detected"], bool)


def test_prediction_classify(client: TestClient):
    """Verify POST /api/v1/predictions/classify."""
    payload = {"cyclone_id": "2019117N12089"}
    res = client.post("/api/v1/predictions/classify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "predicted_category" in data
    assert "category_probabilities" in data
    assert len(data["category_probabilities"]) == 7


def test_prediction_intensity(client: TestClient):
    """Verify POST /api/v1/predictions/intensity."""
    payload = {"cyclone_id": "2019117N12089", "forecast_horizon_hours": 12}
    res = client.post("/api/v1/predictions/intensity", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["forecast_horizon_hours"] == 12
    assert "predicted_intensity_kts" in data
    assert "predicted_imd_stage" in data


def test_prediction_track(client: TestClient):
    """Verify POST /api/v1/predictions/track."""
    payload = {"cyclone_id": "2019117N12089", "forecast_horizon_hours": 18}
    res = client.post("/api/v1/predictions/track", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["forecast_horizon_hours"] == 18
    assert len(data["projected_track"]) == 3  # 18h // 6h = 3 steps
    assert len(data["predicted_coordinates"]) == 2


def test_prediction_analyze(client: TestClient):
    """Verify POST /api/v1/predictions/analyze (End-to-End Pipeline)."""
    payload = {"cyclone_id": "2020137N10087", "forecast_horizon_hours": 12}
    res = client.post("/api/v1/predictions/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["cyclone_name"] == "AMPHAN"
    assert "detection" in data
    assert "classification" in data
    assert "intensity" in data
    assert "track_forecast" in data
    assert "prediction_run_id" in data

    # Verify run retrieval via GET /api/v1/predictions/{id}
    run_id = data["prediction_run_id"]
    get_run_res = client.get(f"/api/v1/predictions/{run_id}")
    assert get_run_res.status_code == 200
    run_data = get_run_res.json()
    assert run_data["id"] == run_id
    assert run_data["status"] == "completed"


def test_metrics_endpoint(client: TestClient):
    """Verify GET /api/v1/metrics."""
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "benchmark_comparison" in data
    assert "persistence_baseline" in data["benchmark_comparison"]
    assert "convlstm_spatiotemporal" in data["benchmark_comparison"]
    assert "classification_metrics" in data


def test_report_generation_and_download(client: TestClient):
    """Verify report generation (PDF and CSV) and download endpoints."""
    # 1. Generate PDF Report
    pdf_req = {"title": "Cyclone Fani Test Report", "cyclone_id": "2019117N12089", "report_type": "pdf"}
    pdf_res = client.post("/api/v1/reports", json=pdf_req)
    assert pdf_res.status_code == 201
    pdf_data = pdf_res.json()
    pdf_id = pdf_data["id"]
    assert pdf_data["report_type"] == "pdf"
    assert pdf_data["file_size_bytes"] > 0

    # 2. Download PDF
    dl_pdf_res = client.get(f"/api/v1/reports/{pdf_id}/download")
    assert dl_pdf_res.status_code == 200
    assert dl_pdf_res.headers["content-type"] == "application/pdf"
    assert len(dl_pdf_res.content) > 1000

    # 3. Generate CSV Report
    csv_req = {"title": "Cyclone Fani CSV Export", "cyclone_id": "2019117N12089", "report_type": "csv"}
    csv_res = client.post("/api/v1/reports", json=csv_req)
    assert csv_res.status_code == 201
    csv_data = csv_res.json()
    csv_id = csv_data["id"]

    # 4. Download CSV
    dl_csv_res = client.get(f"/api/v1/reports/{csv_id}/download")
    assert dl_csv_res.status_code == 200
    assert "text/csv" in dl_csv_res.headers["content-type"]
    assert b"cyclone_id,cyclone_name" in dl_csv_res.content


def test_invalid_input_validation(client: TestClient):
    """Verify Pydantic input validation rejections."""
    # Invalid latitude in track forecast request
    bad_payload = {
        "cyclone_id": "2019117N12089",
        "historical_coordinates": [[999.0, 999.0]],  # Invalid coordinates
    }
    # Forecast horizon too high
    bad_horizon_payload = {
        "cyclone_id": "2019117N12089",
        "forecast_horizon_hours": 999,  # exceeds maximum 48
    }
    res = client.post("/api/v1/predictions/track", json=bad_horizon_payload)
    assert res.status_code == 422
