"""
Dataset Splitting and Manifest Generation.
Strictly enforces storm-level partitioning to guarantee zero data leakage between
training, validation, and held-out evaluation sets.
"""

import os
import json
import logging
from typing import Any, Dict, List, Set, Tuple
import numpy as np
import pandas as pd

logger = logging.getLogger("dataset_pipeline")


def train_val_test_split_by_cyclone(
    cyclones: List[Dict[str, Any]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    random_seed: int = 42,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Split cyclone entities strictly by cyclone_id.
    Guarantees no storm's observations appear in more than one partition.
    """
    if not cyclones:
        return [], [], []

    rng = np.random.RandomState(random_seed)
    storm_ids = [c["cyclone_id"] for c in cyclones]
    unique_ids = list(dict.fromkeys(storm_ids))  # preserve order before shuffle
    rng.shuffle(unique_ids)

    n_total = len(unique_ids)
    n_train = max(1, int(n_total * train_ratio))
    n_val = max(1, int(n_total * val_ratio)) if (n_total - n_train) > 1 else 0

    train_ids = set(unique_ids[:n_train])
    val_ids = set(unique_ids[n_train : n_train + n_val])
    test_ids = set(unique_ids[n_train + n_val :])

    # If small test set, ensure test is non-empty if n_total >= 3
    if not test_ids and len(val_ids) > 1:
        test_ids.add(val_ids.pop())

    # Verify zero data leakage
    assert len(train_ids.intersection(val_ids)) == 0, "Leakage detected: train & val overlap"
    assert len(train_ids.intersection(test_ids)) == 0, "Leakage detected: train & test overlap"
    assert len(val_ids.intersection(test_ids)) == 0, "Leakage detected: val & test overlap"

    train_cyclones = [c for c in cyclones if c["cyclone_id"] in train_ids]
    val_cyclones = [c for c in cyclones if c["cyclone_id"] in val_ids]
    test_cyclones = [c for c in cyclones if c["cyclone_id"] in test_ids]

    logger.info(
        f"Cyclone-level partition: {len(train_cyclones)} train storms ({len(train_ids)} IDs), "
        f"{len(val_cyclones)} val storms ({len(val_ids)} IDs), "
        f"{len(test_cyclones)} test storms ({len(test_ids)} IDs)"
    )
    return train_cyclones, val_cyclones, test_cyclones


def build_dataset_manifest(
    cyclones: List[Dict[str, Any]],
    output_manifest_path: str,
    train_ids: Set[str],
    val_ids: Set[str],
    test_ids: Set[str],
) -> pd.DataFrame:
    """Generate reproducible CSV manifest mapping every observation to its split partition."""
    rows = []
    for storm in cyclones:
        c_id = storm["cyclone_id"]
        c_name = storm.get("name", "UNNAMED")
        season = storm.get("season_year", 0)
        basin = storm.get("basin", "North Indian Ocean")
        subbasin = storm.get("subbasin", "Bay of Bengal")

        split_label = "train"
        if c_id in test_ids:
            split_label = "test"
        elif c_id in val_ids:
            split_label = "val"

        for obs_idx, obs in enumerate(storm.get("track_points", [])):
            rows.append({
                "cyclone_id": c_id,
                "cyclone_name": c_name,
                "season_year": season,
                "basin": basin,
                "subbasin": subbasin,
                "obs_index": obs_idx,
                "timestamp_utc": obs.get("timestamp_utc"),
                "latitude": obs.get("latitude"),
                "longitude": obs.get("longitude"),
                "wind_speed_kts": obs.get("wind_speed_kts"),
                "central_pressure_hpa": obs.get("central_pressure_hpa"),
                "imd_stage": obs.get("imd_stage"),
                "image_path": obs.get("image_path", ""),
                "split": split_label,
            })

    df_manifest = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(output_manifest_path), exist_ok=True)
    df_manifest.to_csv(output_manifest_path, index=False)
    logger.info(f"Dataset manifest with {len(df_manifest)} entries written to {output_manifest_path}")
    return df_manifest
