import React, { useEffect, useState, useRef } from 'react';
import {
  Layers,
  Activity,
  Wind,
  Gauge,
  Compass,
  ArrowRight,
  TrendingUp,
  Flame,
  Globe,
  MapPin,
  Clock,
  ShieldAlert,
  Sparkles,
  BarChart3,
  SplitSquareVertical,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import { Cyclone, CycloneDetail, TrackPoint } from '../types';
import { StageBadge } from '../components/common/StageBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const CycloneComparatorPage: React.FC = () => {
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [selectedIdA, setSelectedIdA] = useState<string>('');
  const [selectedIdB, setSelectedIdB] = useState<string>('');
  const [cycloneA, setCycloneA] = useState<CycloneDetail | null>(null);
  const [cycloneB, setCycloneB] = useState<CycloneDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchingDetails, setFetchingDetails] = useState<boolean>(false);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Fetch all cyclones on mount
  useEffect(() => {
    api
      .getCyclones()
      .then((data) => {
        setCyclones(data);
        if (data.length >= 2) {
          // Default to Katrina vs Haiyan or Amphan vs Biparjoy
          const katrina = data.find((c) => c.name.toUpperCase() === 'KATRINA');
          const haiyan = data.find((c) => c.name.toUpperCase() === 'HAIYAN');
          const amphan = data.find((c) => c.name.toUpperCase() === 'AMPHAN');
          const biparjoy = data.find((c) => c.name.toUpperCase() === 'BIPARJOY');

          setSelectedIdA(katrina?.cyclone_id || amphan?.cyclone_id || data[0].cyclone_id);
          setSelectedIdB(haiyan?.cyclone_id || biparjoy?.cyclone_id || data[1].cyclone_id);
        }
      })
      .catch((err) => console.error('Failed to load cyclones:', err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch details for both storms
  useEffect(() => {
    if (!selectedIdA || !selectedIdB) return;
    setFetchingDetails(true);

    Promise.all([api.getCycloneById(selectedIdA), api.getCycloneById(selectedIdB)])
      .then(([detA, detB]) => {
        setCycloneA(detA);
        setCycloneB(detB);
      })
      .catch((err) => console.error('Failed to load cyclone pair:', err))
      .finally(() => setFetchingDetails(false));
  }, [selectedIdA, selectedIdB]);

  // Compute 24h max surge for a storm
  const getMaxSurge = (pts: TrackPoint[] = []) => {
    let maxDelta = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const t1 = new Date(pts[i].timestamp_utc).getTime();
        const t2 = new Date(pts[j].timestamp_utc).getTime();
        const diffHours = (t2 - t1) / (1000 * 60 * 60);
        if (diffHours >= 20 && diffHours <= 28) {
          const delta = (pts[j].wind_speed_kts || 0) - (pts[i].wind_speed_kts || 0);
          if (delta > maxDelta) maxDelta = delta;
        }
      }
    }
    return maxDelta;
  };

  const surgeA = getMaxSurge(cycloneA?.track_points);
  const surgeB = getMaxSurge(cycloneB?.track_points);

  // Initialize or update Leaflet dual comparison map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: [15, 0],
        zoom: 2,
        minZoom: 1,
        maxZoom: 18,
        worldCopyJump: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing overlay layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const allLatLngs: [number, number][] = [];

    // Plot Cyclone A (Cyan/Blue #0284c7)
    if (cycloneA && cycloneA.track_points.length > 0) {
      const latlngsA = cycloneA.track_points.map((p) => [p.latitude, p.longitude] as [number, number]);
      allLatLngs.push(...latlngsA);

      L.polyline(latlngsA, {
        color: '#0284c7',
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      cycloneA.track_points.forEach((p, i) => {
        const marker = L.circleMarker([p.latitude, p.longitude], {
          radius: i === cycloneA.track_points.length - 1 ? 7 : 4,
          fillColor: '#0284c7',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #0284c7;">${cycloneA.name}</strong><br/>
            Time: ${p.timestamp_utc.slice(0, 16)}Z<br/>
            Wind: <b>${p.wind_speed_kts} kts</b> | Pres: <b>${p.central_pressure_hpa} hPa</b><br/>
            Stage: ${p.imd_stage}
          </div>
        `);
      });
    }

    // Plot Cyclone B (Rose/Magenta #e11d48)
    if (cycloneB && cycloneB.track_points.length > 0) {
      const latlngsB = cycloneB.track_points.map((p) => [p.latitude, p.longitude] as [number, number]);
      allLatLngs.push(...latlngsB);

      L.polyline(latlngsB, {
        color: '#e11d48',
        weight: 4,
        opacity: 0.9,
        dashArray: '6 4',
      }).addTo(map);

      cycloneB.track_points.forEach((p, i) => {
        const marker = L.circleMarker([p.latitude, p.longitude], {
          radius: i === cycloneB.track_points.length - 1 ? 7 : 4,
          fillColor: '#e11d48',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #e11d48;">${cycloneB.name}</strong><br/>
            Time: ${p.timestamp_utc.slice(0, 16)}Z<br/>
            Wind: <b>${p.wind_speed_kts} kts</b> | Pres: <b>${p.central_pressure_hpa} hPa</b><br/>
            Stage: ${p.imd_stage}
          </div>
        `);
      });
    }

    // Fit bounds smoothly to contain both storms
    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [cycloneA, cycloneB]);

  // Quick Preset Setters
  const applyPreset = (nameA: string, nameB: string) => {
    const cA = cyclones.find((c) => c.name.toUpperCase() === nameA.toUpperCase());
    const cB = cyclones.find((c) => c.name.toUpperCase() === nameB.toUpperCase());
    if (cA) setSelectedIdA(cA.cyclone_id);
    if (cB) setSelectedIdB(cB.cyclone_id);
  };

  if (loading) {
    return <LoadingSpinner message="Loading global cyclone comparison catalog..." />;
  }

  // Normalized Evolution Profile Math
  const maxLifetimeSteps = Math.max(
    cycloneA?.track_points.length || 1,
    cycloneB?.track_points.length || 1
  );

  const chartWidth = 800;
  const chartHeight = 220;
  const pad = { left: 45, right: 20, top: 20, bottom: 35 };
  const pW = chartWidth - pad.left - pad.right;
  const pH = chartHeight - pad.top - pad.bottom;

  const maxCompareWind = Math.max(
    cycloneA?.max_wind_speed_kts || 140,
    cycloneB?.max_wind_speed_kts || 140,
    160
  );

  const getNormX = (idx: number, total: number) =>
    pad.left + (idx / Math.max(1, total - 1)) * pW;
  const getNormY = (wind: number) =>
    pad.top + pH - ((wind - 20) / (maxCompareWind - 20)) * pH;

  const pathA =
    cycloneA && cycloneA.track_points.length > 1
      ? cycloneA.track_points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getNormX(i, cycloneA.track_points.length).toFixed(1)} ${getNormY(p.wind_speed_kts || 30).toFixed(1)}`)
          .join(' ')
      : '';

  const pathB =
    cycloneB && cycloneB.track_points.length > 1
      ? cycloneB.track_points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getNormX(i, cycloneB.track_points.length).toFixed(1)} ${getNormY(p.wind_speed_kts || 30).toFixed(1)}`)
          .join(' ')
      : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="white-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
          borderLeft: '5px solid #2563eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#2563eb',
                backgroundColor: '#dbeafe',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Cross-Basin Analytics
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={14} color="#2563eb" /> NOAA IBTrACS Multi-Storm Comparator
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            Multi-Cyclone Comparative Studio
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '840px', marginTop: '4px', lineHeight: 1.5 }}>
            Side-by-side meteorological comparison of tropical cyclones across basins, contrasting intensification slopes, peak intensity, track geometry, and minimum central barometric pressure.
          </p>
        </div>

        {/* Preset Comparison Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => applyPreset('KATRINA', 'HAIYAN')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Katrina vs Haiyan (Cat 5 Clash)
          </button>

          <button
            onClick={() => applyPreset('AMPHAN', 'BIPARJOY')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Amphan vs Biparjoy (N. Indian)
          </button>

          <button
            onClick={() => applyPreset('PATRICIA', 'FREDDY')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Patricia vs Freddy (RI vs Longevity)
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Storm A Selector Card */}
        <div
          className="white-card"
          style={{
            padding: '18px 22px',
            borderTop: '4px solid #0284c7',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
              Primary Cyclone (A)
            </span>
            {cycloneA && <StageBadge stage={cycloneA.highest_imd_stage} />}
          </div>

          <select
            value={selectedIdA}
            onChange={(e) => setSelectedIdA(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {cyclones.map((c) => (
              <option key={`opt-a-${c.cyclone_id}`} value={c.cyclone_id}>
                {c.name} ({c.season_year}) - {c.basin} [{c.max_wind_speed_kts} kts]
              </option>
            ))}
          </select>

          {cycloneA && (
            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '14px' }}>
              <span>Basin: <strong>{cycloneA.basin}</strong></span>
              <span>Subbasin: <strong>{cycloneA.subbasin}</strong></span>
              <span>Obs: <strong>{cycloneA.track_points.length} points</strong></span>
            </div>
          )}
        </div>

        {/* Storm B Selector Card */}
        <div
          className="white-card"
          style={{
            padding: '18px 22px',
            borderTop: '4px solid #e11d48',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>
              Benchmark Cyclone (B)
            </span>
            {cycloneB && <StageBadge stage={cycloneB.highest_imd_stage} />}
          </div>

          <select
            value={selectedIdB}
            onChange={(e) => setSelectedIdB(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {cyclones.map((c) => (
              <option key={`opt-b-${c.cyclone_id}`} value={c.cyclone_id}>
                {c.name} ({c.season_year}) - {c.basin} [{c.max_wind_speed_kts} kts]
              </option>
            ))}
          </select>

          {cycloneB && (
            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '14px' }}>
              <span>Basin: <strong>{cycloneB.basin}</strong></span>
              <span>Subbasin: <strong>{cycloneB.subbasin}</strong></span>
              <span>Obs: <strong>{cycloneB.track_points.length} points</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side KPI Cards */}
      {cycloneA && cycloneB && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Peak Wind Speed */}
          <div className="white-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Peak Sustained Wind
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>
                {cycloneA.max_wind_speed_kts} <span style={{ fontSize: '0.8rem' }}>kts</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>vs</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#e11d48' }}>
                {cycloneB.max_wind_speed_kts} <span style={{ fontSize: '0.8rem' }}>kts</span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
              Δ: {Math.abs((cycloneA.max_wind_speed_kts || 0) - (cycloneB.max_wind_speed_kts || 0))} kts higher for{' '}
              <strong>{(cycloneA.max_wind_speed_kts || 0) >= (cycloneB.max_wind_speed_kts || 0) ? cycloneA.name : cycloneB.name}</strong>
            </div>
          </div>

          {/* Min Central Pressure */}
          <div className="white-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Lowest Central Pressure
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>
                {cycloneA.min_central_pressure_hpa} <span style={{ fontSize: '0.8rem' }}>hPa</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>vs</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#e11d48' }}>
                {cycloneB.min_central_pressure_hpa} <span style={{ fontSize: '0.8rem' }}>hPa</span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
              Lower central pressure indicates more intense vortex core
            </div>
          </div>

          {/* 24h RI Acceleration */}
          <div className="white-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Max 24h RI Surge (ΔV)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: surgeA >= 30 ? '#dc2626' : '#0284c7' }}>
                +{surgeA} <span style={{ fontSize: '0.8rem' }}>kts</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>vs</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: surgeB >= 30 ? '#dc2626' : '#e11d48' }}>
                +{surgeB} <span style={{ fontSize: '0.8rem' }}>kts</span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
              WMO RI threshold: ≥30 kts in 24 hours
            </div>
          </div>

          {/* Track Point Density */}
          <div className="white-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Track Synoptic Lifetime
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>
                {cycloneA.track_points.length * 6} <span style={{ fontSize: '0.8rem' }}>hrs</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>vs</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#e11d48' }}>
                {cycloneB.track_points.length * 6} <span style={{ fontSize: '0.8rem' }}>hrs</span>
              </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
              Calculated from 6-hourly best-track observations
            </div>
          </div>
        </div>
      )}

      {/* Normalized Evolution Profile Chart */}
      <div className="white-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#2563eb" />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Normalized Lifetime Intensification Profiles
              </h4>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
              Wind speed evolution normalized over total storm duration (0% Genesis to 100% Dissipation / Landfall).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '4px', backgroundColor: '#0284c7', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>{cycloneA?.name} (A)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '4px', backgroundColor: '#e11d48', borderRadius: '2px', borderBottom: '2px dashed #e11d48' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e11d48' }}>{cycloneB?.name} (B)</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', minWidth: '600px' }}>
            {/* Grid */}
            {[34, 64, 90, 120, 150].map((wVal) => {
              const y = getNormY(wVal);
              return (
                <g key={`norm-grid-${wVal}`}>
                  <line x1={pad.left} y1={y} x2={chartWidth - pad.right} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                    {wVal} kt
                  </text>
                </g>
              );
            })}

            {/* Path A */}
            {pathA && (
              <path d={pathA} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Path B */}
            {pathB && (
              <path d={pathB} fill="none" stroke="#e11d48" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Points A */}
            {cycloneA?.track_points.map((p, i) => (
              <circle
                key={`pt-a-${i}`}
                cx={getNormX(i, cycloneA.track_points.length)}
                cy={getNormY(p.wind_speed_kts || 30)}
                r="3.5"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}

            {/* Points B */}
            {cycloneB?.track_points.map((p, i) => (
              <circle
                key={`pt-b-${i}`}
                cx={getNormX(i, cycloneB.track_points.length)}
                cy={getNormY(p.wind_speed_kts || 30)}
                r="3.5"
                fill="#e11d48"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}

            {/* X Axis Labels */}
            <text x={pad.left} y={chartHeight - 10} fontSize="9" fill="#64748b" fontWeight="600">Genesis (0%)</text>
            <text x={pad.left + pW * 0.25} y={chartHeight - 10} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">25% Lifecycle</text>
            <text x={pad.left + pW * 0.50} y={chartHeight - 10} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">Peak Mature (50%)</text>
            <text x={pad.left + pW * 0.75} y={chartHeight - 10} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">75% Lifecycle</text>
            <text x={chartWidth - pad.right} y={chartHeight - 10} textAnchor="end" fontSize="9" fill="#64748b" fontWeight="600">Landfall (100%)</text>
          </svg>
        </div>
      </div>

      {/* Geospatial Dual-Track Map */}
      <div className="white-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="#2563eb" />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                Simultaneous Geospatial Trajectory Overlay
              </h4>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
              Both storm tracks rendered on a continuous world projection to contrast Coriolis recurvature, steering currents, and coastal approach angles.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>
              ● {cycloneA?.name} (Solid Blue)
            </span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e11d48' }}>
              --- {cycloneB?.name} (Dashed Rose)
            </span>
          </div>
        </div>

        <div
          ref={mapContainerRef}
          style={{
            height: '480px',
            width: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
          }}
        />
      </div>

      {/* Comparison Matrix Table */}
      {cycloneA && cycloneB && (
        <div className="white-card" style={{ padding: '22px 24px', overflowX: 'auto' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            Detailed Synoptic Meteorological Comparison Matrix
          </h4>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', color: '#475569' }}>Meteorological Parameter</th>
                <th style={{ padding: '10px 14px', color: '#0284c7' }}>{cycloneA.name} ({cycloneA.season_year})</th>
                <th style={{ padding: '10px 14px', color: '#e11d48' }}>{cycloneB.name} ({cycloneB.season_year})</th>
                <th style={{ padding: '10px 14px', color: '#64748b' }}>Comparative Analysis</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>Oceanic Basin</td>
                <td style={{ padding: '10px 14px' }}>{cycloneA.basin} ({cycloneA.subbasin})</td>
                <td style={{ padding: '10px 14px' }}>{cycloneB.basin} ({cycloneB.subbasin})</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  {cycloneA.basin === cycloneB.basin ? 'Same Oceanic Basin' : 'Cross-Basin Oceanic Comparison'}
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>Peak Classification</td>
                <td style={{ padding: '10px 14px' }}><StageBadge stage={cycloneA.highest_imd_stage} /></td>
                <td style={{ padding: '10px 14px' }}><StageBadge stage={cycloneB.highest_imd_stage} /></td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  Standardized WMO / IMD Multi-Scale Rating
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>Peak Sustained Wind</td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0284c7' }}>{cycloneA.max_wind_speed_kts} knots</td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#e11d48' }}>{cycloneB.max_wind_speed_kts} knots</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  Difference: {Math.abs((cycloneA.max_wind_speed_kts || 0) - (cycloneB.max_wind_speed_kts || 0))} knots
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>Minimum Barometric Pressure</td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0284c7' }}>{cycloneA.min_central_pressure_hpa} hPa</td>
                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#e11d48' }}>{cycloneB.min_central_pressure_hpa} hPa</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  Core Depth Delta: {Math.abs((cycloneA.min_central_pressure_hpa || 0) - (cycloneB.min_central_pressure_hpa || 0))} hPa
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>Rapid Intensification Rate</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: surgeA >= 30 ? '#dc2626' : '#0284c7' }}>+{surgeA} kts / 24h</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: surgeB >= 30 ? '#dc2626' : '#e11d48' }}>+{surgeB} kts / 24h</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  {surgeA > surgeB ? `${cycloneA.name} intensified ${surgeA - surgeB} kts/24h faster` : `${cycloneB.name} intensified ${surgeB - surgeA} kts/24h faster`}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>Total Best-Track Duration</td>
                <td style={{ padding: '10px 14px' }}>{cycloneA.track_points.length * 6} hours ({cycloneA.track_points.length} fixes)</td>
                <td style={{ padding: '10px 14px' }}>{cycloneB.track_points.length * 6} hours ({cycloneB.track_points.length} fixes)</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                  NOAA IBTrACS synoptic sampling interval: 6 hours
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
