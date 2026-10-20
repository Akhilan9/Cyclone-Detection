"""
Spatial CNN Architecture for Tropical Cyclone Analysis.
Performs:
1. Binary Cyclone Presence Detection (sigmoid)
2. IMD Intensity Stage Classification (7 classes, softmax/cross-entropy)
3. Maximum Sustained Wind Speed (MSW) Regression (knots)
"""

import os
from typing import Dict, Optional, Tuple, Union
import numpy as np

# PyTorch Implementation (primary execution backend)
import torch
import torch.nn as nn
import torch.nn.functional as F


class SqueezeExcitationBlock(nn.Module):
    """
    Squeeze-and-Excitation (SE) Channel Attention Block for Convective Eyewall Salience.
    Dynamically recalibrates channel feature maps to amplify central vortex structure
    over peripheral background cirrus cloud noise.
    """

    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        reduced_channels = max(channels // reduction, 8)
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(channels, reduced_channels, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(reduced_channels, channels, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, c, _, _ = x.size()
        y = self.avg_pool(x).view(b, c)
        y = self.fc(y).view(b, c, 1, 1)
        return x * y.expand_as(x)


class CycloneSpatialCNN(nn.Module):
    """
    Multi-Head Deep Convolutional Neural Network with Eyewall Squeeze-and-Excitation
    Channel Attention for Satellite Cyclone Analysis.
    Extracts spatial hierarchical features from satellite thermal IR imagery.
    """

    def __init__(
        self,
        in_channels: int = 1,
        num_classes: int = 7,  # 7 IMD Intensity Stages
        dropout_rate: float = 0.3,
    ):
        super().__init__()
        self.in_channels = in_channels
        self.num_classes = num_classes

        # Feature Extractor Backbone
        self.features = nn.Sequential(
            # Block 1
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 64 -> 32
            # Block 2
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 32 -> 16
            # Block 3
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 16 -> 8
            # Block 4
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4)),  # 256 x 4 x 4 = 4096
        )

        # Eyewall Convective Channel Attention Block
        self.se_attention = SqueezeExcitationBlock(256, reduction=16)

        # Dense Shared Representation
        self.shared_dense = nn.Sequential(
            nn.Linear(256 * 4 * 4, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_rate),
        )

        # Head 1: Binary Cyclone Presence Detection
        self.presence_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 1),
        )

        # Head 2: IMD Intensity Stage Classification
        self.classification_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(128, num_classes),
        )

        # Head 3: Wind Speed Regression (knots)
        self.wind_regression_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 1),
        )

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
            x: Tensor of shape (B, C, H, W)
        Returns:
            Dict containing:
              'presence_prob': (B, 1) probability in [0, 1]
              'class_logits': (B, num_classes)
              'wind_speed_kts': (B, 1)
        """
        feats = self.features(x)
        feats = self.se_attention(feats)
        flat = torch.flatten(feats, 1)
        shared = self.shared_dense(flat)

        presence_logits = self.presence_head(shared)
        presence_prob = torch.sigmoid(presence_logits)
        class_logits = self.classification_head(shared)
        wind_speed = F.relu(self.wind_regression_head(shared))  # wind speed >= 0

        return {
            "presence_prob": presence_prob,
            "class_logits": class_logits,
            "wind_speed_kts": wind_speed,
        }

    def predict_with_tta(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Test-Time Augmentation (TTA) using 4-fold cyclonic rotational symmetry (0°, 90°, 180°, 270°).
        Ensembles multi-angle forward passes to reduce epistemic variance and boost accuracy.
        """
        rots = [x, torch.rot90(x, 1, [2, 3]), torch.rot90(x, 2, [2, 3]), torch.rot90(x, 3, [2, 3])]
        preds = [self.forward(r) for r in rots]

        avg_presence = torch.stack([p["presence_prob"] for p in preds]).mean(dim=0)
        avg_logits = torch.stack([p["class_logits"] for p in preds]).mean(dim=0)
        avg_wind = torch.stack([p["wind_speed_kts"] for p in preds]).mean(dim=0)

        return {
            "presence_prob": avg_presence,
            "class_logits": avg_logits,
            "wind_speed_kts": avg_wind,
        }


# Optional TensorFlow/Keras 3 Builder
def build_keras_spatial_cnn(
    input_shape: Tuple[int, int, int] = (64, 64, 1),
    num_classes: int = 7,
):
    """Functional Keras 3 builder for spatial CNN multi-head architecture."""
    try:
        import keras
        from keras import layers

        inputs = layers.Input(shape=input_shape, name="satellite_image")

        # Backbone
        x = layers.Conv2D(32, (3, 3), padding="same", activation="relu")(inputs)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)

        x = layers.Conv2D(64, (3, 3), padding="same", activation="relu")(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)

        x = layers.Conv2D(128, (3, 3), padding="same", activation="relu")(x)
        x = layers.BatchNormalization()(x)
        x = layers.MaxPooling2D((2, 2))(x)

        x = layers.GlobalAveragePooling2D()(x)
        shared = layers.Dense(256, activation="relu")(x)
        shared = layers.Dropout(0.3)(shared)

        # Heads
        presence = layers.Dense(1, activation="sigmoid", name="presence_head")(shared)
        classification = layers.Dense(num_classes, activation="softmax", name="classification_head")(shared)
        wind = layers.Dense(1, activation="relu", name="wind_regression_head")(shared)

        model = keras.Model(inputs=inputs, outputs=[presence, classification, wind], name="CycloneSpatialCNN")
        return model
    except ImportError:
        return None
