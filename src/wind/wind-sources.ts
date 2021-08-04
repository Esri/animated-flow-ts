import Extent from "@arcgis/core/geometry/Extent";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
import { Field, WindData } from "./wind-types";

export abstract class WindSource {
  abstract fetchWindData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<WindData>;
  
  destroy(): void {
  }
}

export class ImageryTileLayerWindSource {
  private imageryTileLayer: ImageryTileLayer;

  constructor(url: string) {
    this.imageryTileLayer = new ImageryTileLayer({ url });
  }
  
  async fetchWindData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<WindData> {
    // TODO! Do I even want this? Probably yes?
    const pixelScale = 1.0; // /* TODO: Dinamically?

    await this.imageryTileLayer.load(signal);
    const rasterData = await this.imageryTileLayer.fetchPixels(extent, Math.round(width * pixelScale), Math.round(height * pixelScale), { signal });
    const pixelBlock = rasterData.pixelBlock;

    const actualWidth = pixelBlock.width;
    const actualHeight = pixelBlock.height;
    const data = new Float32Array(actualWidth * actualHeight * 2);
  
    for (let i = 0; i < actualWidth * actualHeight; i++) {
      // TODO! Make this configurable.
      const mag = pixelBlock.pixels[0]![i]! / 10; // TODO?
      const dir = Math.PI * pixelBlock.pixels[1]![i]! / 180; // TODO?
  
      const co = Math.cos(dir);
      const si = Math.sin(dir);
      const u = co * mag + si * mag;
      const v = -si * mag + co * mag;
      
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
        data[2 * (y * width + x) + 0] = u;
        data[2 * (y * width + x) + 1] = v;
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
