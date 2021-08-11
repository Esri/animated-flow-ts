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
 * A worker module that implements tracing the wind particles and
 * triangulating the resulting flow lines.
 *
 * Note that this file **is not** compiled to a worker script
 * compatible with the HTML5 `new Worker()` constructor; this
 * module must be loaded using Esri's [workers framework](https://developers.arcgis.com/javascript/latest/api-reference/esri-core-workers.html)
 * that ships as part of the ArcGIS API for JavaScript.
 */

import { createFlowLinesMesh as createFlowLinesMeshImpl } from "../flow/shared";
import { TransferableFlowData } from "../flow/types";

/**
 * Create
 *
 * It is a wrapper around `wind-es.flow.shared.createFlowLinesMesh` that
 * takes care of marshalling and unmarshalling the parameters.
 * 
 * @param data 
 * @param options 
 * @returns 
 */
export async function createFlowLinesMesh(
  data: { flowData: TransferableFlowData; smoothing: number },
  options: { signal: AbortSignal }
): Promise<{ result: { vertexBuffer: ArrayBuffer; indexBuffer: ArrayBuffer }; transferList: ArrayBuffer[] }> {
  const { vertexData, indexData } = await createFlowLinesMeshImpl(
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
