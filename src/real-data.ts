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
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

const url = "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer";

const imageryLayer = new ImageryTileLayer({ url });

const windLayer = new WindLayer({
  url,
  effect: "bloom(1.1, 0.3px, 0.1)",
  useWebWorkers: true
} as any);

const map = new EsriMap({
  layers: [
    vectorTileLayer,
    imageryLayer,
    windLayer
  ]
});

new MapView({
  container: "viewDiv",
  map: map,
  zoom: 4,
  center: [-98, 39]
});
