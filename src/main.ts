import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";

import WindLayer from "./wind/Layer";

const vectorTileLayer = new VectorTileLayer({
  // url: "https://www.arcgis.com/sharing/rest/content/items/13100ed96b7a4e18b9a7c024c56910aa/resources/styles/root.json"
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json?f=pjson"
});
const windLayer = new WindLayer({
  effect: "bloom(1.5, 0.5px, 0.1)"
} as any);
// windLayer.opacity = 0.6;

const map = new EsriMap({
  // basemap: "topo-vector",
  layers: [vectorTileLayer, windLayer]
});

const view = new MapView({
  container: "viewDiv",
  map: map,
  // zoom: 4,
  // center: [11, 44] // longitude, latitude
  zoom: 5,
  center: [-98, 39]
});

console.log(view);