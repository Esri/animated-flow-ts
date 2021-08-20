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
 * @module animated-flow-ts/flow/types
 *
 * This module contains simple type definitions used by the `flow` visualization.
 */

 export type Cells = number;
 export type CellsPerSecond = number;
 export type PixelsPerSecond = number;
 export type PixelsPerCell = number;

/**
 * A vertex of a flow line, as returned by The `trace()` function in
 * module `animated-flow-ts/flow/shared.
 *
 * A flow line is a polyline where each vertex is timestamped in seconds.
 */
export type StreamLineVertex = {
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
 * The mesh data as returned by createStreamLinesMesh...
 */
export type StreamLinesMesh = {
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
 * A flow source defines how the flow data is loaded into the `FlowLayer`.
 */
export interface FlowSource {
  fetchFlowData(extent: Extent, width: Pixels, height: Pixels, signal: AbortSignal): Promise<FlowData>;
  destroy(): void;
}

/**
 * A flow processor defines how the flow data is used to generate streamlines
 * that are subsequently transformed into a triangle mesh.
 */
export interface FlowProcessor {
  createStreamLinesMesh(flowData: FlowData, signal: AbortSignal): Promise<StreamLinesMesh>;
  destroy(): void;
}
