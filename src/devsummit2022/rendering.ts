import Extent from "esri/geometry/Extent";
import Point from "esri/geometry/Point";
import FeatureLayer from "esri/layers/FeatureLayer";
import { mat4 } from "gl-matrix";
import { VisualizationStyle } from "../core/rendering";
import { MapUnitsPerPixel, Pixels, Resources, VisualizationRenderParams } from "../core/types";
import { defined, throwIfAborted } from "../core/util";

export class GlobalResources implements Resources {
  program: WebGLProgram | null = null;
  uniforms: HashMap<WebGLUniformLocation> = {};

  attach(gl: WebGLRenderingContext): void {
    const vertexSource = `
      attribute vec2 a_Position;
      attribute vec2 a_Offset;
      attribute float a_Random;
      attribute vec3 a_Color;

      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_Rotation;
      uniform mat4 u_ClipFromScreen;

      varying vec2 v_Texcoord;
      varying vec2 v_Offset;
      varying float v_Random;
      varying vec3 v_Color;

      void main(void) {
        vec2 pos = a_Position;
        vec4 anchor = u_ScreenFromLocal * vec4(pos, 0.0, 1.0);
        vec4 screen = anchor + vec4(a_Offset * 40.0, 0.0, 0.0);
        vec4 clip = u_ClipFromScreen * screen;
        gl_Position = clip;
        v_Texcoord = (clip.xy + 1.0) / 2.0;
        v_Offset = a_Offset;
        v_Random = a_Random;
        v_Color = a_Color;
      }`;

    const fragmentSource = `
      precision mediump float;

      uniform float u_Time;

      varying vec2 v_Offset;
      varying float v_Random;
      varying vec3 v_Color;

      void main(void) {
        float intensity = exp(-(16.0 + 8.0 * sin(u_Time + 6.2830 * v_Random)) * length(v_Offset));

        gl_FragColor = vec4(v_Color, intensity);
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

    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));

    const program = gl.createProgram();
    defined(program);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "a_Position");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.program = program;
    this.uniforms["u_ScreenFromLocal"] = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
    this.uniforms["u_Rotation"] = gl.getUniformLocation(program, "u_Rotation")!;
    this.uniforms["u_ClipFromScreen"] = gl.getUniformLocation(program, "u_ClipFromScreen")!;
    this.uniforms["u_Time"] = gl.getUniformLocation(program, "u_Time")!;
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
  u_Rotation = mat4.create();
  u_ClipFromScreen = mat4.create();

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
  private _featureLayer = new FeatureLayer({
    url: "https://services.arcgis.com/AgwDJMQH12AGieWa/arcgis/rest/services/global_power_plant_database_June_2018/FeatureServer"
  });
  
  constructor() {
    super();
  }

  override async loadGlobalResources(): Promise<GlobalResources> {
    return new GlobalResources();
  }

  override async loadLocalResources(
    extent: Extent,
    _resolution: MapUnitsPerPixel,
    size: [Pixels, Pixels],
    _pixelRatio: number,
    signal: AbortSignal
  ): Promise<LocalResources> {
    throwIfAborted(signal);

    await this._featureLayer.load();

    const query = this._featureLayer.createQuery();
    query.geometry = extent;
    const featureSet = await this._featureLayer.queryFeatures(query);
    const vertexData: number[] = [];
    const indexData: number[] = [];
    let count = 0;

    const fuelMap: any = {
      "Wind": [0, 0.5, 1],
      "Solar": [1, 1, 0],
      "Hydro": [0.2, 0.3, 0.5],
      "Gas": [1, 1, 0],
      "Oil": [1, 0, 0],
      "Coal": [1, 0.5, 0],
      "Storage": [0.7, 0.2, 0.1],
      "Waste": [0, 1, 0],
      "Biomass": [1, 0, 1],
      "Cogeneration": [1, 0.2, 0.7],
      "Geothermal": [0.5, 1, 0.2],
      "Nuclear": [0.5, 0.8, 1],
      "Other": [1, 1, 1],
      "Wave and Tidal": [0.4, 0.9, 1.0],
    };

    for (const feature of featureSet.features) {
      const rnd = Math.random();

      const [r, g, b] = fuelMap[(feature.attributes || {}).fuel1 || "Other"];

      const point = feature.geometry as Point;
      const x = size[0] * (point.x - extent.xmin) / (extent.xmax - extent.xmin);
      const y = size[1] * (1 - (point.y - extent.ymin) / (extent.ymax - extent.ymin));
      vertexData.push(
        x, y, -0.5, -0.5, rnd, r, g, b,
        x, y,  0.5, -0.5, rnd, r, g, b,
        x, y, -0.5,  0.5, rnd, r, g, b,
        x, y,  0.5,  0.5, rnd, r, g, b
      );
      indexData.push(
        count * 4 + 0,
        count * 4 + 1,
        count * 4 + 2,
        count * 4 + 1,
        count * 4 + 3,
        count * 4 + 2
      );
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
    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [
      2 / (renderParams.size[0] * renderParams.pixelRatio),
      -2 / (renderParams.size[1] * renderParams.pixelRatio),
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
      renderParams.scale * renderParams.pixelRatio,
      renderParams.scale * renderParams.pixelRatio,
      1
    ]);

    gl.useProgram(globalResources.program);
    gl.uniformMatrix4fv(
      globalResources.uniforms["u_ScreenFromLocal"]!,
      false,
      localResources.u_ScreenFromLocal
    );
    gl.uniformMatrix4fv(
      globalResources.uniforms["u_Rotation"]!,
      false,
      localResources.u_Rotation
    );
    gl.uniformMatrix4fv(
      globalResources.uniforms["u_ClipFromScreen"]!,
      false,
      localResources.u_ClipFromScreen
    );

    defined(localResources.vertexBuffer);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    // gl.disable(gl.CULL_FACE);

    const solidProgram = globalResources.program;
    gl.useProgram(solidProgram);

    gl.uniform1f(
      globalResources.uniforms["u_Time"]!,
      performance.now() / 1000
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 8);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 16);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 32, 20);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);
    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}
