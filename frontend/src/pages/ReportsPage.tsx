import React, { useEffect, useState } from 'react';
import { Download, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    Promise.all([api.getReports(), api.getCyclones()])
      .then(([repList, cycList]: [ReportItem[], Cyclone[]]) => {
        setReports(repList);
        setCyclones(cycList);
        if (cycList.length > 0) setSelectedCycloneId(cycList[0].cyclone_id);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedCycloneId) return;
    setGenerating(true);
    setMessage(null);
    const cyclone = cyclones.find((c) => c.cyclone_id === selectedCycloneId);
    try {
      const newReport = await api.createReport({
        title: `Cyclone ${cyclone?.name || 'Storm'} Research Evaluation Report`,
        cyclone_id: selectedCycloneId,
        report_type: reportType,
      });
      setReports((prev) => [newReport, ...prev]);
      setMessage({
        text: `Successfully generated ${newReport.report_type.toUpperCase()} report (${(newReport.file_size_bytes / 1024).toFixed(1)} KB).`,
        type: 'success',
      });
      window.open(api.getReportDownloadUrl(newReport.id), '_blank');
    } catch (err: any) {
      setMessage({ text: err.message || 'Report generation failed.', type: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading research report archive..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
          Generate Research Cyclone Report
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Target Cyclone
            </label>
            <select
              className="input-field"
              value={selectedCycloneId}
              onChange={(e) => setSelectedCycloneId(e.target.value)}
            >
              {cyclones.map((c) => (
                <option key={c.cyclone_id} value={c.cyclone_id}>
                  {c.name} ({c.season_year}) - {c.subbasin}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Report Format
            </label>
            <select
              className="input-field"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'pdf' | 'csv')}
            >
              <option value="pdf">PDF (Full Scientific Report with Evaluation Tables)</option>
              <option value="csv">CSV (Synoptic Track Observations Dataset)</option>
            </select>
          </div>

          <div>
            <button className="btn-primary" style={{ width: '100%', height: '38px' }} onClick={handleGenerateReport} disabled={generating}>
              <Plus size={16} />
              <span>{generating ? 'Compiling Report...' : `Generate & Download ${reportType.toUpperCase()}`}</span>
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
          Report Archive ({reports.length} Generated)
        </h3>

        {reports.length === 0 ? (
          <p style={{ fontSize: '0.825rem', color: 'var(--text-faint)' }}>
            No reports generated yet. Click "Generate" above to compile a PDF or CSV report.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Title</th>
                  <th>Format</th>
                  <th>Storm ID</th>
                  <th>File Size</th>
                  <th>Created (UTC)</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong style={{ color: '#f8fafc' }}>{r.title}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: r.report_type === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: r.report_type === 'pdf' ? '#f87171' : '#34d399',
                          border: `1px solid ${r.report_type === 'pdf' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        }}
                      >
                        {r.report_type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                      {r.cyclone_id || 'N/A'}
                    </td>
                    <td>{(r.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {r.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td>
                      <a
                        href={api.getReportDownloadUrl(r.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
