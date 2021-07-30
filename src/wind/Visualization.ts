import Extent from "@arcgis/core/geometry/Extent";
import { mat4 } from "gl-matrix";
import { VisualizationRenderParams } from "../base/types";
import BaseVisualization from "../base/Visualization";
import { defined } from "../util";

export default class Visualization extends BaseVisualization {
  private _vertexBuffer: WebGLBuffer | null = null;
  private u_ScreenFromLocal = mat4.create();
  private u_ClipFromScreen = mat4.create();
  
  constructor(extent: Extent, resolution: number) {
    super(extent, resolution);
  }

  attach(gl: WebGLRenderingContext): void {
    const vertexBuffer = gl.createBuffer();
    defined(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this._vertexBuffer = vertexBuffer;
  }

  render(gl: WebGLRenderingContext, _params: VisualizationRenderParams): void {
    defined(this._vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);

    mat4.identity(this.u_ScreenFromLocal);
    mat4.scale(this.u_ScreenFromLocal, this.u_ScreenFromLocal, [0.3, 0.3, 1.0]);

    const solidProgram = this._programs!["solid"]?.program;
    defined(solidProgram);
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(this._programs!["solid"]?.uniforms["u_ScreenFromLocal"]!, false, this.u_ScreenFromLocal);
    gl.uniformMatrix4fv(this._programs!["solid"]?.uniforms["u_ClipFromScreen"]!, false, this.u_ClipFromScreen);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  detach(gl: WebGLRenderingContext): void {
    console.log("detach", gl);
  }
}