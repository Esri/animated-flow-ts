import Extent from "esri/geometry/Extent";
import Point from "esri/geometry/Point";
import FeatureLayer from "esri/layers/FeatureLayer";
import ImageryLayer from "esri/layers/ImageryLayer";
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

      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_Rotation;
      uniform mat4 u_ClipFromScreen;
      uniform float u_Time;

      varying vec2 v_Texcoord;
      varying vec2 v_TexcoordCenter;
      varying vec2 v_Offset;

      void main(void) {
        float t = u_Time * 0.1;
        vec2 pos = a_Position + 5.0 * vec2(cos(3.0 * t) * sin(7.0 * t), sin(5.0 * t) * sin(8.0 * t));
        vec4 anchor = u_ScreenFromLocal * vec4(pos, 0.0, 1.0);
        vec4 screen = anchor + vec4(a_Offset * 100.0, 0.0, 0.0);
        vec4 clip = u_ClipFromScreen * screen;
        gl_Position = clip;
        v_Texcoord = (clip.xy + 1.0) / 2.0;
        v_TexcoordCenter = ((u_ClipFromScreen * anchor).xy + 1.0) / 2.0;
        v_Offset = a_Offset;
      }`;

    const fragmentSource = `
      precision mediump float;

      varying vec2 v_Texcoord;
      varying vec2 v_TexcoordCenter;
      varying vec2 v_Offset;

      uniform vec2 u_TexSize;
      uniform sampler2D u_Elevation;

      float height(vec2 uv) {
        return texture2D(u_Elevation, uv).r;
      }

      void main(void) {
        vec3 normal = normalize(texture2D(u_Elevation, v_Texcoord).rgb - 0.5);
        vec3 light = normalize(vec3(v_Offset, 1.0));
        float d = clamp(dot(normal, light), 0.0, 1.0);

        float a = d * clamp(1.0 - 2.0 * length(v_Offset), 0.0, 1.0);


        gl_FragColor = vec4(vec3(1.0), a);
        gl_FragColor.rgb *= a;
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
    this.uniforms["u_Elevation"] = gl.getUniformLocation(program, "u_Elevation")!;
    this.uniforms["u_TexSize"] = gl.getUniformLocation(program, "u_TexSize")!;
    this.uniforms["u_Time"] = gl.getUniformLocation(program, "u_Time")!;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.program);
  }
}

export class LocalResources implements Resources {
  vertexData: Float32Array | null;
  indexData: Uint32Array | null;
  elevationData: ImageData | null;
  indexCount = 0;
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  elevationTexture: WebGLTexture | null = null;
  u_ScreenFromLocal = mat4.create();
  u_Rotation = mat4.create();
  u_ClipFromScreen = mat4.create();
  width: number;
  height: number;

  constructor(vertexData: Float32Array, indexData: Uint32Array, elevationData: ImageData) {
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.indexCount = indexData.length;
    this.elevationData = elevationData;
    this.width = elevationData.width;
    this.height = elevationData.height;
  }

  attach(gl: WebGLRenderingContext): void {
    defined(this.vertexData);
    defined(this.indexData);
    defined(this.elevationData);

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

    const elevationTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, elevationTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.elevationData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    this.vertexData = null;
    this.indexData = null;
    this.elevationData = null;
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;
    this.elevationTexture = elevationTexture;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
    gl.deleteTexture(this.elevationTexture);
  }
}

function normalMap(f: ImageData): ImageData {
  const d = new ImageData(f.width, f.height);

  for (let y = 1; y < d.height - 1; y++) {
    for (let x = 1; x < d.width - 1; x++) {
      const hp = f.data[(y * d.width + (x - 1)) * 4]!;
      const hn = f.data[(y * d.width + (x + 1)) * 4]!;
      const vp = f.data[((y - 1) * d.width + x) * 4]!;
      const vn = f.data[((y + 1) * d.width + x) * 4]!;

      const u = 3 * (hn - hp) + 128;
      const v = 3 * (vn - vp) + 128;

      d.data[(y * d.width + x) * 4 + 0] = u;
      d.data[(y * d.width + x) * 4 + 1] = v;
      d.data[(y * d.width + x) * 4 + 2] = 256;
      d.data[(y * d.width + x) * 4 + 3] = 1;
    }
  }

  return d;
}

export class DevSummit2022VisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  private _elevationLayer = new ImageryLayer({
    url: "https://kyraster.ky.gov/arcgis/rest/services/ElevationServices/Ky_DEM_KYAPED_5FT/ImageServer"
  });

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

    await this._elevationLayer.load();

    const elevation = await this._elevationLayer.fetchImage(extent, size[0], size[1]);
    let elevationData = new ImageData(size[0], size[1]);

    for (let y = 0; y < size[1]; y++) {
      for (let x = 0; x < size[0]; x++) {
        elevationData.data[(y * size[0] + x) * 4 + 0] = elevation.pixelData.pixelBlock.pixels[0][y * size[0] + x];
        elevationData.data[(y * size[0] + x) * 4 + 1] = elevation.pixelData.pixelBlock.pixels[1][y * size[0] + x];
        elevationData.data[(y * size[0] + x) * 4 + 2] = elevation.pixelData.pixelBlock.pixels[2][y * size[0] + x];
        elevationData.data[(y * size[0] + x) * 4 + 3] = 255;
      }
    }

    elevationData = normalMap(elevationData);

    // const canvas = document.createElement("canvas");
    // canvas.width = size[0];
    // canvas.height = size[1];
    // const ctx = canvas.getContext("2d");
    // defined(ctx);
    // ctx.fillStyle = "white";
    // ctx.fillRect(20, 20, 100, 100);
    // elevationData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    
    await this._featureLayer.load();

    const query = this._featureLayer.createQuery();
    query.geometry = extent;
    const featureSet = await this._featureLayer.queryFeatures(query);
    const vertexData: number[] = [];
    const indexData: number[] = [];
    let count = 0;

    for (const feature of featureSet.features) {
      const point = feature.geometry as Point;
      const x = size[0] * (point.x - extent.xmin) / (extent.xmax - extent.xmin);
      const y = size[1] * (1 - (point.y - extent.ymin) / (extent.ymax - extent.ymin));
      vertexData.push(
        x, y, -0.5, -0.5,
        x, y,  0.5, -0.5,
        x, y, -0.5,  0.5,
        x, y,  0.5,  0.5
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

    return new LocalResources(new Float32Array(vertexData), new Uint32Array(indexData), elevationData);
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
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    // gl.disable(gl.CULL_FACE);

    const solidProgram = globalResources.program;
    gl.useProgram(solidProgram);

    gl.uniform1i(
      globalResources.uniforms["u_Elevation"]!,
      0
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, localResources.elevationTexture);
    
    gl.uniform2f(
      globalResources.uniforms["u_TexSize"]!,
      localResources.width,
      localResources.height
    );

    gl.uniform1f(
      globalResources.uniforms["u_Time"]!,
      performance.now() / 1000
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);
    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}



        // vec3 tot = vec3(0.0);
        // float h0 = height(v_Texcoord);

        // // for (float theta = 0.0; theta < 6.2830; theta += 0.5) {
        // //   vec2 dir = vec2(cos(theta), sin(theta));

        // //   for (float dist = 0.0; dist < 1.0; dist += 0.05) {
        // //     float h1 = height(v_Texcoord + dir * dist);
        // //     vec3 col = color(v_Texcoord + dir * dist);

        // //     for (int i = 0; i < 10; i++) {
        // //       float d = dist * float(i) / 10.0;
        // //       float h = height(v_Texcoord + dir * d);
        // //       float hi = h0 + (h1 - h0) * float(i) / 10.0;

        // //       if (hi < h) {
        // //         col = vec3(0.0);
        // //       }
        // //     }

        // //     tot += col;
        // //   }
        // // }

        // gl_FragColor = vec4(tot, 1.0);

        // // vec2 dir = vec2(-1.0, 1.0) / 1000.0;
        // // float intensity = 0.0;
        // // float coverage = 0.0;

        // // for (int i = 0; i < 100; i++) {
        // //   float h = texture2D(u_Elevation, v_Texcoord + dir * float(i)).r;
        // //   coverage = max(coverage, h);
        // //   intensity += exp(-30.0 * coverage);
        // //   // intensity += h * 0.01;
        // // }

        // // vec4 color = texture2D(u_Elevation, v_Texcoord);
        // // color += intensity;

        // gl_FragColor = u_Color;