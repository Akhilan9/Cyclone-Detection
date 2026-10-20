"""
Spatiotemporal Sequence Builder for ConvLSTM and Temporal Forecasting.
Constructs sliding window sequences of satellite images and track metadata
strictly grouped by cyclone identifier to prevent cross-storm data contamination.
"""

import os
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from ml.pipelines.preprocessor import CycloneDataPreprocessor


class SpatiotemporalSequenceBuilder:
    """Constructs temporal sliding windows for spatiotemporal cyclone forecasting."""

    def __init__(
        self,
        sequence_length: int = 4,
        forecast_horizon_steps: int = 1,  # 1 step = +6 hours (if 6-hourly observations)
        image_shape: Tuple[int, int, int] = (64, 64, 1),
    ):
        """
        Args:
            sequence_length: Number of consecutive past observations (T)
            forecast_horizon_steps: Number of steps ahead to predict (H)
            image_shape: (height, width, channels)
        """
        self.sequence_length = sequence_length
        self.forecast_horizon_steps = forecast_horizon_steps
        self.image_shape = image_shape
        self.preprocessor = CycloneDataPreprocessor(
            target_image_size=(image_shape[0], image_shape[1]),
            channels=image_shape[2]
        )

    def build_sequences_from_cyclone_records(
        self,
        cyclones_data: List[Dict[str, Any]],
        generate_synthetic_image_if_missing: bool = True,
    ) -> Dict[str, np.ndarray]:
        """
        Process a list of cyclone objects, each containing chronological track_points.
        Returns dictionary of numpy arrays:
          'X_images': (N, T, H, W, C)
          'X_coords': (N, T, 2) [latitude, longitude]
          'X_winds': (N, T, 1) [wind_speed_kts]
          'y_future_coords': (N, 2) [lat, lon at t + H]
          'y_future_wind': (N, 1) [wind at t + H]
          'y_future_class': (N,) [IMD category index at t + H]
          'cyclone_ids': (N,) array of cyclone identifier strings
        """
        X_images_list: List[np.ndarray] = []
        X_coords_list: List[np.ndarray] = []
        X_winds_list: List[np.ndarray] = []
        y_coords_list: List[np.ndarray] = []
        y_wind_list: List[np.ndarray] = []
        y_class_list: List[int] = []
        c_id_list: List[str] = []

        total_window = self.sequence_length + self.forecast_horizon_steps

        for storm in cyclones_data:
            c_id = storm.get("cyclone_id", "UNKNOWN")
            pts = storm.get("track_points", [])

            # Need at least total_window observations for a single sequence
            if len(pts) < total_window:
                continue

            for i in range(len(pts) - total_window + 1):
                window_in = pts[i : i + self.sequence_length]
                target_pt = pts[i + self.sequence_length + self.forecast_horizon_steps - 1]

                # 1. Coordinates and wind sequence
                coords_seq = []
                winds_seq = []
                images_seq = []

                for obs in window_in:
                    lat = float(obs.get("latitude", 0.0))
                    lon = float(obs.get("longitude", 0.0))
                    wind = float(obs.get("wind_speed_kts", 25.0))
                    coords_seq.append([lat, lon])
                    winds_seq.append([wind])

                    # Image observation: prioritize real NASA satellite observations
                    real_img_found = False
                    img_path = obs.get("image_path")
                    if img_path and os.path.exists(img_path):
                        try:
                            img_arr = self.preprocessor.preprocess_image(img_path)
                            real_img_found = True
                        except Exception:
                            real_img_found = False

                    if not real_img_found:
                        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                        cand_path = os.path.join(base_dir, "data", "raw", "satellite_images", f"{c_id}_real_tir.png")
                        if os.path.exists(cand_path):
                            try:
                                img_arr = self.preprocessor.preprocess_image(cand_path)
                                real_img_found = True
                            except Exception:
                                real_img_found = False

                    if not real_img_found:
                        if generate_synthetic_image_if_missing:
                            img_arr = self._generate_vortex_pattern(lat, lon, wind)
                        else:
                            img_arr = np.zeros(self.image_shape, dtype=np.float32)

                    images_seq.append(img_arr)

                # Target future observation
                tgt_lat = float(target_pt.get("latitude", 0.0))
                tgt_lon = float(target_pt.get("longitude", 0.0))
                tgt_wind = float(target_pt.get("wind_speed_kts", 25.0))
                tgt_stage = target_pt.get("imd_stage", "Depression (D)")
                tgt_class = self.preprocessor.imd_category_to_index(tgt_stage)

                X_images_list.append(np.stack(images_seq, axis=0))  # (T, H, W, C)
                X_coords_list.append(np.array(coords_seq, dtype=np.float32))  # (T, 2)
                X_winds_list.append(np.array(winds_seq, dtype=np.float32))  # (T, 1)
                y_coords_list.append(np.array([tgt_lat, tgt_lon], dtype=np.float32))  # (2,)
                y_wind_list.append(np.array([tgt_wind], dtype=np.float32))  # (1,)
                y_class_list.append(tgt_class)
                c_id_list.append(c_id)

        if not X_images_list:
            # Return empty arrays with proper dimensions
            return {
                "X_images": np.empty((0, self.sequence_length, *self.image_shape), dtype=np.float32),
                "X_coords": np.empty((0, self.sequence_length, 2), dtype=np.float32),
                "X_winds": np.empty((0, self.sequence_length, 1), dtype=np.float32),
                "y_future_coords": np.empty((0, 2), dtype=np.float32),
                "y_future_wind": np.empty((0, 1), dtype=np.float32),
                "y_future_class": np.empty((0,), dtype=np.int64),
                "cyclone_ids": np.empty((0,), dtype=object),
            }

        return {
            "X_images": np.stack(X_images_list, axis=0).astype(np.float32),
            "X_coords": np.stack(X_coords_list, axis=0).astype(np.float32),
            "X_winds": np.stack(X_winds_list, axis=0).astype(np.float32),
            "y_future_coords": np.stack(y_coords_list, axis=0).astype(np.float32),
            "y_future_wind": np.stack(y_wind_list, axis=0).astype(np.float32),
            "y_future_class": np.array(y_class_list, dtype=np.int64),
            "cyclone_ids": np.array(c_id_list, dtype=object),
        }

    def _generate_vortex_pattern(self, lat: float, lon: float, wind_kts: float) -> np.ndarray:
        """
        Generate physically grounded synthetic satellite IR vortex representation
        when raw image files are missing, modeling cyclone spiral rainbands and central dense overcast.
        """
        h, w, c = self.image_shape
        y, x = np.ogrid[:h, :w]
        cy, cx = h / 2.0, w / 2.0
        r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
        theta = np.arctan2(y - cy, x - cx)

        # Intensity scales spiral tight-winding and core brightness temperature
        norm_wind = min(max(wind_kts / 130.0, 0.1), 1.0)
        spiral = np.sin(3.0 * np.log(np.maximum(r, 1.0)) - theta)
        radial_decay = np.exp(-(r ** 2) / (2.0 * (w * 0.35) ** 2))

        # Brightness temperature: dense convective core has low IR temp (high normalized contrast)
        vortex = (radial_decay * (0.6 + 0.4 * spiral) * norm_wind).clip(0.0, 1.0)
        if c == 1:
            return np.expand_dims(vortex.astype(np.float32), axis=-1)
        else:
            return np.repeat(np.expand_dims(vortex.astype(np.float32), axis=-1), c, axis=-1)
