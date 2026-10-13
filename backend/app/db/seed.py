"""
Database Seeding Script.
Creates all database tables and populates verified historical cyclone records.
"""

import json
import logging
import os
import sys

# Ensure backend and project root are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.db.base import Base
from backend.app.db.session import engine, SessionLocal
from backend.app.models.db_models import CycloneModel, TrackPointModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_db")


def seed_database(force_recreate: bool = False, db_engine=None, db_sessionmaker=None):
    """Create tables and seed initial historical cyclone dataset."""
    target_engine = db_engine or engine
    target_sessionmaker = db_sessionmaker or SessionLocal

    logger.info("Initializing database schema...")
    if force_recreate:
        Base.metadata.drop_all(bind=target_engine)
    Base.metadata.create_all(bind=target_engine)

    session = target_sessionmaker()
    try:
        existing_count = session.query(CycloneModel).count()
        if existing_count > 0:
            logger.info(f"Database already contains {existing_count} cyclone records. Skipping seed.")
            return

        fixture_path = os.path.join(PROJECT_ROOT, "data", "fixtures", "sample_cyclones.json")
        if not os.path.exists(fixture_path):
            logger.warning(f"Seed fixture not found at {fixture_path}")
            return

        with open(fixture_path, "r") as f:
            data = json.load(f)
            cyclones = data.get("cyclones", [])

        for item in cyclones:
            cyclone = CycloneModel(
                cyclone_id=item["cyclone_id"],
                name=item["name"],
                season_year=item["season_year"],
                basin=item.get("basin", "North Indian Ocean"),
                subbasin=item.get("subbasin", "Bay of Bengal"),
                nature=item.get("nature", "Tropical"),
                max_wind_speed_kts=item.get("max_wind_speed_kts"),
                min_central_pressure_hpa=item.get("min_central_pressure_hpa"),
                highest_imd_stage=item.get("highest_imd_stage"),
            )
            session.add(cyclone)

            for pt in item.get("track_points", []):
                track_pt = TrackPointModel(
                    cyclone_id=item["cyclone_id"],
                    timestamp_utc=pt["timestamp_utc"],
                    latitude=pt["latitude"],
                    longitude=pt["longitude"],
                    wind_speed_kts=pt.get("wind_speed_kts"),
                    central_pressure_hpa=pt.get("central_pressure_hpa"),
                    imd_stage=pt.get("imd_stage"),
                    image_path=pt.get("image_path"),
                )
                session.add(track_pt)

        session.commit()
        logger.info(f"Successfully seeded {len(cyclones)} cyclone records into database.")
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
