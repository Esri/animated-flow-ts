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
import VectorTileLayer from "esri/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import ImageryTileLayer from "esri/layers/ImageryTileLayer";
import esriConfig from "esri/config";
import Color from "esri/Color";

// Tell the worker frameworks the location of the modules.
esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "wind-es",
      location: location.origin + "/demos/js"
    }
  ]
};

// A vector tile layer is used as basemap.
const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

// The URL of an imagery tile layer.
const url =
  "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer";

// First, it is added as a layer in the map, and visualized as
// static arrows by the stock vector field renderer that ships
// with the ArcGIS API for JavaScript.
const imageryLayer = new ImageryTileLayer({ url });

// But then it is also used as data source for the custom `FlowLayer`.
const windLayer = new FlowLayer({
  url,
  effect: "bloom(1.5, 0.5px, 0.2)",
  useWebWorkers: true,
  color: new Color([60, 160, 220, 1])
} as any);

// Create the map with the three layers defined above.
const map = new EsriMap({
  layers: [vectorTileLayer, imageryLayer, windLayer]
});

// Create the map view.
new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-98, 39]
});
