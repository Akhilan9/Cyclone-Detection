import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  RotateCcw,
  Compass,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Crosshair,
  MapPin,
  MoveHorizontal,
  Info,
  Zap,
} from 'lucide-react';
import { TrackPoint, PredictedTrackPoint, LandfallHazardResult } from '../../types';

interface InteractiveMapProps {
  observedPoints?: TrackPoint[];
  predictedPoints?: PredictedTrackPoint[];
  cycloneName?: string;
  height?: string;
  landfallData?: LandfallHazardResult | null;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  observedPoints = [],
  predictedPoints = [],
  cycloneName = 'VARDAH',
  height = '560px',
  landfallData = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Layer[]>([]);

  const [mapMode, setMapMode] = useState<'osm' | 'satellite' | 'nasa_gibs'>('osm');
  const [showHazardRadii, setShowHazardRadii] = useState<boolean>(true);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [isLegendCollapsed, setIsLegendCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [dockPosition, setDockPosition] = useState<'top-left' | 'bottom-right'>('top-left');

  const totalObserved = observedPoints.length;
  const activeIdx =
    selectedPointIndex !== null && selectedPointIndex >= 0 && selectedPointIndex < totalObserved
      ? selectedPointIndex
      : totalObserved > 0
      ? totalObserved - 1
      : null;

  const activePoint = activeIdx !== null ? observedPoints[activeIdx] : null;
  const isViewingLatest = activeIdx === totalObserved - 1 || activeIdx === null;

  const formatCoord = (lat: number, lon: number) => {
    const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    return `${latStr}, ${lonStr}`;
  };

  const activePosition = activePoint
    ? formatCoord(activePoint.latitude, activePoint.longitude)
    : '15.00°N, 80.00°E';

  const activeUpdateTime = activePoint?.timestamp_utc
    ? `${activePoint.timestamp_utc.replace('T', ' ').replace('Z', '')} UTC`
    : '2016-12-19 00:00:00 UTC';

  const activeWindKts = activePoint?.wind_speed_kts ?? 35;
  const activePressureHpa = activePoint?.central_pressure_hpa ?? 1004;
  const activeStage =
    activePoint?.imd_stage ||
    (activeWindKts >= 120
      ? 'Super Cyclonic Storm'
      : activeWindKts >= 90
      ? 'Extremely Severe Cyclonic Storm'
      : activeWindKts >= 64
      ? 'Very Severe Cyclonic Storm'
      : activeWindKts >= 48
      ? 'Severe Cyclonic Storm'
      : activeWindKts >= 34
      ? 'Cyclonic Storm'
      : activeWindKts >= 28
      ? 'Deep Depression'
      : 'Depression');

  // Stage Color Mapping
  const getStageBadgeColor = (stage: string) => {
    if (stage.includes('Super')) return { bg: '#4c1d95', text: '#ede9fe', border: '#7c3aed' };
    if (stage.includes('Extremely') || stage.includes('Very Severe')) return { bg: '#991b1b', text: '#fee2e2', border: '#ef4444' };
    if (stage.includes('Severe')) return { bg: '#c2410c', text: '#ffedd5', border: '#f97316' };
    if (stage.includes('Cyclonic Storm')) return { bg: '#ea580c', text: '#fff7ed', border: '#fb923c' };
    if (stage.includes('Deep Depression')) return { bg: '#1d4ed8', text: '#dbeafe', border: '#3b82f6' };
    return { bg: '#0369a1', text: '#e0f2fe', border: '#38bdf8' };
  };

  const stageStyle = getStageBadgeColor(activeStage);

  // Direct camera fly-to helper
  const handleFlyToPosition = (lat: number, lon: number, zoom = 7) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([lat, lon], zoom, { duration: 1.2 });
  };

  // Timeline Stepper Handlers
  const handleStepPrev = () => {
    if (totalObserved === 0) return;
    const current = activeIdx ?? totalObserved - 1;
    const prev = Math.max(0, current - 1);
    setSelectedPointIndex(prev);
    const pt = observedPoints[prev];
    handleFlyToPosition(pt.latitude, pt.longitude, 7);
  };

  const handleStepNext = () => {
    if (totalObserved === 0) return;
    const current = activeIdx ?? totalObserved - 1;
    const next = Math.min(totalObserved - 1, current + 1);
    setSelectedPointIndex(next);
    const pt = observedPoints[next];
    handleFlyToPosition(pt.latitude, pt.longitude, 7);
  };

  const handleResetToLatest = () => {
    if (totalObserved === 0) return;
    const latestIdx = totalObserved - 1;
    setSelectedPointIndex(latestIdx);
    const pt = observedPoints[latestIdx];
    handleFlyToPosition(pt.latitude, pt.longitude, 7);
  };

  // Toggle Map Tiles between Street Map, ESRI High-Res Sat, and Real NASA GIBS Satellite
  const toggleMapMode = () => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    let newMode: 'osm' | 'satellite' | 'nasa_gibs' = 'osm';
    if (mapMode === 'osm') newMode = 'satellite';
    else if (mapMode === 'satellite') newMode = 'nasa_gibs';
    else newMode = 'osm';

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    let newUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (newMode === 'satellite') {
      newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; ESRI World Imagery';
    } else if (newMode === 'nasa_gibs') {
      const stormDate = activePoint ? activePoint.timestamp_utc.slice(0, 10) : '2023-06-13';
      newUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${stormDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
      attribution = '&copy; NASA EOSDIS / GIBS Satellite Observation';
    }

    const newTile = L.tileLayer(newUrl, {
      attribution,
      minZoom: 1,
      maxZoom: newMode === 'nasa_gibs' ? 9 : 19,
      noWrap: false,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTile;
    setMapMode(newMode);
  };

  const handleResetZoom = () => {
    if (!mapInstanceRef.current || observedPoints.length === 0) return;
    const allBounds: L.LatLngExpression[] = observedPoints.map((pt) => [pt.latitude, pt.longitude]);
    if (predictedPoints.length > 0) {
      predictedPoints.forEach((pt) => allBounds.push([pt.predicted_latitude, pt.predicted_longitude]));
    }
    if (landfallData?.projected_landfall_point) {
      allBounds.push(landfallData.projected_landfall_point);
    }
    mapInstanceRef.current.fitBounds(L.latLngBounds(allBounds), { padding: [50, 50], maxZoom: 7 });
  };

  const handleRegionalView = () => {
    if (!mapInstanceRef.current) return;
    if (activePoint) {
      mapInstanceRef.current.flyTo([activePoint.latitude, activePoint.longitude], 6, { duration: 1.2 });
    } else {
      mapInstanceRef.current.flyTo([20.0, 0.0], 3, { duration: 1.2 });
    }
  };

  const handleLandfallFly = () => {
    if (!mapInstanceRef.current || !landfallData?.projected_landfall_point) return;
    mapInstanceRef.current.flyTo(landfallData.projected_landfall_point, 8, { duration: 1.2 });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: activePoint ? [activePoint.latitude, activePoint.longitude] : [20.0, 78.0],
        zoom: 4,
        minZoom: 2,
        maxZoom: 19,
        worldCopyJump: true,
        zoomControl: true,
      });

      const initialTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 1,
        maxZoom: 19,
        noWrap: false,
      }).addTo(map);

      tileLayerRef.current = initialTiles;
      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    // Resize observer to ensure Leaflet canvas size never clips
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    layersGroup.clearLayers();
    markersRef.current = [];
    const bounds: L.LatLngExpression[] = [];

    // 1. Plot Observed Historical Track
    if (observedPoints.length > 0) {
      const latlngs: L.LatLngExpression[] = observedPoints.map((pt) => [pt.latitude, pt.longitude]);
      bounds.push(...latlngs);

      // Glowing Background Track Path
      const glowLine = L.polyline(latlngs, {
        color: '#ef4444',
        weight: 7,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layersGroup.addLayer(glowLine);

      // Sharp Core Dashed Track Line
      const observedLine = L.polyline(latlngs, {
        color: '#dc2626',
        weight: 3.5,
        opacity: 0.95,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round',
      });
      observedLine.bindTooltip(`🌀 Cyclone ${cycloneName} Track (IBTrACS Observed Path) • Click to focus`, {
        sticky: true,
      });
      observedLine.on('click', handleResetZoom);
      observedLine.on('mouseover', () => {
        observedLine.setStyle({ weight: 5, color: '#b91c1c' });
        glowLine.setStyle({ opacity: 0.65, weight: 10 });
      });
      observedLine.on('mouseout', () => {
        observedLine.setStyle({ weight: 3.5, color: '#dc2626' });
        glowLine.setStyle({ opacity: 0.35, weight: 7 });
      });
      layersGroup.addLayer(observedLine);

      // Plot point markers with color gradient
      const totalPts = observedPoints.length;
      observedPoints.forEach((pt, idx) => {
        const isLatest = idx === totalPts - 1;
        const isSelected = selectedPointIndex === idx;

        if (isLatest) {
          // Current Position: Pulsing Radar Marker
          const pingIcon = L.divIcon({
            className: 'custom-radar-ping-icon',
            html: `<div class="radar-ping-marker" style="${isSelected ? 'box-shadow: 0 0 18px #38bdf8; border-color: #38bdf8;' : ''}"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          const marker = L.marker([pt.latitude, pt.longitude], { icon: pingIcon });
          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
              <strong style="color: #dc2626; font-size: 13px;">🌀 ${cycloneName} - Latest Eye Position</strong><br/>
              <strong>Time:</strong> ${pt.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
              <strong>Coordinates:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E<br/>
              <strong>Wind Speed:</strong> ${pt.wind_speed_kts ?? 'N/A'} knots<br/>
              <strong>Central Pressure:</strong> ${pt.central_pressure_hpa ?? 'N/A'} hPa<br/>
              <strong>IMD Stage:</strong> <span style="font-weight: 700; color: #b91c1c;">${pt.imd_stage || 'N/A'}</span>
            </div>
          `);
          marker.on('click', () => {
            setSelectedPointIndex(idx);
          });
          layersGroup.addLayer(marker);
          markersRef.current.push(marker);
        } else {
          // Color progression based on chronological position
          let dotColor = '#10b981'; // Green for earlier
          if (idx >= Math.floor(totalPts * 0.45)) {
            dotColor = '#f59e0b'; // Orange for recent
          }

          const marker = L.circleMarker([pt.latitude, pt.longitude], {
            radius: isSelected ? 8 : 5,
            color: isSelected ? '#38bdf8' : '#ffffff',
            fillColor: dotColor,
            fillOpacity: 1,
            weight: isSelected ? 3 : 1.5,
          });

          marker.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
              <strong style="color: #1e3a8a; font-size: 13px;">🌀 ${cycloneName} - Observation #${idx + 1}</strong><br/>
              <strong>Time:</strong> ${pt.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}<br/>
              <strong>Coordinates:</strong> ${pt.latitude.toFixed(2)}°N, ${pt.longitude.toFixed(2)}°E<br/>
              <strong>Wind:</strong> ${pt.wind_speed_kts ?? 'N/A'} knots<br/>
              <strong>Pressure:</strong> ${pt.central_pressure_hpa ?? 'N/A'} hPa<br/>
              <strong>Stage:</strong> ${pt.imd_stage || 'N/A'}
            </div>
          `);
          marker.on('click', () => {
            setSelectedPointIndex(idx);
          });
          layersGroup.addLayer(marker);
          markersRef.current.push(marker);
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
            <strong>Position:</strong> ${formatCoord(pt.predicted_latitude, pt.predicted_longitude)}<br/>
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

    // 3. Plot Coastal Landfall & Hazard Danger Radii
    if (showHazardRadii && (landfallData || activePoint)) {
      const centerLat = activePoint ? activePoint.latitude : (landfallData?.projected_landfall_point[0] || 14.0);
      const centerLon = activePoint ? activePoint.longitude : (landfallData?.projected_landfall_point[1] || 82.0);

      // Core Gale Danger Zone (50 km - Red)
      const galeCircle = L.circle([centerLat, centerLon], {
        radius: 50 * 1000,
        color: '#dc2626',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.18,
      });
      galeCircle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
          <strong style="color: #dc2626; font-size: 13px;">Core Gale Danger Zone (50 km)</strong><br/>
          <strong>Hazard:</strong> Destructive hurricane-force winds (≥64 kts) & severe eyewall turbulence.<br/>
          <strong>Advisory:</strong> Complete suspension of coastal maritime navigation.
        </div>
      `);
      layersGroup.addLayer(galeCircle);

      // Outer Storm Warning Zone (100 km - Amber/Orange)
      const stormCircle = L.circle([centerLat, centerLon], {
        radius: 100 * 1000,
        color: '#ea580c',
        weight: 1.5,
        fillColor: '#f97316',
        fillOpacity: 0.08,
        dashArray: '4, 4',
      });
      stormCircle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.4; padding: 4px;">
          <strong style="color: #ea580c; font-size: 13px;">Outer Storm Warning Zone (100 km)</strong><br/>
          <strong>Hazard:</strong> Damaging gale squalls (34–63 kts) & rough sea conditions.
        </div>
      `);
      layersGroup.addLayer(stormCircle);

      // Coastal Landfall Point Marker
      if (landfallData && landfallData.projected_landfall_point) {
        bounds.push(landfallData.projected_landfall_point);
        const landfallIcon = L.divIcon({
          className: 'landfall-beacon',
          html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: ${landfallData.alert_color}; border: 3px solid #ffffff; box-shadow: 0 0 16px ${landfallData.alert_color}; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: bold;">⚡</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const landfallMarker = L.marker(landfallData.projected_landfall_point, { icon: landfallIcon });
        landfallMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${landfallData.alert_color}; color: #ffffff; font-weight: bold; font-size: 10px; margin-bottom: 4px;">
              ${landfallData.alert_level}
            </span><br/>
            <strong style="color: #0f172a; font-size: 13px;">Projected Landfall Sector:</strong><br/>
            <strong style="color: #2563eb;">${landfallData.target_coastal_sector}</strong><br/>
            <strong>Distance to Coast:</strong> ${landfallData.distance_to_coast_km} km<br/>
            <strong>Estimated Landfall ETA:</strong> ~${landfallData.estimated_landfall_eta_hours} hrs<br/>
            <div style="margin-top: 6px; font-size: 11px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 4px;">
              ${landfallData.advisory}
            </div>
          </div>
        `);
        layersGroup.addLayer(landfallMarker);
      }
    }

    if (bounds.length > 0 && selectedPointIndex === null) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60] });
    }
  }, [observedPoints, predictedPoints, cycloneName, showHazardRadii, landfallData, selectedPointIndex]);

  return (
    <div
      className="white-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        height,
        width: '100%',
        isolation: 'isolate',
        zIndex: 10,
        contain: 'paint',
        borderRadius: '16px',
      }}
    >
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          zIndex: 1,
          overflow: 'hidden',
          borderRadius: '16px',
        }}
      />

      {/* Floating HUD Card: Collapsible, Dockable, and Fully Interactive */}
      {isCardCollapsed ? (
        /* MINIMIZED SLIM PILL (Zero Overlap on Ocean & Map, strictly contained) */
        <div
          style={{
            position: 'absolute',
            ...(dockPosition === 'top-left' ? { top: '14px', left: '14px' } : { bottom: '16px', right: '14px' }),
            zIndex: 500,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            borderRadius: '10px',
            padding: '5px 12px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ffffff',
            transition: 'all 0.25s ease',
            maxWidth: 'calc(100% - 28px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px' }}>🌀</span>
            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f8fafc', letterSpacing: '0.02em' }}>
              {cycloneName.toUpperCase()}
            </span>
            <button
              onClick={() => activePoint && handleFlyToPosition(activePoint.latitude, activePoint.longitude, 7)}
              title="Click to fly map directly to eye position"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.74rem',
                color: '#38bdf8',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 4px',
                borderRadius: '4px',
              }}
            >
              <MapPin size={12} color="#38bdf8" />
              <span>{activePosition}</span>
            </button>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: stageStyle.bg,
                color: stageStyle.text,
                border: `1px solid ${stageStyle.border}`,
                fontWeight: 700,
              }}
            >
              {activeWindKts} kts
            </span>
          </div>

          <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          <button
            onClick={() => activePoint && handleFlyToPosition(activePoint.latitude, activePoint.longitude, 7)}
            title="Fly map directly to storm center"
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Crosshair size={12} />
            <span>Center Eye</span>
          </button>

          <button
            onClick={() => setIsCardCollapsed(false)}
            title="Expand Full Interactive Telemetry HUD"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Maximize2 size={12} />
            <span>Expand HUD</span>
          </button>
        </div>
      ) : (
        /* EXPANDED INTERACTIVE HUD CARD (Strictly Contained within map bounds) */
        <div
          style={{
            position: 'absolute',
            ...(dockPosition === 'top-left' ? { top: '14px', left: '14px' } : { bottom: '16px', right: '14px' }),
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(14px)',
            borderRadius: '12px',
            padding: '12px 14px',
            color: '#ffffff',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
            zIndex: 500,
            width: '265px',
            maxWidth: 'calc(100% - 28px)',
            maxHeight: 'calc(100% - 28px)',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            transition: 'all 0.25s ease',
          }}
        >
          {/* Card Header with Logo, Dock, and Minimize Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}
              >
                🌀
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.1 }}>
                  CycloVision
                </div>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Tropical Cyclone Monitoring</div>
              </div>
            </div>

            {/* Quick Window Utility Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setDockPosition(dockPosition === 'top-left' ? 'bottom-right' : 'top-left')}
                title={dockPosition === 'top-left' ? 'Move HUD to Bottom-Right' : 'Move HUD to Top-Left'}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94a3b8',
                  borderRadius: '5px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.62rem',
                }}
              >
                <MoveHorizontal size={11} />
                <span>Dock</span>
              </button>

              <button
                onClick={() => setIsCardCollapsed(true)}
                title="Minimize HUD to slim badge"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94a3b8',
                  borderRadius: '5px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={12} />
              </button>
            </div>
          </div>

          {/* Cyclone Title & Stage Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.03em' }}>
              {cycloneName.toUpperCase()}
            </div>
            <span
              style={{
                fontSize: '0.64rem',
                padding: '2px 6px',
                borderRadius: '5px',
                backgroundColor: stageStyle.bg,
                color: stageStyle.text,
                border: `1px solid ${stageStyle.border}`,
                fontWeight: 700,
                textAlign: 'right',
                maxWidth: '120px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={activeStage}
            >
              {activeStage}
            </span>
          </div>

          {/* Telemetry Key-Value Rows */}
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.28)', borderRadius: '7px', padding: '6px 8px', marginBottom: '8px' }}>
            {/* Track Line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '3px' }}>
              <span>Track Source:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>NOAA IBTrACS (Verified)</span>
            </div>

            {/* Time Line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '3px' }}>
              <span>Last Update:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{activeUpdateTime}</span>
            </div>

            {/* Clickable Interactive Position */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '3px' }}>
              <span>Position:</span>
              <button
                onClick={() => activePoint && handleFlyToPosition(activePoint.latitude, activePoint.longitude, 7)}
                title="Click to fly map directly to this storm coordinate"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#38bdf8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                <MapPin size={11} color="#38bdf8" />
                <span>{activePosition}</span>
              </button>
            </div>

            {/* Wind & Pressure Telemetry */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', paddingTop: '3px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Wind: <strong style={{ color: '#f87171' }}>{activeWindKts} kts</strong></span>
              <span>Pressure: <strong style={{ color: '#38bdf8' }}>{activePressureHpa} hPa</strong></span>
            </div>
          </div>

          {/* Interactive Historical Point Stepper */}
          {totalObserved > 1 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  {isViewingLatest ? '⚡ Latest Eye Position' : `Pt ${(activeIdx ?? 0) + 1} of ${totalObserved}`}
                </span>
                {!isViewingLatest && (
                  <button
                    onClick={handleResetToLatest}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    ↺ Reset
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={handleStepPrev}
                  disabled={(activeIdx ?? 0) <= 0}
                  title="Step to Previous Track Point"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    padding: '3px 4px',
                    borderRadius: '5px',
                    backgroundColor: (activeIdx ?? 0) <= 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: (activeIdx ?? 0) <= 0 ? '#64748b' : '#ffffff',
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    cursor: (activeIdx ?? 0) <= 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={11} />
                  <span>Prev</span>
                </button>

                <div
                  style={{
                    fontSize: '0.64rem',
                    color: '#cbd5e1',
                    fontWeight: 700,
                    padding: '2px 4px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: '4px',
                  }}
                >
                  {(activeIdx ?? 0) + 1}/{totalObserved}
                </div>

                <button
                  onClick={handleStepNext}
                  disabled={isViewingLatest}
                  title="Step to Next Track Point"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    padding: '3px 4px',
                    borderRadius: '5px',
                    backgroundColor: isViewingLatest ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: isViewingLatest ? '#64748b' : '#ffffff',
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    cursor: isViewingLatest ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={11} />
                </button>
              </div>
            </div>
          )}

          {/* Direct Interactive Action Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: landfallData ? '1fr 1fr' : '1fr 1fr', gap: '5px' }}>
            <button
              onClick={() => activePoint && handleFlyToPosition(activePoint.latitude, activePoint.longitude, 7)}
              title="Fly map camera to current storm center"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '5px 6px',
                borderRadius: '5px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Crosshair size={12} />
              <span>Center Eye</span>
            </button>

            {landfallData ? (
              <button
                onClick={handleLandfallFly}
                title="Fly to projected coastal landfall sector"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '5px 6px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Zap size={12} />
                <span>Landfall Zone</span>
              </button>
            ) : (
              <button
                onClick={handleResetZoom}
                title="Fit full track in map frame"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '5px 6px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCcw size={12} />
                <span>Fit Track</span>
              </button>
            )}
          </div>

          {/* Sync Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '6px', fontSize: '0.6rem', color: '#94a3b8' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span>Interactive Telemetry Sync Active</span>
          </div>
        </div>
      )}

      {/* Top-Right Map Controls */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          zIndex: 500,
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          maxWidth: 'calc(100% - 28px)',
        }}
      >
        <button
          onClick={toggleMapMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '6px 12px',
            borderRadius: '7px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Layers size={13} />
          <span>
            {mapMode === 'osm'
              ? '🗺️ Top Down'
              : mapMode === 'satellite'
              ? '🛰️ ESRI Sat'
              : '🌐 NASA GIBS'}
          </span>
        </button>

        <button
          onClick={handleRegionalView}
          title="Top-Down Regional View (India, Bay of Bengal, Arabian Sea)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '6px 10px',
            borderRadius: '7px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Compass size={13} />
          <span>Regional View</span>
        </button>

        <button
          onClick={() => setShowHazardRadii(!showHazardRadii)}
          title="Toggle Coastal Hazard Danger Radii"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: showHazardRadii ? 'rgba(220, 38, 38, 0.92)' : 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            border: showHazardRadii ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
            padding: '6px 10px',
            borderRadius: '7px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldAlert size={13} color="#ffffff" />
          <span>{showHazardRadii ? 'Hazard Radii: ON' : 'Hazard Radii: OFF'}</span>
        </button>

        <button
          onClick={handleResetZoom}
          title="Reset View & Center Complete Cyclone Track"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            padding: '6px 10px',
            borderRadius: '7px',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCcw size={13} color="#38bdf8" />
          <span>Focus Track</span>
        </button>
      </div>

      {/* Bottom-Left Floating Legend Card (Collapsible) */}
      {isLegendCollapsed ? (
        <button
          onClick={() => setIsLegendCollapsed(false)}
          title="Expand Cyclone Track Legend"
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(10px)',
            borderRadius: '7px',
            padding: '5px 10px',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            zIndex: 500,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.68rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <Info size={12} color="#38bdf8" />
          <span>Track Legend</span>
        </button>
      ) : (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '14px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)',
            zIndex: 500,
            minWidth: '180px',
            maxWidth: 'calc(100% - 28px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
              CYCLONE TRACK
            </div>
            <button
              onClick={() => setIsLegendCollapsed(true)}
              title="Minimize Legend"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Minus size={11} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <div style={{ width: '18px', borderTop: '2px dashed #ef4444' }} />
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Observed Track (IBTrACS)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Current Eye Position</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Recent Observations</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Genesis / Earlier Track</span>
          </div>
        </div>
      )}
    </div>
  );
};



