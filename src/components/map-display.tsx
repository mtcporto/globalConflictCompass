
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CuratedConflictEntry, ConflictSeverityCategory } from '@/lib/types';

// Patch Leaflet's default icon path (ensure this runs only once)
if (typeof window !== 'undefined') {
  if (!L.Icon.Default.prototype._iconUrlPatched) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
      iconUrl: require('leaflet/dist/images/marker-icon.png').default,
      shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
    });
    (L.Icon.Default.prototype as any)._iconUrlPatched = true;
  }
}

interface MapDisplayProps {
  conflicts: CuratedConflictEntry[];
}

const leafletSeverityColorMap: Record<ConflictSeverityCategory, string> = {
  "Alta Gravidade": '#DC2626',    // Red-600
  "Média Gravidade": '#F59E0B',  // Amber-500
  "Baixa Gravidade": '#FACC15',     // Yellow-400
};

const defaultCountryStyle = {
  fillColor: "#E2E8F0", 
  weight: 1,
  opacity: 1,
  color: 'white', 
  fillOpacity: 0.6
};

const LegendControl = ({ severityMap }: { severityMap: Record<ConflictSeverityCategory, string> }) => {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend bg-background/80 p-2 rounded-md shadow-md text-xs");
      let labels = ['<strong class="text-sm">Gravidade do Conflito</strong>'];
      (Object.keys(severityMap) as ConflictSeverityCategory[]).forEach(severityKey => {
        labels.push(
          `<i style="background:${severityMap[severityKey]}; width: 12px; height: 12px; display: inline-block; margin-right: 4px; border-radius: 50%;"></i> ${severityKey}`
        );
      });
      div.innerHTML = labels.join('<br>');
      return div;
    };
    legend.addTo(map);

    return () => {
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
    (conflict) => conflict.coordenadas && typeof conflict.coordenadas[0] === 'number' && typeof conflict.coordenadas[1] === 'number'
  );

  const getCountryStyle = (feature: any) => {
    const countryName = feature.properties.name;
    const involvedConflicts = conflicts.filter(c => 
      c.envolvidos && Array.isArray(c.envolvidos) && c.envolvidos.some(loc => 
        loc.toLowerCase() === countryName.toLowerCase() || 
        loc.toLowerCase().includes(countryName.toLowerCase()) || 
        countryName.toLowerCase().includes(loc.toLowerCase())
      )
    );

    if (involvedConflicts.length > 0) {
      let highestSeverityCategory: ConflictSeverityCategory = "Baixa Gravidade"; // Default
      
      if (involvedConflicts.some(c => c.severityCategory === 'Alta Gravidade')) highestSeverityCategory = 'Alta Gravidade';
      else if (involvedConflicts.some(c => c.severityCategory === 'Média Gravidade')) highestSeverityCategory = 'Média Gravidade';
      // 'Baixa Gravidade' is already the default if the others are not met.
      
      return {
        fillColor: leafletSeverityColorMap[highestSeverityCategory] || defaultCountryStyle.fillColor,
        weight: 1.5,
        opacity: 1,
        color: '#4B5563', 
        fillOpacity: 0.5
      };
    }
    return defaultCountryStyle;
  };

  const onEachCountryFeature = (feature: any, layer: L.Layer) => {
    const countryName = feature.properties.name;
    const relatedConflicts = conflicts.filter(c => 
      c.envolvidos && Array.isArray(c.envolvidos) && c.envolvidos.some(loc => 
        loc.toLowerCase() === countryName.toLowerCase() || 
        loc.toLowerCase().includes(countryName.toLowerCase()) || 
        countryName.toLowerCase().includes(loc.toLowerCase())
      )
    );
    if (relatedConflicts.length > 0) {
      const popupContent = `
        <div class="text-sm">
          <h4 class="font-semibold text-base mb-1">${countryName}</h4>
          <p class="font-medium">Conflitos Envolvidos:</p>
          <ul class="list-disc list-inside ml-1 text-xs">
            ${relatedConflicts.map(c => `<li>${c.nome} (Gravidade: ${c.severityCategory || 'N/A'})</li>`).join('')}
          </ul>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };
  
  const mapCenter: L.LatLngTuple = [20, 0];
  const mapZoom = 2;

  if (loadingGeoJson) {
    return (
      <div className="h-[600px] md:h-[700px] w-full rounded-lg overflow-hidden shadow-md relative bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dados do mapa geográfico...</p>
      </div>
    );
  }

  return (
    <div className="h-[600px] md:h-[700px] w-full rounded-lg overflow-hidden shadow-md relative" data-ai-hint={validConflicts.length > 0 ? "world map conflict hotspots" : "world map illustration"}>
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
            key={JSON.stringify(conflicts.map(c => ({ nome: c.nome, envolvidos: c.envolvidos, severityCategory: c.severityCategory})))} 
            data={countriesGeoJson}
            style={getCountryStyle}
            onEachFeature={onEachCountryFeature}
          />
        )}

        {validConflicts.map((conflict) => {
          const severityCat = conflict.severityCategory || "Baixa Gravidade";
          const color = leafletSeverityColorMap[severityCat] || '#6B7280';
          let radius = 4;
          if (severityCat === "Alta Gravidade") radius = 8;
          else if (severityCat === "Média Gravidade") radius = 6;

          return (
            <CircleMarker
              key={conflict.nome} // Assuming nome is unique for key
              center={[conflict.coordenadas[0], conflict.coordenadas[1]]}
              radius={radius}
              pathOptions={{ 
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-sm max-w-xs">
                  <h4 className="font-semibold text-base mb-1">{conflict.nome}</h4>
                  <p><span className="font-medium">Gravidade:</span> {severityCat}</p>
                  <p><span className="font-medium">Fatalidades:</span> {conflict.fatalidades_texto}</p>
                  {conflict.territorio && <p><span className="font-medium">Território Específico:</span> {conflict.territorio}</p>}
                  {conflict.envolvidos && conflict.envolvidos.length > 0 && (
                    <p><span className="font-medium">Envolvidos (Países/Grupos):</span> {conflict.envolvidos.join(', ')}</p>
                  )}
                  {conflict.inicio && <p><span className="font-medium">Início:</span> {conflict.inicio}</p>}
                  {conflict.wikipedia_link && (
                    <a
                      href={conflict.wikipedia_link}
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
          );
        })}
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

