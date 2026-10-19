"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
const MAPLIBRE_CSS = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css";
const MAPLIBRE_JS = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const LEAFLET_PLUGIN_JS = "https://cdn.jsdelivr.net/npm/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js";

let scriptsPromise: Promise<void> | undefined;

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-map-script="${url}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.mapScript = url;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
}

function ensureMapLibre(): Promise<void> {
  if (!document.querySelector('link[data-openfreemap-css]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = MAPLIBRE_CSS;
    css.dataset.openfreemapCss = "true";
    document.head.appendChild(css);
  }
  scriptsPromise ??= loadScript(MAPLIBRE_JS).then(() => loadScript(LEAFLET_PLUGIN_JS)).catch(error => {
    scriptsPromise = undefined;
    throw error;
  });
  return scriptsPromise;
}

/** Vector basemap under the existing Leaflet GeoJSON and conflict markers. */
export default function OpenFreeMapLayer() {
  const map = useMap();
  useEffect(() => {
    let disposed = false;
    let layer: L.Layer | undefined;
    ensureMapLibre().then(() => {
      if (disposed) return;
      const factory = (L as typeof L & { maplibreGL?: (options: { style: string; attribution: string }) => L.Layer }).maplibreGL;
      if (!factory) throw new Error("MapLibre Leaflet adapter unavailable");
      layer = factory({
        style: STYLE_URL,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | <a href="https://openfreemap.org/">OpenFreeMap</a>',
      });
      layer.addTo(map);
    }).catch(error => console.error("OpenFreeMap basemap could not load:", error));
    return () => {
      disposed = true;
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [map]);
  return null;
}
