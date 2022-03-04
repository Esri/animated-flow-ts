import Extent from "esri/geometry/Extent";
import Point from "esri/geometry/Point";
import FeatureLayer from "esri/layers/FeatureLayer";
import ImageryLayer from "esri/layers/ImageryLayer";
import { VisualizationStyle } from "../core/rendering";
import { MapUnitsPerPixel, Pixels, Resources, VisualizationRenderParams } from "../core/types";
import { defined, throwIfAborted } from "../core/util";

export class GlobalResources implements Resources {
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  programs: HashMap<{
    program: WebGLProgram;
    uniforms: HashMap<WebGLUniformLocation>;
  }> | null = null;

  attach(gl: WebGLRenderingContext): void {
    const vertexBuffer = gl.createBuffer();
    defined(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, 1
    ]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const indexBuffer = gl.createBuffer();
    defined(indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array([
      0, 1, 2, 1, 3, 2
    ]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;

    const vertexSource = `
      attribute vec2 a_Position;

      varying vec2 v_Texcoord;
      
      void main(void) {
        gl_Position = vec4(a_Position, 0.0, 1.0);
        v_Texcoord = (a_Position + 1.0) / 2.0;
      }`;

    const fragmentSource = `
      precision mediump float;

      varying vec2 v_Texcoord;

      uniform sampler2D u_Elevation;
      uniform sampler2D u_Light;
      uniform vec4 u_Color;

      float height(vec2 uv) {
        return texture2D(u_Elevation, uv).r;
      }

      vec3 color(vec2 uv) {
        return texture2D(u_Light, uv).rgb;
      }

      void main(void) {
        vec3 tot = vec3(0.0);
        float h0 = height(v_Texcoord);

        // for (float theta = 0.0; theta < 6.2830; theta += 0.5) {
        //   vec2 dir = vec2(cos(theta), sin(theta));

        //   for (float dist = 0.0; dist < 1.0; dist += 0.05) {
        //     float h1 = height(v_Texcoord + dir * dist);
        //     vec3 col = color(v_Texcoord + dir * dist);

        //     for (int i = 0; i < 10; i++) {
        //       float d = dist * float(i) / 10.0;
        //       float h = height(v_Texcoord + dir * d);
        //       float hi = h0 + (h1 - h0) * float(i) / 10.0;

        //       if (hi < h) {
        //         col = vec3(0.0);
        //       }
        //     }

        //     tot += col;
        //   }
        // }

        gl_FragColor = vec4(tot, 1.0);

        // vec2 dir = vec2(-1.0, 1.0) / 1000.0;
        // float intensity = 0.0;
        // float coverage = 0.0;

        // for (int i = 0; i < 100; i++) {
        //   float h = texture2D(u_Elevation, v_Texcoord + dir * float(i)).r;
        //   coverage = max(coverage, h);
        //   intensity += exp(-30.0 * coverage);
        //   // intensity += h * 0.01;
        // }

        // vec4 color = texture2D(u_Elevation, v_Texcoord);
        // color += intensity;

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

    this.programs = {
      solid: {
        program,
        uniforms: {
          u_Color: gl.getUniformLocation(program, "u_Color")!,
          u_Elevation: gl.getUniformLocation(program, "u_Elevation")!,
          u_Light: gl.getUniformLocation(program, "u_Light")!
        }
      }
    };
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.programs!["solid"]?.program!);
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}

export class LocalResources implements Resources {
  vertexData: Float32Array | null;
  indexData: Uint32Array | null;
  elevationData: ImageData | null;
  lightData: ImageData | null;
  indexCount = 0;
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  elevationTexture: WebGLTexture | null = null;
  lightTexture: WebGLTexture | null = null;

  constructor(vertexData: Float32Array, indexData: Uint32Array, elevationData: ImageData, lightData: ImageData) {
    this.vertexData = vertexData;
    this.indexData = indexData;
    this.indexCount = indexData.length;
    this.elevationData = elevationData;
    this.lightData = lightData;
  }

  attach(gl: WebGLRenderingContext): void {
    defined(this.vertexData);
    defined(this.indexData);
    defined(this.elevationData);
    defined(this.lightData);

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

    const lightTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.lightData);
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
    this.lightTexture = lightTexture;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
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
    const vertexData = new Float32Array([-0.1, -0.1, 0.1, -0.1, 0, 0.1]);
    const indexData = new Uint32Array([0, 1, 2]);

    const elevationData = new ImageData(size[0], size[1]);

    for (let y = 0; y < size[1]; y++) {
      for (let x = 0; x < size[0]; x++) {
        elevationData.data[(y * size[0] + x) * 4 + 0] = elevation.pixelData.pixelBlock.pixels[0][y * size[0] + x];
        elevationData.data[(y * size[0] + x) * 4 + 1] = elevation.pixelData.pixelBlock.pixels[1][y * size[0] + x];
        elevationData.data[(y * size[0] + x) * 4 + 2] = elevation.pixelData.pixelBlock.pixels[2][y * size[0] + x];
        elevationData.data[(y * size[0] + x) * 4 + 3] = 255;
      }
    }

    const lightCanvas = document.createElement("canvas");
    lightCanvas.width = size[0];
    lightCanvas.height = size[1];
    const ctx = lightCanvas.getContext("2d");
    defined(ctx);
    
    await this._featureLayer.load();

    const query = this._featureLayer.createQuery();
    query.geometry = extent;
    const featureSet = await this._featureLayer.queryFeatures(query);

    for (const feature of featureSet.features) {
      const point = feature.geometry as Point;
      const x = size[0] * (point.x - extent.xmin) / (extent.xmax - extent.xmin);
      const y = size[1] * (1 - (point.y - extent.ymin) / (extent.ymax - extent.ymin));
      ctx.fillStyle = "red";
      ctx.fillRect(x - 10, y - 10, 20, 20);
    }

    const lightData = ctx.getImageData(0, 0, lightCanvas.width, lightCanvas.height);

    return new LocalResources(vertexData, indexData, elevationData, lightData);
  }

  override renderVisualization(
    gl: WebGLRenderingContext,
    _renderParams: VisualizationRenderParams,
    globalResources: GlobalResources,
    localResources: LocalResources
  ): void {
    defined(localResources.vertexBuffer);
    defined(globalResources.vertexBuffer);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    const solidProgram = globalResources.programs!["solid"]?.program!;
    gl.useProgram(solidProgram);

    gl.uniform1i(
      globalResources.programs!["solid"]?.uniforms["u_Elevation"]!,
      0
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, localResources.elevationTexture);

    gl.uniform1i(
      globalResources.programs!["solid"]?.uniforms["u_Light"]!,
      1
    );
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, localResources.lightTexture);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, globalResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, globalResources.indexBuffer);
    gl.uniform4f(
      globalResources.programs!["solid"]?.uniforms["u_Color"]!,
      1,
      0,
      0,
      1
    );
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);
    gl.uniform4f(
      globalResources.programs!["solid"]?.uniforms["u_Color"]!,
      0,
      0,
      1,
      1
    );
    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_INT, 0);
  }
}
