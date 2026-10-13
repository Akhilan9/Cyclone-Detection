import React, { useEffect, useState } from 'react';
import { Play, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import type { Cyclone, AnalysisResponse } from '../types';
import { StageBadge } from '../components/common/StageBadge';
import { InteractiveMap } from '../components/map/InteractiveMap';
import { IntensityChart } from '../components/charts/IntensityChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface AnalysisPageProps {
  initialCycloneId?: string;
  onNavigateToReports?: () => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ initialCycloneId }) => {
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [selectedCycloneId, setSelectedCycloneId] = useState<string>(initialCycloneId || '');
  const [forecastHorizon, setForecastHorizon] = useState<number>(12);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.getCyclones().then((list: Cyclone[]) => {
      setCyclones(list);
      if (!selectedCycloneId && list.length > 0) {
        setSelectedCycloneId(list[0].cyclone_id);
      }
    }).catch((err: any) => setError(err.message));
  }, []);

  const handleRunAnalysis = async () => {
    if (!selectedCycloneId) return;
    setAnalyzing(true);
    setError(null);
    setReportSuccess(null);
    try {
      const result = await api.analyzeCyclone({
        cyclone_id: selectedCycloneId,
        forecast_horizon_hours: forecastHorizon,
      });
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || 'Inference execution failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGeneratePdfReport = async () => {
    if (!selectedCycloneId) return;
    setReportGenerating(true);
    try {
      const selected = cyclones.find((c) => c.cyclone_id === selectedCycloneId);
      const rep = await api.createReport({
        title: `Cyclone ${selected?.name || 'Analysis'} Deep Learning Report`,
        cyclone_id: selectedCycloneId,
        prediction_run_id: analysisResult?.prediction_run_id,
        report_type: 'pdf',
      });
      setReportSuccess(`Report successfully compiled (${(rep.file_size_bytes / 1024).toFixed(1)} KB).`);
      window.open(api.getReportDownloadUrl(rep.id), '_blank');
    } catch (err: any) {
      setError(`Failed to generate report: ${err.message}`);
    } finally {
      setReportGenerating(false);
    }
  };

  const currentCyclone = cyclones.find((c) => c.cyclone_id === selectedCycloneId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Control Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
          Spatiotemporal Cyclone Forecast Control Panel
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Select Historical Cyclone
            </label>
            <select
              className="input-field"
              value={selectedCycloneId}
              onChange={(e) => {
                setSelectedCycloneId(e.target.value);
                setAnalysisResult(null);
              }}
            >
              {cyclones.map((c) => (
                <option key={c.cyclone_id} value={c.cyclone_id}>
                  {c.name} ({c.season_year}) - {c.subbasin}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Forecast Horizon (Lead Time)
            </label>
            <select
              className="input-field"
              value={forecastHorizon}
              onChange={(e) => setForecastHorizon(Number(e.target.value))}
            >
              <option value={6}>+6 Hours (1 Synoptic Step)</option>
              <option value={12}>+12 Hours (2 Synoptic Steps)</option>
              <option value={18}>+18 Hours (3 Synoptic Steps)</option>
              <option value={24}>+24 Hours (4 Synoptic Steps)</option>
            </select>
          </div>

          <div>
            <button
              className="btn-primary"
              style={{ width: '100%', height: '38px' }}
              onClick={handleRunAnalysis}
              disabled={analyzing || !selectedCycloneId}
            >
              <Play size={16} />
              <span>{analyzing ? 'Computing Forecast...' : 'Run DL Forecast'}</span>
            </button>
          </div>
        </div>

        {currentCyclone && (
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div><strong>Basin:</strong> {currentCyclone.basin} ({currentCyclone.subbasin})</div>
            <div><strong>Recorded Peak:</strong> {currentCyclone.max_wind_speed_kts} knots</div>
            <div><strong>Min Central Pressure:</strong> {currentCyclone.min_central_pressure_hpa} hPa</div>
            <div><strong>Highest Classification:</strong> <StageBadge stage={currentCyclone.highest_imd_stage} /></div>
          </div>
        )}
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '14px 18px', borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} color="#ef4444" />
          <span style={{ fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {reportSuccess && (
        <div className="glass-panel" style={{ padding: '14px 18px', borderColor: 'rgba(16, 185, 129, 0.4)', backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span style={{ fontSize: '0.875rem' }}>{reportSuccess}</span>
        </div>
      )}

      {analyzing && <LoadingSpinner message={`Running ConvLSTM forward propagation on ${currentCyclone?.name || 'cyclone'} sequences...`} />}

      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                Inference Result • Run ID: {analysisResult.prediction_run_id.slice(0, 8)}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                Cyclone {analysisResult.cyclone_name} (+{forecastHorizon}h Spatiotemporal Forecast)
              </h3>
            </div>
            <button className="btn-secondary" onClick={handleGeneratePdfReport} disabled={reportGenerating}>
              <Download size={15} />
              <span>{reportGenerating ? 'Generating PDF...' : 'Download Scientific Report (PDF)'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                Convective Presence
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#06b6d4' }}>
                  {(analysisResult.detection.presence_probability * 100).toFixed(1)}%
                </span>
                <span className="badge badge-cs">
                  {analysisResult.detection.confidence_level} Confidence
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                CNN feature spatial presence detection
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                IMD Classification Stage
              </span>
              <div style={{ margin: '8px 0' }}>
                <StageBadge stage={analysisResult.classification.predicted_category} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                7-stage IMD meteorological classification
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                Forecast Intensity (+{forecastHorizon}h)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f59e0b' }}>
                  {analysisResult.intensity.predicted_intensity_kts} kt
                </span>
                <span style={{ fontSize: '0.8rem', color: analysisResult.intensity.intensity_delta_kts >= 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {analysisResult.intensity.intensity_delta_kts >= 0 ? '+' : ''}
                  {analysisResult.intensity.intensity_delta_kts} kt
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Current: {analysisResult.intensity.current_intensity_kts} kt MSW
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                Projected Eye Location (+{forecastHorizon}h)
              </span>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)', margin: '6px 0' }}>
                {analysisResult.track_forecast.predicted_coordinates[0].toFixed(2)}°N, {analysisResult.track_forecast.predicted_coordinates[1].toFixed(2)}°E
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ConvLSTM Kinematic Vector Translation
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              Spatiotemporal Track & Forecast Cone Visualization
            </h4>
            <InteractiveMap
              observedPoints={analysisResult.historical_points}
              predictedPoints={analysisResult.track_forecast.projected_track}
              cycloneName={analysisResult.cyclone_name}
              height="500px"
            />
          </div>

          <IntensityChart
            observedPoints={analysisResult.historical_points}
            predictedPoints={analysisResult.track_forecast.projected_track}
          />
        </div>
      )}
    </div>
  );
};
