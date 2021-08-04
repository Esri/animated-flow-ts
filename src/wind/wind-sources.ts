import Extent from "@arcgis/core/geometry/Extent";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
import { WindData } from "./wind-types";

const MIN_WEIGHT_THRESHOLD = 0.001;

export abstract class WindSource {
  abstract fetchWindData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<WindData>;
  
  destroy(): void {
  }
}

function smooth(data: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const horizontal = new Float32Array(data.length);

  const halfRadius = Math.round(3 * sigma);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = -halfRadius; d <= halfRadius; d++) {
        if (x + d < 0 || x + d >= width) {
          continue;
        }

        const weight = Math.exp(-d * d / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * data[2 * (y * width + (x + d)) + 0]!;
        s1 += weight * data[2 * (y * width + (x + d)) + 1]!;
      }

      horizontal[2 * (y * width + x) + 0] = totalWeight < MIN_WEIGHT_THRESHOLD ? 0 : (s0 / totalWeight);
      horizontal[2 * (y * width + x) + 1] = totalWeight < MIN_WEIGHT_THRESHOLD ? 0 : (s1 / totalWeight);
    }
  }

  const final = new Float32Array(data.length);
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = -halfRadius; d <= halfRadius; d++) {
        if (y + d < 0 || y + d >= height) {
          continue;
        }

        const weight = Math.exp(-d * d / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * horizontal[2 * ((y + d) * width + x) + 0]!;
        s1 += weight * horizontal[2 * ((y + d) * width + x) + 1]!;
      }

      final[2 * (y * width + x) + 0] = totalWeight < MIN_WEIGHT_THRESHOLD ? 0 : (s0 / totalWeight);
      final[2 * (y * width + x) + 1] = totalWeight < MIN_WEIGHT_THRESHOLD ? 0 : (s1 / totalWeight);
    }
  }

  return final;
}

export class ImageryTileLayerWindSource {
  private imageryTileLayer: ImageryTileLayer;

  constructor(url: string) {
    this.imageryTileLayer = new ImageryTileLayer({ url });
  }
  
  async fetchWindData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<WindData> {
    const pixelScale = 1.0; // /* TODO: Dinamically?

    await this.imageryTileLayer.load(signal);
    const rasterData = await this.imageryTileLayer.fetchPixels(extent, Math.round(width * pixelScale), Math.round(height * pixelScale), { signal });
    const pixelBlock = rasterData.pixelBlock;

    const actualWidth = pixelBlock.width;
    const actualHeight = pixelBlock.height;
    const rawData = new Float32Array(actualWidth * actualHeight * 2);
  
    for (let i = 0; i < actualWidth * actualHeight; i++) {
      // TODO! Make this configurable.
      const mag = pixelBlock.pixels[0]![i]! / 10; // TODO?
      const dir = Math.PI * pixelBlock.pixels[1]![i]! / 180; // TODO?
  
      const co = Math.cos(dir);
      const si = Math.sin(dir);
      const u = co * mag + si * mag;
      const v = -si * mag + co * mag;
      
      rawData[2 * i + 0] = u;
      rawData[2 * i + 1] = v;
    }
    
    const smoothing = 10;

    const data = smooth(rawData, actualWidth, actualHeight, smoothing);

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