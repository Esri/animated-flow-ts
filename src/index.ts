import Point from "esri/geometry/Point";
import { WorkerFlowTracer } from "./flow/meshing";
import { FlowVisualizationStyle } from "./flow/rendering";
import { ImageryTileLayerFlowSource } from "./flow/sources";
import SpatialReference from "esri/geometry/SpatialReference";
import esriConfig from "esri/config";
import Color from "esri/Color";
import { defined } from "./core/util";

esriConfig.workers.loaderConfig = {
  packages: [
    {
      name: "wind-es",
      location: location.origin + "/demos/js"
    }
  ]
};

const flow = new FlowVisualizationStyle(
  new ImageryTileLayerFlowSource(
    "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer",
    0.1
  ),
  new WorkerFlowTracer(),
  Color.fromRgb("rgba(60, 160, 220, 1)")
);

const div = document.createElement("div");

const width = 320;
const height = 180;

const glCanvas = document.createElement("canvas");
glCanvas.width = width;
glCanvas.height = height;
const gl = glCanvas.getContext("webgl", {
  preserveDrawingBuffer: true
});
defined(gl);
gl.getExtension("OES_element_index_uint");

flow.createImage(gl, new Point({ x: -98, y: 39, spatialReference: SpatialReference.WGS84 }), 0.05, width, height, "rgba(20, 30, 40, 1)", new AbortController().signal).then((image) => {
  div.appendChild(image);
});

document.body.appendChild(div);