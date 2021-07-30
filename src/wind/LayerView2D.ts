import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Extent from "@arcgis/core/geometry/Extent";
import { mat4 } from "gl-matrix";
import BaseLayerView2D from "../base/LayerView2D";
import { VisualizationRenderParams } from "../base/types";
import { defined } from "../util";
import { SharedResources, LocalResources } from "./resources";

@subclass("wind-es.wind.LayerView2D")
export default class LayerView2D extends BaseLayerView2D<SharedResources, LocalResources> {
  override loadSharedResources(): Promise<SharedResources> {
    return Promise.resolve(new SharedResources());
  }

  override loadLocalResources(extent: Extent, resolution: number): Promise<LocalResources> {
    return Promise.resolve(new LocalResources(extent, resolution));
  }

  override renderVisualization(gl: WebGLRenderingContext, _renderParams: VisualizationRenderParams, sharedResources: SharedResources, localResources: LocalResources): void {
    defined(localResources.vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
  
    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [0.3, 0.3, 1.0]);
  
    const solidProgram = sharedResources.programs!["solid"]?.program!;
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(sharedResources.programs!["solid"]?.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(sharedResources.programs!["solid"]?.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
  
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
