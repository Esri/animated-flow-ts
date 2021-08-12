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
 * @module wind-es/apps/currents
 *
 * An app that uses real UV ocean current data from an imagery tile layer.
 */

import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import VectorTileLayer from "esri/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import { VectorFieldFlowSource } from "../flow/sources";
import { Field } from "../flow/types";
import esriConfig from "esri/config";
import ImageryLayer from "esri/layers/ImageryLayer";
import GroupLayer from "esri/layers/GroupLayer";

esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "wind-es",
      location: location.origin + "/demos/js"
    }
  ]
};

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

function createVortex(vortexCenter: [number, number]): Field {
  return (x, y) => {
    x -= vortexCenter[0];
    y -= vortexCenter[1];
    const d2 = x * x + y * y;
    return [-y / d2, x / d2];
  };
}

const vortex1 = createVortex([-57, 38]);
const vortex2 = createVortex([-70, 34]);
const vortex3 = createVortex([-77, 30]);

const currentsVectorField = (x: number, y: number): [number, number] => {
  const v1 = vortex1(x, y);
  const v2 = vortex2(x, y);
  const v3 = vortex3(x, y);
  return [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1]];
};

const currentsLayer = new FlowLayer({
  source: new VectorFieldFlowSource(currentsVectorField),
  useWebWorkers: true
} as any);

const temperatureLayer = new ImageryLayer({
  url: "https://gis.ngdc.noaa.gov/arcgis/rest/services/PathfinderSST_monthly_averages/ImageServer",
  blendMode: "multiply"
});

const groupLayer = new GroupLayer({
  effect: "bloom(1.5, 0.5px, 0.2)"
});
groupLayer.add(currentsLayer);
groupLayer.add(temperatureLayer);

const map = new EsriMap({
  layers: [vectorTileLayer, groupLayer]
});

new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-65, 37]
});
