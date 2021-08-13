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
 * @module wind-es/flow/shared
 *
 * This module...
 */

import { createRand, rest } from "../core/util";
import settings from "./settings";
import { Field, FlowLinesMesh, FlowLineVertex, FlowData, PixelsPerSecond, Cells } from "./types";

function smooth(data: Float32Array, columns: Cells, rows: Cells, sigma: Cells): Float32Array {
  const horizontal = new Float32Array(data.length);

  const halfRadius = Math.round(3 * sigma);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = -halfRadius; d <= halfRadius; d++) {
        if (x + d < 0 || x + d >= columns) {
          continue;
        }

        const weight = Math.exp((-d * d) / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * data[2 * (y * columns + (x + d)) + 0]!;
        s1 += weight * data[2 * (y * columns + (x + d)) + 1]!;
      }

      horizontal[2 * (y * columns + x) + 0] = totalWeight < settings.minWeightThreshold ? 0 : s0 / totalWeight;
      horizontal[2 * (y * columns + x) + 1] = totalWeight < settings.minWeightThreshold ? 0 : s1 / totalWeight;
    }
  }

  const final = new Float32Array(data.length);

  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = -halfRadius; d <= halfRadius; d++) {
        if (y + d < 0 || y + d >= rows) {
          continue;
        }

        const weight = Math.exp((-d * d) / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * horizontal[2 * ((y + d) * columns + x) + 0]!;
        s1 += weight * horizontal[2 * ((y + d) * columns + x) + 1]!;
      }

      final[2 * (y * columns + x) + 0] = totalWeight < settings.minWeightThreshold ? 0 : s0 / totalWeight;
      final[2 * (y * columns + x) + 1] = totalWeight < settings.minWeightThreshold ? 0 : s1 / totalWeight;
    }
  }

  return final;
}

function createFlowFieldFromData(flowData: FlowData): Field {
  const data = smooth(flowData.data, flowData.columns, flowData.rows, settings.smoothing);

  const f = (x: Cells, y: Cells): [PixelsPerSecond, PixelsPerSecond] => {
    const X: Cells = Math.round(x);
    let Y: Cells = Math.round(y);

    if (X < 0 || X >= flowData.columns) {
      return [0, 0];
    }

    if (Y < 0 || Y >= flowData.rows) {
      return [0, 0];
    }

    return [data[2 * (Y * flowData.columns + X) + 0]!, data[2 * (Y * flowData.columns + X) + 1]!];
  };

  return f;
}

function trace(f: Field, x0: number, y0: number): FlowLineVertex[] {
  const line: FlowLineVertex[] = [];

  let t = 0;

  let x = x0;
  let y = y0;

  line.push({
    position: [x, y],
    time: t
  });

  for (let i = 0; i < settings.verticesPerLine; i++) {
    let [vx, vy] = f(x, y);
    vx *= settings.speedScale;
    vy *= settings.speedScale;
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v < settings.minSpeedThreshold) {
      return line;
    }
    const dx = vx / v;
    const dy = vy / v;
    x += dx * settings.segmentLength;
    y += dy * settings.segmentLength;
    const dt = settings.segmentLength / v;
    t += dt;

    line.push({
      position: [x, y],
      time: t
    });
  }

  return line;
}

function getFlowLines(f: Field, columns: number, rows: number): FlowLineVertex[][] {
  const lines: FlowLineVertex[][] = [];

  console.log(columns, rows);

  const rand = createRand();

  for (let i = 0; i < settings.linesPerVisualization; i++) {
    const line = trace(f, Math.round(rand() * columns), Math.round(rand() * rows));
    lines.push(line);
  }

  return lines;
}

export async function createFlowLinesMesh(
  flowData: FlowData,
  signal: AbortSignal
): Promise<FlowLinesMesh> {
  let vertexCount = 0;
  const vertexData: number[] = [];
  const indexData: number[] = [];

  const f = createFlowFieldFromData(flowData);
  const flowLines = getFlowLines(f, flowData.columns, flowData.rows);

  // flowLines.length = 1;
  // flowLines[0] = [{ position: [100, 100], time: 0 }, { position: [200, 100], time: 1000 }];
  
  const rand = createRand();

  let restTime = performance.now();

  for (const line of flowLines) {
    const currentTime = performance.now();

    if (currentTime - restTime > settings.flowProcessingQuanta) {
      console.log("Resting...");
      restTime = currentTime;
      await rest(signal);
      console.log("Done resting!");
    }

    const random = rand();
    const lastVertex = line[line.length - 1]!;
    const totalTime = lastVertex.time;

    for (let i = 1; i < line.length; i++) {
      let {
        position: [x0, y0],
        time: t0
      } = line[i - 1]!;
      let {
        position: [x1, y1],
        time: t1
      } = line[i]!;
      const speed = 1 / (t1 - t0);

      const l = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
      const ex = -(y1 - y0) / l;
      const ey = (x1 - x0) / l;

      vertexData.push(
        x0,
        y0,
        ex,
        ey,
        -1,
        t0,
        totalTime,
        speed,
        random,
        x0,
        y0,
        -ex,
        -ey,
        +1,
        t0,
        totalTime,
        speed,
        random,
        x1,
        y1,
        ex,
        ey,
        -1,
        t1,
        totalTime,
        speed,
        random,
        x1,
        y1,
        -ex,
        -ey,
        +1,
        t1,
        totalTime,
        speed,
        random
      );

      indexData.push(
        vertexCount + 0,
        vertexCount + 1,
        vertexCount + 2,
        vertexCount + 1,
        vertexCount + 3,
        vertexCount + 2
      );

      vertexCount += 4;
    }
  }

  return {
    vertexData: new Float32Array(vertexData),
    indexData: new Uint32Array(indexData)
  };
}
