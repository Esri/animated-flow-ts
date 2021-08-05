import { createWindMesh } from "./wind-shared";

self.addEventListener("message", (evt) => {
  if (evt.data.method === "createWindMesh") {
    const { vertexData, indexData } = createWindMesh(evt.data.windData, evt.data.smoothing);
    (self as any).postMessage(
      {
        method: "createWindMesh",
        vertexData: vertexData.buffer,
        indexData: indexData.buffer
      },
      [
        vertexData.buffer,
        indexData.buffer
      ]
    )
  }
});
