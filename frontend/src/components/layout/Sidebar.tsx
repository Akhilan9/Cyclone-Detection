import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  MapPin,
  TrendingUp,
  Award,
  FileText,
  Database,
} from 'lucide-react';

export type NavTab = 'overview' | 'analysis' | 'map' | 'intensity' | 'evaluation' | 'reports' | 'sources';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'analysis', label: 'Cyclone Analysis', icon: <Cpu size={18} />, badge: 'AI Live' },
    { id: 'map', label: 'Interactive Map', icon: <MapPin size={18} /> },
    { id: 'intensity', label: 'Intensity Timeline', icon: <TrendingUp size={18} /> },
    { id: 'evaluation', label: 'Model Evaluation', icon: <Award size={18} /> },
    { id: 'reports', label: 'Reports Center', icon: <FileText size={18} /> },
    { id: 'sources', label: 'Data Sources', icon: <Database size={18} /> },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#0a101f',
        borderRight: '1px solid var(--border-card)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        gap: '6px',
        minHeight: 'calc(100vh - 63px)',
      }}
    >
      <div style={{ padding: '0 12px 14px 12px', fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        Scientific Navigation
      </div>

      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              border: isActive ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid transparent',
              backgroundColor: isActive ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
              color: isActive ? '#f8fafc' : 'var(--text-muted)',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.08)';
                e.currentTarget.style.color = '#f8fafc';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-faint)' }}>{item.icon}</div>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(6, 182, 212, 0.2)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      <div style={{ marginTop: 'auto', padding: '16px 12px 0 12px', borderTop: '1px solid var(--border-card)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Target Domain</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--accent-sky)', fontWeight: 600 }}>North Indian Ocean (NIO)</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginTop: '2px' }}>Bay of Bengal & Arabian Sea</div>
      </div>
    </aside>
  );
};
