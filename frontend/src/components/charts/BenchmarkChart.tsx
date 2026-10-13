import React from 'react';

interface BenchmarkComparison {
  [key: string]: {
    model_name: string;
    mean_track_error_km: number;
    intensity_mae_knots: number;
    intensity_rmse_knots: number;
    description: string;
  };
}

interface BenchmarkChartProps {
  benchmarks?: BenchmarkComparison;
}

export const BenchmarkChart: React.FC<BenchmarkChartProps> = ({ benchmarks = {} }) => {
  const models = Object.values(benchmarks);
  if (models.length === 0) return null;

  const maxTrackError = Math.max(300, ...models.map((m) => m.mean_track_error_km));
  const maxIntensityMae = Math.max(20, ...models.map((m) => m.intensity_mae_knots));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      {/* 1. Track Error Comparison */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
          Geodesic Track Forecast Error (Lower is Better)
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '16px' }}>
          Mean Haversine Geodesic Distance Error in Kilometers (km) on held-out test cyclones
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {models.map((m) => {
            const pct = (m.mean_track_error_km / maxTrackError) * 100;
            const isProposed = m.model_name.includes('ConvLSTM');
            const color = isProposed ? '#06b6d4' : m.model_name.includes('Linear') ? '#3b82f6' : '#64748b';

            return (
              <div key={m.model_name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: isProposed ? 700 : 500, color: isProposed ? '#22d3ee' : '#e2e8f0' }}>
                    {m.model_name} {isProposed && '(Proposed)'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>
                    {m.mean_track_error_km.toFixed(1)} km
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: color,
                      borderRadius: '999px',
                      transition: 'width 0.8s ease',
                      boxShadow: isProposed ? '0 0 8px rgba(6, 182, 212, 0.5)' : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Intensity MAE Comparison */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
          Intensity Forecast Error (Lower is Better)
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '16px' }}>
          Mean Absolute Error (MAE) in knots of Maximum Sustained Wind Speed
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {models.map((m) => {
            const pct = (m.intensity_mae_knots / maxIntensityMae) * 100;
            const isProposed = m.model_name.includes('ConvLSTM');
            const color = isProposed ? '#10b981' : m.model_name.includes('Linear') ? '#f59e0b' : '#64748b';

            return (
              <div key={m.model_name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: isProposed ? 700 : 500, color: isProposed ? '#34d399' : '#e2e8f0' }}>
                    {m.model_name} {isProposed && '(Proposed)'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>
                    {m.intensity_mae_knots.toFixed(2)} kt (RMSE: {m.intensity_rmse_knots.toFixed(2)} kt)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: color,
                      borderRadius: '999px',
                      transition: 'width 0.8s ease',
                      boxShadow: isProposed ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
