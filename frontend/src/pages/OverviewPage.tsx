import React, { useEffect, useState } from 'react';
import { Cpu, Navigation, Wind, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Cyclone, SystemStatus, ModelMetadataItem } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StageBadge } from '../components/common/StageBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface OverviewPageProps {
  onNavigateToAnalysis: (cycloneId?: string) => void;
  onNavigateToMap: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateToAnalysis, onNavigateToMap }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [models, setModels] = useState<ModelMetadataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getStatus(),
      api.getCyclones(),
      api.getModels().then((res) => res.models),
    ])
      .then(([statusRes, cyclonesRes, modelsRes]) => {
        setStatus(statusRes);
        setCyclones(cyclonesRes);
        setModels(modelsRes);
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to backend server.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading operational dashboard status..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.95) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderLeft: '4px solid var(--accent-cyan)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              North Indian Ocean Tropical Cyclone Forecasting System
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '780px' }}>
              Multi-source satellite spatiotemporal deep learning framework for cyclone convective presence detection,
              IMD 7-stage intensity classification, and +6h to +24h trajectory & intensity forecasting.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" onClick={() => onNavigateToAnalysis()}>
              <Cpu size={16} />
              <span>Launch Live Inference</span>
            </button>
            <button className="btn-secondary" onClick={onNavigateToMap}>
              <Navigation size={16} />
              <span>View Map</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '16px', borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Monitored Cyclones"
          value={status?.total_cyclones_in_db ?? 0}
          subtitle="Best-track storms in database"
          icon={<Wind size={20} />}
          accentColor="#06b6d4"
        />
        <StatCard
          title="Synoptic Track Points"
          value={status?.total_track_points ?? 0}
          subtitle="Verified 6-hourly observations"
          icon={<Navigation size={20} />}
          accentColor="#3b82f6"
        />
        <StatCard
          title="Deep Learning Models"
          value={models.length}
          subtitle="Spatial CNN & ConvLSTM nets"
          icon={<Cpu size={20} />}
          accentColor="#10b981"
          badge="Ready"
        />
        <StatCard
          title="Target Basin"
          value="NIO"
          subtitle="Bay of Bengal & Arabian Sea"
          icon={<ShieldCheck size={20} />}
          accentColor="#a855f7"
          badge="IMD Scale"
        />
      </div>

      {/* Available Historical Cyclones Section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
              Historical Tropical Cyclones (Verified Best-Track Records)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
              RSMC New Delhi / NOAA IBTrACS historical storms ready for spatiotemporal analysis
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cyclone Name</th>
                <th>Storm Identifier</th>
                <th>Season / Year</th>
                <th>Sub-basin</th>
                <th>Peak Sustained Wind</th>
                <th>Min Central Pressure</th>
                <th>Highest IMD Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cyclones.map((c) => (
                <tr key={c.cyclone_id}>
                  <td>
                    <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>{c.name}</strong>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: 'var(--text-faint)' }}>
                    {c.cyclone_id}
                  </td>
                  <td>{c.season_year}</td>
                  <td>{c.subbasin}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>{c.max_wind_speed_kts ?? 'N/A'} kt</span>
                  </td>
                  <td>{c.min_central_pressure_hpa ? `${c.min_central_pressure_hpa} hPa` : 'N/A'}</td>
                  <td>
                    <StageBadge stage={c.highest_imd_stage} />
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => onNavigateToAnalysis(c.cyclone_id)}
                    >
                      <span>Analyze</span>
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Cpu size={18} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
              Spatial Feature Extractor (CNN)
            </h4>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Multi-head convolutional architecture processing 64×64 thermal infrared satellite imagery.
            Performs binary cyclone presence detection and 7-stage IMD intensity classification.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Navigation size={18} color="var(--accent-sky)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
              Spatiotemporal ConvLSTM Forecaster
            </h4>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Learns rotational vorticity dynamics from consecutive 6-hourly satellite observations (T=4),
            fusing kinematic track vectors to predict future latitude/longitude and sustained wind speed.
          </p>
        </div>
      </div>
    </div>
  );
};
