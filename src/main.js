import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import WindLayer from "./WindLayer";

const windLayer = new WindLayer();

const map = new EsriMap({
  basemap: "topo-vector",
  layers: [windLayer]
});

const view = new MapView({
  container: "viewDiv",
  map: map,
  zoom: 4,
  center: [15, 65] // longitude, latitude
});