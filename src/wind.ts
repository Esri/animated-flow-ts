import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Extent from "@arcgis/core/geometry/Extent";
import { mat4 } from "gl-matrix";
import { LayerView2D as BaseLayerView2D, VisualizationRenderParams, LocalResources as BaseLocalResources, SharedResources as BaseSharedResources } from "./base";
import { defined } from "./util";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";
import BaseLayer from "@arcgis/core/layers/Layer";

function smooth(data: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const horizontal = new Float32Array(data.length);

  const halfRadius = Math.round(3 * sigma);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = -halfRadius; d <= halfRadius; d++) {
        if (x + d < 0 || x + d >= width) {
          continue;
        }

        const weight = Math.exp(-d * d / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * data[2 * (y * width + (x + d)) + 0]!;
        s1 += weight * data[2 * (y * width + (x + d)) + 1]!;
      }

      horizontal[2 * (y * width + x) + 0] = totalWeight < 0.001 ? 0 : (s0 / totalWeight);
      horizontal[2 * (y * width + x) + 1] = totalWeight < 0.001 ? 0 : (s1 / totalWeight);
    }
  }

  const final = new Float32Array(data.length);
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = -halfRadius; d <= halfRadius; d++) {
        if (y + d < 0 || y + d >= height) {
          continue;
        }

        const weight = Math.exp(-d * d / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * horizontal[2 * ((y + d) * width + x) + 0]!;
        s1 += weight * horizontal[2 * ((y + d) * width + x) + 1]!;
      }

      final[2 * (y * width + x) + 0] = totalWeight < 0.001 ? 0 : (s0 / totalWeight);
      final[2 * (y * width + x) + 1] = totalWeight < 0.001 ? 0 : (s1 / totalWeight);
    }
  }

  return final;
}

function getFlowLines(pixelBlock: any): { position: [number, number]; distance: number; time: number; }[][] {
  const W = pixelBlock.width;
  const H = pixelBlock.height;
  const rawData = new Float32Array(W * H * 2);

  for (let i = 0; i < W * H; i++) {
    const mag = pixelBlock.pixels[0][i] / 10;
    const dir = Math.PI * pixelBlock.pixels[1][i] / 180;

    const co = Math.cos(dir);
    const si = Math.sin(dir);
    const u = co * mag + si * mag;
    const v = -si * mag + co * mag;
    
    rawData[2 * i + 0] = u;
    rawData[2 * i + 1] = v;
  }

  const data = smooth(rawData, W, H, 10);

  /////////////////////////////////////////////////////

  function f(x: number, y: number): [number, number] {
    const X = Math.round(x);
    const Y = Math.round(y);
    if (X < 0 || X >= W) {
      return [0, 0];
    }
    if (Y < 0 || Y >= H) {
      return [0, 0];
    }
    return [data[2 * (Y * W + X) + 0]!, data[2 * (Y * W + X) + 1]!];
  }
  
  /////////////////////////////////////////////////////

  const lines: { position: [number, number]; distance: number; time: number; }[][] = [];

  // const SEGMENT_LENGTH = 0.1;
  const SEGMENT_LENGTH = 10;

  function trace(field: (x: number, y: number) => [number, number], x0: number, y0: number) {
    const line: { position: [number, number]; distance: number; time: number; }[] = [];

    let t = 0;
    let d = 0;
    let c = 0;
    
    let x = x0;
    let y = y0;

    line.push({
      position: [x, y],
      distance: d,
      time: t
    });
    
    while (t < 1000 && c < 1000) {
      const [vx, vy] = field(x, y);
      const v = Math.sqrt(vx * vx + vy * vy);
      if (v < 0.001) {
        return;
      }
      const dx = vx / v;
      const dy = vy / v;
      x += dx * SEGMENT_LENGTH;
      y += dy * SEGMENT_LENGTH;
      const dt = SEGMENT_LENGTH / v;
      t += dt;
      d += SEGMENT_LENGTH;
      c++;

      line.push({
        position: [x, y],
        distance: d,
        time: t
      });
    }

    lines.push(line);
  }

  // for (let i = 0; i < 10; i++) {
  //   trace(f, Math.round(Math.random() * W), Math.round(Math.random() * H));
  // }

  for (let i = 0; i < 5000; i++) {
    trace(f, Math.round(Math.random() * W), Math.round(Math.random() * H));
  }
  
  return lines;
}

export class SharedResources extends BaseSharedResources {
  programs: HashMap<{
    program: WebGLProgram;
    uniforms: HashMap<WebGLUniformLocation>
  }> | null = null;

  override attach(gl: WebGLRenderingContext): void {
    const vertexSource = `
      attribute vec2 a_Position;
      attribute vec2 a_Extrude;
      attribute float a_Side;
      attribute float a_Time;
      attribute float a_Distance;
      
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_Rotation;
      uniform mat4 u_ClipFromScreen;

      varying float v_Side;
      varying float v_Time;
      
      void main(void) {
        vec4 screenPosition = u_ScreenFromLocal * vec4(a_Position, 0.0, 1.0);
        screenPosition += u_Rotation * vec4(a_Extrude, 0.0, 0.0);
        gl_Position = u_ClipFromScreen * screenPosition;
        v_Side = a_Side;
        v_Time = a_Time;
      }`;
      
    const fragmentSource = `
      precision mediump float;

      uniform float u_Opacity;
      uniform float u_Time;
      
      varying float v_Side;
      varying float v_Time;

      void main(void) {
        gl_FragColor = vec4(60.0 / 255.0, 160.0 / 255.0, 220.0 / 255.0, 1.0);

        gl_FragColor.a *= u_Opacity * (1.0 - length(v_Side));
        
        float t = 10.0 * (u_Time - 10.0);

        if (t < v_Time) {
          gl_FragColor.a *= 0.0;
        } else {
          gl_FragColor.a *= exp(-0.01 * (t - v_Time));
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
    gl.bindAttribLocation(program, 4, "a_Distance");
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
          u_Opacity: gl.getUniformLocation(program, "u_Opacity")!,
          u_Time: gl.getUniformLocation(program, "u_Time")!
        }
      }
    };
  }

  override detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.programs!["solid"]?.program!);
  }
}

export class LocalResources extends BaseLocalResources {
  vertexBuffer: WebGLBuffer | null = null;
  indexBuffer: WebGLBuffer | null = null;
  u_ScreenFromLocal = mat4.create();
  u_Rotation = mat4.create();
  u_ClipFromScreen = mat4.create();
  private flowLines: { position: [number, number]; distance: number; time: number; }[][] | null;
  indexCount = 0;

  constructor(extent: Extent, resolution: number, pixelBlock: any) {
    super(extent, resolution);

    this.flowLines = getFlowLines(pixelBlock);
  }

  override attach(gl: WebGLRenderingContext): void {
    let vertexCount = 0;
    const vertexData: number[] = [];
    const indexData: number[] = [];

    defined(this.flowLines);

    for (const line of this.flowLines) {
      for (let i = 1; i < line.length; i++) {
        const { position: [x0, y0], time: t0, distance: d0 } = line[i - 1]!;
        const { position: [x1, y1], time: t1, distance: d1 } = line[i]!;

        const l = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
        const ex = -(y1 - y0) / l;
        const ey = (x1 - x0) / l;

        vertexData.push(
          x0, y0, ex * 32767, ey * 32767, -1, t0, d0,
          x0, y0, -ex * 32767, -ey * 32767, +1, t0, d0,
          x1, y1, ex * 32767, ey * 32767, -1, t1, d1,
          x1, y1, -ex * 32767, -ey * 32767, +1, t1, d1,
        );

        indexData.push(
          vertexCount + 0,
          vertexCount + 1,
          vertexCount + 2,
          vertexCount + 1,
          vertexCount + 3,
          vertexCount + 2
        );

        vertexCount += 4;
      }
    }

    this.indexCount = indexData.length;

    const vertexBuffer = gl.createBuffer();
    defined(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(vertexData), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const indexBuffer = gl.createBuffer();
    defined(indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    this.flowLines = null;
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;

    console.log("DONE!");
  }

  override detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
  }
}


@subclass("wind-es.wind.Layer")
export class Layer extends BaseLayer {
  spatialReference = {
    wkid: 4326
  };

  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new LayerView2D({
        view: view,
        layer: this
      } as any);
    }
  }
}

@subclass("wind-es.wind.LayerView2D")
export class LayerView2D extends BaseLayerView2D<SharedResources, LocalResources> {
  private _imageryTileLayer: ImageryTileLayer;

  override animate = true;

  constructor(params: any) {
    super(params);
    
    this._imageryTileLayer = new ImageryTileLayer({
      url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer"
    });

    const worker = new Worker("/wind-worker.js");
    console.log(worker);
  }
  
  override async loadSharedResources(): Promise<SharedResources> {
    return new SharedResources();
  }

  override async loadLocalResources(extent: Extent, resolution: number): Promise<LocalResources> {
    const width = Math.round((extent.xmax - extent.xmin) / resolution);
    const height = Math.round((extent.ymax - extent.ymin) / resolution);

    await this._imageryTileLayer.load();
    const rasterData = await this._imageryTileLayer.fetchPixels(extent, width, height);

    return new LocalResources(extent, resolution, rasterData.pixelBlock);
  }

  override renderVisualization(gl: WebGLRenderingContext, renderParams: VisualizationRenderParams, sharedResources: SharedResources, localResources: LocalResources): void {
    defined(localResources.vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.SHORT, false, 14, 0);
    gl.vertexAttribPointer(1, 2, gl.SHORT, true, 14, 4);
    gl.vertexAttribPointer(2, 1, gl.SHORT, false, 14, 8);
    gl.vertexAttribPointer(3, 1, gl.SHORT, false, 14, 10);
    gl.vertexAttribPointer(4, 1, gl.SHORT, false, 14, 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);
    gl.enableVertexAttribArray(4);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, localResources.indexBuffer);

    gl.disable(gl.CULL_FACE);

    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [2 / renderParams.size[0], -2 / renderParams.size[1], 1]);

    mat4.identity(localResources.u_Rotation);
    mat4.rotateZ(localResources.u_Rotation, localResources.u_Rotation, renderParams.rotation);

    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [renderParams.translation[0], renderParams.translation[1], 1]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [renderParams.scale, renderParams.scale, 1]);
    // mat4.translate();

    const solidProgram = sharedResources.programs!["texture"]?.program!;
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_Rotation"]!, false, localResources.u_Rotation);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_Opacity"]!, renderParams.opacity);
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_Time"]!, performance.now() / 1000.0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawElements(gl.TRIANGLES, localResources.indexCount, gl.UNSIGNED_SHORT, 0);
  }
}
