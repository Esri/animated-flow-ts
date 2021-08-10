import { createFlowMesh } from "./shared";
import { FlowLinesMesh, FlowData } from "./types";
import * as workers from "esri/core/workers";

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
  private connection = workers.open("js/workers/flow");

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

    return {
      vertexData: new Float32Array(result.vertexData),
      indexData: new Uint32Array(result.indexData)
    };
  }

  override destroy(): void {
    this.connection.then((connection) => {
      connection.close();
    });
  }
}