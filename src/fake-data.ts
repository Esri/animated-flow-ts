/**
 * @module wind-es/main
 * 
 * The entry point of the app.
 * 
 * Create a WGS-84 map with a basemap and a wind layer.
 */

import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import { WindLayer } from "./wind/wind-layer";
import { AnalyticWindSource } from "./wind/wind-sources";

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

const center: [number, number] = [-98, 39];

const windLayer = new WindLayer({
  source: new AnalyticWindSource((x, y) => {
    x -= center[0];
    y -= center[1];
    const d2 = x * x + y * y;
    return [-y / d2, x / d2];
  }),
  effect: "bloom(1.1, 0.3px, 0.1)",
  useWebWorkers: true
} as any);

const map = new EsriMap({
  layers: [
    vectorTileLayer,
    windLayer
  ]
});

new MapView({
  container: "viewDiv",
  map: map,
  zoom: 4,
  center
});
