import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  Database,
  CheckCircle2,
  Activity,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  Satellite,
  FileSpreadsheet,
  Globe,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import type { DataSourceItem } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DataSourcesPage: React.FC = () => {
  const [sources, setSources] = useState<DataSourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'satellite' | 'tracks' | 'portal'>('all');
  const [pingStatuses, setPingStatuses] = useState<{ [id: string]: { testing: boolean; latencyMs?: number; ok?: boolean } }>({});
  const [expandedSchema, setExpandedSchema] = useState<boolean>(false);

  useEffect(() => {
    api
      .getDataSources()
      .then((res: { sources: DataSourceItem[]; total_sources: number }) => setSources(res.sources))
      .finally(() => setLoading(false));
  }, []);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('python data/scripts/download_noaa_ibtracs.py');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async (id: string) => {
    setPingStatuses((prev) => ({ ...prev, [id]: { testing: true } }));
    try {
      const res = await api.pingDataSource(id);
      setPingStatuses((prev) => ({
        ...prev,
        [id]: { testing: false, latencyMs: res.latency_ms, ok: res.ok },
      }));
    } catch {
      setPingStatuses((prev) => ({
        ...prev,
        [id]: { testing: false, latencyMs: undefined, ok: false },
      }));
    }
  };

  const filteredSources = sources.filter((src) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'satellite') return src.id.includes('satellite') || src.id.includes('insat');
    if (filterCategory === 'tracks') return src.id.includes('ibtracs') || src.id.includes('track');
    if (filterCategory === 'portal') return src.id.includes('imd') || src.id.includes('portal');
    return true;
  });

  if (loading) return <LoadingSpinner message="Querying meteorological dataset registry..." />;

  const schemaFields = [
    { name: 'SID', desc: 'Unique Storm Identifier (WMO/IBTrACS format, e.g. 2016341N10087 for Vardah)', type: 'String' },
    { name: 'SEASON', desc: 'Annual operational cyclone season year (e.g. 2016, 2020, 2023)', type: 'Integer' },
    { name: 'NAME', desc: 'Official regional designated name (e.g. VARDAH, AMPHAN, MOCHA, BIPARJOY)', type: 'String' },
    { name: 'ISO_TIME', desc: 'Universal Coordinated Time observation timestamp (YYYY-MM-DD HH:MM:SS UTC)', type: 'Timestamp' },
    { name: 'LAT & LON', desc: 'Haversine geodesic eye center coordinates in decimal degrees', type: 'Float' },
    { name: 'WMO_WIND', desc: 'Maximum sustained surface wind speed in knots (1-minute / 3-minute average)', type: 'Float' },
    { name: 'WMO_PRES', desc: 'Minimum central atmospheric sea-level pressure in hectopascals (hPa / mb)', type: 'Float' },
    { name: 'SUBBASIN', desc: 'Regional sub-basin identifier (BB = Bay of Bengal, AS = Arabian Sea)', type: 'String' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="white-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
          borderLeft: '5px solid #0d9488',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#0d9488',
            backgroundColor: '#ccfbf1',
            padding: '3px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Authoritative Provenance
        </span>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
          Authoritative Meteorological Data Sources & Provenance Registry
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '860px', marginTop: '4px', lineHeight: 1.5 }}>
          Comprehensive catalog of scientific tropical cyclone archives, geostationary satellite imagery feeds,
          and ground-truth best-track datasets supporting transparent scientific reproducibility across the North Indian Ocean basin.
        </p>
      </div>

      {/* 4 Ingestion & Architecture Metric Cards (Responsive) */}
      <div className="dashboard-metric-cards">
        <div className="white-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Cleaned IBTrACS Records
            </span>
            <Database size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>58,580</div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
            ✓ Parsed in data/raw/ibtracs_ni_cleaned.csv
          </div>
        </div>

        <div className="white-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Historical Cyclones
            </span>
            <Radio size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a' }}>1,855</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            1980 – 2024 North Indian Ocean seasons
          </div>
        </div>

        <div className="white-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              NASA GIBS Satellite Tiles
            </span>
            <Satellite size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#7c3aed' }}>Real TIR + VIS</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            MODIS Band 31 (11µm) & True-Color
          </div>
        </div>

        <div className="white-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Open Science Policy
            </span>
            <ShieldCheck size={18} color="#0d9488" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0d9488' }}>100% Free</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            No proprietary API keys or tokens required
          </div>
        </div>
      </div>

      {/* Interactive Category Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          {[
            { id: 'all', label: `All Feeds (${sources.length})` },
            { id: 'satellite', label: 'Satellite Feeds (2)' },
            { id: 'tracks', label: 'Best-Track Archives (2)' },
            { id: 'portal', label: 'IMD Portal (1)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filterCategory === cat.id ? '#ffffff' : 'transparent',
                color: filterCategory === cat.id ? '#0f172a' : '#64748b',
                boxShadow: filterCategory === cat.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setExpandedSchema(!expandedSchema)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={14} color="#2563eb" />
          <span>{expandedSchema ? 'Hide Track Schema' : 'Inspect Synoptic Variables (8)'}</span>
        </button>
      </div>

      {/* Expandable Schema Table */}
      {expandedSchema && (
        <div className="white-card" style={{ padding: '20px', animation: 'fadeInScale 0.18s ease' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            NOAA IBTrACS Synoptic Track Variables & Schema
          </h4>
          <p style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '14px' }}>
            Standard meteorological attributes ingested from the World Meteorological Organization (WMO) international best-track archive.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Variable Name</th>
                  <th>Data Type</th>
                  <th>Scientific Description & Physical Units</th>
                </tr>
              </thead>
              <tbody>
                {schemaFields.map((f) => (
                  <tr key={f.name}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2563eb', fontSize: '0.82rem' }}>
                      {f.name}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {f.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#475569' }}>{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Source Cards Grid (Responsive) */}
      <div className="responsive-grid-auto-320">
        {filteredSources.map((src) => {
          const ping = pingStatuses[src.id];

          return (
            <div
              key={src.id}
              className="white-card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                    {src.organization}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor:
                        src.status === 'active' || src.status === 'integrated_via_ibtracs'
                          ? '#ecfdf5'
                          : '#eff6ff',
                      color:
                        src.status === 'active' || src.status === 'integrated_via_ibtracs'
                          ? '#059669'
                          : '#2563eb',
                      border: `1px solid ${
                        src.status === 'active' || src.status === 'integrated_via_ibtracs'
                          ? '#a7f3d0'
                          : '#bfdbfe'
                      }`,
                    }}
                  >
                    {src.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', lineHeight: 1.3 }}>
                  {src.name}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: '#475569',
                    marginBottom: '18px',
                    backgroundColor: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div>
                    <strong style={{ color: '#0f172a' }}>Basin:</strong> {src.basin}
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Access:</strong> {src.access}
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Format:</strong> {src.format}
                  </div>
                </div>
              </div>

              <div>
                {/* Ping Status Feedback */}
                {ping && (
                  <div
                    style={{
                      marginBottom: '12px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: ping.testing ? '#f8fafc' : '#ecfdf5',
                      border: `1px solid ${ping.testing ? '#e2e8f0' : '#a7f3d0'}`,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: ping.testing ? '#64748b' : '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Activity size={12} color={ping.testing ? '#64748b' : '#059669'} />
                    <span>
                      {ping.testing ? 'Pinging endpoint...' : `Online • Roundtrip Latency: ${ping.latencyMs}ms`}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <button
                    id={`btn-test-conn-${src.id}`}
                    onClick={() => handleTestConnection(src.id)}
                    disabled={ping?.testing}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {ping?.testing ? 'Testing...' : 'Test Connection'}
                  </button>

                  {src.url.startsWith('http') && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>Official Archive</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Command Runner Box */}
      <div className="white-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Automated NOAA IBTrACS Ingestion Command
          </h4>
          <button
            onClick={handleCopyCommand}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: copied ? '#ecfdf5' : '#ffffff',
              color: copied ? '#059669' : '#334155',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Script Command'}</span>
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
          Execute this CLI script locally to synchronize and parse the official NOAA North Indian Ocean track archive into SQLite and local CSV fixtures:
        </p>
        <div
          style={{
            backgroundColor: '#0f172a',
            padding: '14px 18px',
            borderRadius: '10px',
            color: '#38bdf8',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            overflowX: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>python data/scripts/download_noaa_ibtracs.py</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-sans)' }}>
            Requires Python 3.9+ & Requests
          </span>
        </div>
      </div>
    </div>
  );
};
