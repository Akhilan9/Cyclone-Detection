"""
Data Preprocessing Pipeline for Satellite Imagery and Cyclone Tracks.
Handles image normalization, coordinate validation, unit conversions,
and Haversine distance calculations.
"""

import math
import os
from typing import Dict, Optional, Tuple, Union
import numpy as np
import cv2


class CycloneDataPreprocessor:
    """Preprocessor for satellite imagery and cyclone spatiotemporal parameters."""

    def __init__(
        self,
        target_image_size: Tuple[int, int] = (64, 64),
        channels: int = 1,
        min_temp_k: float = 170.0,
        max_temp_k: float = 320.0,
    ):
        """
        Args:
            target_image_size: (height, width) for spatial resizing
            channels: 1 for infrared single channel, 3 for multi-spectral / RGB
            min_temp_k: Minimum brightness temperature in Kelvin for thermal IR
            max_temp_k: Maximum brightness temperature in Kelvin
        """
        self.target_image_size = target_image_size
        self.channels = channels
        self.min_temp_k = min_temp_k
        self.max_temp_k = max_temp_k

    def preprocess_image(
        self,
        image_input: Union[str, np.ndarray],
    ) -> np.ndarray:
        """
        Load (if filepath) and normalize satellite image to [0, 1].
        Returns array of shape (height, width, channels) with dtype float32.
        """
        if isinstance(image_input, str):
            if not os.path.exists(image_input):
                raise FileNotFoundError(f"Satellite image file not found: {image_input}")
            # Read image; grayscale if channels==1
            flags = cv2.IMREAD_GRAYSCALE if self.channels == 1 else cv2.IMREAD_COLOR
            img = cv2.imread(image_input, flags)
            if img is None:
                raise ValueError(f"Failed to decode image from {image_input}")
        elif isinstance(image_input, np.ndarray):
            img = image_input.copy()
            if self.channels == 1 and len(img.shape) == 3 and img.shape[2] == 3:
                img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            elif self.channels == 3 and len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        else:
            raise TypeError("image_input must be a file path or numpy array")

        # Resize to target dimension
        resized = cv2.resize(img, self.target_image_size, interpolation=cv2.INTER_AREA)

        # Ensure channel dimension is explicit: (H, W, C)
        if len(resized.shape) == 2:
            resized = np.expand_dims(resized, axis=-1)

        # Normalize pixel values to [0.0, 1.0]
        if resized.dtype == np.uint8:
            normalized = resized.astype(np.float32) / 255.0
        else:
            # Handle raw brightness temperature Kelvin if applicable
            norm = (resized.astype(np.float32) - self.min_temp_k) / (self.max_temp_k - self.min_temp_k)
            normalized = np.clip(norm, 0.0, 1.0)

        return normalized.astype(np.float32)

    @staticmethod
    def validate_coordinates(lat: float, lon: float, basin: str = "NIO") -> bool:
        """
        Validate geographical coordinates.
        For North Indian Ocean (NIO): Latitude in [0, 40], Longitude in [45, 110].
        """
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return False
        if basin == "NIO":
            return (0.0 <= lat <= 40.0) and (45.0 <= lon <= 110.0)
        return True

    @staticmethod
    def validate_wind_speed(wind_kts: float) -> bool:
        """Validate maximum sustained wind speed (knots). Reasonable tropical range: 10 to 200 kt."""
        return 10.0 <= wind_kts <= 200.0

    @staticmethod
    def validate_central_pressure(pressure_hpa: float) -> bool:
        """Validate central pressure (hPa). Reasonable tropical cyclone range: 870 to 1025 hPa."""
        return 870.0 <= pressure_hpa <= 1025.0

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Compute Great-Circle geodesic distance between two coordinate pairs in kilometers.
        d = 2 * R * arcsin(sqrt(sin^2(dlat/2) + cos(lat1)*cos(lat2)*sin^2(dlon/2)))
        """
        r_earth_km = 6371.0  # Earth's mean radius
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r_earth_km * c

    @staticmethod
    def imd_category_to_index(stage: str) -> int:
        """Map IMD stage to numeric classification index (0-6)."""
        mapping = {
            "Depression (D)": 0,
            "Deep Depression (DD)": 1,
            "Cyclonic Storm (CS)": 2,
            "Severe Cyclonic Storm (SCS)": 3,
            "Very Severe Cyclonic Storm (VSCS)": 4,
            "Extremely Severe Cyclonic Storm (ESCS)": 5,
            "Super Cyclonic Storm (SuCS)": 6,
        }
        return mapping.get(stage, 0)

    @staticmethod
    def index_to_imd_category(idx: int) -> str:
        """Map numeric classification index back to IMD category name."""
        mapping = {
            0: "Depression (D)",
            1: "Deep Depression (DD)",
            2: "Cyclonic Storm (CS)",
            3: "Severe Cyclonic Storm (SCS)",
            4: "Very Severe Cyclonic Storm (VSCS)",
            5: "Extremely Severe Cyclonic Storm (ESCS)",
            6: "Super Cyclonic Storm (SuCS)",
        }
        return mapping.get(idx, "Depression (D)")
