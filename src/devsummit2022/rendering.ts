import Extent from "esri/geometry/Extent";
import { VisualizationStyle } from "../core/rendering";
import { MapUnitsPerPixel, Pixels, Resources, VisualizationRenderParams } from "../core/types";
import { defined, throwIfAborted } from "../core/util";

export class GlobalResources implements Resources {
  programs: HashMap<{
    program: WebGLProgram;
    uniforms: HashMap<WebGLUniformLocation>;
  }> | null = null;

  attach(gl: WebGLRenderingContext): void {
    const vertexSource = `
      attribute vec2 a_Position;
      
      void main(void) {
        gl_Position = vec4(a_Position, 0.0, 1.0);
      }`;

    const fragmentSource = `
      precision mediump float;

      uniform vec4 u_Color;

      void main(void) {
        gl_FragColor = u_Color;
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
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.programs = {
      solid: {
        program,
        uniforms: {
          u_Color: gl.getUniformLocation(program, "u_Color")!
        }
      }
    };
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.programs!["solid"]?.program!);
  }
}

export class LocalResources implements Resources {
  vertexData: Float32Array | null;
  indexData: Uint32Array | null;
  indexCount = 0;
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;

  constructor(vertexData: Float32Array, indexData: Uint32Array) {
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.indexCount = indexData.length;
  }

  attach(gl: WebGLRenderingContext): void {
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

  detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}

export class DevSummit2022VisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  constructor() {
    super();
  }

  override async loadGlobalResources(): Promise<GlobalResources> {
    return new GlobalResources();
  }

  override async loadLocalResources(
    _extent: Extent,
    _resolution: MapUnitsPerPixel,
    _size: [Pixels, Pixels],
    _pixelRatio: number,
    signal: AbortSignal
  ): Promise<LocalResources> {
    throwIfAborted(signal);

    const vertexData = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.0, 0.5]);
    const indexData = new Uint32Array([0, 1, 2, 1, 3, 2]);

    return new LocalResources(vertexData, indexData);
  }

  override renderVisualization(
    gl: WebGLRenderingContext,
    _renderParams: VisualizationRenderParams,
    globalResources: GlobalResources,
    localResources: LocalResources
  ): void {
    defined(localResources.vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);

    gl.disable(gl.CULL_FACE);

    const solidProgram = globalResources.programs!["solid"]?.program!;
    gl.useProgram(solidProgram);

    gl.uniform4f(
      globalResources.programs!["solid"]?.uniforms["u_Color"]!,
      1,
      0,
      0,
      1
    );

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}
