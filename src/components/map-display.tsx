"use client";

import React, { useEffect, useRef, useState } from 'react';
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
    border: 1px solid #FFFFFF;
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<span style="${markerHtmlStyles}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24]
  });
};

function MapDisplay({ conflicts }: MapDisplayProps) {
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Aguarda um tick para garantir que o DOM está pronto
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  const validConflicts = conflicts.filter(
    (conflict) => conflict.latitude != null && conflict.longitude != null &&
      typeof conflict.latitude === 'number' &&
      typeof conflict.longitude === 'number'
  );

  if (!isClient || !mounted) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md relative bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Carregando mapa...</div>
      </div>
    );
  }

  const mapCenter: L.LatLngTuple = [20, 0];
  const mapZoom = 2;

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md relative">
      <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          attributionControl={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {validConflicts.map((conflict: WikipediaConflict) => (
            <Marker
              key={conflict.id}
              position={[conflict.latitude as number, conflict.longitude as number]}
              icon={createCustomIcon(severityColorMap[conflict.severity || 'UNKNOWN'])}
            >
              <Popup>
                <div className="text-sm max-w-xs">
                  <h4 className="font-semibold text-base mb-2">{conflict.name}</h4>
                  <div className="space-y-1">
                    <p><span className="font-medium">Severidade:</span> {conflict.severity}</p>
                    <p><span className="font-medium">Fatalidades:</span> {conflict.fatalitiesRaw}</p>
                    {conflict.locations && (
                      <p><span className="font-medium">Locais:</span> {conflict.locations.join(', ')}</p>
                    )}
                    {conflict.startDate && (
                      <p><span className="font-medium">Início:</span> {conflict.startDate}</p>
                    )}
                  </div>
                  {conflict.detailsLink && (
                    <a
                      href={conflict.detailsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline mt-2 block"
                    >
                      Detalhes na Wikipedia →
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {validConflicts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-[1000]">
          <div className="text-white bg-black/70 p-4 rounded-lg shadow-lg text-center">
            <p className="text-lg font-medium">Nenhum conflito para exibir</p>
            <p className="text-sm opacity-90 mt-1">Dados com coordenadas não encontrados</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapDisplay;