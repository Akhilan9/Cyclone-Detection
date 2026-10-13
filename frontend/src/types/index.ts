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
