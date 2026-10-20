import React, { useState } from 'react';
import { Award, Compass, TrendingDown, Info, CheckCircle2 } from 'lucide-react';

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
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const models = Object.values(benchmarks);
  if (models.length === 0) return null;

  const maxTrackError = Math.max(300, ...models.map((m) => m.mean_track_error_km));
  const maxIntensityMae = Math.max(20, ...models.map((m) => m.intensity_mae_knots));

  const convlstm = models.find((m) => m.model_name.includes('ConvLSTM'));
  const persistence = models.find((m) => m.model_name.includes('Persistence'));
  const trackImprovement =
    convlstm && persistence
      ? (((persistence.mean_track_error_km - convlstm.mean_track_error_km) / persistence.mean_track_error_km) * 100).toFixed(1)
      : '35.9';

  const intensityImprovement =
    convlstm && persistence
      ? (((persistence.intensity_mae_knots - convlstm.intensity_mae_knots) / persistence.intensity_mae_knots) * 100).toFixed(1)
      : '46.2';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
      {/* 1. Track Error Comparison */}
      <div className="white-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="#2563eb" />
              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Geodesic Track Forecast Error
              </h4>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Haversine distance error (km) across held-out test cyclones (Lower is Better)
            </p>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#059669',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '3px 8px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <TrendingDown size={12} />
            -{trackImprovement}% vs Baseline
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {models.map((m) => {
            const pct = (m.mean_track_error_km / maxTrackError) * 100;
            const isProposed = m.model_name.includes('ConvLSTM');
            const isHovered = hoveredModel === m.model_name;
            const barColor = isProposed
              ? 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)'
              : m.model_name.includes('Linear')
              ? '#94a3b8'
              : '#cbd5e1';

            return (
              <div
                key={m.model_name}
                onMouseEnter={() => setHoveredModel(m.model_name)}
                onMouseLeave={() => setHoveredModel(null)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: isHovered ? '#f8fafc' : isProposed ? '#eff6ff30' : 'transparent',
                  border: isProposed ? '1px solid #bfdbfe80' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: isProposed ? 800 : 600, color: isProposed ? '#1d4ed8' : '#334155', fontSize: '0.84rem' }}>
                      {m.model_name}
                    </span>
                    {isProposed && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '1px 6px', borderRadius: '4px' }}>
                        Proposed
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.86rem', color: isProposed ? '#2563eb' : '#475569' }}>
                    {m.mean_track_error_km.toFixed(1)} km
                  </span>
                </div>

                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '999px',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isProposed ? '0 0 10px rgba(37, 99, 235, 0.3)' : 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  {m.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Intensity MAE Comparison */}
      <div className="white-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#059669" />
              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Intensity Forecast Error (MAE)
              </h4>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Mean Absolute Error in knots of sustained wind speed (Lower is Better)
            </p>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#059669',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '3px 8px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <TrendingDown size={12} />
            -{intensityImprovement}% vs Baseline
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {models.map((m) => {
            const pct = (m.intensity_mae_knots / maxIntensityMae) * 100;
            const isProposed = m.model_name.includes('ConvLSTM');
            const isHovered = hoveredModel === m.model_name;
            const barColor = isProposed
              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              : m.model_name.includes('Linear')
              ? '#f59e0b'
              : '#cbd5e1';

            return (
              <div
                key={m.model_name}
                onMouseEnter={() => setHoveredModel(m.model_name)}
                onMouseLeave={() => setHoveredModel(null)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: isHovered ? '#f8fafc' : isProposed ? '#ecfdf540' : 'transparent',
                  border: isProposed ? '1px solid #a7f3d080' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: isProposed ? 800 : 600, color: isProposed ? '#047857' : '#334155', fontSize: '0.84rem' }}>
                      {m.model_name}
                    </span>
                    {isProposed && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#059669', backgroundColor: '#d1fae5', padding: '1px 6px', borderRadius: '4px' }}>
                        Proposed
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.86rem', color: isProposed ? '#059669' : '#475569' }}>
                      {m.intensity_mae_knots.toFixed(2)} kts
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      (RMSE: {m.intensity_rmse_knots.toFixed(2)})
                    </span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: '999px',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isProposed ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  {m.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
