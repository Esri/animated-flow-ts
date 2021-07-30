import Extent from "@arcgis/core/geometry/Extent";

export abstract class Resources {
  abstract attach(gl: WebGLRenderingContext): void;
  abstract detach(gl: WebGLRenderingContext): void;
}

export abstract class SharedResources extends Resources {
}

export abstract class LocalResources extends Resources {
  private _size: [number, number];

  constructor(private _extent: Extent, private _resolution: number) {
    super();
    
    this._size = [
      Math.round((_extent.xmax - _extent.xmin) / _resolution),
      Math.round((_extent.ymax - _extent.ymin) / _resolution)
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
}