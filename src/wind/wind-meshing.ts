import { defined } from "../util";
import { createWindMesh } from "./wind-shared";
import { FlowLinesMesh, WindData } from "./wind-types";

export abstract class WindTracer {
  abstract createWindMesh(windData: WindData, smoothing: number): Promise<FlowLinesMesh>;
  
  destroy(): void {
  }
}

export class MainWindTracer extends WindTracer {
  override async createWindMesh(windData: WindData, smoothing: number): Promise<FlowLinesMesh> {
    return createWindMesh(windData, smoothing);
  }
}

export class WorkerWindTracer extends WindTracer {
  private worker = new Worker("./wind-worker.js");
  private requestId = 0;
  private requests = new Map<number, (result: FlowLinesMesh) => void>();

  constructor() {
    super();
    this.worker.addEventListener("message", (evt) => {
      if (evt.data.method === "createWindMesh") {
        const resolve = this.requests.get(evt.data.requestId);
        defined(resolve);
        resolve({
          vertexData: new Float32Array(evt.data.vertexData),
          indexData: new Uint32Array(evt.data.indexData)
        });
      }
    });
  }

  override createWindMesh(windData: WindData, smoothing: number): Promise<FlowLinesMesh> {
    return new Promise((resolve) => {
      this.requestId++;
      this.requests.set(this.requestId, resolve);

      this.worker.postMessage({
        method: "createWindMesh",
        windData,
        smoothing,
        requestId: this.requestId
      }, [
        windData.data.buffer
      ]);
    });
  }

  override destroy(): void {
    this.worker.terminate();
  }
}