import Extent from "@arcgis/core/geometry/Extent";
import { VisualizationRenderParams } from "./types";

export default abstract class Visualization {
  constructor(private _extent: Extent, private _resolution: number) {
  }

  protected extent(): Extent {
    return this._extent;
  }

  protected resolution(): number {
    return this._resolution;
  }

  abstract attach(gl: WebGLRenderingContext): void;
  abstract render(gl: WebGLRenderingContext, params: VisualizationRenderParams): void;
  abstract detach(gl: WebGLRenderingContext): void;
}