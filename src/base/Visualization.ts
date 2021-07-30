import Extent from "@arcgis/core/geometry/Extent";
import { VisualizationRenderParams } from "./types";

export default abstract class Visualization {
  private _size: [number, number];

  constructor(private _extent: Extent, private _resolution: number) {
    this._size = [
      (_extent.xmax - _extent.xmin) / _resolution,
      (_extent.ymax - _extent.ymin) / _resolution
    ];
  }

  get extent(): Extent {
    return this._extent;
  }

  get resolution(): number {
    return this._resolution;
  }
  
  get size(): [number, number] {
    return this._size;
  }

  abstract attach(gl: WebGLRenderingContext): void;
  abstract render(gl: WebGLRenderingContext, params: VisualizationRenderParams): void;
  abstract detach(gl: WebGLRenderingContext): void;
}