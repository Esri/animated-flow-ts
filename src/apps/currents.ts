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
 import { FlowLayer } from "../flow/layer";
 import esriConfig from "esri/config";
//  import GroupLayer from "esri/layers/GroupLayer";
//  import FeatureLayer from "esri/layers/FeatureLayer";
import TileLayer from "esri/layers/TileLayer";
import Color from "esri/Color";
import { VectorFieldFlowSource } from "../flow/sources";
import { MapUnits } from "../core/types";
import { Field, PixelsPerSecond } from "../flow/types";
 
 // Tell the worker frameworks the location of the modules.
 esriConfig.workers.loaderConfig = {
   packages: [
     {
       name: "animated-flow-ts",
       location: location.origin + "/demos/js"
     }
   ]
 };
 
 // A tile layer is used as basemap.
 const tileLayer = new TileLayer({
   url: "https://tiles.arcgis.com/tiles/nGt4QxSblgDfeJn9/arcgis/rest/services/Spilhaus_Vibrant_Basemap/MapServer",
   effect: "saturate(10%) brightness(0.3)"
 });
 
//  // TODO: Change this.
//  const temperatureLayer = new FeatureLayer({
//    url: "https://services.arcgis.com/DO4gTjwJVIJ7O9Ca/arcgis/rest/services/Unacast_Latest_Available__Visitation_and_Distance_/FeatureServer",
//    effect: "blur(10px)"
//  });
 
//  // The `FlowLayer` uses an imagery tile layer as data source.
//  const windLayer = new FlowLayer({
//    url: "https://tiledimageservices.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/NLDAS2011_daily_wind_uv/ImageServer",
//    useWebWorkers: true,
//    blendMode: "destination-in"
//  } as any);
 
//  // We create a group layer to combine temperature and wind in a single visualization
//  // where the temperature drives the color of the streamlines.
//  const groupLayer = new GroupLayer({
//    effect: "bloom(1.5, 0.5px, 0.2)"
//  });
//  groupLayer.add(temperatureLayer);
//  groupLayer.add(windLayer);
 
// // Create the map with the three layers defined above.
// const map = new EsriMap({
//   layers: [tileLayer, groupLayer]
// });




// A vortex vector field.
function createVortex(vortexCenter: [MapUnits, MapUnits]): Field {
  return (x, y) => {
    x -= vortexCenter[0];
    y -= vortexCenter[1];
    const d2 = x * x + y * y;
    return [-1000000.0 * y / d2, -1000000.0 * x / d2];
  };
}

// We create 3 vortices over the US.
const vortex1 = createVortex([-10000000, 4000000]);
const vortex2 = createVortex([-20000000, -6000000]);
const vortex3 = createVortex([1000000, 0]);

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
  opacity: 0.7,
  useWebWorkers: true,
  color: new Color([255, 100, 80, 1])
} as any);

const map = new EsriMap({
  layers: [tileLayer, windLayer]
});





// Create the map view.
new MapView({
  container: "viewDiv",
  map,
  zoom: 2,
  center: [-98, 39]
});
 