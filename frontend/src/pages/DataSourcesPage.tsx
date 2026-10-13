import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import type { DataSourceItem } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DataSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getDataSources()
      .then((res: { sources: DataSourceItem[]; total_sources: number }) => setSources(res.sources))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Querying meteorological dataset registry..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-sky)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
          Authoritative Meteorological Data Sources & Provenance
        </h2>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '820px' }}>
          Catalog of authoritative historical tropical cyclone archives, geostationary satellite feeds,
          and software verification fixtures supporting scientific reproducibility in the North Indian Ocean.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {sources.map((src) => (
          <div key={src.id} className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {src.organization}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor:
                      src.status === 'active' || src.status === 'integrated_via_ibtracs'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                    color:
                      src.status === 'active' || src.status === 'integrated_via_ibtracs'
                        ? '#34d399'
                        : '#38bdf8',
                  }}
                >
                  {src.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                {src.name}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                <div><strong>Basin:</strong> {src.basin}</div>
                <div><strong>Access:</strong> {src.access}</div>
                <div><strong>Format:</strong> {src.format}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-card)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Identifier: {src.id}</span>
              {src.url.startsWith('http') && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={12} />
                  <span>Official Archive</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
          Automated Data Ingestion & Refresh Command
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          To download and synchronize the latest live historical records from the official NOAA IBTrACS North Indian Ocean repository:
        </p>
        <pre
          style={{
            backgroundColor: '#090e1a',
            padding: '12px 16px',
            borderRadius: '6px',
            border: '1px solid var(--border-card)',
            color: 'var(--accent-cyan)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.825rem',
            overflowX: 'auto',
          }}
        >
          python data/scripts/download_noaa_ibtracs.py
        </pre>
      </div>
    </div>
  );
};
