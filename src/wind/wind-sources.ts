import Extent from "@arcgis/core/geometry/Extent";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
import { Field, WindData } from "./wind-types";

export abstract class WindSource {
  // TODO: Add support for AbortController?
  abstract fetchWindData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<WindData>;
  
  destroy(): void {
  }
}

export class ImageryTileLayerWindSource {
  private imageryTileLayer: ImageryTileLayer;
  private magnitudeScale: number;

  constructor(url: string, magnitudeScale: number) {
    this.imageryTileLayer = new ImageryTileLayer({ url });
    this.magnitudeScale = magnitudeScale;
  }
  
  // TODO: Add support for devicePixelRatio?
  async fetchWindData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<WindData> {
    // TODO! Do I even want this? Probably yes?
    const pixelScale = 1.0; // /* TODO: Dinamically?

    await this.imageryTileLayer.load(signal);
    const dataType = this.imageryTileLayer.rasterInfo.dataType;
    // TODO Chech for aborted?
    const rasterData = await this.imageryTileLayer.fetchPixels(extent, Math.round(width * pixelScale), Math.round(height * pixelScale), { signal });
    // TODO Chech for aborted?
    const pixelBlock = rasterData.pixelBlock;

    const actualWidth = pixelBlock.width;
    const actualHeight = pixelBlock.height;
    const data = new Float32Array(actualWidth * actualHeight * 2);
  
    for (let i = 0; i < actualWidth * actualHeight; i++) {
      let u: number;
      let v: number;

      if (dataType === "vector-magdir") {
        const mag = pixelBlock.pixels[0]![i]! * this.magnitudeScale;
        const dir = Math.PI * pixelBlock.pixels[1]![i]! / 180;
        const co = Math.cos(dir);
        const si = Math.sin(dir);
        u = co * mag + si * mag;
        v = -si * mag + co * mag;
      } else if (dataType === "vector-uv") {
        u = pixelBlock.pixels[0]![i]! / this.magnitudeScale;
        v = pixelBlock.pixels[1]![i]! / this.magnitudeScale;
      } else {
        console.error(`Unsupported data type "${dataType}"; the ImageryTileLayerWindSource class only suppors "vector-magdir" and "vector-uv".`);
        u = 0;
        v = 0;
      }

      data[2 * i + 0] = u;
      data[2 * i + 1] = v;
    }

    return {
      data,
      width: actualWidth,
      height: actualHeight,
      pixelScale
    };
  }
  
  destroy(): void {
    this.imageryTileLayer.destroy();
  }
}

export class AnalyticWindSource {
  constructor(private mapField: Field) {
  }
  
  async fetchWindData(extent: Extent, width: number, height: number): Promise<WindData> {
    const pixelScale = 1;

    width = Math.round(width);
    height = Math.round(height);

    const data = new Float32Array(width * height * 2);

    for (let y = 0; y < height; y++) {
      const yMap = extent.ymin + (extent.ymax - extent.ymin) * (y / height);

      for (let x = 0; x < width; x++) {
        const xMap = extent.xmin + (extent.xmax - extent.xmin) * (x / width);
        const [u, v] = this.mapField(xMap, yMap);
        data[2 * ((height - 1 - y) * width + x) + 0] = u;
        data[2 * ((height - 1 - y) * width + x) + 1] = v;
      }
    }
  
    return {
      data,
      width,
      height,
      pixelScale
    };
  }
}
