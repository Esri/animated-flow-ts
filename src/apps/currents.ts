/**
 * @module wind-es/apps/currents
 * 
 * An app that uses real wind data from an imagery tile layer.
 */

import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

const url = "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer";

const imageryLayer = new ImageryTileLayer({ url });

const currentsLayer = new FlowLayer({
  url,
  effect: "bloom(1.1, 0.3px, 0.1)",
  useWebWorkers: true
} as any);

const map = new EsriMap({
  layers: [
    vectorTileLayer,
    imageryLayer,
    currentsLayer
  ]
});

new MapView({
  container: "viewDiv",
  map: map,
  zoom: 4,
  center: [-98, 39]
});
