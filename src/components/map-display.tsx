
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { WikipediaConflict, WikipediaConflictSeverity } from '@/lib/types';

// Patch Leaflet's default icon path (ensure this runs only once)
if (typeof window !== 'undefined') {
  if (!L.Icon.Default.prototype._iconUrlPatched) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
      iconUrl: require('leaflet/dist/images/marker-icon.png').default,
      shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
    });
    L.Icon.Default.prototype._iconUrlPatched = true;
  }
}

interface MapDisplayProps {
  conflicts: WikipediaConflict[];
}

const leafletSeverityColorMap: Record<WikipediaConflictSeverity, string> = {
  HIGH: '#DC2626',    // Red-600
  MEDIUM: '#F59E0B',  // Amber-500
  LOW: '#FACC15',     // Yellow-400
  UNKNOWN: '#6B7280', // Gray-500
};

const defaultCountryStyle = {
  fillColor: "#CBD5E1", // slate-300
  weight: 1,
  opacity: 1,
  color: 'white', // White border for countries
  fillOpacity: 0.7
};

const LegendControl = ({ severityMap }: { severityMap: Record<WikipediaConflictSeverity, string> }) => {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend bg-background/80 p-2 rounded-md shadow-md text-xs");
      let labels = ['<strong class="text-sm">Gravidade do Conflito</strong>'];
      (Object.keys(severityMap) as WikipediaConflictSeverity[]).forEach(severity => {
        const severityLabel = 
          severity === 'HIGH' ? 'Alta (10k+ mortes)' :
          severity === 'MEDIUM' ? 'Média (1k-10k mortes)' :
          severity === 'LOW' ? 'Baixa (100-1k mortes)' :
          'Desconhecida';
        labels.push(
          `<i style="background:${severityMap[severity]}; width: 12px; height: 12px; display: inline-block; margin-right: 4px; border-radius: 50%;"></i> ${severityLabel}`
        );
      });
      div.innerHTML = labels.join('<br>');
      return div;
    };
    legend.addTo(map);

    return () => {
      // Check if map instance and legend exist before trying to remove
      if (map && legend && legend.getContainer()) {
         map.removeControl(legend);
      }
    };
  }, [map, severityMap]);

  return null;
};


function MapDisplay({ conflicts }: MapDisplayProps) {
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [loadingGeoJson, setLoadingGeoJson] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setLoadingGeoJson(true);
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then(res => res.json())
      .then(data => {
        setCountriesGeoJson(data);
        setLoadingGeoJson(false);
      })
      .catch(error => {
        console.error("Error fetching countries GeoJSON:", error);
        setLoadingGeoJson(false);
      });
  }, []);

  const validConflicts = conflicts.filter(
    (conflict) => conflict.latitude != null && conflict.longitude != null &&
      typeof conflict.latitude === 'number' &&
      typeof conflict.longitude === 'number'
  );

  const getCountryStyle = (feature: any) => {
    const countryName = feature.properties.name;
    const involvedConflicts = conflicts.filter(c => 
      c.locations.some(loc => loc.toLowerCase() === countryName.toLowerCase() || loc.toLowerCase().includes(countryName.toLowerCase()) || countryName.toLowerCase().includes(loc.toLowerCase()) )
    );

    if (involvedConflicts.length > 0) {
      // Prioritize by severity: HIGH > MEDIUM > LOW > UNKNOWN
      let highestSeverity: WikipediaConflictSeverity = 'UNKNOWN';
      if (involvedConflicts.some(c => c.severity === 'HIGH')) highestSeverity = 'HIGH';
      else if (involvedConflicts.some(c => c.severity === 'MEDIUM')) highestSeverity = 'MEDIUM';
      else if (involvedConflicts.some(c => c.severity === 'LOW')) highestSeverity = 'LOW';
      
      return {
        fillColor: leafletSeverityColorMap[highestSeverity],
        weight: 1.5,
        opacity: 1,
        color: '#4B5563', // Gray-700 border for highlighted countries
        fillOpacity: 0.5
      };
    }
    return defaultCountryStyle;
  };

  const onEachCountryFeature = (feature: any, layer: L.Layer) => {
    const countryName = feature.properties.name;
    const relatedConflicts = conflicts.filter(c => 
      c.locations.some(loc => loc.toLowerCase() === countryName.toLowerCase() || loc.toLowerCase().includes(countryName.toLowerCase()) || countryName.toLowerCase().includes(loc.toLowerCase()))
    );
    if (relatedConflicts.length > 0) {
      const popupContent = `
        <div class="text-sm">
          <h4 class="font-semibold text-base mb-1">${countryName}</h4>
          <p class="font-medium">Conflitos Envolvidos:</p>
          <ul class="list-disc list-inside ml-1 text-xs">
            ${relatedConflicts.map(c => `<li>${c.name} (Gravidade: ${c.severity})</li>`).join('')}
          </ul>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };
  
  const mapCenter: L.LatLngTuple = [20, 0]; // Centered more globally
  const mapZoom = 2;

  if (loadingGeoJson) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden shadow-md relative bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dados do mapa...</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] md:h-[600px] w-full rounded-lg overflow-hidden shadow-md relative" data-ai-hint={validConflicts.length > 0 ? "world map conflict hotspots" : "world map illustration"}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        whenCreated={instance => { mapRef.current = instance; }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
        />

        {countriesGeoJson && (
          <GeoJSON
            key={JSON.stringify(conflicts)} // Re-render GeoJSON if conflicts change
            data={countriesGeoJson}
            style={getCountryStyle}
            onEachFeature={onEachCountryFeature}
          />
        )}

        {validConflicts.map((conflict) => (
          <CircleMarker
            key={conflict.id}
            center={[conflict.latitude as number, conflict.longitude as number]}
            radius={conflict.severity === 'HIGH' ? 8 : conflict.severity === 'MEDIUM' ? 6 : 4}
            pathOptions={{ 
              color: leafletSeverityColorMap[conflict.severity || 'UNKNOWN'],
              fillColor: leafletSeverityColorMap[conflict.severity || 'UNKNOWN'],
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-sm max-w-xs">
                <h4 className="font-semibold text-base mb-1">{conflict.name}</h4>
                <p><span className="font-medium">Gravidade:</span> {conflict.severity}</p>
                <p><span className="font-medium">Fatalidades:</span> {conflict.fatalitiesRaw}</p>
                {conflict.territory && <p><span className="font-medium">Território Específico:</span> {conflict.territory}</p>}
                {conflict.locations && conflict.locations.length > 0 && (
                  <p><span className="font-medium">Locais:</span> {conflict.locations.join(', ')}</p>
                )}
                {conflict.startDate && <p><span className="font-medium">Início:</span> {conflict.startDate}</p>}
                {conflict.detailsLink && (
                  <a
                    href={conflict.detailsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline mt-1.5 block"
                  >
                    Detalhes na Wikipedia →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        <LegendControl severityMap={leafletSeverityColorMap} />
      </MapContainer>
      
      {validConflicts.length === 0 && countriesGeoJson && !loadingGeoJson && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-[1000]">
            <div className="text-slate-700 bg-slate-100/90 p-3 rounded-md shadow-lg text-center">
              <p className="text-base font-medium">Nenhum conflito com coordenadas para exibir no mapa.</p>
              <p className="text-xs opacity-90 mt-0.5">Os países envolvidos podem estar destacados.</p>
            </div>
          </div>
      )}
    </div>
  );
}

export default React.memo(MapDisplay);
