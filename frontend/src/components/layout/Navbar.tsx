import React, { useEffect, useState } from 'react';
import { Activity, Clock, Wind, LayoutDashboard, Award, FileText, Database, Camera, SplitSquareVertical } from 'lucide-react';
import { api } from '../../services/api';
import { SystemStatus } from '../../types';

export type NavTab = 'overview' | 'comparator' | 'custom_inference' | 'evaluation' | 'reports' | 'sources';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [timeInfo, setTimeInfo] = useState<{ local12: string; local24: string; utc: string; tz: string }>({
    local12: '',
    local24: '',
    utc: '',
    tz: 'IST',
  });
  const [timeDisplayMode, setTimeDisplayMode] = useState<'combined' | 'local12' | 'local24' | 'utc'>('combined');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const local12 = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const local24 = now.toLocaleTimeString('en-GB', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const utc = now.toISOString().slice(11, 19) + ' UTC';

      let tz = 'IST';
      try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(now);
        const found = parts.find((p) => p.type === 'timeZoneName')?.value;
        if (found) {
          tz = found === 'GMT+5:30' ? 'IST' : found;
        }
      } catch {
        tz = 'IST';
      }

      setTimeInfo({ local12, local24, utc, tz });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getFormattedClock = () => {
    if (!timeInfo.local12) return 'Synchronizing...';
    switch (timeDisplayMode) {
      case 'local12':
        return `${timeInfo.local12} ${timeInfo.tz}`;
      case 'local24':
        return `${timeInfo.local24} ${timeInfo.tz}`;
      case 'utc':
        return timeInfo.utc;
      case 'combined':
      default:
        return `${timeInfo.local12} ${timeInfo.tz} • ${timeInfo.utc}`;
    }
  };

  const handleCycleTime = () => {
    const modes: ('combined' | 'local12' | 'local24' | 'utc')[] = ['combined', 'local12', 'local24', 'utc'];
    const nextIdx = (modes.indexOf(timeDisplayMode) + 1) % modes.length;
    setTimeDisplayMode(modes[nextIdx]);
  };

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => null);
    const interval = setInterval(() => {
      api.getStatus().then(setStatus).catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    { id: 'overview', label: 'Intelligence Dashboard', icon: <LayoutDashboard size={16} /> },
    { id: 'comparator', label: 'Cyclone Comparator', icon: <SplitSquareVertical size={16} />, badge: 'Compare 2', badgeColor: '#0ea5e9' },
    { id: 'custom_inference', label: 'AI Vision Studio', icon: <Camera size={16} />, badge: 'Upload & XAI', badgeColor: '#7c3aed' },
    { id: 'evaluation', label: 'Model Evaluation', icon: <Award size={16} />, badge: '63.4%', badgeColor: '#10b981' },
    { id: 'reports', label: 'Research Reports', icon: <FileText size={16} />, badge: 'PDF / CSV', badgeColor: '#2563eb' },
    { id: 'sources', label: 'Data Sources', icon: <Database size={16} />, badge: '6 Feeds', badgeColor: '#8b5cf6' },
  ];

  return (
    <header className="app-navbar-header">
      {/* Brand Logo & Title */}
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
            flexShrink: 0,
          }}
        >
          <Wind size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            CycloFusion <span style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700 }}>AI/ML</span>
          </div>
          <div className="navbar-brand-subtitle" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
            Tropical Cyclone Intelligent System • Multi-Source Satellite Platform
          </div>
        </div>
      </div>

      {/* Center Tabs Navigation with Touch Momentum Scroll */}
      <nav className="navbar-nav-tabs">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              data-testid={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                fontWeight: isActive ? 750 : 500,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                  e.currentTarget.style.color = '#1e293b';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              <div style={{ color: isActive ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </div>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '999px',
                    backgroundColor: isActive ? `${tab.badgeColor}18` : '#e2e8f0',
                    color: isActive ? tab.badgeColor : '#64748b',
                    border: `1px solid ${isActive ? `${tab.badgeColor}40` : 'transparent'}`,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Side Status Badges */}
      <div className="navbar-status-badges">
        {/* Synchronized Live Clock (Local IST & UTC) */}
        <div
          onClick={handleCycleTime}
          title="Live Synchronized Time • Click to toggle format (Combined / Local IST / 24h / UTC)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            color: '#1e293b',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            backgroundColor: '#f8fafc',
            padding: '5px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            cursor: 'pointer',
            userSelect: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.backgroundColor = '#eff6ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
        >
          <Clock size={13} color="#2563eb" />
          <span>{getFormattedClock()}</span>
        </div>

        {/* DB Connected Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            padding: '4px 9px',
            borderRadius: '999px',
            backgroundColor: status?.database_connected ? '#dcfce7' : '#fee2e2',
            color: status?.database_connected ? '#16a34a' : '#dc2626',
            border: `1px solid ${status?.database_connected ? '#bbf7d0' : '#fecaca'}`,
            fontWeight: 600,
            flexShrink: 0,
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
          className="navbar-status-badge-hide-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            padding: '4px 9px',
            borderRadius: '999px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <Activity size={13} color="#2563eb" />
          <span>CNN &amp; ConvLSTM Ready</span>
        </div>
      </div>
    </header>
  );
};

