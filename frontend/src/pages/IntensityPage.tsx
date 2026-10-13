import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Cyclone, CycloneDetail } from '../types';
import { IntensityChart } from '../components/charts/IntensityChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const IntensityPage: React.FC = () => {
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [selectedCycloneId, setSelectedCycloneId] = useState<string>('');
  const [cycloneDetail, setCycloneDetail] = useState<CycloneDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getCyclones().then((list: Cyclone[]) => {
      setCyclones(list);
      if (list.length > 0) setSelectedCycloneId(list[0].cyclone_id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCycloneId) return;
    api.getCycloneById(selectedCycloneId).then((detail: CycloneDetail) => setCycloneDetail(detail));
  }, [selectedCycloneId]);

  if (loading) return <LoadingSpinner message="Loading intensity timelines..." />;

  const imdStages = [
    { code: 'D', name: 'Depression', windRange: '17 - 27 kt', kmph: '31 - 49 km/h', color: '#38bdf8' },
    { code: 'DD', name: 'Deep Depression', windRange: '28 - 33 kt', kmph: '50 - 61 km/h', color: '#60a5fa' },
    { code: 'CS', name: 'Cyclonic Storm', windRange: '34 - 47 kt', kmph: '62 - 88 km/h', color: '#34d399' },
    { code: 'SCS', name: 'Severe Cyclonic Storm', windRange: '48 - 63 kt', kmph: '89 - 117 km/h', color: '#fbbf24' },
    { code: 'VSCS', name: 'Very Severe Cyclonic Storm', windRange: '64 - 89 kt', kmph: '118 - 165 km/h', color: '#fb923c' },
    { code: 'ESCS', name: 'Extremely Severe Cyclonic Storm', windRange: '90 - 119 kt', kmph: '166 - 221 km/h', color: '#f87171' },
    { code: 'SuCS', name: 'Super Cyclonic Storm', windRange: '≥ 120 kt', kmph: '≥ 222 km/h', color: '#c084fc' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Cyclone Intensity Evolution & IMD Classification
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            Historical 3-minute sustained wind speed profiles and central pressure dynamics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Storm:</label>
          <select
            className="input-field"
            style={{ width: '240px' }}
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
      </div>

      <IntensityChart observedPoints={cycloneDetail?.track_points || []} />

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
          India Meteorological Department (IMD) Classification Scale
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginBottom: '14px' }}>
          Official RSMC New Delhi intensity classification based on maximum sustained surface wind speed (MSW)
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Category Stage Name</th>
                <th>Wind Speed Range (Knots)</th>
                <th>Wind Speed (km/h)</th>
                <th>Severity Indicator</th>
              </tr>
            </thead>
            <tbody>
              {imdStages.map((st) => (
                <tr key={st.code}>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{st.code}</td>
                  <td>{st.name}</td>
                  <td style={{ color: '#38bdf8', fontWeight: 600 }}>{st.windRange}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{st.kmph}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: st.color,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
