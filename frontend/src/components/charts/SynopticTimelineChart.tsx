import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  Wind,
  Gauge,
  Flame,
  Zap,
  Clock,
  Compass,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { TrackPoint, PredictedTrackPoint } from '../../types';

interface SynopticTimelineChartProps {
  trackPoints: TrackPoint[];
  forecastPoints?: PredictedTrackPoint[];
  cycloneName: string;
  basin?: string;
}

export const SynopticTimelineChart: React.FC<SynopticTimelineChartProps> = ({
  trackPoints = [],
  forecastPoints = [],
  cycloneName,
  basin,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!trackPoints || trackPoints.length === 0) {
    return null;
  }

  // Combine chronological track points with forecast points
  const points = trackPoints.map((p, idx) => ({
    idx,
    isForecast: false,
    timestamp: p.timestamp_utc,
    dateLabel: p.timestamp_utc ? p.timestamp_utc.slice(5, 16).replace('T', ' ') + 'Z' : `T+${idx * 6}h`,
    wind: p.wind_speed_kts ?? 35,
    pressure: p.central_pressure_hpa ?? 1000,
    stage: p.imd_stage || 'Cyclonic Storm',
  }));

  if (forecastPoints && forecastPoints.length > 0) {
    forecastPoints.forEach((fp, fIdx) => {
      points.push({
        idx: trackPoints.length + fIdx,
        isForecast: true,
        timestamp: fp.forecast_timestamp_utc,
        dateLabel: `FC +${fp.step_hours}h`,
        wind: Math.round(fp.predicted_wind_kts),
        pressure: Math.round(1010 - (fp.predicted_wind_kts * 0.65)),
        stage: fp.predicted_imd_stage || 'Forecast Projection',
      });
    });
  }

  // Calculate Rapid Intensification surges (max 24h delta)
  let max24hSurge = 0;
  let riStartIndex = -1;
  for (let i = 0; i < trackPoints.length; i++) {
    for (let j = i + 1; j < trackPoints.length; j++) {
      const t1 = new Date(trackPoints[i].timestamp_utc).getTime();
      const t2 = new Date(trackPoints[j].timestamp_utc).getTime();
      const diffHours = (t2 - t1) / (1000 * 60 * 60);
      if (diffHours >= 20 && diffHours <= 28) {
        const delta = (trackPoints[j].wind_speed_kts || 0) - (trackPoints[i].wind_speed_kts || 0);
        if (delta > max24hSurge) {
          max24hSurge = delta;
          riStartIndex = i;
        }
      }
    }
  }

  const isRapidIntensification = max24hSurge >= 30;

  // Chart dimensions & scaling
  const width = 860;
  const height = 240;
  const padLeft = 55;
  const padRight = 55;
  const padTop = 25;
  const padBottom = 40;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const minWind = 15;
  const maxWind = Math.max(160, ...points.map((p) => p.wind + 15));
  const minPres = Math.min(880, ...points.map((p) => p.pressure - 10));
  const maxPres = 1015;

  const getX = (index: number) => padLeft + (index / Math.max(1, points.length - 1)) * plotWidth;
  const getYWind = (wind: number) =>
    padTop + plotHeight - ((wind - minWind) / (maxWind - minWind)) * plotHeight;
  // Pressure scale is inverted so lower pressure dips downward (matching cyclone core deepening)
  const getYPres = (pres: number) =>
    padTop + ((maxPres - pres) / (maxPres - minPres)) * plotHeight;

  // Generate SVG path strings
  const historicalPoints = points.filter((p) => !p.isForecast);
  const forecastOnlyPoints = points.filter((p) => p.isForecast);

  const histWindPath =
    historicalPoints.length > 1
      ? historicalPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.idx).toFixed(1)} ${getYWind(p.wind).toFixed(1)}`)
          .join(' ')
      : '';

  const histPresPath =
    historicalPoints.length > 1
      ? historicalPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.idx).toFixed(1)} ${getYPres(p.pressure).toFixed(1)}`)
          .join(' ')
      : '';

  // Forecast dashed connection
  let forecastWindPath = '';
  let forecastPresPath = '';
  if (forecastOnlyPoints.length > 0 && historicalPoints.length > 0) {
    const lastHist = historicalPoints[historicalPoints.length - 1];
    forecastWindPath = `M ${getX(lastHist.idx).toFixed(1)} ${getYWind(lastHist.wind).toFixed(1)} ` +
      forecastOnlyPoints.map((p) => `L ${getX(p.idx).toFixed(1)} ${getYWind(p.wind).toFixed(1)}`).join(' ');
    forecastPresPath = `M ${getX(lastHist.idx).toFixed(1)} ${getYPres(lastHist.pressure).toFixed(1)} ` +
      forecastOnlyPoints.map((p) => `L ${getX(p.idx).toFixed(1)} ${getYPres(p.pressure).toFixed(1)}`).join(' ');
  }

  // Summary Metrics
  const peakWind = Math.max(...points.map((p) => p.wind));
  const minPressure = Math.min(...points.map((p) => p.pressure));
  const latestWind = points[points.length - 1]?.wind;
  const latestPres = points[points.length - 1]?.pressure;

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div
      className="white-card"
      style={{
        padding: '20px 24px',
        borderRadius: '14px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Header with Title and KPI Badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: '1px solid rgba(37, 99, 235, 0.25)',
              }}
            >
              Synoptic Analytics
            </span>
            {isRapidIntensification && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#f87171',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Flame size={12} />
                Explosive RI Active (+{max24hSurge} kts/24h)
              </span>
            )}
            {basin && (
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                • {basin}
              </span>
            )}
          </div>
          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0f172a',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Activity size={18} color="#2563eb" />
            Intensity &amp; Pressure Evolution Timeline ({cycloneName})
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
            Dual-variable synoptic curve showing maximum sustained wind speed (knots) and central barometric pressure (hPa) with 24h ConvLSTM forecast.
          </p>
        </div>

        {/* Top Summary Metric Chips */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Peak Wind
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0284c7' }}>
              {peakWind} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>kts</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Min Pressure
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#9333ea' }}>
              {minPressure} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>hPa</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: isRapidIntensification ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${isRapidIntensification ? '#fca5a5' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '6px 12px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.65rem', color: isRapidIntensification ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Peak 24h ΔV
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isRapidIntensification ? '#dc2626' : '#0f172a' }}>
              +{max24hSurge} <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>kts</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}
        >
          <defs>
            <linearGradient id="windGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="presGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <linearGradient id="windAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[34, 64, 90, 120].map((thr) => {
            const y = getYWind(thr);
            return (
              <g key={`grid-wind-${thr}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748b"
                  fontWeight="600"
                >
                  {thr} kt
                </text>
              </g>
            );
          })}

          {/* Right Y-Axis Pressure Grid Labels */}
          {[990, 960, 930, 900].map((pVal) => {
            const y = getYPres(pVal);
            return (
              <text
                key={`grid-pres-${pVal}`}
                x={width - padRight + 8}
                y={y + 3}
                textAnchor="start"
                fontSize="9"
                fill="#c084fc"
                fontWeight="600"
              >
                {pVal} hPa
              </text>
            );
          })}

          {/* Forecast Horizon Boundary Divider */}
          {historicalPoints.length > 0 && forecastOnlyPoints.length > 0 && (
            <g>
              <line
                x1={getX(historicalPoints[historicalPoints.length - 1].idx)}
                y1={padTop}
                x2={getX(historicalPoints[historicalPoints.length - 1].idx)}
                y2={height - padBottom}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect
                x={getX(historicalPoints[historicalPoints.length - 1].idx)}
                y={padTop}
                width={width - padRight - getX(historicalPoints[historicalPoints.length - 1].idx)}
                height={plotHeight}
                fill="#fef3c7"
                fillOpacity="0.15"
              />
              <text
                x={getX(historicalPoints[historicalPoints.length - 1].idx) + 6}
                y={padTop + 12}
                fontSize="9"
                fill="#d97706"
                fontWeight="700"
              >
                24h Forecast Horizon →
              </text>
            </g>
          )}

          {/* Historical Wind Curve */}
          {histWindPath && (
            <path
              d={histWindPath}
              fill="none"
              stroke="url(#windGrad)"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Wind Curve (Dashed) */}
          {forecastWindPath && (
            <path
              d={forecastWindPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          )}

          {/* Historical Pressure Curve */}
          {histPresPath && (
            <path
              d={histPresPath}
              fill="none"
              stroke="url(#presGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Pressure Curve (Dashed) */}
          {forecastPresPath && (
            <path
              d={forecastPresPath}
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.75"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, i) => {
            const cx = getX(p.idx);
            const cyWind = getYWind(p.wind);
            const isHovered = hoveredIdx === i;
            const isLatest = i === historicalPoints.length - 1;

            return (
              <g key={`pt-${i}`} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                {/* Wind Point */}
                <circle
                  cx={cx}
                  cy={cyWind}
                  r={isHovered ? 6 : p.isForecast ? 4 : isLatest ? 5.5 : 3.5}
                  fill={p.isForecast ? '#f59e0b' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                />

                {/* Pressure Point */}
                <circle
                  cx={cx}
                  cy={getYPres(p.pressure)}
                  r={isHovered ? 4.5 : 2.5}
                  fill="#9333ea"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                />

                {/* Date Label on X Axis */}
                {(i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1) && (
                  <text
                    x={cx}
                    y={height - padBottom + 16}
                    textAnchor="middle"
                    fontSize="9"
                    fill={p.isForecast ? '#d97706' : '#64748b'}
                    fontWeight={p.isForecast ? '700' : '500'}
                  >
                    {p.dateLabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* Active Hover Guide Line */}
          {hoveredIdx !== null && (
            <line
              x1={getX(points[hoveredIdx].idx)}
              y1={padTop}
              x2={getX(points[hoveredIdx].idx)}
              y2={height - padBottom}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Left Y-Axis Title */}
          <text
            x={16}
            y={padTop - 8}
            fontSize="9"
            fill="#0284c7"
            fontWeight="800"
            textAnchor="start"
          >
            ▲ Wind (kts)
          </text>

          {/* Right Y-Axis Title */}
          <text
            x={width - 12}
            y={padTop - 8}
            fontSize="9"
            fill="#9333ea"
            fontWeight="800"
            textAnchor="end"
          >
            ▼ Pressure (hPa)
          </text>
        </svg>
      </div>

      {/* Interactive Hover Detail Inspector */}
      {activePoint && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            padding: '10px 16px',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={15} color="#2563eb" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
              {activePoint.dateLabel}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: activePoint.isForecast ? '#b45309' : '#0369a1',
                backgroundColor: activePoint.isForecast ? '#fef3c7' : '#e0f2fe',
                border: activePoint.isForecast ? '1px solid #fde68a' : '1px solid #bae6fd',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {activePoint.isForecast ? 'ConvLSTM 24h Projected' : 'Best-Track Observation'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Wind:</span>
              <strong style={{ fontSize: '0.88rem', color: '#0284c7' }}>
                {activePoint.wind} kts ({Math.round(activePoint.wind * 1.852)} km/h)
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9333ea' }} />
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Pressure:</span>
              <strong style={{ fontSize: '0.88rem', color: '#9333ea' }}>
                {activePoint.pressure} hPa
              </strong>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
              {activePoint.stage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
