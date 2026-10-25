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
    { id: 'evaluation', label: 'Model Evaluation', icon: <Award size={16} />, badge: '90.3%', badgeColor: '#10b981' },
    { id: 'reports', label: 'Research Reports', icon: <FileText size={16} />, badge: 'PDF / CSV', badgeColor: '#2563eb' },
    { id: 'sources', label: 'Data Sources', icon: <Database size={16} />, badge: '6 Feeds', badgeColor: '#8b5cf6' },
  ];

  return (
    <header className="app-navbar-header">
      {/* Top Row: Brand on Left, Live Clock & Status Badges on Right */}
      <div className="navbar-top-row">
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
              transition: 'transform 0.2s ease',
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
              color: '#334155',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              backgroundColor: '#f8fafc',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              userSelect: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.18s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
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
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: status?.database_connected ? '#ecfdf5' : '#fef2f2',
              color: status?.database_connected ? '#065f46' : '#991b1b',
              border: `1px solid ${status?.database_connected ? '#a7f3d0' : '#fecaca'}`,
              fontWeight: 600,
              flexShrink: 0,
              transition: 'all 0.2s ease',
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
            className="navbar-status-badge-hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              fontWeight: 600,
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            <Activity size={13} color="#2563eb" />
            <span>CNN &amp; ConvLSTM Ready</span>
          </div>
        </div>
      </div>

      {/* Dedicated Full Width Tabs Row: All 6 tabs completely visible without clipping */}
      <div className="navbar-nav-strip">
        <nav className="navbar-nav-tabs">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                data-testid={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`navbar-tab-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #cbd5e1' : '1px solid transparent',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#2563eb' : '#64748b',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.6)';
                    e.currentTarget.style.color = '#f1f5f9';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div style={{ color: isActive ? '#38bdf8' : '#64748b', display: 'flex', alignItems: 'center' }}>
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
                      backgroundColor: isActive ? `${tab.badgeColor}25` : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? tab.badgeColor : '#94a3b8',
                      border: `1px solid ${isActive ? `${tab.badgeColor}50` : 'rgba(255, 255, 255, 0.06)'}`,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

