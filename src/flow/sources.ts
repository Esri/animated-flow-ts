/*
  Copyright 2021 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import Extent from "esri/geometry/Extent";
import ImageryTileLayer from "esri/layers/ImageryTileLayer";
import { Field, FlowData } from "./types";

export abstract class FlowSource {
  // TODO: Add support for AbortController?
  abstract fetchFlowData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<FlowData>;
  
  destroy(): void {
  }
}

export class ImageryTileLayerFlowSource {
  private imageryTileLayer: ImageryTileLayer;
  private magnitudeScale: number;

  constructor(url: string, magnitudeScale: number) {
    this.imageryTileLayer = new ImageryTileLayer({ url });
    this.magnitudeScale = magnitudeScale;
  }
  
  // TODO: Add support for devicePixelRatio?
  async fetchFlowData(extent: Extent, width: number, height: number, signal: AbortSignal): Promise<FlowData> {
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
        console.error(`Unsupported data type "${dataType}"; the ImageryTileLayerFlowSource class only suppors "vector-magdir" and "vector-uv".`);
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

export class VectorFieldFlowSource {
  constructor(private mapVectorField: Field) {
  }
  
  async fetchFlowData(extent: Extent, width: number, height: number): Promise<FlowData> {
    const pixelScale = 1;

    width = Math.round(width);
    height = Math.round(height);

    const data = new Float32Array(width * height * 2);

    for (let y = 0; y < height; y++) {
      const yMap = extent.ymin + (extent.ymax - extent.ymin) * (y / height);

      for (let x = 0; x < width; x++) {
        const xMap = extent.xmin + (extent.xmax - extent.xmin) * (x / width);
        const [u, v] = this.mapVectorField(xMap, yMap);
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
