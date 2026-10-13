import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Clock, Wind } from 'lucide-react';
import { api } from '../../services/api';
import { SystemStatus } from '../../types';

export const Navbar: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => null);
    const interval = setInterval(() => {
      api.getStatus().then(setStatus).catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        backgroundColor: 'rgba(13, 21, 39, 0.85)',
        borderBottom: '1px solid var(--border-card)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
          }}
        >
          <Wind size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            CYCLONE AI <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 600 }}>v1.0</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
            Deep Learning Multi-Source Spatiotemporal Framework
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* UTC Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-card)',
          }}
        >
          <Clock size={14} color="var(--accent-cyan)" />
          <span>{utcTime}</span>
        </div>

        {/* Database Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.775rem',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: status?.database_connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: status?.database_connected ? '#34d399' : '#f87171',
            border: `1px solid ${status?.database_connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: status?.database_connected ? '#10b981' : '#ef4444',
            }}
          />
          <span>{status?.database_connected ? 'DB Connected' : 'DB Disconnected'}</span>
        </div>

        {/* Models Online Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.775rem',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: status?.models_ready ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: status?.models_ready ? 'var(--accent-cyan)' : 'var(--accent-amber)',
            border: `1px solid ${status?.models_ready ? 'rgba(6, 182, 212, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
        >
          <Activity size={13} />
          <span>{status?.models_ready ? 'CNN & ConvLSTM Ready' : 'Models Standby'}</span>
        </div>
      </div>
    </header>
  );
};
