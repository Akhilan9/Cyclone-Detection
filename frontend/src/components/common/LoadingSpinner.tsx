import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Processing cyclone data...', size = 32 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '16px' }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: '3px solid rgba(6, 182, 212, 0.15)',
          borderTop: '3px solid var(--accent-cyan)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {message && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{message}</p>}
    </div>
  );
};
