# Machine Learning Model Documentation

## 1. Model Architectures Overview

### 1.1 CycloneSpatialCNN (Multi-Head Spatial Feature Extractor)
- **Input Dimension**: $(B, C=1, H=64, W=64)$ normalized thermal infrared brightness temperature.
- **Backbone**:
  - Block 1: Conv2D(1 -> 32, kernel=3, pad=1) + BatchNorm2d + ReLU + MaxPool2d(2) -> $(32, 32, 32)$
  - Block 2: Conv2D(32 -> 64, kernel=3, pad=1) + BatchNorm2d + ReLU + MaxPool2d(2) -> $(64, 16, 16)$
  - Block 3: Conv2D(64 -> 128, kernel=3, pad=1) + BatchNorm2d + ReLU + MaxPool2d(2) -> $(128, 8, 8)$
  - Block 4: Conv2D(128 -> 256, kernel=3, pad=1) + BatchNorm2d + ReLU + AdaptiveAvgPool2d((4, 4)) -> $(256, 4, 4)$
  - Shared Representation: Dense(4096 -> 256) + ReLU + Dropout(0.3)
- **Task Heads**:
  - `presence_head`: Linear(256 -> 64) -> ReLU -> Linear(64 -> 1) -> Sigmoid ($\hat{p} \in [0, 1]$).
  - `classification_head`: Linear(256 -> 128) -> ReLU -> Dropout(0.3) -> Linear(128 -> 7 classes, CrossEntropy).
  - `wind_regression_head`: Linear(256 -> 64) -> ReLU -> Linear(64 -> 1) -> ReLU (Wind speed $\ge 0$ knots).

### 1.2 CycloneConvLSTMNet (Spatiotemporal Trajectory & Intensity Forecaster)
- **Input Sequences**:
  - Image sequence: $(B, T=4, C=1, H=64, W=64)$
  - Kinematic coordinates: $(B, T=4, 2)$ $[\text{latitude}, \text{longitude}]$
  - Kinematic wind speeds: $(B, T=4, 1)$ $[\text{sustained wind}]$
- **Spatiotemporal Core**:
  - Frame Encoder: 2-layer Conv2D mapping each timestep to $(64, 16, 16)$ spatial feature map.
  - ConvLSTM Cell: Recurrent cell with 2D convolutional input and recurrent state transitions ($64$ hidden channels, $3\times 3$ kernel).
  - Spatial Pooler: AdaptiveAvgPool2d((2, 2)) -> $(256)$ visual representation.
  - Kinematic Encoder: Dense layer processing flattened track history $(T \times 3 = 12 \to 64)$.
  - Multi-Modal Fusion: Dense layer fusing visual pooled features ($256$) with kinematic features ($64$) into a $128$-dimensional joint state vector.
- **Forecasting Heads**:
  - `trajectory_head`: Dense(128 -> 64) -> Linear(64 -> 2) predicting translation vector $(\Delta\text{lat}, \Delta\text{lon})$.
    $$\hat{\text{coord}}_{t+H} = \text{coord}_t + \Delta\text{coord}$$
  - `intensity_head`: Dense(128 -> 64) -> Linear(64 -> 1) predicting intensity rate of change $\Delta w$.
    $$\hat{w}_{t+H} = \max(15.0, w_t + \Delta w)$$

---

## 2. Benchmark Baseline Models

### 2.1 Persistence Baseline
- Holds the most recent observed coordinate and intensity values constant forward in time:
  $$\hat{\text{lat}}_{t+H} = \text{lat}_t, \quad \hat{\text{lon}}_{t+H} = \text{lon}_t, \quad \hat{w}_{t+H} = w_t$$
- Represents the classic zero-skill meteorological lower-bound.

### 2.2 Linear Kinematic Extrapolation Baseline
- Projects the velocity vector measured over the previous 6-hour synoptic interval:
  $$\vec{v} = \text{coord}_t - \text{coord}_{t-1}$$
  $$\hat{\text{coord}}_{t+H} = \text{coord}_t + H \cdot \vec{v}$$

---

## 3. Checkpoint Artifacts
- Location: `ml/artifacts/`
- Checkpoint Files:
  - `cnn_spatial_best.pt`: Serialized weights for spatial multi-head CNN.
  - `convlstm_temporal_best.pt`: Serialized weights for spatiotemporal ConvLSTM net.
  - `model_metadata.json`: Model versioning, architecture description, and training metadata.
  - `evaluation_metrics.json`: Machine-readable verified performance metrics on held-out test cyclones.
