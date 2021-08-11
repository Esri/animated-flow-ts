/*
  Copyright 2021 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/**
 * @module wind-es/flow/rendering
 *
 * This module...
 */

import { subclass } from "esri/core/accessorSupport/decorators";
import Extent from "esri/geometry/Extent";
import { mat4 } from "gl-matrix";
import {
  VisualizationLayerView2D,
  LocalResources,
  SharedResources
} from "../core/rendering";
import { defined, throwIfAborted } from "../core/util";
import { VisualizationRenderParams } from "../core/types";
import { FlowLayer } from "./layer";

class FlowSharedResources extends SharedResources {
  programs: HashMap<{
    program: WebGLProgram;
    uniforms: HashMap<WebGLUniformLocation>;
  }> | null = null;

  override attach(gl: WebGLRenderingContext): void {
    const vertexSource = `
      attribute vec2 a_Position;
      attribute vec2 a_Extrude;
      attribute float a_Side;
      attribute float a_Time;
      attribute float a_TotalTime;
      attribute float a_Speed;
      attribute float a_Random;
      
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_Rotation;
      uniform mat4 u_ClipFromScreen;
      uniform float u_PixelRatio;

      varying float v_Side;
      varying float v_Time;
      varying float v_TotalTime;
      varying float v_Speed;
      varying float v_Random;
      
      void main(void) {
        vec4 screenPosition = u_ScreenFromLocal * vec4(a_Position, 0.0, 1.0);
        screenPosition += u_Rotation * vec4(a_Extrude, 0.0, 0.0) / u_PixelRatio /* Is this right? */;
        gl_Position = u_ClipFromScreen * screenPosition;
        v_Side = a_Side;
        v_Time = a_Time;
        v_TotalTime = a_TotalTime;
        v_Speed = a_Speed;
        v_Random = a_Random;
      }`;

    const fragmentSource = `
      precision mediump float;

      uniform vec4 u_Color;
      uniform float u_Time;
      
      varying float v_Side;
      varying float v_Time;
      varying float v_TotalTime;
      varying float v_Speed;
      varying float v_Random;

      void main(void) {
        gl_FragColor = u_Color;

        gl_FragColor.a *= 1.0 - length(v_Side);
        
        float t = mod(50.0 * u_Time + v_Random * 2.0 * v_TotalTime, 2.0 * v_TotalTime);

        if (t < v_Time) {
          gl_FragColor.a *= 0.0;
        } else {
          gl_FragColor.a *= exp(-0.01 * (t - v_Time)) * (1.0 - exp(-100.0 /* TODO! Factor! */ * v_Speed));
        }

        gl_FragColor.rgb *= gl_FragColor.a;
      }`;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    defined(vertexShader);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    defined(fragmentShader);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    defined(program);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "a_Position");
    gl.bindAttribLocation(program, 1, "a_Extrude");
    gl.bindAttribLocation(program, 2, "a_Side");
    gl.bindAttribLocation(program, 3, "a_Time");
    gl.bindAttribLocation(program, 4, "a_TotalTime");
    gl.bindAttribLocation(program, 5, "a_Speed");
    gl.bindAttribLocation(program, 6, "a_Random");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
    console.log(gl.getProgramInfoLog(program));

    this.programs = {
      texture: {
        program,
        uniforms: {
          u_ScreenFromLocal: gl.getUniformLocation(program, "u_ScreenFromLocal")!,
          u_Rotation: gl.getUniformLocation(program, "u_Rotation")!,
          u_ClipFromScreen: gl.getUniformLocation(program, "u_ClipFromScreen")!,
          u_PixelRatio: gl.getUniformLocation(program, "u_PixelRatio")!,
          u_Color: gl.getUniformLocation(program, "u_Color")!,
          u_Time: gl.getUniformLocation(program, "u_Time")!
        }
      }
    };
  }

  override detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.programs!["solid"]?.program!);
  }
}

class FlowLocalResources extends LocalResources {
  vertexData: Float32Array | null;
  indexData: Uint32Array | null;
  downsample: number;
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  u_ScreenFromLocal = mat4.create();
  u_Rotation = mat4.create();
  u_ClipFromScreen = mat4.create();
  indexCount = 0;

  constructor(
    extent: Extent,
    resolution: number,
    downsample: number,
    vertexData: Float32Array,
    indexData: Uint32Array
  ) {
    super(extent, resolution);

    this.downsample = downsample;
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.indexCount = indexData.length;
  }

  override attach(gl: WebGLRenderingContext): void {
    defined(this.vertexData);
    defined(this.indexData);

    const vertexBuffer = gl.createBuffer();
    defined(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const indexBuffer = gl.createBuffer();
    defined(indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    this.vertexData = null;
    this.indexData = null;
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;
  }

  override detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}

@subclass("wind-es.flow.layer.FlowLayerView2D")
export class FlowLayerView2D extends VisualizationLayerView2D<FlowSharedResources, FlowLocalResources> {
  override animate = true;

  override async loadSharedResources(): Promise<FlowSharedResources> {
    return new FlowSharedResources();
  }

  override async loadLocalResources(
    extent: Extent,
    resolution: number,
    signal: AbortSignal
  ): Promise<FlowLocalResources> {
    // TODO?
    extent = extent.clone();
    extent.expand(1.15); // Increase this?

    const width = Math.round((extent.xmax - extent.xmin) / resolution);
    const height = Math.round((extent.ymax - extent.ymin) / resolution);

    const layer = this.layer as FlowLayer;

    const downsample = 1;

    const [source, tracer] = await Promise.all([layer.source, layer.tracer]);

    throwIfAborted(signal);

    const flowData = await source.fetchFlowData(extent, width / downsample, height / downsample, signal);
    const { vertexData, indexData } = await tracer.createFlowMesh(flowData, 5, signal);
    return new FlowLocalResources(extent, resolution, downsample, vertexData, indexData);
  }

  override renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    sharedResources: FlowSharedResources,
    localResources: FlowLocalResources
  ): void {
    defined(localResources.vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 8);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 36, 16);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 36, 20);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 36, 24);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 36, 28);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 36, 32);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);
    gl.enableVertexAttribArray(4);
    gl.enableVertexAttribArray(5);
    gl.enableVertexAttribArray(6);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);

    gl.disable(gl.CULL_FACE);

    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [
      2 / renderParams.size[0],
      -2 / renderParams.size[1],
      1
    ]);

    mat4.identity(localResources.u_Rotation);
    mat4.rotateZ(localResources.u_Rotation, localResources.u_Rotation, renderParams.rotation);

    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.translation[0],
      renderParams.translation[1],
      1
    ]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.scale * localResources.downsample,
      renderParams.scale * localResources.downsample,
      1
    ]);

    const solidProgram = sharedResources.programs!["texture"]?.program!;
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(
      sharedResources.programs!["texture"]?.uniforms["u_ScreenFromLocal"]!,
      false,
      localResources.u_ScreenFromLocal
    );
    gl.uniformMatrix4fv(
      sharedResources.programs!["texture"]?.uniforms["u_Rotation"]!,
      false,
      localResources.u_Rotation
    );
    gl.uniformMatrix4fv(
      sharedResources.programs!["texture"]?.uniforms["u_ClipFromScreen"]!,
      false,
      localResources.u_ClipFromScreen
    );
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_PixelRatio"]!, renderParams.pixelRatio);
    gl.uniform4f(
      sharedResources.programs!["texture"]?.uniforms["u_Color"]!,
      (this.layer as any).color.r / 255.0,
      (this.layer as any).color.g / 255.0,
      (this.layer as any).color.b / 255.0,
      (this.layer as any).color.a * renderParams.opacity
    );
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_Time"]!, performance.now() / 1000.0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}
