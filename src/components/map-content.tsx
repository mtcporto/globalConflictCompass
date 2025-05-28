"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { WikipediaConflict, WikipediaConflictSeverity } from '@/lib/types';

// Correção do ícone do Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
  });
}

interface MapContentProps {
  conflicts: WikipediaConflict[];
  severityColorMap: Record<WikipediaConflictSeverity, string>;
}

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
    border: 1px solid #FFFFFF;
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<span style="${markerHtmlStyles}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  });
};

function MapContent({ conflicts, severityColorMap }: MapContentProps) {
  const mapCenter: L.LatLngExpression = [20, 0];
  const mapZoom = 2;

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
      />

      {conflicts.map((conflict: WikipediaConflict) => (
        <Marker
          key={conflict.id}
          position={[conflict.latitude as number, conflict.longitude as number]}
          icon={createCustomIcon(severityColorMap[conflict.severity || 'UNKNOWN'])}
        >
          <Popup>
            <div className="text-sm">
              <h4 className="font-semibold text-base mb-1">{conflict.name}</h4>
              <p><strong>Severidade:</strong> {conflict.severity}</p>
              <p><strong>Fatalidades:</strong> {conflict.fatalitiesRaw}</p>
              {conflict.locations && <p><strong>Locais:</strong> {conflict.locations.join(', ')}</p>}
              {conflict.startDate && <p><strong>Início:</strong> {conflict.startDate}</p>}
              {conflict.detailsLink && (
                <a
                  href={conflict.detailsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-1 block"
                >
                  Detalhes na Wikipedia
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapContent;