import { defined } from "../core/util";
import { createFlowMesh } from "./shared";
import { FlowLinesMesh, FlowData } from "./types";
import * as workers from "esri/core/workers";
import esriConfig from "esri/config";

// esriConfig.workers.loaderUrl = "https://cdn.jsdelivr.net/npm/systemjs@6.10.0/dist/s.min.js";

esriConfig.workers.loaderConfig = {
  // paths: {
  //   flow: new URL("pippo", document.baseURI).href
  // }

  packages: [
    {
      name: "js",
      location: "http://localhost:8000/dist/js"
    }
  ]
};

export abstract class FlowTracer {
  // TODO: Add support for AbortController?
  abstract createFlowMesh(flowData: FlowData, smoothing: number): Promise<FlowLinesMesh>;
  
  destroy(): void {
  }
}

export class MainFlowTracer extends FlowTracer {
  override async createFlowMesh(flowData: FlowData, smoothing: number): Promise<FlowLinesMesh> {
    return createFlowMesh(flowData, smoothing);
  }
}

// export class WorkerFlowTracer extends FlowTracer {
//   private worker = new Worker("./flow.js");
//   private requestId = 0;
//   private requests = new Map<number, (result: FlowLinesMesh) => void>();

//   constructor() {
//     super();
//     this.worker.addEventListener("message", (evt) => {
//       if (evt.data.method === "createFlowMesh") {
//         const resolve = this.requests.get(evt.data.requestId);
//         defined(resolve);
//         resolve({
//           vertexData: new Float32Array(evt.data.vertexData),
//           indexData: new Uint32Array(evt.data.indexData)
//         });
//       }
//     });
//   }

//   override createFlowMesh(flowData: FlowData, smoothing: number): Promise<FlowLinesMesh> {
//     return new Promise((resolve) => {
//       this.requestId++;
//       this.requests.set(this.requestId, resolve);

//       this.worker.postMessage({
//         method: "createFlowMesh",
//         flowData,
//         smoothing,
//         requestId: this.requestId
//       }, [
//         flowData.data.buffer
//       ]);
//     });
//   }

//   override destroy(): void {
//     this.worker.terminate();
//   }
// }

console.log(defined);

// const local = window.location.href.substring(0, window.location.href.lastIndexOf("/"));
// console.log({ local });
export class WorkerFlowTracer extends FlowTracer {
  private connection = workers.open("js/workers/flow");

  // constructor() {
  //   super();
  //   this.worker.addEventListener("message", (evt) => {
  //     if (evt.data.method === "createFlowMesh") {
  //       const resolve = this.requests.get(evt.data.requestId);
  //       defined(resolve);
  //       resolve({
  //         vertexData: new Float32Array(evt.data.vertexData),
  //         indexData: new Uint32Array(evt.data.indexData)
  //       });
  //     }
  //   });
  // }

  override async createFlowMesh(flowData: FlowData, smoothing: number): Promise<FlowLinesMesh> {
    const connection = await this.connection;
    
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
        transferList: [flowData.data.buffer]
      }
    );

    console.log("result", result);

    return {
      vertexData: new Float32Array(result.vertexData),
      indexData: new Uint32Array(result.indexData)
    };

    // return new Promise((resolve) => {
    //   this.requestId++;
    //   this.requests.set(this.requestId, resolve);

    //   this.worker.postMessage({
    //     method: "createFlowMesh",
    //     flowData,
    //     smoothing,
    //     requestId: this.requestId
    //   }, [
    //     flowData.data.buffer
    //   ]);
    // });
  }

  override destroy(): void {
    this.connection.then((connection) => {
      connection.close();
    });
  }
}