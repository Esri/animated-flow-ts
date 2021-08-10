/*
  Copyright 2021 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/**
 * @module wind-es/apps/winds
 *
 * An app that uses real magnitude/direction wind data from an imagery tile layer.
 */

import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
// import VectorTileLayer from "esri/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import ImageryTileLayer from "esri/layers/ImageryTileLayer";
import esriConfig from "esri/config";

esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "wind-es",
      location: location.origin + "/demos/js"
    }
  ]
};

// const vectorTileLayer = new VectorTileLayer({
//   url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
// });

const url =
  "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer";

const imageryLayer = new ImageryTileLayer({ url });

const windLayer = new FlowLayer({
  url,
  effect: "bloom(1.1, 0.3px, 0.1)",
  useWebWorkers: true
} as any);

const map = new EsriMap({
  layers: [
    // vectorTileLayer, 
    imageryLayer, windLayer]
});

new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-98, 39]
});
