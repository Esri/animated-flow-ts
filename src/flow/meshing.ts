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
 * @module wind-es/flow/meshing
 *
 * This module...
 */

import { createFlowMesh } from "./shared";
import { FlowLinesMesh, FlowData } from "./types";
import * as workers from "esri/core/workers";
import { throwIfAborted } from "../core/util";

export abstract class FlowTracer {
  abstract createFlowMesh(flowData: FlowData, smoothing: number, signal: AbortSignal): Promise<FlowLinesMesh>;

  destroy(): void {}
}

export class MainFlowTracer extends FlowTracer {
  override async createFlowMesh(flowData: FlowData, smoothing: number, signal: AbortSignal): Promise<FlowLinesMesh> {
    return createFlowMesh(flowData, smoothing, signal);
  }
}

export class WorkerFlowTracer extends FlowTracer {
  private connection = workers.open("wind-es/workers/flow");

  override async createFlowMesh(flowData: FlowData, smoothing: number, signal: AbortSignal): Promise<FlowLinesMesh> {
    const connection = await this.connection;

    throwIfAborted(signal);

    const result = await connection.invoke(
      "createFlowMesh",
      {
        flowData: {
          ...flowData,
          buffer: flowData.data.buffer
        },
        smoothing
      },
      {
        transferList: [flowData.data.buffer],
        signal
      }
    );

    return {
      vertexData: new Float32Array(result.vertexData),
      indexData: new Uint32Array(result.indexData)
    };
  }

  override async destroy(): Promise<void> {
    const connection = await this.connection;
    connection.close();
  }
}
