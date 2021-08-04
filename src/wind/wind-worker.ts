import { createWindMesh } from "./wind-shared";

console.log("I AM A WORKER!");

self.addEventListener("message", (evt) => {
  if (evt.data.method === "createWindMesh") {
    const { vertexData, indexData } = createWindMesh(evt.data.windData, 10);
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

// console.log("Hello! I am an Esri worker!");

// declare function define(dependencies: string[], callback: (...dependencies: any[]) => any): void;

// define([], () => {
//   console.log("MIAO!");
  
//   return {
//     f: () => {
//       console.log("CIAO!");
//     }
//   };
// });