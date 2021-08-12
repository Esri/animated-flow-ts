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

/**
 * @module wind-es/flow/sources
 *
 * This module...
 */

import Extent from "esri/geometry/Extent";
import ImageryTileLayer from "esri/layers/ImageryTileLayer";
import { Field, FlowData, FlowSource } from "./types";

export class ImageryTileLayerFlowSource implements FlowSource {
  private imageryTileLayer: ImageryTileLayer;

  constructor(url: string) {
    this.imageryTileLayer = new ImageryTileLayer({ url });
  }

  // TODO: Add support for devicePixelRatio?
  async fetchFlowData(extent: Extent, width: number, height: number, cellSize: number, signal: AbortSignal): Promise<FlowData> {
    const columns = Math.round(width / cellSize);
    const rows = Math.round(height / cellSize);

    await this.imageryTileLayer.load(signal);
    const dataType = this.imageryTileLayer.rasterInfo.dataType;
    const rasterData = await this.imageryTileLayer.fetchPixels(
      extent,
      columns,
      rows,
      { signal }
    );
    const pixelBlock = rasterData.pixelBlock;
    const data = new Float32Array(columns * rows * 2);

    for (let i = 0; i < columns * rows; i++) {
      let u: number;
      let v: number;

      if (dataType === "vector-magdir") {
        const mag = pixelBlock.pixels[0]![i]!;
        const dir = (Math.PI * pixelBlock.pixels[1]![i]!) / 180;
        const co = Math.cos(dir);
        const si = Math.sin(dir);
        u = co * mag + si * mag;
        v = -si * mag + co * mag;
      } else if (dataType === "vector-uv") {
        u = pixelBlock.pixels[0]![i]!;
        v = pixelBlock.pixels[1]![i]!;
      } else {
        console.error(
          `Unsupported data type "${dataType}"; the ImageryTileLayerFlowSource class only suppors "vector-magdir" and "vector-uv".`
        );
        u = 0;
        v = 0;
      }

      data[2 * i + 0] = u;
      data[2 * i + 1] = v;
    }

    return {
      data,
      columns,
      rows,
      cellSize
    };
  }

  destroy(): void {
    this.imageryTileLayer.destroy();
  }
}

export class VectorFieldFlowSource implements FlowSource {
  constructor(private mapVectorField: Field) {
  }

  async fetchFlowData(extent: Extent, width: number, height: number, cellSize: number): Promise<FlowData> {
    const columns = Math.round(width / cellSize);
    const rows = Math.round(height / cellSize);

    const data = new Float32Array(columns * rows * 2);

    for (let i = 0; i < rows; i++) {
      const y = i * cellSize;
      const yMap = extent.ymax + (extent.ymin - extent.ymax) * (y / height);

      for (let j = 0; j < columns; j++) {
        const x = j * cellSize;
        const xMap = extent.xmin + (extent.xmax - extent.xmin) * (x / width);
        const [u, v] = this.mapVectorField(xMap, yMap);
        data[2 * (i * columns + j) + 0] = u;
        data[2 * (i * columns + j) + 1] = v;
      }
    }

    return {
      data,
      columns,
      rows,
      cellSize
    };
  }

  destroy(): void {
  }
}
