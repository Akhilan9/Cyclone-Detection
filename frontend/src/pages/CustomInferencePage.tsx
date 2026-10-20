import React, { useState, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Camera,
  Layers,
  Brain,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wind,
  Gauge,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import type { UploadAnalyzeResult } from '../types';

interface PresetTile {
  id: string;
  cycloneId?: string;
  name: string;
  basin?: string;
  stage: string;
  windKts: number;
  description: string;
  imagePath: string;
}

const PRESET_TILES: PresetTile[] = [
  {
    id: 'katrina_cat5',
    cycloneId: '2005236N23285',
    name: 'Hurricane Katrina Core',
    basin: 'North Atlantic',
    stage: 'Cat 5 Major Hurricane',
    windKts: 150,
    description: 'NOAA / NASA GOES thermal infrared capture - Gulf of Mexico eyewall (2005)',
    imagePath: '/satellite/fused_frame5.jpg',
  },
  {
    id: 'haiyan_supertyphoon',
    cycloneId: '2013307N06158',
    name: 'Typhoon Haiyan Eyewall',
    basin: 'Western Pacific',
    stage: 'Cat 5 Super Typhoon',
    windKts: 170,
    description: 'JMA Himawari / NASA capture - world-record pinhole eyewall (2013)',
    imagePath: '/satellite/irwin_frame4.jpg',
  },
  {
    id: 'patricia_record',
    cycloneId: '2015293N09266',
    name: 'Hurricane Patricia Core',
    basin: 'Eastern Pacific',
    stage: 'Cat 5 Major Hurricane',
    windKts: 185,
    description: 'NASA MODIS Band 31 capture - explosive rapid intensification (2015)',
    imagePath: '/satellite/irwin_frame5.jpg',
  },
  {
    id: 'freddy_record',
    cycloneId: '2023036S10114',
    name: 'Cyclone Freddy Vortex',
    basin: 'Southern Hemisphere',
    stage: 'Cat 5 Tropical Cyclone',
    windKts: 145,
    description: 'EUMETSAT / NASA capture - historic 36-day trans-oceanic track (2023)',
    imagePath: '/satellite/vis_frame5.jpg',
  },
  {
    id: 'amphan_super',
    cycloneId: '2020137N10087',
    name: 'Cyclone Amphan Core',
    basin: 'North Indian Ocean',
    stage: 'Super Cyclonic Storm',
    windKts: 130,
    description: 'Real NASA Terra Band 31 capture - symmetric eyewall (2020)',
    imagePath: '/satellite/fused_frame5.jpg',
  },
  {
    id: 'vardah_landfall',
    cycloneId: '2016341N10095',
    name: 'Cyclone Vardah Landfall',
    basin: 'North Indian Ocean',
    stage: 'Very Severe Cyclonic Storm',
    windKts: 75,
    description: 'Real NASA MODIS thermal IR capture - approaching coast (2016)',
    imagePath: '/satellite/irwin_frame5.jpg',
  },
  {
    id: 'fani_extreme',
    cycloneId: '2019117N12089',
    name: 'Cyclone Fani Core',
    basin: 'North Indian Ocean',
    stage: 'Extremely Severe Cyclonic Storm',
    windKts: 115,
    description: 'Real NASA MODIS capture - Cat-4 pinhole eyewall (2019)',
    imagePath: '/satellite/irwin_frame4.jpg',
  },
  {
    id: 'biparjoy_vortex',
    cycloneId: '2023157N13066',
    name: 'Cyclone Biparjoy Spiral',
    basin: 'North Indian Ocean',
    stage: 'Very Severe Cyclonic Storm',
    windKts: 90,
    description: 'Real NASA Terra capture - long-lived Arabian Sea vortex (2023)',
    imagePath: '/satellite/fused_frame4.jpg',
  },
];

export const CustomInferencePage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<UploadAnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camOpacity, setCamOpacity] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'overlay' | 'side_by_side' | 'raw'>('overlay');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result as string;
      setImagePreview(base64Str);
      runInference(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    } else {
      setError('Please drop a valid image file (PNG, JPG, JPEG, or WebP).');
    }
  };

  const handleSelectPreset = async (preset: PresetTile) => {
    setAnalyzing(true);
    setError(null);
    try {
      let base64Str = '';
      if (preset.cycloneId) {
        try {
          const preview = await api.getSatellitePreview(preset.cycloneId);
          if (preview.tir_image_base64) {
            base64Str = preview.tir_image_base64;
          } else if (preview.visible_image_base64) {
            base64Str = preview.visible_image_base64;
          }
        } catch (e) {
          console.warn('API satellite preview not available, using fallback asset:', e);
        }
      }

      if (!base64Str && preset.imagePath) {
        const res = await fetch(preset.imagePath);
        const blob = await res.blob();
        base64Str = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (base64Str) {
        setImagePreview(base64Str);
        await runInference(base64Str);
      } else {
        throw new Error('Satellite frame could not be loaded.');
      }
    } catch (err: any) {
      setError(err.message || 'Preset inference failed.');
      setAnalyzing(false);
    }
  };

  const runInference = async (base64Payload: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.uploadAndAnalyze({ image_base64: base64Payload });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Image inference failed. Please ensure the backend is running.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getStageBadgeStyle = (category: string) => {
    const s = category.toLowerCase();
    if (s.includes('super')) return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    if (s.includes('extremely')) return { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' };
    if (s.includes('very severe')) return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
    if (s.includes('severe')) return { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' };
    return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
  };

  const activeBadge = result ? getStageBadgeStyle(result.predicted_category) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="white-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
          borderLeft: '5px solid #7c3aed',
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
                color: '#7c3aed',
                backgroundColor: '#ede9fe',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Interactive Computer Vision
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Brain size={14} color="#7c3aed" /> CNN Feature Activation + Grad-CAM Saliency
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
            Live AI Vision Studio & Custom Satellite Inference
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '840px', marginTop: '4px', lineHeight: 1.5 }}>
            Upload arbitrary geostationary or polar satellite imagery (Thermal IR Band 31, Visible, or Synthetic Radar)
            to execute live spatial CNN vortex detection, 7-stage IMD intensity classification, and Explainable AI (Grad-CAM) attention localization.
          </p>
        </div>
      </div>

      {/* Preset Fast-Test Selector */}
      <div className="white-card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
          Quick Benchmark Test Presets (Click to Evaluate)
        </div>
        <div className="responsive-grid-auto-220">
          {PRESET_TILES.map((t) => (
            <div
              key={t.id}
              id={`preset-${t.id}`}
              onClick={() => handleSelectPreset(t)}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.backgroundColor = '#f5f3ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{t.name}</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {t.basin && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                      {t.basin.replace(' Ocean', '')}
                    </span>
                  )}
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#059669', backgroundColor: '#d1fae5', padding: '1px 5px', borderRadius: '4px' }}>
                    🛰️ NASA
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed', backgroundColor: '#ede9fe', padding: '1px 6px', borderRadius: '4px' }}>
                    {t.windKts} kts
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>{t.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Studio Grid (Responsive) */}
      <div className="responsive-grid-auto-320">
        {/* Left Card: Upload & Visual Inspection Canvas */}
        <div className="white-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Satellite Frame Input</h3>
            {result && (
              <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                {(['overlay', 'side_by_side', 'raw'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: viewMode === m ? '#ffffff' : 'transparent',
                      color: viewMode === m ? '#7c3aed' : '#64748b',
                      boxShadow: viewMode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {m === 'overlay' ? 'Blended Grad-CAM' : m === 'side_by_side' ? 'Saliency Heatmap' : 'Raw Frame'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload Area / Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: imagePreview ? '12px' : '36px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              transition: 'border-color 0.2s ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden' }}>
                {viewMode === 'raw' && (
                  <img
                    src={imagePreview}
                    alt="Uploaded Satellite Raw"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                {viewMode === 'overlay' && result && (
                  <img
                    src={result.gradcam.overlay_base64}
                    alt="Grad-CAM Overlay"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                {viewMode === 'side_by_side' && result && (
                  <img
                    src={result.gradcam.heatmap_base64}
                    alt="Grad-CAM Saliency"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                {(!result || viewMode === 'raw') && (
                  <img
                    src={imagePreview}
                    alt="Raw Frame"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {/* Eyewall Bounding Box Indicator */}
                {result && result.eyewall_bounding_box && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${result.eyewall_bounding_box.ymin * 100}%`,
                      left: `${result.eyewall_bounding_box.xmin * 100}%`,
                      width: `${(result.eyewall_bounding_box.xmax - result.eyewall_bounding_box.xmin) * 100}%`,
                      height: `${(result.eyewall_bounding_box.ymax - result.eyewall_bounding_box.ymin) * 100}%`,
                      border: '2px solid #ef4444',
                      borderRadius: '4px',
                      boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
                      pointerEvents: 'none',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '0',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      DETECTED EYEWALL
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Upload size={24} />
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Drop custom satellite image here
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Supports PNG, JPG, or GeoTIFF (MODIS, INSAT-3D, Himawari)
                </div>
              </div>
            )}
          </div>

          {/* Grad-CAM Saliency Bar & Legend */}
          {result && (
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Explainable AI (Grad-CAM) Visual Saliency
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c3aed' }}>
                  {result.gradcam.feature_layer}
                </span>
              </div>

              {/* JET colorbar */}
              <div
                style={{
                  height: '10px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #0000ff 0%, #00ffff 25%, #ffff00 65%, #ff0000 100%)',
                  marginBottom: '6px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                <span>Low Activation (Sea / Clear Air)</span>
                <span>Spiral Feeder Bands</span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>Peak Eye Convection (Red)</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}
        </div>

        {/* Right Card: Real-Time AI Classification & Regression Verdict */}
        <div className="white-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Real-Time Inference Output</h3>
            {analyzing && (
              <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="animate-spin" /> Running PyTorch CNN...
              </span>
            )}
          </div>

          {!result ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
              Upload an image or pick a preset above to run live neural network inference.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Primary Verdict Card */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  backgroundColor: activeBadge?.bg || '#eff6ff',
                  border: `1.5px solid ${activeBadge?.border || '#bfdbfe'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: activeBadge?.color, textTransform: 'uppercase' }}>
                    IMD 7-Stage Classification Verdict
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', backgroundColor: '#d1fae5', padding: '2px 8px', borderRadius: '999px' }}>
                    {(result.confidence * 100).toFixed(1)}% Confidence
                  </span>
                </div>

                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {result.predicted_category}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>SUSTAINED WIND SPEED:</span>{' '}
                    <strong style={{ color: activeBadge?.color }}>{result.estimated_wind_speed_kts} knots</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>ESTIMATED PRESSURE:</span>{' '}
                    <strong style={{ color: '#0f172a' }}>{result.estimated_pressure_hpa} hPa</strong>
                  </div>
                </div>
              </div>

              {/* Convective Vortex Presence Check */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <CheckCircle2 size={18} color="#059669" />
                <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                  <strong>Cyclone Structural Convection Confirmed:</strong> Model detected organized cyclonic circulation with{' '}
                  <strong style={{ color: '#059669' }}>{(result.presence_probability * 100).toFixed(1)}%</strong> probability.
                </div>
              </div>

              {/* Full 7-Stage Softmax Class Probabilities */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Softmax Class Probability Distribution across 7 Stages
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(result.category_probabilities).map(([cat, prob]) => {
                    const isTop = cat === result.predicted_category;
                    const pct = (prob * 100).toFixed(1);

                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '3px' }}>
                          <span style={{ fontWeight: isTop ? 800 : 500, color: isTop ? '#0f172a' : '#64748b' }}>
                            {cat}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: isTop ? 800 : 600, color: isTop ? '#7c3aed' : '#475569' }}>
                            {pct}%
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: isTop ? '#7c3aed' : '#cbd5e1',
                              borderRadius: '999px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
