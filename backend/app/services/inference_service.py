"""
Inference Service for Spatial CNN & ConvLSTM Forecasting Models.
Handles tensor preprocessing, inference execution, post-processing,
and database persistence of prediction runs.
"""

import base64
from datetime import datetime, timezone, timedelta
import io
import json
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
import torch

from backend.app.core.config import settings
from backend.app.models.db_models import PredictionRunModel, PredictionResultModel, CycloneModel, TrackPointModel
from ml.architectures.cnn_spatial import CycloneSpatialCNN
from ml.architectures.convlstm_temporal import CycloneConvLSTMNet
from ml.pipelines.preprocessor import CycloneDataPreprocessor
from ml.pipelines.sequence_builder import SpatiotemporalSequenceBuilder

logger = logging.getLogger("inference_service")


class InferenceEngine:
    _instance = None

    def __init__(self):
        self.device = "cpu"
        self.preprocessor = CycloneDataPreprocessor(target_image_size=(64, 64), channels=1)
        self.seq_builder = SpatiotemporalSequenceBuilder(sequence_length=4, forecast_horizon_steps=1)

        self.cnn_model: Optional[CycloneSpatialCNN] = None
        self.convlstm_model: Optional[CycloneConvLSTMNet] = None
        self.models_loaded = False
        self._load_models()

    @classmethod
    def get_instance(cls) -> "InferenceEngine":
        if cls._instance is None:
            cls._instance = InferenceEngine()
        return cls._instance

    def _load_models(self):
        cnn_path = os.path.join(settings.ML_MODELS_DIR, "cnn_spatial_best.pt")
        convlstm_path = os.path.join(settings.ML_MODELS_DIR, "convlstm_temporal_best.pt")

        try:
            if os.path.exists(cnn_path):
                self.cnn_model = CycloneSpatialCNN(in_channels=1, num_classes=7)
                self.cnn_model.load_state_dict(torch.load(cnn_path, map_location=self.device))
                self.cnn_model.eval()
                logger.info(f"Loaded spatial CNN from {cnn_path}")
            else:
                logger.warning(f"CNN model checkpoint not found at {cnn_path}")

            if os.path.exists(convlstm_path):
                self.convlstm_model = CycloneConvLSTMNet(in_channels=1, hidden_dim=64, seq_len=4)
                self.convlstm_model.load_state_dict(torch.load(convlstm_path, map_location=self.device))
                self.convlstm_model.eval()
                logger.info(f"Loaded spatiotemporal ConvLSTM from {convlstm_path}")
            else:
                logger.warning(f"ConvLSTM checkpoint not found at {convlstm_path}")

            self.models_loaded = (self.cnn_model is not None) and (self.convlstm_model is not None)
        except Exception as e:
            logger.error(f"Error loading trained checkpoints: {e}")
            self.models_loaded = False

    def decode_image_input(self, image_base64: Optional[str] = None, preset: Optional[str] = None) -> np.ndarray:
        """Decode base64 image or generate physical vortex pattern."""
        if image_base64:
            # Handle potential data URL prefix
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            img_bytes = base64.b64decode(image_base64)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("L")
            img_np = np.array(pil_img)
            return self.preprocessor.preprocess_image(img_np)
        elif preset:
            # Generate representative vortex pattern
            if preset == "fani_eye":
                return self.seq_builder._generate_vortex_pattern(17.1, 84.8, 115.0)
            elif preset == "amphan_super":
                return self.seq_builder._generate_vortex_pattern(13.9, 86.5, 130.0)
            elif preset == "tauktae_arabian":
                return self.seq_builder._generate_vortex_pattern(18.8, 71.5, 95.0)
            else:
                return self.seq_builder._generate_vortex_pattern(15.0, 85.0, 50.0)
        else:
            # Default synoptic vortex
            return self.seq_builder._generate_vortex_pattern(15.0, 85.0, 65.0)

    def detect_presence(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Run binary presence detection."""
        if self.cnn_model is None:
            raise RuntimeError("Spatial CNN model checkpoint is not loaded.")

        # Prepare tensor (1, C, H, W)
        tensor_in = torch.tensor(img_array.transpose(2, 0, 1), dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            out = self.cnn_model(tensor_in)
            prob = float(out["presence_prob"].item())

        is_cyclone = prob >= 0.50
        confidence = "High" if prob >= 0.8 or prob <= 0.2 else "Moderate"

        return {
            "presence_probability": round(prob, 4),
            "is_cyclone_detected": is_cyclone,
            "confidence_level": confidence,
            "feature_summary": {
                "mean_brightness_norm": round(float(np.mean(img_array)), 4),
                "peak_core_contrast": round(float(np.max(img_array) - np.min(img_array)), 4),
            },
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    def classify_category(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Classify IMD intensity stage and estimate sustained wind speed."""
        if self.cnn_model is None:
            raise RuntimeError("Spatial CNN model checkpoint is not loaded.")

        tensor_in = torch.tensor(img_array.transpose(2, 0, 1), dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            out = self.cnn_model(tensor_in)
            logits = out["class_logits"][0]
            probs = torch.softmax(logits, dim=0).cpu().numpy()
            wind_speed = float(out["wind_speed_kts"].item())

        cat_idx = int(np.argmax(probs))
        cat_name = self.preprocessor.index_to_imd_category(cat_idx)

        prob_dict = {}
        for idx in range(7):
            name = self.preprocessor.index_to_imd_category(idx)
            prob_dict[name] = round(float(probs[idx]), 4)

        return {
            "predicted_category": cat_name,
            "category_index": cat_idx,
            "category_probabilities": prob_dict,
            "estimated_wind_speed_kts": round(wind_speed, 1),
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }

    def forecast_track_and_intensity(
        self,
        past_coords: List[List[float]],
        past_winds: List[float],
        forecast_horizon_hours: int = 6,
        latest_timestamp_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Spatiotemporal ConvLSTM trajectory and intensity forecast.
        Projects forward in 6-hour synoptic intervals.
        """
        if self.convlstm_model is None:
            raise RuntimeError("Spatiotemporal ConvLSTM model is not loaded.")

        steps_needed = max(1, forecast_horizon_hours // 6)
        curr_coords = list(past_coords)
        curr_winds = list(past_winds)

        # Ensure we have at least 4 observations for sequence
        while len(curr_coords) < 4:
            curr_coords.insert(0, curr_coords[0])
            curr_winds.insert(0, curr_winds[0])

        projected_track = []
        base_time = (
            datetime.fromisoformat(latest_timestamp_str.replace("Z", "+00:00"))
            if latest_timestamp_str
            else datetime.now(timezone.utc)
        )

        for step in range(1, steps_needed + 1):
            window_coords = curr_coords[-4:]
            window_winds = curr_winds[-4:]

            # Generate vortex patterns for input window
            window_imgs = [
                self.seq_builder._generate_vortex_pattern(c[0], c[1], w)
                for c, w in zip(window_coords, window_winds)
            ]

            img_seq_np = np.stack(window_imgs, axis=0)  # (4, 64, 64, 1)
            coord_seq_np = np.array(window_coords, dtype=np.float32)  # (4, 2)
            wind_seq_np = np.array(window_winds, dtype=np.float32).reshape(4, 1)  # (4, 1)

            t_img = torch.tensor(img_seq_np.transpose(0, 3, 1, 2), dtype=torch.float32).unsqueeze(0)  # (1, 4, 1, 64, 64)
            t_crd = torch.tensor(coord_seq_np, dtype=torch.float32).unsqueeze(0)  # (1, 4, 2)
            t_wnd = torch.tensor(wind_seq_np, dtype=torch.float32).unsqueeze(0)  # (1, 4, 1)

            with torch.no_grad():
                out = self.convlstm_model(t_img, t_crd, t_wnd)
                pred_crd = out["predicted_coords"][0].cpu().numpy()
                pred_wnd = float(out["predicted_wind"][0].item())

            pred_lat = round(float(pred_crd[0]), 2)
            pred_lon = round(float(pred_crd[1]), 2)
            pred_wind_kts = round(max(15.0, pred_wnd), 1)
            stage = CycloneDataPreprocessor.index_to_imd_category(
                CycloneDataPreprocessor.imd_category_to_index(
                    CycloneDataPreprocessor.index_to_imd_category(
                        min(6, int(pred_wind_kts // 20))
                    )
                )
            )

            step_time = base_time + timedelta(hours=step * 6)
            uncertainty_km = round(35.0 + step * 25.0, 1)

            projected_track.append({
                "step_hours": step * 6,
                "forecast_timestamp_utc": step_time.isoformat(),
                "predicted_latitude": pred_lat,
                "predicted_longitude": pred_lon,
                "predicted_wind_kts": pred_wind_kts,
                "predicted_imd_stage": stage,
                "uncertainty_radius_km": uncertainty_km,
            })

            curr_coords.append([pred_lat, pred_lon])
            curr_winds.append(pred_wind_kts)

        final_step = projected_track[-1]
        return {
            "forecast_horizon_hours": forecast_horizon_hours,
            "current_coordinates": past_coords[-1],
            "predicted_coordinates": [final_step["predicted_latitude"], final_step["predicted_longitude"]],
            "projected_track": projected_track,
            "model_name": "ConvLSTM Spatiotemporal Net (Proposed)",
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        }
