/**
 * @module wind-es/apps/vortices
 * 
 * An app that defines a vector field analytically in map units
 * and uses it to drive a flow visualization.
 */

import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import VectorTileLayer from "esri/layers/VectorTileLayer";
import { FlowLayer } from "../flow/layer";
import { VectorFieldFlowSource } from "../flow/sources";
import { Field } from "../flow/types";
import esriConfig from "esri/config";

esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "js",
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

const vortex1 = createVortex([-98, 39]);
const vortex2 = createVortex([-98 + 20, 39]);
const vortex3 = createVortex([-98 - 10, 39 - 10]);

const windVectorField = (x: number, y: number): [number, number] => {
  const v1 = vortex1(x, y);
  const v2 = vortex2(x, y);
  const v3 = vortex3(x, y);
  return [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1]];
};

const windLayer = new FlowLayer({
  // TODO: Analytic is a bad name
  source: new VectorFieldFlowSource(windVectorField),
  effect: "bloom(1.1, 0.3px, 0.1)",
  useWebWorkers: true
} as any);

const map = new EsriMap({
  layers: [
    vectorTileLayer,
    windLayer
  ]
});

new MapView({
  container: "viewDiv",
  map: map,
  zoom: 4,
  center: [-98, 39]
});
