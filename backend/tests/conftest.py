"""
Pytest Fixtures for FastAPI Backend Tests.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.db.seed import seed_database
from backend.app.services.inference_service import InferenceEngine

TEST_DB_URL = "sqlite:///./test_cyclone_db.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Setup test database and initialize inference engine once for test session."""
    seed_database(force_recreate=True, db_engine=test_engine, db_sessionmaker=TestingSessionLocal)
    InferenceEngine.get_instance()
    yield
    # Cleanup test db
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_cyclone_db.db"):
        try:
            os.remove("./test_cyclone_db.db")
        except OSError:
            pass


@pytest.fixture
def db_session():
    """Provide transactional database session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    """Provide FastAPI test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
