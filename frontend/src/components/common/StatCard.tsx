import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  accentColor = '#06b6d4',
}) => {
  return (
    <div className="glass-panel p-5 relative overflow-hidden" style={{ padding: '20px' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          backgroundColor: accentColor,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          {title}
        </span>
        {icon && <div style={{ color: accentColor, opacity: 0.9 }}>{icon}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {badge && (
          <span style={{ fontSize: '0.75rem', color: accentColor, background: `${accentColor}18`, padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
  );
};
