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

import { createFlowMesh as createFlowMeshImpl } from "../flow/shared";

import { FlowDataWorker } from "../flow/types";

import SpatialReference from "esri/geometry/SpatialReference";

// self.addEventListener("message", (evt) => {
//   if (evt.data.method === "createFlowMesh") {
//     const { vertexData, indexData } = createFlowMesh(evt.data.flowData, evt.data.smoothing);
//     (self as any).postMessage(
//       {
//         method: "createFlowMesh",
//         vertexData: vertexData.buffer,
//         indexData: indexData.buffer,
//         requestId: evt.data.requestId
//       },
//       [
//         vertexData.buffer,
//         indexData.buffer
//       ]
//     )
//   }
// });

export async function createFlowMesh(data: { flowData: FlowDataWorker; smoothing: number }): Promise<{ result: { vertexData: ArrayBuffer; indexData: ArrayBuffer; }; transferList: ArrayBuffer[] }> {
  const sr = new SpatialReference({ wkid: 4326 });
  console.log("SR JSON", sr.toJSON());
  
  const { vertexData, indexData } = createFlowMeshImpl(
    {
      ...data.flowData,
      data: new Float32Array(data.flowData.buffer)
    },
    data.smoothing
  );

  return {
    result: {
      vertexData: vertexData.buffer,
      indexData: indexData.buffer
    },
    transferList: [vertexData.buffer, indexData.buffer]
  };
}