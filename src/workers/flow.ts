import { createFlowMesh } from "../flow/shared";

self.addEventListener("message", (evt) => {
  if (evt.data.method === "createFlowMesh") {
    const { vertexData, indexData } = createFlowMesh(evt.data.flowData, evt.data.smoothing);
    (self as any).postMessage(
      {
        method: "createFlowMesh",
        vertexData: vertexData.buffer,
        indexData: indexData.buffer,
        requestId: evt.data.requestId
      },
      [
        vertexData.buffer,
        indexData.buffer
      ]
    )
  }
});
