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
 * @module wind-es/flow/types
 *
 * This module contains simple type definitions used by the `flow` visualization.
 */

 export type Cells = number;
 export type PixelsPerSecond = number;
 export type PixelsPerCell = number;

// /**
//  * Method `ImageryTileLayer.fetchPixels()` returns a block of "pixels" into the
//  * property `pixelBlock` of the fetched raster data object. From the perspective
//  * of wind-es, the returned data is not really in "pixels" because very often
//  * for efficiency reason it will be worthed query the service at a lower resolution
//  * than the screen. For this reason, wind-es regards the result as a matrix of
//  * "cells" rather than pixels, and instead of the terms "width" and "height" uses
//  * the terms "columns" and "rows".
//  */
// export type CellBlock = {
//   /**
//    * The number of columns in the block.
//    */
//   columns: Cells;

//   /**
//    * The number of rows in the block.
//    */
//   rows: Cells;

//   /**
//    * The cell data.
//    *
//    * Cell data is stored:
//    *
//    * - Linearly;
//    * - One scanline at a time, starting from the top scanline;
//    * - In separated channels.
//    *
//    * The first index into the `cells` multidimensional array
//    * specifies the channel, while the second index specifies
//    * a scalar cell value.
//    *
//    * As an example, consider a MagDir raster as returned by a
//    * query to an image server.
//    *
//    * Here are some examples.
//    *
//    * - cells[0][0] is the first cell of the magnitude channel;
//    * - cells[1][0] is the first cell of the direction channel;
//    * - cells[0][columns - 1] is the last cell of the first (top)
//    *   scanline of the magnitude channel;
//    * - cells[0][columns * rows - 1] is the last cell of the
//    *   last (bottom) scanline of the magnitude channel.
//    */
//   cells: number[][];
// };

/**
 * A vertex of a flow line, as returned by The `trace()` function in
 * module `wind-es/flow/shared.
 *
 * A flow line is a polyline where each vertex is timestamped in seconds.
 */
export type FlowLineVertex = {
  /**
   * The position of the vertex, in pixels.
   */
  position: [Pixels, Pixels];

  /**
   * The timestamp associated to this position, in seconds.
   *
   * Timestamps are used to animate flow; the first vertex is
   * associated to timestamp 0 and the last one is timestamped
   * with the time that it takes the flow to complete one run
   * through the line. Note that this is not the period of the
   * animation; after the flow has started exiting the end of
   * the polyline, we wait an extended period of time to allow
   * for the trail to fully fade.
   */
  time: Seconds;
};

/**
 * The mesh data as returned by createFlowLinesMesh...
 */
export type FlowLinesMesh = {
  vertexData: Float32Array;
  indexData: Uint32Array;
};

/**
 * A 2D vector field.
 */
export type Field = (x: number, y: number) => [number, number];

/**
 * A 2D grid of horizontal and vertical speeds in screen space.
 */
export type FlowData = {
  /**
   * Horizontal and vertical speeds.
   * 
   * The speeds are stored interleaved, row major,
   */
  data: Float32Array;
  columns: Cells;
  rows: Cells;
  cellSize: PixelsPerCell;
};

export type TransferableFlowData = {
  buffer: ArrayBuffer;
  columns: Cells;
  rows: Cells;
  cellSize: PixelsPerCell;
};

/**
 * A flow source is a gate
 */
export interface FlowSource {
  fetchFlowData(extent: Extent, width: Pixels, height: Pixels, signal: AbortSignal): Promise<FlowData>;
  destroy(): void;
}

export interface FlowProcessor {
  createFlowLinesMesh(flowData: FlowData, signal: AbortSignal): Promise<FlowLinesMesh>;
  destroy(): void;
}
