/**
 * @module wind-es/fake-data
 * 
 * An app that uses fake wind data provided by a vector field
 * defined analytically in map units.
 */

import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import { WindLayer } from "./wind/wind-layer";
import { AnalyticWindSource } from "./wind/wind-sources";
import { Field } from "./wind/wind-types";

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

const center: [number, number] = [0, 0];//[-98, 39];

function createVortex(vortexCenter: [number, number]): Field {
  return (x, y) => {
    x -= vortexCenter[0];
    y -= vortexCenter[1];
    const d2 = x * x + y * y;
    return [-y / d2, x / d2];
  };
}

const vortex1 = createVortex([0, 0]);
const vortex2 = createVortex([20, 0]);
const vortex3 = createVortex([-10, -10]);

const winds = (x: number, y: number): [number, number] => {
  const v1 = vortex1(x, y);
  const v2 = vortex2(x, y);
  const v3 = vortex3(x, y);
  return [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1]];
};

const windLayer = new WindLayer({
  source: new AnalyticWindSource(winds),
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
  center
});
