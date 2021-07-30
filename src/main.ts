import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";

import WindLayer from "./wind/Layer";

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/13100ed96b7a4e18b9a7c024c56910aa/resources/styles/root.json"
});
const windLayer = new WindLayer();
windLayer.opacity = 0.6;

const map = new EsriMap({
  // basemap: "topo-vector",
  layers: [vectorTileLayer, windLayer]
});

const view = new MapView({
  container: "viewDiv",
  map: map,
  zoom: 3,
  center: [0, 0] // longitude, latitude
});

console.log(view);