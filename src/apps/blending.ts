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
 * @module animated-flow-ts/apps/winds
 *
 * An app that uses real UV wind data from an imagery tile layer and combines
 * using blend modes with another layer.
 */

import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import VectorTileLayer from "esri/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import esriConfig from "esri/config";
import GroupLayer from "esri/layers/GroupLayer";
import FeatureLayer from "esri/layers/FeatureLayer";

// Tell the worker frameworks the location of the modules.
esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "animated-flow-ts",
      location: location.origin + "/demos/js"
    }
  ]
};

// A vector tile layer is used as basemap.
const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

// TODO: This should be a "temperature" layer.
const temperatureLayer = new FeatureLayer({
  url: "https://services.arcgis.com/DO4gTjwJVIJ7O9Ca/arcgis/rest/services/Unacast_Latest_Available__Visitation_and_Distance_/FeatureServer",
  effect: "blur(10px)"
});

// The `FlowLayer` uses an imagery tile layer as data source.
const windLayer = new FlowLayer({
  url: "https://tiledimageservices.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/NLDAS2011_daily_wind_uv/ImageServer",
  useWebWorkers: true,
  blendMode: "destination-in"
} as any);

// We create a group layer to combine temperature and wind in a single visualization
// where the temperature drives the color of the streamlines.
const groupLayer = new GroupLayer({
  effect: "bloom(1.5, 0.5px, 0.2)"
});
groupLayer.add(temperatureLayer);
groupLayer.add(windLayer);

// Create the map with the three layers defined above.
const map = new EsriMap({
  layers: [vectorTileLayer, groupLayer]
});

// Create the map view.
new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-98, 39]
});
