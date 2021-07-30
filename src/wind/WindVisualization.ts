import Extent from "@arcgis/core/geometry/Extent";
import { VisualizationRenderParams } from "../base/types";
import Visualization from "../base/Visualization";

export default class WindVisualization extends Visualization {
  constructor(extent: Extent, resolution: number) {
    super(extent, resolution);
  }

  attach(gl: WebGLRenderingContext): void {
    console.log("attach", gl);
  }

  render(gl: WebGLRenderingContext, params: VisualizationRenderParams): void {
    gl.clearColor(0.2, 0.3, 0.5, params.opacity);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  
  detach(gl: WebGLRenderingContext): void {
    console.log("detach", gl);
  }
}