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
 * @module wind-es/workers/flow
 *
 * A worker...
 */

import { createFlowMesh as createFlowMeshImpl } from "../flow/shared";

import { FlowDataWorker } from "../flow/types";

export async function createFlowMesh(
  data: { flowData: FlowDataWorker; smoothing: number },
  options: { signal: AbortSignal }
): Promise<{ result: { vertexBuffer: ArrayBuffer; indexBuffer: ArrayBuffer }; transferList: ArrayBuffer[] }> {
  const { vertexData, indexData } = await createFlowMeshImpl(
    {
      ...data.flowData,
      data: new Float32Array(data.flowData.buffer)
    },
    data.smoothing,
    options.signal
  );

  return {
    result: {
      vertexBuffer: vertexData.buffer,
      indexBuffer: indexData.buffer
    },
    transferList: [vertexData.buffer, indexData.buffer]
  };
}
