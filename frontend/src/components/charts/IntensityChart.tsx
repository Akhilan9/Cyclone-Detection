import React from 'react';
import { TrackPoint, PredictedTrackPoint } from '../../types';

interface IntensityChartProps {
  observedPoints?: TrackPoint[];
  predictedPoints?: PredictedTrackPoint[];
}

export const IntensityChart: React.FC<IntensityChartProps> = ({
  observedPoints = [],
  predictedPoints = [],
}) => {
  if (observedPoints.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No intensity observations available to graph.
      </div>
    );
  }

  // Combine observed and predicted sequence
  const combinedPoints: { label: string; wind: number; isPredicted: boolean }[] = [
    ...observedPoints.map((pt, idx) => ({
      label: pt.timestamp_utc.slice(5, 16).replace('T', ' '),
      wind: pt.wind_speed_kts ?? 30,
      isPredicted: false,
    })),
    ...predictedPoints.map((pt) => ({
      label: `+${pt.step_hours}h Forecast`,
      wind: pt.predicted_wind_kts,
      isPredicted: true,
    })),
  ];

  const maxWind = Math.max(140, ...combinedPoints.map((p) => p.wind));
  const svgWidth = 720;
  const svgHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (idx: number) => paddingLeft + (idx / Math.max(1, combinedPoints.length - 1)) * chartWidth;
  const getY = (wind: number) => paddingTop + chartHeight - (wind / maxWind) * chartHeight;

  // IMD Category Thresholds
  const thresholds = [
    { label: 'CS (34 kt)', wind: 34, color: '#10b981' },
    { label: 'VSCS (64 kt)', wind: 64, color: '#f59e0b' },
    { label: 'ESCS (90 kt)', wind: 90, color: '#ef4444' },
    { label: 'SuCS (120 kt)', wind: 120, color: '#a855f7' },
  ];

  // Observed Polyline path
  const observedSlice = combinedPoints.filter((p) => !p.isPredicted);
  const observedPath = observedSlice.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.wind)}`).join(' ');

  // Predicted Polyline path
  const lastObsIndex = observedSlice.length - 1;
  let predictedPath = '';
  if (predictedPoints.length > 0 && lastObsIndex >= 0) {
    predictedPath = `M ${getX(lastObsIndex)} ${getY(combinedPoints[lastObsIndex].wind)} `;
    predictedPoints.forEach((pt, pIdx) => {
      const globalIdx = lastObsIndex + 1 + pIdx;
      predictedPath += `L ${getX(globalIdx)} ${getY(pt.predicted_wind_kts)} `;
    });
  }

  return (
    <div className="glass-panel" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
            Wind Speed Intensity Profile & Spatiotemporal Forecast
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            Maximum Sustained Surface Wind (knots) with IMD Category reference lines
          </p>
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: '#38bdf8' }} />
            <span style={{ color: 'var(--text-muted)' }}>Observed MSW</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', borderTop: '2px dashed #f97316' }} />
            <span style={{ color: 'var(--text-muted)' }}>ConvLSTM Forecast</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Y Axis Grid and Labels */}
          {[0, 30, 60, 90, 120, 150].map((tick) => {
            const yPos = getY(tick);
            return (
              <g key={tick}>
                <line x1={paddingLeft} y1={yPos} x2={svgWidth - paddingRight} y2={yPos} stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                <text x={paddingLeft - 10} y={yPos + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
                  {tick} kt
                </text>
              </g>
            );
          })}

          {/* Threshold Reference Lines */}
          {thresholds.map((th) => {
            const yPos = getY(th.wind);
            return (
              <g key={th.label}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={svgWidth - paddingRight}
                  y2={yPos}
                  stroke={th.color}
                  strokeWidth="1"
                  strokeDasharray="4, 4"
                  strokeOpacity="0.4"
                />
                <text x={svgWidth - paddingRight + 4} y={yPos + 3} fill={th.color} fontSize="8" fontWeight="600">
                  {th.label}
                </text>
              </g>
            );
          })}

          {/* Observed Path */}
          {observedPath && <path d={observedPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />}

          {/* Predicted Path */}
          {predictedPath && (
            <path d={predictedPath} fill="none" stroke="#f97316" strokeWidth="2.5" strokeDasharray="5, 4" />
          )}

          {/* Observed Markers */}
          {combinedPoints.map((p, idx) => {
            const xPos = getX(idx);
            const yPos = getY(p.wind);
            return (
              <g key={idx}>
                <circle
                  cx={xPos}
                  cy={yPos}
                  r={p.isPredicted ? 5 : 3.5}
                  fill={p.isPredicted ? '#ea580c' : '#0284c7'}
                  stroke={p.isPredicted ? '#fdba74' : '#bae6fd'}
                  strokeWidth="1.5"
                />
              </g>
            );
          })}

          {/* X Axis Ticks (Subset for readability) */}
          {combinedPoints.map((p, idx) => {
            if (idx % Math.ceil(combinedPoints.length / 7) !== 0 && idx !== combinedPoints.length - 1) return null;
            const xPos = getX(idx);
            return (
              <text
                key={idx}
                x={xPos}
                y={svgHeight - 10}
                fill={p.isPredicted ? '#fb923c' : '#64748b'}
                fontSize="9"
                textAnchor="middle"
                fontWeight={p.isPredicted ? '600' : 'normal'}
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
