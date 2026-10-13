"""
Spatiotemporal ConvLSTM Architecture for Tropical Cyclone Trajectory & Intensity Forecasting.
Learns spatiotemporal convective evolution from image sequences (T, H, W, C)
and fuses kinematic track history to predict future cyclone center coordinates
and maximum sustained wind speed at specified forecast horizons (+6h, +12h, +24h).
"""

from typing import Dict, Optional, Tuple, Union
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class ConvLSTMCell(nn.Module):
    """Convolutional LSTM Cell for 2D spatial feature maps."""

    def __init__(self, in_channels: int, hidden_channels: int, kernel_size: int = 3):
        super().__init__()
        self.in_channels = in_channels
        self.hidden_channels = hidden_channels
        padding = kernel_size // 2

        self.conv = nn.Conv2d(
            in_channels + hidden_channels,
            4 * hidden_channels,
            kernel_size=kernel_size,
            padding=padding,
        )

    def forward(
        self,
        x: torch.Tensor,
        state: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        b, _, h, w = x.size()
        if state is None:
            h_cur = torch.zeros(b, self.hidden_channels, h, w, device=x.device)
            c_cur = torch.zeros(b, self.hidden_channels, h, w, device=x.device)
        else:
            h_cur, c_cur = state

        combined = torch.cat([x, h_cur], dim=1)
        gates = self.conv(combined)
        i, f, o, g = torch.chunk(gates, 4, dim=1)

        i = torch.sigmoid(i)
        f = torch.sigmoid(f)
        o = torch.sigmoid(o)
        g = torch.tanh(g)

        c_next = f * c_cur + i * g
        h_next = o * torch.tanh(c_next)
        return h_next, c_next


class CycloneConvLSTMNet(nn.Module):
    """
    End-to-End Spatiotemporal Cyclone Forecasting Network.
    Fuses ConvLSTM spatiotemporal visual representations with historical track coordinates.
    """

    def __init__(
        self,
        in_channels: int = 1,
        hidden_dim: int = 64,
        seq_len: int = 4,
        coord_dim: int = 2,
        wind_dim: int = 1,
    ):
        super().__init__()
        self.seq_len = seq_len

        # Spatial encoder for individual image frames
        self.frame_encoder = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),  # 64 -> 32
            nn.Conv2d(32, hidden_dim, kernel_size=3, padding=1),
            nn.BatchNorm2d(hidden_dim),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),  # 32 -> 16
        )

        # Spatiotemporal Recurrent Cell
        self.convlstm = ConvLSTMCell(in_channels=hidden_dim, hidden_channels=hidden_dim, kernel_size=3)

        # Spatial Pooler for final temporal hidden state
        self.pooler = nn.AdaptiveAvgPool2d((2, 2))  # hidden_dim x 2 x 2 = 256

        # Kinematic Track Encoder (Processes past coordinates and past winds)
        self.kinematic_encoder = nn.Sequential(
            nn.Linear(seq_len * (coord_dim + wind_dim), 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 64),
            nn.ReLU(inplace=True),
        )

        # Fusion Dense Layer
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * 2 * 2 + 64, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
        )

        # Head 1: Future Trajectory Coordinate Displacement (delta_lat, delta_lon)
        self.trajectory_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 2),  # (delta_lat, delta_lon)
        )

        # Head 2: Future Sustained Wind Speed (knots)
        self.intensity_head = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 1),
        )

    def forward(
        self,
        img_seq: torch.Tensor,     # (B, T, C, H, W)
        coord_seq: torch.Tensor,   # (B, T, 2)
        wind_seq: torch.Tensor,    # (B, T, 1)
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            img_seq: (B, T, C, H, W)
            coord_seq: (B, T, 2)
            wind_seq: (B, T, 1)
        Returns:
            Dict containing:
              'predicted_coords': (B, 2) [predicted future latitude, longitude]
              'predicted_wind': (B, 1) [predicted future wind speed in knots]
        """
        b, t, c, h, w = img_seq.size()
        state = None

        # Process spatiotemporal image frames sequentially through ConvLSTM
        for step in range(t):
            frame = img_seq[:, step, :, :, :]  # (B, C, H, W)
            spatial_feats = self.frame_encoder(frame)  # (B, hidden_dim, 16, 16)
            h_next, c_next = self.convlstm(spatial_feats, state)
            state = (h_next, c_next)

        final_spatial_h = state[0]
        pooled_visual = torch.flatten(self.pooler(final_spatial_h), 1)  # (B, hidden_dim * 4)

        # Process kinematic history
        kinematics_flat = torch.cat([coord_seq.reshape(b, -1), wind_seq.reshape(b, -1)], dim=1)
        kinematic_feats = self.kinematic_encoder(kinematics_flat)  # (B, 64)

        # Fuse visual & kinematic representations
        fused = self.fusion(torch.cat([pooled_visual, kinematic_feats], dim=1))  # (B, 128)

        # Compute trajectory displacement and anchor on current position
        delta_coords = self.trajectory_head(fused)  # (B, 2)
        current_coords = coord_seq[:, -1, :]        # (B, 2)
        predicted_coords = current_coords + delta_coords

        # Compute future wind speed
        delta_wind = self.intensity_head(fused)
        current_wind = wind_seq[:, -1, :]
        predicted_wind = F.relu(current_wind + delta_wind)

        return {
            "predicted_coords": predicted_coords,
            "predicted_wind": predicted_wind,
            "delta_coords": delta_coords,
        }


# Optional TensorFlow/Keras 3 Builder
def build_keras_convlstm(
    sequence_shape: Tuple[int, int, int, int] = (4, 64, 64, 1),
    coord_shape: Tuple[int, int] = (4, 2),
    wind_shape: Tuple[int, int] = (4, 1),
):
    """Functional Keras 3 builder for ConvLSTM trajectory & intensity forecasting."""
    try:
        import keras
        from keras import layers

        img_in = layers.Input(shape=sequence_shape, name="image_sequence")
        coord_in = layers.Input(shape=coord_shape, name="coord_sequence")
        wind_in = layers.Input(shape=wind_shape, name="wind_sequence")

        # ConvLSTM Layer
        x = layers.ConvLSTM2D(32, (3, 3), padding="same", return_sequences=False)(img_in)
        x = layers.BatchNormalization()(x)
        x = layers.GlobalAveragePooling2D()(x)

        # Kinematics
        coords_flat = layers.Flatten()(coord_in)
        winds_flat = layers.Flatten()(wind_in)
        kin = layers.Concatenate()([coords_flat, winds_flat])
        kin = layers.Dense(64, activation="relu")(kin)

        # Fusion
        fused = layers.Concatenate()([x, kin])
        fused = layers.Dense(128, activation="relu")(fused)

        pred_delta_coords = layers.Dense(2, name="delta_coords")(fused)
        pred_delta_wind = layers.Dense(1, name="delta_wind")(fused)

        model = keras.Model(
            inputs=[img_in, coord_in, wind_in],
            outputs=[pred_delta_coords, pred_delta_wind],
            name="CycloneConvLSTM"
        )
        return model
    except ImportError:
        return None
