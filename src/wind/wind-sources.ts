import Extent from "@arcgis/core/geometry/Extent";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
import { WindData } from "./wind-types";

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