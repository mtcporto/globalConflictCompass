
"use client";

import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Globe } from 'lucide-react';

interface ConflictZone {
  nome: string;
  latitude?: number | null; // Allow null
  longitude?: number | null; // Allow null
}

interface MapDisplayProps {
  zones: ConflictZone[];
}

// Default Leaflet icon fix for Next.js/Webpack
if (typeof window !== 'undefined') {
  const L = require('leaflet');
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default.src,
    iconUrl: require('leaflet/dist/images/marker-icon.png').default.src,
    shadowUrl: require('leaflet/dist/images/marker-shadow.png').default.src,
  });
}


export default function MapDisplay({ zones }: MapDisplayProps) {
  const position: LatLngExpression = [20, 0]; // Default center
  const zoomLevel = 2;

  // Filter for zones that have valid, numeric latitude and longitude
  const validZones = zones.filter(
    zone => typeof zone.latitude === 'number' && typeof zone.longitude === 'number'
  );

  if (validZones.length === 0) {
    return (
      <div className="h-[300px] w-full flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 text-center">
        <Globe className="w-12 h-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma coordenada geográfica numérica disponível para exibir no mapa no momento.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          A IA tentará fornecer coordenadas para as zonas de conflito identificadas.
        </p>
      </div>
    );
  }
  
  // Calculate bounds if there are multiple valid zones
  let mapBounds: LatLngExpression[] | undefined = undefined;
  if (validZones.length > 0) {
    // Ensure latitude and longitude are not null before casting
    mapBounds = validZones.map(zone => [zone.latitude as number, zone.longitude as number] as LatLngExpression);
  }


  return (
    <div className="h-[300px] w-full rounded-lg overflow-hidden shadow-md border">
      <MapContainer 
        center={position} 
        zoom={zoomLevel} 
        scrollWheelZoom={true} 
        className="h-full w-full"
        bounds={mapBounds && mapBounds.length > 0 ? mapBounds : undefined}
        boundsOptions={mapBounds && mapBounds.length > 0 ? { padding: [50, 50] } : undefined}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validZones.map((zone) => (
          <Marker 
            key={zone.nome} 
            // We've already filtered for number types, so direct use is safe
            position={[zone.latitude as number, zone.longitude as number]}
          >
            <Popup>
              {zone.nome}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

