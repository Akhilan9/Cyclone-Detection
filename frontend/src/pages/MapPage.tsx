import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Cyclone, CycloneDetail } from '../types';
import { InteractiveMap } from '../components/map/InteractiveMap';
import { StageBadge } from '../components/common/StageBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const MapPage: React.FC = () => {
  const [cyclones, setCyclones] = useState<Cyclone[]>([]);
  const [selectedCycloneId, setSelectedCycloneId] = useState<string>('');
  const [cycloneDetail, setCycloneDetail] = useState<CycloneDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getCyclones()
      .then((list: Cyclone[]) => {
        setCyclones(list);
        if (list.length > 0) {
          setSelectedCycloneId(list[0].cyclone_id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCycloneId) return;
    api.getCycloneById(selectedCycloneId)
      .then((detail: CycloneDetail) => setCycloneDetail(detail));
  }, [selectedCycloneId]);

  if (loading) return <LoadingSpinner message="Initializing meteorological geospatial map..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Interactive Cyclone Geospatial Tracker
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            High-resolution synoptic tracks across Bay of Bengal and Arabian Sea basins
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

      <InteractiveMap
        observedPoints={cycloneDetail?.track_points || []}
        cycloneName={cycloneDetail?.name || 'Cyclone'}
        height="560px"
      />

      {cycloneDetail && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
            Synoptic Track History ({cycloneDetail.track_points.length} Observations)
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Wind Speed</th>
                  <th>Central Pressure</th>
                  <th>IMD Stage</th>
                </tr>
              </thead>
              <tbody>
                {cycloneDetail.track_points.map((pt) => (
                  <tr key={pt.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {pt.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{pt.latitude.toFixed(2)}°N</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{pt.longitude.toFixed(2)}°E</td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>{pt.wind_speed_kts ?? 'N/A'} kt</span>
                    </td>
                    <td>{pt.central_pressure_hpa ? `${pt.central_pressure_hpa} hPa` : 'N/A'}</td>
                    <td>
                      <StageBadge stage={pt.imd_stage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
