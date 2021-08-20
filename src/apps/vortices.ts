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
 * @module animated-flow-ts/apps/vortices
 *
 * An app that defines a vector field analytically in map units
 * and uses it to drive a flow visualization.
 */

import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import VectorTileLayer from "esri/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import { VectorFieldFlowSource } from "../flow/sources";
import { Field, PixelsPerSecond } from "../flow/types";
import esriConfig from "esri/config";
import Color from "esri/Color";
import { MapUnits } from "../core/types";

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

// A vortex vector field.
function createVortex(vortexCenter: [MapUnits, MapUnits]): Field {
  return (x, y) => {
    x -= vortexCenter[0];
    y -= vortexCenter[1];
    const d2 = x * x + y * y;
    return [-10.0 * y / d2, -10.0 * x / d2];
  };
}

// We create 3 vortices over the US.
const vortex1 = createVortex([-98, 39]);
const vortex2 = createVortex([-98 + 20, 39]);
const vortex3 = createVortex([-98 - 10, 39 - 10]);

const windVectorField = (x: MapUnits, y: MapUnits): [PixelsPerSecond, PixelsPerSecond] => {
  const v1 = vortex1(x, y);
  const v2 = vortex2(x, y);
  const v3 = vortex3(x, y);

  // The three vortex velocity fields can be simply added together.
  return [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1]];
};

// The `FlowLayer` uses the analytic velocity field as data source.
const windLayer = new FlowLayer({
  source: new VectorFieldFlowSource(windVectorField),
  effect: "bloom(1.5, 0.5px, 0.2)",
  useWebWorkers: true,
  color: new Color([60, 220, 160, 1])
} as any);

// Create the map with the three layers defined above.
const map = new EsriMap({
  layers: [vectorTileLayer, windLayer]
});

// Create the map view.
new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-98, 39]
});
