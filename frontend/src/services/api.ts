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
};
