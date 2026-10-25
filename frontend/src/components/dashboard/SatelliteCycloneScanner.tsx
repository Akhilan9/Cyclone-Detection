import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe, Radio } from 'lucide-react';
import { api } from '../../services/api';
import type {
  NewCycloneDetectionResult,
  SurveillanceSector,
  TrackPoint,
  PredictedTrackPoint,
  LandfallHazardResult,
} from '../../types';

interface Props {
  onApplyDetectedCycloneToMap: (params: {
    cycloneName: string;
    cycloneId: string;
    observedPoints: TrackPoint[];
    predictedPoints: PredictedTrackPoint[];
    landfallHazard?: LandfallHazardResult;
    imagePreviewBase64?: string;
  }) => void;
  onRefreshCycloneList: () => void;
}

export const SatelliteCycloneScanner: React.FC<Props> = ({
  onApplyDetectedCycloneToMap,
  onRefreshCycloneList,
}) => {
  const [selectedSector, setSelectedSector] = useState<string>('Bay of Bengal');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [detectionResult, setDetectionResult] = useState<NewCycloneDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forecastHorizon, setForecastHorizon] = useState<number>(48);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sectors: Array<{
    name: string;
    label: string;
    sat: string;
    sensor: string;
    basin: string;
    coords: [number, number];
  }> = [
    {
      name: 'Bay of Bengal',
      label: 'Bay of Bengal',
      sat: 'INSAT-3DR TIR Band 31',
      sensor: '10.8 µm Thermal IR',
      basin: 'North Indian Ocean',
      coords: [14.8, 87.2],
    },
    {
      name: 'Arabian Sea',
      label: 'Arabian Sea',
      sat: 'INSAT-3D + NOAA-20',
      sensor: 'VIIRS Infrared Window',
      basin: 'North Indian Ocean',
      coords: [16.2, 68.4],
    },
    {
      name: 'Western Pacific',
      label: 'Western Pacific',
      sat: 'Himawari-9 AHI Band 13',
      sensor: 'Clean IR Window',
      basin: 'Philippine Sea / East Asia',
      coords: [16.5, 133.5],
    },
    {
      name: 'South Indian Ocean',
      label: 'South Indian Ocean',
      sat: 'NASA MODIS Terra',
      sensor: 'TIR Brightness Temp',
      basin: 'Southwest Maritime Basin',
      coords: [-15.4, 76.5],
    },
  ];

  const currentSectorObj = sectors.find((s) => s.name === selectedSector) || sectors[0];

  const handleScanForNewCyclones = async () => {
    setScanning(true);
    setError(null);
    setScanStep('📡 Ingesting Multi-Source Satellite Infrared Observations (10.8 µm)...');

    try {
      await new Promise((r) => setTimeout(r, 600));
      setScanStep('🧠 Running Spatial CNN Feature Extractor & Cyclogenesis Detector...');
      await new Promise((r) => setTimeout(r, 600));
      setScanStep('🌀 Computing IMD Intensity Stage & Convective Organization Morphology...');
      await new Promise((r) => setTimeout(r, 600));
      setScanStep('📈 Spatiotemporally Forecasting 48h Trajectory & Landfall Cone (ConvLSTM)...');

      const result = await api.scanNewCyclone({
        sector_name: selectedSector,
        satellite_source: currentSectorObj.sat,
        scan_coordinates: currentSectorObj.coords,
        forecast_horizon_hours: forecastHorizon,
        register_in_system: true,
      });

      setDetectionResult(result);
      onRefreshCycloneList();
    } catch (err: any) {
      console.error('Scan failed:', err);
      setError(err?.message || 'Failed to complete satellite cyclone detection scan.');
    } finally {
      setScanning(false);
      setScanStep('');
    }
  };

  const handlePlotOnMap = () => {
    if (!detectionResult) return;
    onApplyDetectedCycloneToMap({
      cycloneName: detectionResult.storm_designation,
      cycloneId: detectionResult.storm_designation,
      observedPoints: detectionResult.historical_formation_track || [],
      predictedPoints: detectionResult.projected_track || [],
      landfallHazard: detectionResult.landfall_hazard,
      imagePreviewBase64: detectionResult.image_preview_base64,
    });
  };

  return (
    <div
      className="white-card"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
        marginBottom: '24px',
        color: '#0f172a',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px #10b981',
              animation: 'pulse 2s infinite',
            }}
          />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              🛰️ Multi-Source Satellite Cyclone Detection & Trajectory Forecasting Engine
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Autonomous Deep Learning Cyclogenesis Surveillance & Real-Time Track Prediction
            </p>
          </div>
        </div>

        {/* Live Satellite Constellation Telemetry Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem' }}>
          <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 700 }}>
            🛰️ INSAT-3DR TIR: ACTIVE
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 700 }}>
            🛰️ NASA MODIS: 10.8µm
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff', fontWeight: 700 }}>
            🛰️ HIMAWARI-9: STREAMING
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 700 }}>
            🛰️ NOAA AVHRR: SYNCED
          </span>
        </div>
      </div>

      {/* Sector Selection & Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Custom Interactive Sector Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
            SURVEILLANCE SECTOR &amp; BASIN:
          </label>
          <button
            type="button"
            disabled={scanning}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#0f172a',
              border: isDropdownOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
              boxShadow: isDropdownOpen ? '0 0 10px rgba(37, 99, 235, 0.15)' : 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: scanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem' }}>🌊</span>
              <div>
                <span style={{ color: '#0f172a', fontWeight: 700 }}>{currentSectorObj.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '8px' }}>
                  ({currentSectorObj.basin})
                </span>
              </div>
            </div>
            <ChevronDown
              size={18}
              color="#64748b"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {/* Dropdown Options Menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 100,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                maxHeight: '260px',
                overflowY: 'auto',
              }}
            >
              {sectors.map((s) => {
                const isSelected = s.name === selectedSector;
                return (
                  <div
                    key={s.name}
                    onClick={() => {
                      setSelectedSector(s.name);
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? '#2563eb' : '#0f172a' }}>
                        🌊 {s.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                        {s.basin} • {s.sat}
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="#2563eb" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
            PRIMARY MULTI-SPECTRAL SENSOR:
          </label>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              color: '#0284c7',
              fontWeight: 600,
            }}
          >
            {currentSectorObj.sat} • {currentSectorObj.sensor}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
            CONVLSTM FORECAST HORIZON:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[24, 48, 72].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setForecastHorizon(h)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  background: forecastHorizon === h ? '#2563eb' : '#ffffff',
                  color: forecastHorizon === h ? '#ffffff' : '#475569',
                  border: '1px solid',
                  borderColor: forecastHorizon === h ? '#2563eb' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                +{h} Hours
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={handleScanForNewCyclones}
            disabled={scanning}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '8px',
              background: scanning
                ? '#94a3b8'
                : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: scanning ? 'not-allowed' : 'pointer',
              boxShadow: scanning ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {scanning ? '🛰️ SCANNING OBSERVATIONS...' : '🔍 DETECT NEW CYCLONES'}
          </button>
        </div>
      </div>

      {/* Scanning Feedback Status */}
      {scanning && (
        <div
          style={{
            padding: '16px',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px dashed #38bdf8',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🛰️ 🌀 🧠</div>
          <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.95rem' }}>{scanStep}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
            Analyzing multi-spectral brightness temperatures, convective curvature, and spatiotemporal kinematics
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #dc2626',
            color: '#991b1b',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Detection Results Card */}
      {detectionResult && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '16px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          {/* Alert Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              background:
                detectionResult.disaster_advisory.alert_color === '#dc2626'
                  ? '#fef2f2'
                  : '#fff7ed',
              border: `1.5px solid ${detectionResult.disaster_advisory.alert_color}`,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: detectionResult.disaster_advisory.alert_color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {detectionResult.disaster_advisory.alert_level}
              </div>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                🚨 {detectionResult.disaster_advisory.headline}
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePlotOnMap}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                🗺️ Plot Trajectory on Map
              </button>
            </div>
          </div>

          {/* 4 Telemetry Metrics Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DETECTION CONFIDENCE</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
                {(detectionResult.detection_probability * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Spatial CNN Cyclogenesis Verification
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>CLASSIFICATION &amp; INTENSITY</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ea580c', marginTop: '4px' }}>
                {detectionResult.estimated_imd_stage}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                Wind: <strong>{detectionResult.estimated_wind_kts} kts</strong> • Pressure: <strong>{detectionResult.estimated_pressure_hpa} hPa</strong>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DETECTED VORTEX CENTER</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
                {detectionResult.vortex_center[0].toFixed(2)}°N, {detectionResult.vortex_center[1].toFixed(2)}°E
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Estimated Center of Circulation
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>LANDFALL HAZARD &amp; ETA</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
                {detectionResult.disaster_advisory.estimated_landfall_eta}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                Target: {detectionResult.disaster_advisory.landfall_target}
              </div>
            </div>
          </div>

          {/* Satellite Image & ConvLSTM Track Horizon Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Satellite Infrared Frame */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                🛰️ Real-Time Thermal Infrared Satellite Imagery (10.8 µm)
              </div>
              {detectionResult.image_preview_base64 && (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    maxHeight: '240px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: '#000',
                  }}
                >
                  <img
                    src={detectionResult.image_preview_base64}
                    alt="Satellite Infrared Cyclone Frame"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      color: '#38bdf8',
                      fontWeight: 600,
                    }}
                  >
                    {detectionResult.satellite_source}
                  </div>
                </div>
              )}
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
                Morphology: <strong style={{ color: '#0f172a' }}>{detectionResult.structural_pattern}</strong>
              </div>
            </div>

            {/* ConvLSTM Trajectory Forecast Horizon */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '10px' }}>
                📈 Spatiotemporal ConvLSTM Predicted Trajectory Steps
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 4px' }}>Lead Time</th>
                      <th style={{ padding: '6px 4px' }}>Coordinates</th>
                      <th style={{ padding: '6px 4px' }}>Wind</th>
                      <th style={{ padding: '6px 4px' }}>Stage</th>
                      <th style={{ padding: '6px 4px' }}>Cone Radius</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectionResult.projected_track.map((pt, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 4px', fontWeight: 700, color: '#0284c7' }}>
                          +{pt.step_hours}h
                        </td>
                        <td style={{ padding: '6px 4px', color: '#0f172a' }}>
                          {pt.predicted_latitude.toFixed(2)}°N, {pt.predicted_longitude.toFixed(2)}°E
                        </td>
                        <td style={{ padding: '6px 4px', color: '#ea580c', fontWeight: 700 }}>
                          {pt.predicted_wind_kts} kts
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.72rem', color: '#334155' }}>
                          {pt.predicted_imd_stage}
                        </td>
                        <td style={{ padding: '6px 4px', color: '#64748b' }}>
                          ±{pt.uncertainty_radius_km} km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Official Early Warning Decision Support Directives */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              📋 Operational Early Warning Directives &amp; Maritime Protocols
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '0.8rem', color: '#334155' }}>
              <div>
                <strong style={{ color: '#0284c7' }}>Maritime &amp; Port Signal:</strong>{' '}
                {detectionResult.disaster_advisory.port_warning}
              </div>
              <div>
                <strong style={{ color: '#ea580c' }}>Storm Surge Estimate:</strong>{' '}
                {detectionResult.disaster_advisory.storm_surge_estimate}
              </div>
              <div>
                <strong style={{ color: '#dc2626' }}>Evacuation Directive:</strong>{' '}
                {detectionResult.disaster_advisory.evacuation_directive}
              </div>
              <div>
                <strong style={{ color: '#059669' }}>Fishermen Advisory:</strong>{' '}
                {detectionResult.disaster_advisory.maritime_advisory}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
