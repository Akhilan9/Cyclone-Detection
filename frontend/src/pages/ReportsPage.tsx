import React, { useEffect, useState } from 'react';
import {
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
  Calendar,
  Wind,
  Shield,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import type { Cyclone, ReportItem } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [selectedCycloneId, setSelectedCycloneId] = useState<string>('');
  const [reportType, setReportType] = useState<'pdf' | 'csv'>('pdf');
  const [generating, setGenerating] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'pdf' | 'csv'>('all');
  const [previewReport, setPreviewReport] = useState<ReportItem | null>(null);

  useEffect(() => {
    Promise.all([api.getReports(), api.getCyclones()])
      .then(([repList, cycList]: [ReportItem[], Cyclone[]]) => {
        setReports(repList);
        setCyclones(cycList);
        if (cycList.length > 0) setSelectedCycloneId(cycList[0].cyclone_id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCyclone = cyclones.find((c) => c.cyclone_id === selectedCycloneId) || cyclones[0];

  const handleGenerateReport = async () => {
    if (!selectedCycloneId) return;
    setGenerating(true);
    setMessage(null);
    try {
      const newReport = await api.createReport({
        title: `Cyclone ${selectedCyclone?.name || 'Storm'} Research Evaluation Report`,
        cyclone_id: selectedCycloneId,
        report_type: reportType,
      });
      setReports((prev) => [newReport, ...prev]);
      setMessage({
        text: `Successfully compiled ${newReport.report_type.toUpperCase()} report (${(newReport.file_size_bytes / 1024).toFixed(1)} KB). Download initiated.`,
        type: 'success',
      });
      window.open(api.getReportDownloadUrl(newReport.id), '_blank');
    } catch (err: any) {
      setMessage({ text: err.message || 'Report generation failed.', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.cyclone_id && r.cyclone_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFormat = formatFilter === 'all' || r.report_type === formatFilter;
    return matchesSearch && matchesFormat;
  });

  if (loading) return <LoadingSpinner message="Loading scientific research report archive..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="white-card"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
          borderLeft: '5px solid #2563eb',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#2563eb',
            backgroundColor: '#dbeafe',
            padding: '3px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Scientific Dissemination
        </span>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em' }}>
          Automated Cyclone Research Reports & Export Engine
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '840px', marginTop: '4px', lineHeight: 1.5 }}>
          Compile verified synoptic summaries, multi-spectral satellite frame observations, IMD 7-stage classifications,
          and ConvLSTM trajectory forecasts into peer-reviewable PDF monographs or raw CSV observational datasets.
        </p>
      </div>

      {/* Interactive Report Generation Studio */}
      <div className="white-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
          Interactive Report Generator Studio
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* 1. Target Cyclone Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
              Target Cyclone
            </label>
            <select
              className="select-input"
              value={selectedCycloneId}
              onChange={(e) => setSelectedCycloneId(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            >
              {cyclones.map((c) => (
                <option key={c.cyclone_id} value={c.cyclone_id}>
                  {c.name} ({c.season_year}) — {c.highest_imd_stage || 'Cyclonic Storm'} ({c.max_wind_speed_kts} kts)
                </option>
              ))}
            </select>

            {selectedCyclone && (
              <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.74rem', color: '#64748b' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedCyclone.name}</span> ({selectedCyclone.season_year}) • Basin: {selectedCyclone.subbasin || 'Bay of Bengal'} • Peak: {selectedCyclone.max_wind_speed_kts} kts | {selectedCyclone.min_central_pressure_hpa} hPa
              </div>
            )}
          </div>

          {/* 2. Format Selection Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
              Document Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReportType('pdf')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: reportType === 'pdf' ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                  backgroundColor: reportType === 'pdf' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} color="#dc2626" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>PDF Report</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Full Scientific Brief</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('csv')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: reportType === 'csv' ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                  backgroundColor: reportType === 'csv' ? '#ecfdf5' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={18} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>CSV Data</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Synoptic Track Points</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Generate Button Action */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn-run-prediction"
            onClick={handleGenerateReport}
            disabled={generating}
            style={{ padding: '12px 24px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={16} color="#ffffff" />
            </div>
            <span>{generating ? 'Compiling Report Archive...' : `Generate & Download ${reportType.toUpperCase()}`}</span>
          </button>

          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Instant direct download • Auto-archived to local research database
          </span>
        </div>

        {message && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: message.type === 'success' ? '#047857' : '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.84rem',
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span style={{ fontWeight: 600 }}>{message.text}</span>
          </div>
        )}
      </div>

      {/* Interactive Report Archive Explorer */}
      <div className="white-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Compiled Report Archive ({reports.length})
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Historical collection of generated peer-review monographs and data tables.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search archive..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.8rem',
                  color: '#0f172a',
                  width: '140px',
                }}
              />
            </div>

            {/* Format Filter Chips */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {(['all', 'pdf', 'csv'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormatFilter(fmt)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    backgroundColor: formatFilter === fmt ? '#ffffff' : 'transparent',
                    color: formatFilter === fmt ? '#2563eb' : '#64748b',
                    boxShadow: formatFilter === fmt ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
            No reports found matching your filter. Click "Generate" above to create a new report.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Title</th>
                  <th>Format</th>
                  <th>Storm ID</th>
                  <th>File Size</th>
                  <th>Compiled At (UTC)</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {r.report_type === 'pdf' ? (
                          <FileText size={16} color="#dc2626" />
                        ) : (
                          <FileSpreadsheet size={16} color="#059669" />
                        )}
                        <strong style={{ color: '#0f172a', fontSize: '0.86rem' }}>{r.title}</strong>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: r.report_type === 'pdf' ? '#fee2e2' : '#d1fae5',
                          color: r.report_type === 'pdf' ? '#dc2626' : '#059669',
                          border: `1px solid ${r.report_type === 'pdf' ? '#fecaca' : '#a7f3d0'}`,
                        }}
                      >
                        {r.report_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#64748b' }}>
                      {r.cyclone_id || 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                      {(r.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#64748b' }}>
                      {r.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => setPreviewReport(r)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                        <a
                          href={api.getReportDownloadUrl(r.id)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Quick Preview Modal */}
      {previewReport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="white-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              borderRadius: '16px',
              animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#2563eb" />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Report Preview Synopsis</h4>
              </div>
              <button
                onClick={() => setPreviewReport(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem', color: '#334155' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Document Title
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {previewReport.title}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>FORMAT & SIZE</div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {previewReport.report_type.toUpperCase()} • {(previewReport.file_size_bytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>STORM IDENTIFIER</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb', marginTop: '2px' }}>
                    {previewReport.cyclone_id || 'Synoptic Multi-Track'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, marginTop: '4px' }}>
                This document incorporates authentic NOAA IBTrACS Best-Track coordinates, NASA GIBS Thermal IR observation references, spatial CNN category predictions, and 6-hour ConvLSTM future motion vectors.
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setPreviewReport(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <a
                href={api.getReportDownloadUrl(previewReport.id)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <Download size={14} />
                <span>Download {previewReport.report_type.toUpperCase()}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
