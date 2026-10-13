import React, { useEffect, useState } from 'react';
import { Activity, Clock, Wind, LayoutDashboard, Award, FileText, Database } from 'lucide-react';
import { api } from '../../services/api';
import { SystemStatus } from '../../types';

export type NavTab = 'overview' | 'evaluation' | 'reports' | 'sources';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
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

  const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Intelligence Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'evaluation', label: 'Model Evaluation', icon: <Award size={16} /> },
    { id: 'reports', label: 'Research Reports', icon: <FileText size={16} /> },
    { id: 'sources', label: 'Data Sources', icon: <Database size={16} /> },
  ];

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 28px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      {/* Brand Logo & Title (Matching user header title) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          <Wind size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            CycloneFusion <span style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700 }}>AI/ML</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
            Satellite Multi-Source Spatiotemporal Framework
          </div>
        </div>
      </div>

      {/* Center Tabs Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Side Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* UTC Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            color: '#64748b',
            fontFamily: 'var(--font-mono)',
            backgroundColor: '#f8fafc',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
          }}
        >
          <Clock size={13} color="#2563eb" />
          <span>{utcTime}</span>
        </div>

        {/* DB Connected Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: status?.database_connected ? '#dcfce7' : '#fee2e2',
            color: status?.database_connected ? '#16a34a' : '#dc2626',
            border: `1px solid ${status?.database_connected ? '#bbf7d0' : '#fecaca'}`,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: status?.database_connected ? '#16a34a' : '#dc2626',
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
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            fontWeight: 600,
          }}
        >
          <Activity size={13} color="#2563eb" />
          <span>CNN &amp; ConvLSTM Ready</span>
        </div>
      </div>
    </header>
  );
};

