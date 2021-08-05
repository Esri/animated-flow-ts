/**
 * @module wind-es/real-data
 * 
 * An app that uses real wind data from an imagery tile layer.
 */

import EsriMap from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import { WindLayer } from "./wind/wind-layer";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
// import Extent from "@arcgis/core/geometry/Extent";
// import { defined } from "./util";

const vectorTileLayer = new VectorTileLayer({
  url: "https://www.arcgis.com/sharing/rest/content/items/55253142ea534123882314f0d880ddab/resources/styles/root.json"
});

const url = "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer";

const imageryLayer = new ImageryTileLayer({
  url,
  effect: "blur(5px)"
});

// imageryLayer.load().then(() => {
//   imageryLayer.fetchPixels(new Extent({ xmin: -118 - 5, xmax: -118 + 5, ymin: 34 - 5, ymax: 34 + 5 }), 200, 200).then((data) => {
//     console.log("data", data);

//     const { pixelBlock } = data;

//     const pixels = pixelBlock.pixels[0];
//     const imageData = new ImageData(pixelBlock.width, pixelBlock.height);

//     for (let i = 0; i < pixels.length; i++) {
//       imageData.data[4 * i + 0] = pixels[i] * 20;
//       imageData.data[4 * i + 1] = 0;
//       imageData.data[4 * i + 2] = 0;
//       imageData.data[4 * i + 3] = 255;
//     }

//     const canvas = document.createElement("canvas");
//     canvas.width = pixelBlock.width;
//     canvas.height = pixelBlock.height;
//     canvas.style.border = "1px solid black";
//     const ctx = canvas.getContext("2d");
//     defined(ctx);
//     ctx.putImageData(imageData, 0, 0);
//     document.body.appendChild(canvas);
//   });
// });

imageryLayer.opacity = 0.5;

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
