
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CuratedConflictEntry, ConflictSeverityCategory } from '@/lib/types';

// Patch Leaflet's default icon path
if (typeof window !== 'undefined') {
  // Ensure the patch runs only once, even with HMR
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

const leafletSeverityColorMap: Record<ConflictSeverityCategory, string> = {
  "Alta Gravidade": '#EF4444', // red-500
  "Média Gravidade": '#F97316', // orange-500
  "Baixa Gravidade": '#EAB308', // yellow-500
};

const defaultCountryStyle = {
  fillColor: "hsl(var(--muted))",
  weight: 0.5,
  opacity: 1,
  color: "hsl(var(--border))",
  fillOpacity: 0.3
};

const WorldMapBounds = L.latLngBounds(
  L.latLng(-60, -180), // Adjusted south latitude to prevent too much Antarctic view
  L.latLng(85, 180)     // North latitude
);

const LegendControl = ({ severityMap }: { severityMap: Record<ConflictSeverityCategory, string> }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const legend = new (L.Control as any)({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend bg-card text-card-foreground p-2 rounded-md shadow-md text-xs border border-border");
      let labels = ['<strong class="text-sm font-medium">Gravidade do Conflito</strong>'];
      (Object.keys(severityMap) as ConflictSeverityCategory[]).forEach(severityKey => {
        labels.push(
          `<i style="background:${severityMap[severityKey]}; width: 12px; height: 12px; display: inline-block; margin-right: 4px; border-radius: 50%; border: 1px solid hsl(var(--foreground) / 0.5);"></i> ${severityKey}`
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
      let highestSeverityCategory: ConflictSeverityCategory = "Baixa Gravidade";
      if (involvedConflicts.some(c => c.severityCategory === 'Alta Gravidade')) highestSeverityCategory = 'Alta Gravidade';
      else if (involvedConflicts.some(c => c.severityCategory === 'Média Gravidade')) highestSeverityCategory = 'Média Gravidade';

      return {
        fillColor: leafletSeverityColorMap[highestSeverityCategory] || defaultCountryStyle.fillColor,
        weight: 1,
        opacity: 1,
        color: 'hsl(var(--foreground) / 0.7)',
        fillOpacity: 0.4
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
  }, [conflicts]);

  const mapCenter: L.LatLngTuple = [20, 0];
  const initialMapZoom = 2;
  const minMapZoom = 2;
  const maxMapZoom = 6;

  if (loadingGeoJson) {
    return (
      <div className="h-[700px] md:h-[700px] w-full rounded-lg overflow-hidden shadow-md relative bg-muted/30 flex items-center justify-center">
        <p className="text-muted-foreground">Carregando dados do mapa geográfico...</p>
      </div>
    );
  }

  return (
    <div className="h-[700px] md:h-[700px] w-full rounded-lg overflow-hidden shadow-md relative" data-ai-hint={validConflicts.length > 0 ? "world map conflict hotspots" : "world map illustration"}>
      <MapContainer
        center={mapCenter}
        zoom={initialMapZoom}
        minZoom={minMapZoom}
        maxZoom={maxMapZoom}
        maxBounds={WorldMapBounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
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
          const color = leafletSeverityColorMap[severityCat] || '#A0AEC0'; // Gray-500
          let radius = 4;
          if (severityCat === "Alta Gravidade") radius = 7;
          else if (severityCat === "Média Gravidade") radius = 5.5;

          return (
            <CircleMarker
              key={conflict.nome + (conflict.territorio || '')}
              center={[conflict.coordenadas[0], conflict.coordenadas[1]]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
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
                      className="text-primary hover:text-primary/80 hover:underline mt-1.5 block"
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
