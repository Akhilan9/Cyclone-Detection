import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
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
  cycloneName = 'Cyclone',
  height = '520px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet Map centered on North Indian Ocean (Bay of Bengal / Arabian Sea)
      const map = L.map(mapContainerRef.current, {
        center: [16.0, 84.0],
        zoom: 5,
        zoomControl: true,
      });

      // CartoDB Dark Matter / OSM Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

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

      // Blue Polyline for observed track
      const observedLine = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 3.5,
        opacity: 0.85,
      });
      layersGroup.addLayer(observedLine);

      // Circle markers for each synoptic observation
      observedPoints.forEach((pt, idx) => {
        const isLatest = idx === observedPoints.length - 1;
        const marker = L.circleMarker([pt.latitude, pt.longitude], {
          radius: isLatest ? 7 : 4.5,
          color: isLatest ? '#06b6d4' : '#1d4ed8',
          fillColor: isLatest ? '#22d3ee' : '#3b82f6',
          fillOpacity: 0.9,
          weight: isLatest ? 2.5 : 1.5,
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4;">
            <strong style="color: #1e3a8a; font-size: 13px;">${cycloneName} - Observed</strong><br/>
            <strong>Time:</strong> ${pt.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
            <strong>Position:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E<br/>
            <strong>Wind:</strong> ${pt.wind_speed_kts ?? 'N/A'} knots<br/>
            <strong>Pressure:</strong> ${pt.central_pressure_hpa ?? 'N/A'} hPa<br/>
            <strong>Stage:</strong> <span style="font-weight: 600; color: #b45309;">${pt.imd_stage || 'N/A'}</span>
          </div>
        `);
        layersGroup.addLayer(marker);
      });
    }

    // 2. Plot Model Predicted Track
    if (predictedPoints.length > 0) {
      const predLatlngs: L.LatLngExpression[] = [];

      // Connect from the last observed point if available
      if (observedPoints.length > 0) {
        const lastObs = observedPoints[observedPoints.length - 1];
        predLatlngs.push([lastObs.latitude, lastObs.longitude]);
      }

      predictedPoints.forEach((pt) => {
        predLatlngs.push([pt.predicted_latitude, pt.predicted_longitude]);
        bounds.push([pt.predicted_latitude, pt.predicted_longitude]);

        // Uncertainty cone circle
        const circle = L.circle([pt.predicted_latitude, pt.predicted_longitude], {
          radius: pt.uncertainty_radius_km * 1000,
          color: '#f59e0b',
          weight: 1,
          fillColor: '#f59e0b',
          fillOpacity: 0.08,
          dashArray: '3, 4',
        });
        layersGroup.addLayer(circle);

        // Forecast Point Marker
        const marker = L.circleMarker([pt.predicted_latitude, pt.predicted_longitude], {
          radius: 6,
          color: '#dc2626',
          fillColor: '#ef4444',
          fillOpacity: 0.95,
          weight: 2,
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4;">
            <strong style="color: #b91c1c; font-size: 13px;">AI Model Forecast (+${pt.step_hours}h)</strong><br/>
            <strong>Forecast Time:</strong> ${pt.forecast_timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
            <strong>Predicted Position:</strong> ${pt.predicted_latitude.toFixed(2)}°N, ${pt.predicted_longitude.toFixed(2)}°E<br/>
            <strong>Predicted Wind:</strong> ${pt.predicted_wind_kts} knots<br/>
            <strong>Predicted Stage:</strong> <span style="font-weight: 600; color: #c2410c;">${pt.predicted_imd_stage}</span><br/>
            <strong>Uncertainty Radius:</strong> ±${pt.uncertainty_radius_km} km
          </div>
        `);
        layersGroup.addLayer(marker);
      });

      // Dashed Amber/Red Polyline for Predicted Track
      const predictedLine = L.polyline(predLatlngs, {
        color: '#f97316',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 6',
      });
      layersGroup.addLayer(predictedLine);
    }

    // Fit map bounds to encompass all points
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }, [observedPoints, predictedPoints, cycloneName]);

  return (
    <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', height }}>
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Floating Track Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'rgba(13, 21, 39, 0.92)',
          border: '1px solid var(--border-card)',
          borderRadius: '8px',
          padding: '10px 14px',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
          fontSize: '0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>Track Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '16px', height: '3px', backgroundColor: '#2563eb' }} />
          <span style={{ color: 'var(--text-muted)' }}>Observed Track (Best-Track)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '16px', height: '3px', borderTop: '2px dashed #f97316' }} />
          <span style={{ color: 'var(--text-muted)' }}>ConvLSTM Predicted Track</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.3)', border: '1px dashed #f59e0b' }} />
          <span style={{ color: 'var(--text-muted)' }}>Forecast Uncertainty Cone</span>
        </div>
      </div>
    </div>
  );
};
