/**
 * Central API Client for Cyclone Detection and Forecasting Backend.
 */

import type {
  Cyclone,
  CycloneDetail,
  SystemStatus,
  ModelMetadataItem,
  DataSourceItem,
  EvaluationMetrics,
  AnalysisResponse,
  DetectionResult,
  ClassificationResult,
  IntensityResult,
  TrackForecastResult,
  ReportItem,
  GradCAMResult,
  UploadAnalyzeResult,
  LandfallHazardResult,
  RapidIntensificationResult,
} from '../types';

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getStatus: () => request<SystemStatus>('/status'),
  getModels: () => request<{ models: ModelMetadataItem[]; active_spatial_model: string; active_temporal_model: string }>('/models'),
  getDataSources: () => request<{ sources: DataSourceItem[]; total_sources: number }>('/data/sources'),
  pingDataSource: (sourceId: string) =>
    request<{
      source_id: string;
      url: string;
      ok: boolean;
      status_code: number;
      latency_ms: number;
      timestamp_utc: string;
    }>(`/data/sources/${encodeURIComponent(sourceId)}/ping`),
  getMetrics: () => request<EvaluationMetrics>('/metrics'),

  getCyclones: () => request<Cyclone[]>('/cyclones'),
  getCycloneById: (cycloneId: string) => request<CycloneDetail>(`/cyclones/${encodeURIComponent(cycloneId)}`),

  detect: (payload: { image_base64?: string; sample_preset?: string }) =>
    request<DetectionResult>('/predictions/detect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  classify: (payload: { cyclone_id?: string; image_base64?: string }) =>
    request<ClassificationResult>('/predictions/classify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forecastIntensity: (payload: { cyclone_id?: string; forecast_horizon_hours: number; current_wind_speed_kts?: number }) =>
    request<IntensityResult>('/predictions/intensity', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forecastTrack: (payload: { cyclone_id?: string; forecast_horizon_hours: number; historical_coordinates?: number[][] }) =>
    request<TrackForecastResult>('/predictions/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  analyzeCyclone: (payload: { cyclone_id: string; forecast_horizon_hours: number; include_satellite_features?: boolean }) =>
    request<AnalysisResponse>('/predictions/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReports: () => request<ReportItem[]>('/reports'),
  createReport: (payload: { title: string; cyclone_id: string; report_type: 'pdf' | 'csv'; prediction_run_id?: string }) =>
    request<ReportItem>('/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getReportDownloadUrl: (reportId: string) => `${API_BASE}/reports/${encodeURIComponent(reportId)}/download`,

  getSatellitePreview: (cycloneId: string) =>
    request<{
      cyclone_id: string;
      has_real_imagery: boolean;
      tir_image_base64?: string;
      visible_image_base64?: string;
      sensor: string;
      provider: string;
      resolution: string;
    }>(`/satellite/preview/${encodeURIComponent(cycloneId)}`),

  getSatelliteSequence: (cycloneId: string, channel: string = 'irwin') =>
    request<{
      cyclone_id: string;
      channel: string;
      frames: string[];
      timestamps: string[];
      sensor: string;
      resolution: string;
    }>(`/satellite/sequence/${encodeURIComponent(cycloneId)}?channel=${encodeURIComponent(channel)}`),

  getDynamicSatelliteTileUrl: (lat: number, lon: number, date: string, layerType: 'tir' | 'visible' = 'tir') =>
    `${API_BASE}/satellite/dynamic-tile?lat=${lat}&lon=${lon}&date=${encodeURIComponent(date)}&layer_type=${layerType}`,

  getGradCAM: (payload: { cyclone_id?: string; image_base64?: string; target_class?: number }) =>
    request<GradCAMResult>('/predictions/gradcam', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadAndAnalyze: (payload: { image_base64: string }) =>
    request<UploadAnalyzeResult>('/predictions/upload-analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getLandfallHazard: (payload: {
    cyclone_id?: string;
    cyclone_name?: string;
    current_latitude?: number;
    current_longitude?: number;
    predicted_latitude?: number;
    predicted_longitude?: number;
    wind_speed_kts?: number;
    forecast_hours?: number;
  }) =>
    request<LandfallHazardResult>('/predictions/landfall-hazard', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRapidIntensification: (cycloneId: string) =>
    request<RapidIntensificationResult>(`/predictions/rapid-intensification/${encodeURIComponent(cycloneId)}`),
};
