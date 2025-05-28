
"use client";

import React, { useEffect, useRef } from 'react'; // Ensure React and hooks are imported
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WikipediaConflict, WikipediaConflictSeverity } from '@/lib/types';

// Fix for default marker icon issue with Webpack/Next.js
// Ensure this patch runs only once.
// @ts-ignore
if (typeof window !== 'undefined' && !L.Icon.Default.prototype._getIconUrlPatched) {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
  });
  // @ts-ignore
  L.Icon.Default.prototype._getIconUrlPatched = true;
}


interface MapDisplayProps {
  conflicts: WikipediaConflict[];
}

const severityColorMap: Record<WikipediaConflictSeverity, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'gold',
  UNKNOWN: 'grey',
};

const createCustomIcon = (color: string) => {
  const markerHtmlStyles = `
    background-color: ${color};
    width: 1.5rem;
    height: 1.5rem;
    display: block;
    left: -0.75rem;
    top: -0.75rem;
    position: relative;
    border-radius: 1.5rem 1.5rem 0;
    transform: rotate(45deg);
    border: 1px solid #FFFFFF;`;

  return L.divIcon({
    className: "custom-icon",
    iconAnchor: [0, 24],
    labelAnchor: [-6, 0],
    popupAnchor: [0, -24],
    html: `<span style="${markerHtmlStyles}" />`
  });
};

const WorldMapBounds: L.LatLngBoundsExpression = [
  [-60, -170], // Southwest
  [85, 190]  // Northeast
];

export default function MapDisplay({ conflicts }: MapDisplayProps) {
  const mapInstanceRef = useRef<L.Map | null>(null);

  const validConflicts = conflicts.filter(
    (conflict) =>
      conflict.latitude != null &&
      conflict.longitude != null &&
      typeof conflict.latitude === 'number' &&
      typeof conflict.longitude === 'number'
  );

  const mapCenter: L.LatLngExpression = [20, 0];
  const mapZoom = 2;

  useEffect(() => {
    // Cleanup function: will be called when MapDisplay unmounts
    return () => {
      if (mapInstanceRef.current) {
        // console.log("MapDisplay: Manually removing map instance on unmount", mapInstanceRef.current);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs on mount and unmount of MapDisplay

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md relative" data-ai-hint={validConflicts.length > 0 ? "world map conflict hotspots" : "world map illustration"}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        maxBounds={WorldMapBounds}
        minZoom={2}
        whenCreated={(map) => {
          // console.log("MapDisplay: Map instance created by react-leaflet", map);
          mapInstanceRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
        />

        {validConflicts.map((conflict) => (
          <Marker
            key={conflict.id}
            position={[conflict.latitude as number, conflict.longitude as number]}
            icon={createCustomIcon(severityColorMap[conflict.severity || 'UNKNOWN'])}
          >
            <Popup>
              <div className="text-sm">
                <h4 className="font-semibold text-base mb-1">{conflict.name}</h4>
                <p><strong>Severidade:</strong> {conflict.severity}</p>
                <p><strong>Fatalidades:</strong> {conflict.fatalidadesRaw}</p>
                {conflict.locations && <p><strong>Locais:</strong> {conflict.locations.join(', ')}</p>}
                {conflict.startDate && <p><strong>Início:</strong> {conflict.startDate}</p>}
                {conflict.detailsLink && (
                  <a
                    href={conflict.detailsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mt-1 block"
                  >
                    Detalhes na Wikipedia
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {validConflicts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
          <p
            className="text-background bg-foreground/70 p-3 rounded-md shadow-lg"
          >
            Nenhum conflito com coordenadas para exibir no mapa.
          </p>
        </div>
      )}
    </div>
  );
}
