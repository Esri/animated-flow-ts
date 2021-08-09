import { defined } from "../core/util";
import { createFlowMesh } from "./flow-shared";
import { FlowLinesMesh, FlowData } from "./flow-types";

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

export class WorkerFlowTracer extends FlowTracer {
  private worker = new Worker("./flow.js");
  private requestId = 0;
  private requests = new Map<number, (result: FlowLinesMesh) => void>();

  constructor() {
    super();
    this.worker.addEventListener("message", (evt) => {
      if (evt.data.method === "createFlowMesh") {
        const resolve = this.requests.get(evt.data.requestId);
        defined(resolve);
        resolve({
          vertexData: new Float32Array(evt.data.vertexData),
          indexData: new Uint32Array(evt.data.indexData)
        });
      }
    });
  }

  override createFlowMesh(flowData: FlowData, smoothing: number): Promise<FlowLinesMesh> {
    return new Promise((resolve) => {
      this.requestId++;
      this.requests.set(this.requestId, resolve);

      this.worker.postMessage({
        method: "createFlowMesh",
        flowData,
        smoothing,
        requestId: this.requestId
      }, [
        flowData.data.buffer
      ]);
    });
  }

  override destroy(): void {
    this.worker.terminate();
  }
}