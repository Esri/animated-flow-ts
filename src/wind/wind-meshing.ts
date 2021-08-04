import { createWindMesh } from "./wind-shared";
import { Mesh, WindData } from "./wind-types";

export abstract class WindTracer {
  abstract createWindMesh(windData: WindData, smoothing: number): Promise<Mesh>;
  
  destroy(): void {
  }
}

export class MainWindTracer extends WindTracer {
  override async createWindMesh(windData: WindData, smoothing: number): Promise<Mesh> {
    return createWindMesh(windData, smoothing);
  }
}

export class WorkerWindTracer extends WindTracer {
  private worker = new Worker("./wind-worker.js");

  override createWindMesh(windData: WindData, smoothing: number): Promise<Mesh> {
    return new Promise((resolve) => {
      const listener = (evt: MessageEvent): void => {
        if (evt.data.method === "createWindMesh") {
          resolve({
            vertexData: new Float32Array(evt.data.vertexData),
            indexData: new Uint32Array(evt.data.indexData)
          });
    
          this.worker.removeEventListener("message", listener);
        }
      };
      
      this.worker.addEventListener("message", listener);
  
      this.worker.postMessage({
        method: "createWindMesh",
        windData,
        smoothing
      }, [
        windData.data.buffer
      ]);
    });
  }

  override destroy(): void {
    this.worker.terminate();  
  }
}