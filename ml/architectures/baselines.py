"""
Benchmark Baselines for Tropical Cyclone Trajectory and Intensity Forecasting.
Includes:
1. Persistence Forecaster (holds position & intensity constant)
2. Linear Extrapolation Forecaster (kinematic velocity extrapolation)
3. Climatological/Mean Baseline
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from ml.pipelines.preprocessor import CycloneDataPreprocessor


class PersistenceForecaster:
    """
    Persistence Baseline:
    Assumes future cyclone coordinates and intensity remain identical to the most recent observation.
    Target at t+H:
      lat(t+H) = lat(t)
      lon(t+H) = lon(t)
      wind(t+H) = wind(t)
    """

    def __init__(self):
        self.name = "Persistence Baseline"

    def predict(
        self,
        past_coords: np.ndarray,  # Shape (N, T, 2) or (T, 2)
        past_winds: np.ndarray,   # Shape (N, T, 1) or (T, 1)
    ) -> Dict[str, np.ndarray]:
        """Predict using persistence (last observed values)."""
        if past_coords.ndim == 2:
            # Single sample of shape (T, 2)
            last_coord = past_coords[-1, :]
            last_wind = past_winds[-1, :]
            return {
                "pred_coords": last_coord,
                "pred_wind": last_wind,
            }
        else:
            # Batch of shape (N, T, 2)
            last_coords = past_coords[:, -1, :]  # (N, 2)
            last_winds = past_winds[:, -1, :]    # (N, 1)
            return {
                "pred_coords": last_coords,
                "pred_wind": last_winds,
            }


class LinearExtrapolationForecaster:
    """
    Kinematic Linear Extrapolation Baseline:
    Estimates velocity from the last two observations and linearly projects forward.
    coord(t+H) = coord(t) + H * (coord(t) - coord(t-1))
    wind(t+H) = wind(t) + H * (wind(t) - wind(t-1))
    """

    def __init__(self, step_multiplier: float = 1.0):
        self.name = "Linear Extrapolation Baseline"
        self.step_multiplier = step_multiplier

    def predict(
        self,
        past_coords: np.ndarray,  # (N, T, 2)
        past_winds: np.ndarray,   # (N, T, 1)
    ) -> Dict[str, np.ndarray]:
        """Extrapolate forward based on recent velocity."""
        if past_coords.ndim == 2:
            t_curr = past_coords[-1, :]
            t_prev = past_coords[-2, :]
            delta_coord = t_curr - t_prev
            pred_coord = t_curr + (self.step_multiplier * delta_coord)

            w_curr = past_winds[-1, :]
            w_prev = past_winds[-2, :]
            delta_wind = w_curr - w_prev
            pred_wind = np.clip(w_curr + (self.step_multiplier * delta_wind), 15.0, 185.0)

            return {"pred_coords": pred_coord, "pred_wind": pred_wind}
        else:
            t_curr = past_coords[:, -1, :]
            t_prev = past_coords[:, -2, :]
            delta_coord = t_curr - t_prev
            pred_coords = t_curr + (self.step_multiplier * delta_coord)

            w_curr = past_winds[:, -1, :]
            w_prev = past_winds[:, -2, :]
            delta_wind = w_curr - w_prev
            pred_winds = np.clip(w_curr + (self.step_multiplier * delta_wind), 15.0, 185.0)

            return {"pred_coords": pred_coords, "pred_winds": pred_winds}
