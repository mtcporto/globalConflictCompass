
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CuratedConflictEntry, ConflictSeverityCategory } from '@/lib/types';

// Patch Leaflet's default icon path to prevent issues with bundlers
if (typeof window !== 'undefined') {
  if (!(L.Icon.Default.prototype as any)._iconUrlsPatched) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
      iconUrl: require('leaflet/dist/images/marker-icon.png').default,
      shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
    });
    (L.Icon.Default.prototype as any)._iconUrlsPatched = true;
  }
}

interface MapDisplayProps {
  conflicts: CuratedConflictEntry[];
}

// Dark theme color map for Leaflet elements
const leafletSeverityColorMap: Record<ConflictSeverityCategory, string> = {
  "Alta Gravidade": '#EF4444', // Red-500 (Vibrant Red)
  "Média Gravidade": '#F97316', // Orange-500 (Vibrant Orange)
  "Baixa Gravidade": '#EAB308', // Yellow-500 (Vibrant Yellow)
};

// Style for countries not directly involved in highlighted conflicts
const defaultCountryStyle = {
  fillColor: "#374151", // gray-700 (darker gray for non-conflict countries)
  weight: 0.7,
  opacity: 1,
  color: "#4B5563", // gray-600 (slightly lighter border for contrast)
  fillOpacity: 0.5
};

const WorldMapBounds = L.latLngBounds(
  L.latLng(-60, -180),
  L.latLng(85, 180)
);

const LegendControl = ({ severityMap }: { severityMap: Record<ConflictSeverityCategory, string> }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const legend = new (L.Control as any)({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend bg-card text-card-foreground p-2 rounded-md shadow-md text-xs border border-border");
      let labels = ['<strong class="text-sm font-medium block mb-1">Gravidade do Conflito</strong>'];
      (Object.keys(severityMap) as ConflictSeverityCategory[]).forEach(severityKey => {
        labels.push(
          `<i style="background:${severityMap[severityKey]}; width: 12px; height: 12px; display: inline-block; margin-right: 4px; border-radius: 50%; border: 1px solid hsl(var(--foreground) / 0.2);"></i> ${severityKey}`
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

function MapDisplayComponent({ conflicts }: MapDisplayProps) {
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [loadingGeoJson, setLoadingGeoJson] = useState(true);

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

  const validConflicts = useMemo(() =>
    conflicts.filter(
      (conflict) => conflict.coordenadas && typeof conflict.coordenadas[0] === 'number' && typeof conflict.coordenadas[1] === 'number'
    ), [conflicts]);

  const getCountryStyle = useCallback((feature: any) => {
    const countryName = feature.properties.name;
    const involvedConflicts = conflicts.filter(c =>
      c.envolvidos && Array.isArray(c.envolvidos) && c.envolvidos.some(loc =>
        loc.toLowerCase() === countryName.toLowerCase() ||
        loc.toLowerCase().includes(countryName.toLowerCase()) ||
        countryName.toLowerCase().includes(loc.toLowerCase())
      )
    );

    if (involvedConflicts.length > 0) {
      let highestSeverityCategory: ConflictSeverityCategory = "Baixa Gravidade"; // Default to lowest if categories don't match
      if (involvedConflicts.some(c => c.severityCategory === 'Alta Gravidade')) highestSeverityCategory = 'Alta Gravidade';
      else if (involvedConflicts.some(c => c.severityCategory === 'Média Gravidade')) highestSeverityCategory = 'Média Gravidade';
      
      return {
        fillColor: leafletSeverityColorMap[highestSeverityCategory] || defaultCountryStyle.fillColor,
        weight: 1,
        opacity: 1,
        color: leafletSeverityColorMap[highestSeverityCategory] ? '#FFF' : (defaultCountryStyle.color), // White border for highlighted countries for better contrast
        fillOpacity: 0.6 // Slightly more opaque for conflicted countries
      };
    }
    return defaultCountryStyle;
  }, [conflicts]);

  const onEachCountryFeature = useCallback((feature: any, layer: L.Layer) => {
    const countryName = feature.properties.name;
    const relatedConflicts = conflicts.filter(c =>
      c.envolvidos && Array.isArray(c.envolvidos) && c.envolvidos.some(loc =>
        loc.toLowerCase() === countryName.toLowerCase() ||
        loc.toLowerCase().includes(countryName.toLowerCase()) ||
        countryName.toLowerCase().includes(loc.toLowerCase())
      )
    );

    if (relatedConflicts.length > 0) {
      // Popup HTML will use Tailwind classes, assuming default Leaflet popup (light background)
      const popupContent = `
        <div class="text-sm">
          <h4 class="font-semibold text-base mb-1 text-slate-800">${countryName}</h4>
          <p class="font-medium text-slate-700">Conflitos Envolvidos:</p>
          <ul class="list-disc list-inside ml-1 text-xs text-slate-600">
            ${relatedConflicts.map(c => `<li>${c.nome} (Gravidade: ${c.severityCategory || 'N/A'})</li>`).join('')}
          </ul>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  }, [conflicts]);

  const mapCenter: L.LatLngTuple = [20, 0]; // Initial center of the map
  const initialMapZoom = 2; // Initial zoom level
  const minMapZoom = 2; // Prevents zooming out too much
  const maxMapZoom = 6; // Prevents zooming in too much

  if (loadingGeoJson) {
    return (
      <div className="h-[700px] w-full rounded-lg overflow-hidden shadow-md relative bg-gray-800 flex items-center justify-center">
        <p className="text-gray-400">Carregando dados do mapa geográfico...</p>
      </div>
    );
  }

  return (
    <div className="h-[700px] w-full rounded-lg overflow-hidden shadow-md relative" data-ai-hint={validConflicts.length > 0 ? "world map conflict dark" : "dark world map illustration"}>
      <MapContainer
        center={mapCenter}
        zoom={initialMapZoom}
        minZoom={minMapZoom}
        maxZoom={maxZoom}
        style={{ height: '100%', width: '100%', backgroundColor: '#0b192a' }} // Dark blue background for the map container
        scrollWheelZoom={true}
        dragging={true} // Allow dragging
        maxBounds={WorldMapBounds} // Restrict panning to the world bounds
        maxBoundsViscosity={1.0} // Makes bounds "hard"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_matter_nolabels/{z}/{x}/{y}{r}.png"
        />

        {countriesGeoJson && (
          <GeoJSON
            key={JSON.stringify(conflicts.map(c => ({ nome: c.nome, envolvidos: c.envolvidos, severityCategory: c.severityCategory})))} // Re-render if conflict data changes
            data={countriesGeoJson}
            style={getCountryStyle}
            onEachFeature={onEachCountryFeature}
          />
        )}

        {validConflicts.map((conflict) => {
          const severityCat = conflict.severityCategory || "Baixa Gravidade";
          const color = leafletSeverityColorMap[severityCat] || '#A0AEC0'; // Fallback color
          let radius = 6; // Default radius
          if (severityCat === "Alta Gravidade") radius = 10;
          else if (severityCat === "Média Gravidade") radius = 8;

          return (
            <CircleMarker
              key={conflict.nome + (conflict.territorio || '')}
              center={[conflict.coordenadas[0], conflict.coordenadas[1]]}
              radius={radius}
              pathOptions={{
                color: color, // Border color of the circle
                fillColor: color, // Fill color of the circle
                fillOpacity: 0.7, // Make circles a bit more prominent
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-sm max-w-xs">
                  <h4 className="font-semibold text-base mb-1 text-slate-800">{conflict.nome}</h4>
                  <p className="text-slate-700"><span className="font-medium">Gravidade:</span> {severityCat}</p>
                  <p className="text-slate-700"><span className="font-medium">Fatalidades:</span> {conflict.fatalidades_texto}</p>
                  {conflict.territorio && <p className="text-slate-700"><span className="font-medium">Território Específico:</span> {conflict.territorio}</p>}
                  {conflict.envolvidos && conflict.envolvidos.length > 0 && (
                    <p className="text-slate-700"><span className="font-medium">Envolvidos (Países/Grupos):</span> {conflict.envolvidos.join(', ')}</p>
                  )}
                  {conflict.inicio && <p className="text-slate-700"><span className="font-medium">Início:</span> {conflict.inicio}</p>}
                  {conflict.wikipedia_link && (
                    <a
                      href={conflict.wikipedia_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 hover:underline mt-1.5 block"
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
         <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-[1000]">
            <div className="text-slate-300 bg-slate-700/90 p-3 rounded-md shadow-lg text-center">
              <p className="text-base font-medium">Nenhum conflito com coordenadas para exibir no mapa.</p>
              <p className="text-xs opacity-90 mt-0.5">Os países envolvidos podem estar destacados.</p>
            </div>
          </div>
      )}
    </div>
  );
}

export default React.memo(MapDisplayComponent);

    