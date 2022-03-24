import Extent from "esri/geometry/Extent";
import Point from "esri/geometry/Point";
import FeatureLayer from "esri/layers/FeatureLayer";
import { mat4 } from "gl-matrix";
import { VisualizationStyle } from "../../core/rendering";
import { Pixels, Resources, VisualizationRenderParams } from "../../core/types";

export class GlobalResources implements Resources {
  program: WebGLProgram | null = null;
  uniforms: HashMap<WebGLUniformLocation> = {};

  attach(gl: WebGLRenderingContext): void {
    // Compile the shaders.
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vertexShader,
      `
      attribute vec2 a_Position;
      attribute vec2 a_Offset;
      attribute float a_Random;
      attribute vec4 a_Color;
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_ClipFromScreen;
      uniform float u_Size;
      varying vec2 v_Offset;
      varying float v_Random;
      varying vec4 v_Color;
      void main(void) {
        vec2 pos = a_Position;
        vec4 anchor = u_ScreenFromLocal * vec4(pos, 0.0, 1.0);
        vec4 screen = anchor + vec4(a_Offset * u_Size, 0.0, 0.0);
        vec4 clip = u_ClipFromScreen * screen;
        gl_Position = clip;
        v_Offset = a_Offset;
        v_Random = a_Random;
        v_Color = a_Color;
      }`
    );
    gl.compileShader(vertexShader);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      fragmentShader,
      `
      precision mediump float;
      uniform float u_Time;
      varying vec2 v_Offset;
      varying float v_Random;
      varying vec4 v_Color;
      void main(void) {
        float intensity = exp(-(16.0 + 8.0 * sin(u_Time + 6.2830 * v_Random)) * length(v_Offset));
        gl_FragColor = vec4(v_Color.rgb, v_Color.a * intensity);
        gl_FragColor.rgb *= gl_FragColor.a;
      }`
    );
    gl.compileShader(fragmentShader);

    // Link the program.
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "a_Position");
    gl.bindAttribLocation(program, 1, "a_Offset");
    gl.bindAttribLocation(program, 2, "a_Random");
    gl.bindAttribLocation(program, 3, "a_Color");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    this.uniforms["u_ScreenFromLocal"] = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
    this.uniforms["u_ClipFromScreen"] = gl.getUniformLocation(program, "u_ClipFromScreen")!;
    this.uniforms["u_Time"] = gl.getUniformLocation(program, "u_Time")!;
    this.uniforms["u_Size"] = gl.getUniformLocation(program, "u_Size")!;
    this.program = program;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.program);
  }
}

export class LocalResources implements Resources {
  vertexData: Float32Array | null;
  indexData: Uint32Array | null;
  indexCount = 0;
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  u_ScreenFromLocal = mat4.create();
  u_ClipFromScreen = mat4.create();

  constructor(vertexData: Float32Array, indexData: Uint32Array) {
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.indexCount = indexData.length;
  }

  attach(gl: WebGLRenderingContext): void {
    // Upload the markers mesh data to the GPU.
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;

    // Make sure that the CPU data is garbage collected.
    this.vertexData = null;
    this.indexData = null;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}

export class ShimmerVisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  private _featureLayer: FeatureLayer;

  constructor(
    url: string,
    private _fieldName: string,
    private _colorMap: HashMap<[number, number, number, number]>,
    private _defaultColor: [number, number, number, number]
  ) {
    super();

    this._featureLayer = new FeatureLayer({ url });
  }

  override async loadGlobalResources(): Promise<GlobalResources> {
    return new GlobalResources();
  }

  override async loadLocalResources(
    extent: Extent,
    size: [Pixels, Pixels],
    _pixelRatio: number,
    signal: AbortSignal
  ): Promise<LocalResources> {
    await this._featureLayer.load(signal);

    const query = this._featureLayer.createQuery();
    query.geometry = extent;
    const featureSet = await this._featureLayer.queryFeatures(query, { signal });
    const vertexData: number[] = [];
    const indexData: number[] = [];
    let count = 0;

    for (const feature of featureSet.features) {
      const rnd = Math.random();

      const key = (feature.attributes || {})[this._fieldName];
      const color = (key && this._colorMap[key]) || this._defaultColor;
      const [r, g, b, a] = color;

      const point = feature.geometry as Point;
      const x = (size[0] * (point.x - extent.xmin)) / (extent.xmax - extent.xmin);
      const y = size[1] * (1 - (point.y - extent.ymin) / (extent.ymax - extent.ymin));
      vertexData.push(
        x,
        y,
        -0.5,
        -0.5,
        rnd,
        r,
        g,
        b,
        a,
        x,
        y,
        0.5,
        -0.5,
        rnd,
        r,
        g,
        b,
        a,
        x,
        y,
        -0.5,
        0.5,
        rnd,
        r,
        g,
        b,
        a,
        x,
        y,
        0.5,
        0.5,
        rnd,
        r,
        g,
        b,
        a
      );
      indexData.push(count * 4 + 0, count * 4 + 1, count * 4 + 2, count * 4 + 1, count * 4 + 3, count * 4 + 2);
      count++;
    }

    return new LocalResources(new Float32Array(vertexData), new Uint32Array(indexData));
  }

  override renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    globalResources: GlobalResources,
    localResources: LocalResources
  ): void {
    // Compute the `u_ScreenFromLocal` matrix. This matrix converts from local
    // pixel-like coordinates to actual screen positions. It scales, rotates and
    // translates by the amounts dictated by the render parameters.
    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.translation[0],
      renderParams.translation[1],
      0
    ]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.scale,
      renderParams.scale,
      1
    ]);

    // Compute the `u_ClipFromScreen` matrix. This matrix converts from screen
    // coordinates in pixels to clip coordinates in the range [-1, +1].
    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [
      2 / renderParams.size[0],
      -2 / renderParams.size[1],
      1
    ]);

    // Bind the shader program and updates the uniforms.
    gl.useProgram(globalResources.program);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform1f(globalResources.uniforms["u_Time"]!, performance.now() / 1000);
    gl.uniform1f(globalResources.uniforms["u_Size"]!, 40 * renderParams.pixelRatio);

    // Enable additive blending.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // Bind the markers mesh.
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 8);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 36, 16);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 36, 20);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);

    // Draw the markers.
    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}
