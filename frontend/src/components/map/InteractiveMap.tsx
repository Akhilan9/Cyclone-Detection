import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, RotateCcw } from 'lucide-react';
import { TrackPoint, PredictedTrackPoint } from '../../types';

interface InteractiveMapProps {
  observedPoints?: TrackPoint[];
  predictedPoints?: PredictedTrackPoint[];
  cycloneName?: string;
  height?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  observedPoints = [],
  predictedPoints = [],
  cycloneName = 'VARDAH',
  height = '560px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapMode, setMapMode] = useState<'osm' | 'satellite'>('osm');

  const latestPoint = observedPoints.length > 0 ? observedPoints[observedPoints.length - 1] : null;
  const lastUpdateTime = latestPoint ? latestPoint.timestamp_utc.replace('T', ' ').replace('Z', '') : '2016-12-19 00:00:00';
  const lastPosition = latestPoint ? `${latestPoint.latitude.toFixed(2)}°N, ${latestPoint.longitude.toFixed(2)}°E` : '8.90°N, 51.00°E';

  // Toggle Map Tiles
  const toggleMapMode = () => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const newMode = mapMode === 'osm' ? 'satellite' : 'osm';
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const newUrl =
      newMode === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newTile = L.tileLayer(newUrl, {
      attribution: '&copy; OpenStreetMap contributors / ESRI',
      maxZoom: 18,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTile;
    setMapMode(newMode);
  };

  const handleResetZoom = () => {
    if (!mapInstanceRef.current || observedPoints.length === 0) return;
    const bounds: L.LatLngExpression[] = observedPoints.map((pt) => [pt.latitude, pt.longitude]);
    mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [14.0, 75.0],
        zoom: 5,
        zoomControl: true,
      });

      const initialTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      tileLayerRef.current = initialTiles;
      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    layersGroup.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    // 1. Plot Observed Historical Track
    if (observedPoints.length > 0) {
      const latlngs: L.LatLngExpression[] = observedPoints.map((pt) => [pt.latitude, pt.longitude]);
      bounds.push(...latlngs);

      // Red/Crimson Dashed Line for observed track (Matching Screenshot 3)
      const observedLine = L.polyline(latlngs, {
        color: '#dc2626',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 6',
      });
      layersGroup.addLayer(observedLine);

      // Plot point markers with color gradient: earlier = green, recent = orange, current = red
      const totalPts = observedPoints.length;
      observedPoints.forEach((pt, idx) => {
        const isLatest = idx === totalPts - 1;

        if (isLatest) {
          // Current Position: Pulsing Radar Marker
          const pingIcon = L.divIcon({
            className: 'custom-radar-ping-icon',
            html: '<div class="radar-ping-marker"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          const marker = L.marker([pt.latitude, pt.longitude], { icon: pingIcon });
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
              <strong style="color: #dc2626; font-size: 13px;">${cycloneName} - Current Position</strong><br/>
              <strong>Time:</strong> ${pt.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
              <strong>Coordinates:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E<br/>
              <strong>Wind Speed:</strong> ${pt.wind_speed_kts ?? 'N/A'} knots<br/>
              <strong>Central Pressure:</strong> ${pt.central_pressure_hpa ?? 'N/A'} hPa<br/>
              <strong>IMD Stage:</strong> <span style="font-weight: 700; color: #b91c1c;">${pt.imd_stage || 'N/A'}</span>
            </div>
          `);
          layersGroup.addLayer(marker);
        } else {
          // Color progression based on chronological position
          let dotColor = '#10b981'; // Green for earlier
          if (idx >= Math.floor(totalPts * 0.45)) {
            dotColor = '#f59e0b'; // Orange for recent
          }

          const marker = L.circleMarker([pt.latitude, pt.longitude], {
            radius: 5,
            color: '#ffffff',
            fillColor: dotColor,
            fillOpacity: 1,
            weight: 1.5,
          });

          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
              <strong style="color: #1e3a8a; font-size: 13px;">${cycloneName} - Observed Point</strong><br/>
              <strong>Time:</strong> ${pt.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
              <strong>Coordinates:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E<br/>
              <strong>Wind:</strong> ${pt.wind_speed_kts ?? 'N/A'} knots<br/>
              <strong>Pressure:</strong> ${pt.central_pressure_hpa ?? 'N/A'} hPa<br/>
              <strong>Stage:</strong> ${pt.imd_stage || 'N/A'}
            </div>
          `);
          layersGroup.addLayer(marker);
        }
      });
    }

    // 2. Plot Model Predicted Track (if generated)
    if (predictedPoints.length > 0) {
      const predLatlngs: L.LatLngExpression[] = [];
      if (observedPoints.length > 0) {
        const lastObs = observedPoints[observedPoints.length - 1];
        predLatlngs.push([lastObs.latitude, lastObs.longitude]);
      }

      predictedPoints.forEach((pt) => {
        predLatlngs.push([pt.predicted_latitude, pt.predicted_longitude]);
        bounds.push([pt.predicted_latitude, pt.predicted_longitude]);

        // Uncertainty Cone Circle
        const circle = L.circle([pt.predicted_latitude, pt.predicted_longitude], {
          radius: pt.uncertainty_radius_km * 1000,
          color: '#2563eb',
          weight: 1,
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          dashArray: '3, 4',
        });
        layersGroup.addLayer(circle);

        // Forecast Point Marker
        const marker = L.circleMarker([pt.predicted_latitude, pt.predicted_longitude], {
          radius: 6,
          color: '#ffffff',
          fillColor: '#2563eb',
          fillOpacity: 1,
          weight: 2,
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
            <strong style="color: #2563eb; font-size: 13px;">AI Forecast (+${pt.step_hours}h)</strong><br/>
            <strong>Time:</strong> ${pt.forecast_timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
            <strong>Position:</strong> ${pt.predicted_latitude.toFixed(2)}°N, ${pt.predicted_longitude.toFixed(2)}°E<br/>
            <strong>Predicted Wind:</strong> ${pt.predicted_wind_kts} knots<br/>
            <strong>Predicted Stage:</strong> ${pt.predicted_imd_stage}
          </div>
        `);
        layersGroup.addLayer(marker);
      });

      const predictedLine = L.polyline(predLatlngs, {
        color: '#2563eb',
        weight: 3,
        opacity: 0.9,
        dashArray: '5, 5',
      });
      layersGroup.addLayer(predictedLine);
    }

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60] });
    }
  }, [observedPoints, predictedPoints, cycloneName]);

  return (
    <div className="white-card" style={{ position: 'relative', overflow: 'hidden', height, width: '100%' }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Top-Left Floating Glassmorphic HUD Card (Matching Screenshot 3) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: '14px',
          padding: '16px 20px',
          color: '#ffffff',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          minWidth: '240px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            🌀
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.1 }}>
              CycloneFusion
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tropical Cyclone Monitoring</div>
          </div>
        </div>

        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px', letterSpacing: '0.04em' }}>
          {cycloneName.toUpperCase()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
          <span>Track:</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>IBTrACS</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
          <span>Last Update:</span>
          <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{lastUpdateTime}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Position:</span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{lastPosition}</span>
        </div>
      </div>

      {/* Top-Right Map Controls */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={toggleMapMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Layers size={14} />
          <span>{mapMode === 'osm' ? 'Top Down' : 'Satellite'}</span>
        </button>

        <button
          onClick={handleResetZoom}
          title="Reset Zoom"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '7px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Bottom-Left Floating Legend Card (Matching Screenshot 3) */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: '14px 18px',
          color: '#ffffff',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
          zIndex: 1000,
          minWidth: '210px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f8fafc', marginBottom: '10px', letterSpacing: '0.05em' }}>
          CYCLONE TRACK
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{ width: '20px', borderTop: '2px dashed #ef4444' }} />
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Cyclone Track (IBTrACS)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Current Position</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Recent Position</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Earlier Position</span>
        </div>
      </div>
    </div>
  );
};

