# Scientific Limitations and Research Boundary

## 1. Disclaimers & Operational Notice
This software framework is an academic, research-oriented B.Tech major project. **It does not constitute an official meteorological early-warning product.** Real-world disaster preparedness and public safety advisories must strictly follow official bulletins published by the **India Meteorological Department (IMD)**, RSMC New Delhi, and the National Disaster Management Authority (NDMA).

---

## 2. Technical and Scientific Limitations

### 2.1 Hardware and Training Scale Constraints
- **Hardware Profile**: Evaluated on Intel Core i5-7200U CPU (2 cores, 4 threads, 8GB RAM, integrated Intel HD Graphics 620).
- **Batch Processing**: Due to the absence of high-end multi-GPU infrastructure, models are trained on single-channel $64 \times 64$ resolution image arrays rather than multi-spectral $512 \times 512$ GeoTIFFs.
- **Inference Latency**: Single-sample ConvLSTM inference takes ~15–30 ms on CPU, which is suitable for near-real-time research operations.

### 2.2 Satellite Data Availability
- Full-resolution INSAT-3D/3DR raw HDF5 satellite imagery from ISRO MOSDAC requires authenticated researcher credentials and high-bandwidth downloads (~1.5 GB per synoptic slot).
- For reproducible CI/CD testing and immediate evaluation without credential barriers, the framework provides an automated downloader for public NOAA IBTrACS NI records and a physically grounded synthetic vortex generator for software test suites.
- When raw HDF5 satellite files are downloaded, they integrate directly into the preprocessor pipeline (`ml/pipelines/preprocessor.py`).

### 2.3 Intensity Classification Imbalance
- In the North Indian Ocean, Super Cyclonic Storms ($\ge 120$ kt) and Depressions occur with severe frequency imbalance.
- The preliminary classification macro-F1 reflects class imbalance on the held-out single test storm window. In future iterations, focal loss and multi-decade re-sampling should be employed.

### 2.4 Forecast Horizon Uncertainty
- Uncertainty radii expand linearly with lead time: $\pm 35\text{ km}$ at +6h up to $\pm 135\text{ km}$ at +24h, reflecting chaotic steering currents in the upper troposphere.
