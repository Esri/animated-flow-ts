import { createWindMesh, Mesh, PixelBlock } from "./wind-processing";

export abstract class WindClient {
  abstract createWindMesh(pixelBlock: PixelBlock): Promise<Mesh>;
  
  destroy(): void {
  }
}

export class MainWindClient extends WindClient {
  override async createWindMesh(pixelBlock: PixelBlock): Promise<Mesh> {
    return createWindMesh(pixelBlock);
  }
}

export class WorkerWindClient extends WindClient {
  private worker = new Worker("./wind-worker.js");

  override createWindMesh(pixelBlock: PixelBlock): Promise<Mesh> {
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
        pixelBlock: { pixels: pixelBlock.pixels, width: pixelBlock.width, height: pixelBlock.height }
      });
    });
  }

  override destroy(): void {
    this.worker.terminate();  
  }
}