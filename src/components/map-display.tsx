
"use client";

import React from 'react'; // Keep React for JSX
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { WikipediaConflict, WikipediaConflictSeverity } from '@/lib/types';

// More robust icon patch to ensure it only runs effectively once.
// We check for a custom flag on the prototype itself.
// @ts-ignore
if (typeof L !== 'undefined' && !L.Icon.Default.prototype._iconUrlsPatchedByGlobalConflictCompass) {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl; // Delete the original method

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
  });
  // @ts-ignore
  L.Icon.Default.prototype._iconUrlsPatchedByGlobalConflictCompass = true;
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
    className: "custom-icon", // a generic class for potential global styling
    iconAnchor: [0, 24], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -24], // point from which the popup should open relative to the iconAnchor
    html: `<span style="${markerHtmlStyles}" />`
  });
};

// Removed React.memo; parent component's key will handle remounting.
function MapDisplay({ conflicts }: MapDisplayProps) {
  const validConflicts = conflicts.filter(
    (conflict) =>
      conflict.latitude != null &&
      conflict.longitude != null &&
      typeof conflict.latitude === 'number' &&
      typeof conflict.longitude === 'number'
  );

  const mapCenter: L.LatLngExpression = [20, 0]; // Centered view
  const mapZoom = 2;

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md relative" data-ai-hint={validConflicts.length > 0 ? "world map conflict hotspots" : "world map illustration"}>
      <MapContainer
        // Removed dynamic key from here; parent's key on <MapDisplay> controls its lifecycle.
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
        />

        {validConflicts.map((conflict) => (
          <Marker
            key={conflict.id} // Key for list items is important
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

      {/* Overlay message if no conflicts to display */}
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
// Explicitly export MapDisplay as default if it's the main export, or named if preferred.
// Default export is common for components dynamically imported.
export default MapDisplay;

