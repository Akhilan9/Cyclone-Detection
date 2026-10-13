import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { EvaluationMetrics } from '../types';
import { BenchmarkChart } from '../components/charts/BenchmarkChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const EvaluationPage: React.FC = () => {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMetrics()
      .then(setMetrics)
      .catch((err: any) => setError(err.message || 'No verified evaluation metrics found.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading verified experimental metrics..." />;

  const stageLabels = ['D', 'DD', 'CS', 'SCS', 'VSCS', 'ESCS', 'SuCS'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-emerald)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
          Research Model Evaluation & Baseline Benchmarking
        </h2>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '820px' }}>
          Defensible scientific evaluation computed strictly on held-out test cyclones.
          To prevent data leakage, training, validation, and test sets are partitioned strictly by cyclone identity.
        </p>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '20px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}>
          <p style={{ fontWeight: 600 }}>{error}</p>
          <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
            Run the model training pipeline (<code>python ml/training/train_models.py</code>) to produce verified evaluation metrics.
          </p>
        </div>
      )}

      {metrics && (
        <>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
              Dataset Partition & Zero Data Leakage Verification
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Training Cyclones ({metrics.dataset_split.train_cyclone_ids.length})
                </span>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {metrics.dataset_split.train_cyclone_ids.join(', ')}
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Validation Cyclones ({metrics.dataset_split.val_cyclone_ids.length})
                </span>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {metrics.dataset_split.val_cyclone_ids.join(', ')}
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Held-Out Test Cyclones ({metrics.dataset_split.test_cyclone_ids.length})
                </span>
                <div style={{ fontSize: '0.8rem', color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {metrics.dataset_split.test_cyclone_ids.join(', ')}
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Test Sequence Windows
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  {metrics.dataset_split.test_sequence_count} Sequences
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>Window: 24h (T=4), Horizon: +6h</span>
              </div>
            </div>
          </div>

          <BenchmarkChart benchmarks={metrics.benchmark_comparison} />

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
              Comparative Performance Table on Held-Out Test Set
            </h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model / Baseline Architecture</th>
                  <th>Mean Track Error (km)</th>
                  <th>Intensity MAE (kt)</th>
                  <th>Intensity RMSE (kt)</th>
                  <th>Method Description</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(metrics.benchmark_comparison).map((b: any) => {
                  const isProposed = b.model_name.includes('ConvLSTM');
                  return (
                    <tr key={b.model_name} style={{ backgroundColor: isProposed ? 'rgba(6, 182, 212, 0.05)' : 'transparent' }}>
                      <td>
                        <strong style={{ color: isProposed ? '#22d3ee' : '#f8fafc' }}>
                          {b.model_name} {isProposed && '(Proposed)'}
                        </strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isProposed ? '#06b6d4' : '#e2e8f0' }}>
                        {Number(b.mean_track_error_km).toFixed(1)} km
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: isProposed ? '#10b981' : '#e2e8f0' }}>
                        {Number(b.intensity_mae_knots).toFixed(2)} kt
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {Number(b.intensity_rmse_knots).toFixed(2)} kt
                      </td>
                      <td style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{b.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {metrics.classification_metrics.confusion_matrix && metrics.classification_metrics.confusion_matrix.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    IMD 7-Stage Classification Confusion Matrix
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                    Actual class (rows) versus CNN predicted class (columns) on held-out test frames
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Accuracy: <strong style={{ color: '#38bdf8' }}>{(metrics.classification_metrics.accuracy * 100).toFixed(1)}%</strong></span>
                  <span>Macro-F1: <strong style={{ color: '#f59e0b' }}>{metrics.classification_metrics.macro_f1.toFixed(3)}</strong></span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', margin: '0 auto', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px 10px', color: 'var(--text-faint)', fontSize: '0.75rem' }}>True \ Pred</th>
                      {stageLabels.map((lbl) => (
                        <th key={lbl} style={{ padding: '6px 10px', color: 'var(--accent-sky)', fontWeight: 700 }}>
                          {lbl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.classification_metrics.confusion_matrix.map((row: number[], rIdx: number) => (
                      <tr key={rIdx}>
                        <td style={{ padding: '6px 10px', color: 'var(--accent-sky)', fontWeight: 700, textAlign: 'right' }}>
                          {stageLabels[rIdx]}
                        </td>
                        {row.map((val: number, cIdx: number) => {
                          const isMatch = rIdx === cIdx && val > 0;
                          return (
                            <td
                              key={cIdx}
                              style={{
                                padding: '8px 14px',
                                textAlign: 'center',
                                border: '1px solid var(--border-card)',
                                backgroundColor: isMatch
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : val > 0
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(15, 23, 42, 0.3)',
                                color: isMatch ? '#34d399' : val > 0 ? '#fca5a5' : '#475569',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: val > 0 ? 700 : 'normal',
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
