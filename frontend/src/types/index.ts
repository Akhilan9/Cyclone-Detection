export interface TrackPoint {
  id: number;
  cyclone_id: string;
  timestamp_utc: string;
  latitude: number;
  longitude: number;
  wind_speed_kts?: number | null;
  central_pressure_hpa?: number | null;
  imd_stage?: string | null;
  image_path?: string | null;
}

export interface Cyclone {
  cyclone_id: string;
  name: string;
  season_year: number;
  basin: string;
  subbasin: string;
  nature: string;
  max_wind_speed_kts?: number | null;
  min_central_pressure_hpa?: number | null;
  highest_imd_stage?: string | null;
}

export interface CycloneDetail extends Cyclone {
  track_points: TrackPoint[];
}

export interface DetectionResult {
  presence_probability: number;
  is_cyclone_detected: boolean;
  confidence_level: string;
  feature_summary: {
    mean_brightness_norm?: number;
    peak_core_contrast?: number;
  };
  timestamp_utc: string;
}

export interface ClassificationResult {
  predicted_category: string;
  category_index: number;
  category_probabilities: Record<string, number>;
  estimated_wind_speed_kts: number;
  confidence?: number;
  timestamp_utc: string;
}

export interface IntensityResult {
  cyclone_id?: string | null;
  forecast_horizon_hours: number;
  current_intensity_kts: number;
  predicted_intensity_kts: number;
  intensity_delta_kts: number;
  predicted_imd_stage: string;
  prediction_interval_kts: number[];
  timestamp_utc: string;
}

export interface PredictedTrackPoint {
  step_hours: number;
  forecast_timestamp_utc: string;
  predicted_latitude: number;
  predicted_longitude: number;
  predicted_wind_kts: number;
  predicted_imd_stage: string;
  uncertainty_radius_km: number;
}

export interface TrackForecastResult {
  cyclone_id?: string | null;
  forecast_horizon_hours: number;
  current_coordinates: [number, number];
  predicted_coordinates: [number, number];
  projected_track: PredictedTrackPoint[];
  model_name: string;
  timestamp_utc: string;
}

export interface AnalysisResponse {
  cyclone_id: string;
  cyclone_name: string;
  analysis_timestamp_utc: string;
  detection: DetectionResult;
  classification: ClassificationResult;
  intensity: IntensityResult;
  track_forecast: TrackForecastResult;
  historical_points: TrackPoint[];
  prediction_run_id: string;
  satellite_imagery?: {
    cyclone_id: string;
    has_real_imagery: boolean;
    tir_image_base64?: string;
    visible_image_base64?: string;
    sensor: string;
    provider: string;
    resolution: string;
  };
}

export interface SystemStatus {
  status: string;
  version: string;
  environment: string;
  database_connected: boolean;
  models_ready: boolean;
  available_models_count: number;
  total_cyclones_in_db: number;
  total_track_points: number;
  timestamp_utc: string;
}

export interface ModelMetadataItem {
  model_id: string;
  name: string;
  architecture: string;
  task: string;
  status: string;
  framework?: string;
  training_date?: string;
}

export interface DataSourceItem {
  id: string;
  name: string;
  organization: string;
  basin: string;
  access: string;
  url: string;
  format: string;
  status: string;
}

export interface EvaluationMetrics {
  dataset_split: {
    train_cyclone_ids: string[];
    val_cyclone_ids: string[];
    test_cyclone_ids: string[];
    test_sequence_count: number;
  };
  classification_metrics: {
    accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    confusion_matrix: number[][];
    sample_count: number;
  };
  benchmark_comparison: Record<
    string,
    {
      model_name: string;
      mean_track_error_km: number;
      intensity_mae_knots: number;
      intensity_rmse_knots: number;
      description: string;
    }
  >;
  forecast_horizon_hours: number;
  input_window_hours: number;
}

export interface ReportItem {
  id: string;
  title: string;
  cyclone_id?: string | null;
  prediction_run_id?: string | null;
  report_type: 'pdf' | 'csv';
  file_size_bytes: number;
  created_at: string;
}

export interface GradCAMResult {
  heatmap_base64: string;
  overlay_base64: string;
  target_category: string;
  target_class_index: number;
  peak_attention_coords: [number, number];
  attention_focus_region: string;
  feature_layer: string;
  timestamp_utc: string;
}

export interface UploadAnalyzeResult {
  is_cyclone_detected: boolean;
  presence_probability: number;
  predicted_category: string;
  category_index: number;
  category_probabilities: Record<string, number>;
  estimated_wind_speed_kts: number;
  estimated_pressure_hpa: number;
  confidence: number;
  gradcam: GradCAMResult;
  eyewall_bounding_box: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  timestamp_utc: string;
}

export interface LandfallHazardResult {
  cyclone_name: string;
  alert_level: string;
  alert_color: string;
  advisory: string;
  evacuation_recommended: boolean;
  target_coastal_sector: string;
  distance_to_coast_km: number;
  estimated_landfall_eta_hours: number;
  projected_landfall_point: [number, number];
  gale_wind_radius_km: number;
  storm_warning_radius_km: number;
  maximum_sustained_wind_kts: number;
  timestamp_utc: string;
}

export interface DiagnosticFactor {
  name: string;
  value: string;
  threshold: string;
  status: 'extreme' | 'favorable' | 'moderate' | 'unfavorable';
  description: string;
}

export interface RapidIntensificationResult {
  cyclone_id: string;
  cyclone_name: string;
  is_ri_active: boolean;
  ri_probability_pct: number;
  risk_level: 'EXTREME_RI_ACTIVE' | 'HIGH_RISK' | 'MODERATE' | 'LOW';
  risk_color: string;
  status_headline: string;
  observed_24h_wind_delta_kts: number;
  observed_12h_wind_delta_kts: number;
  wmo_ri_threshold_kts: number;
  pressure_drop_rate_hpa_day: number;
  estimated_sst_celsius: number;
  vertical_wind_shear_kts: number;
  core_cloud_top_temp_celsius: number;
  diagnostic_factors: DiagnosticFactor[];
  operational_advisory: string;
  ri_onset_timestamp_utc?: string | null;
  peak_ri_rate_kts_day: number;
  timestamp_utc: string;
}

