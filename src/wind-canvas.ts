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
  console.log("halfRadius", halfRadius);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = Math.max(-halfRadius, 0); d <= Math.min(halfRadius, width - 1); d++) {
        const weight = Math.exp(-d * d / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * data[2 * (y * width + (x + d)) + 0]!;
        s1 += weight * data[2 * (y * width + (x + d)) + 1]!;
      }

      horizontal[2 * (y * width + x) + 0] = s0 / totalWeight;
      horizontal[2 * (y * width + x) + 1] = s1 / totalWeight;
    }
  }

  const final = new Float32Array(data.length);
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let totalWeight = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = Math.max(-halfRadius, 0); d <= Math.min(halfRadius, height - 1); d++) {
        const weight = Math.exp(-d * d / (sigma * sigma));

        totalWeight += weight;
        s0 += weight * horizontal[2 * ((y + d) * width + x) + 0]!;
        s1 += weight * horizontal[2 * ((y + d) * width + x) + 1]!;
      }

      final[2 * (y * width + x) + 0] = s0 / totalWeight;
      final[2 * (y * width + x) + 1] = s1 / totalWeight;
    }
  }

  return final;
}

function symbolize(pixelBlock: any): ImageData {
  // const W = pixelBlock.width;
  // const H = pixelBlock.height;
  // const POWER = 0.1;
  // const DECAY = 0.0025;
  // const HALF_RADIUS = 100;
  // const data = new Float32Array(W * H * 3);
  
  // for (let i = 0; i < 1000; i++) {
  //   const x = Math.round(Math.random() * W);
  //   const y = Math.round(Math.random() * H);
  //   const vx = POWER * (Math.random() * 2 - 1);
  //   const vy = POWER * (Math.random() * 2 - 1);
    
  //   for (let xi = x - HALF_RADIUS; xi <= x + HALF_RADIUS; xi++) {
  //     if (xi < 0 || xi >= W) {
  //       continue;
  //     }

  //     for (let yi = y - HALF_RADIUS; yi <= y + HALF_RADIUS; yi++) {
  //       if (yi < 0 || yi >= H) {
  //         continue;
  //       }

  //       const weight = Math.exp(-DECAY * ((x - xi) * (x - xi) + (y - yi) * (y - yi)));
        
  //       data[3 * (yi * W + xi) + 0] += vx * weight;
  //       data[3 * (yi * W + xi) + 1] += vy * weight;
  //       data[3 * (yi * W + xi) + 2] += weight;
  //     }
  //   }
  // }

  // for (let i = 0; i < W * H; i++) {
  //   if (data[3 * i + 2]! > 0.01) {
  //     data[3 * i + 0] /= data[3 * i + 2]!;
  //     data[3 * i + 1] /= data[3 * i + 2]!;
  //     data[3 * i + 2] = 1;
  //   } else {
  //     data[3 * i + 0] = 0;
  //     data[3 * i + 1] = 0;
  //     data[3 * i + 2] = 0;
  //   }
  // }

  const W = pixelBlock.width;
  const H = pixelBlock.height;
  const rawData = new Float32Array(W * H * 2);

  // let minMag = 1000000;
  // let maxMag = -1000000;
  // let minDir = 1000000;
  // let maxDir = -1000000;
  
  for (let i = 0; i < W * H; i++) {

    //   this.imageData.data[4 * i + 0] = pixelBlock.pixels[0][i];
    //   this.imageData.data[4 * i + 1] = pixelBlock.pixels[1][i];
    //   this.imageData.data[4 * i + 2] = 0;
    //   this.imageData.data[4 * i + 3] = 255;

    const mag = pixelBlock.pixels[0][i] / 10;
    const dir = Math.PI * pixelBlock.pixels[1][i] / 180;

    const co = Math.cos(dir);
    const si = Math.sin(dir);
    const u = co * mag + si * mag;
    const v = -si * mag + co * mag;

    // minMag = Math.min(minMag, mag);
    // minDir = Math.min(minDir, dir);
    // maxMag = Math.max(maxMag, mag);
    // maxDir = Math.max(maxDir, dir);

    rawData[2 * i + 0] = u;
    rawData[2 * i + 1] = v;
    

    // data[3 * i + 0] = Math.random() * 2 - 1;
    // data[3 * i + 1] = Math.random() * 2 - 1;
    // data[3 * i + 2] = 1;
  }

  const data = smooth(rawData, W, H, 10);

  // console.log(minMag, maxMag, minDir, maxDir);

  // const COLOR_SCALE = 1;

  // function clamp(x: number): number {
  //   if (x < -1) {
  //     return -1;
  //   }
  //   if (x > 1) {
  //     return 1;
  //   }
  //   return x;
  // }

  const imageData = new ImageData(W, H);
  // for (let i = 0; i < W * H; i++) {
  //   const vx = data[2 * i + 0]!;
  //   const vy = data[2 * i + 1]!;
  //   imageData.data[4 * i + 0] = Math.round(127.5 + 127.5 * clamp(vx) * COLOR_SCALE);
  //   imageData.data[4 * i + 1] = Math.round(127.5 + 127.5 * clamp(vy) * COLOR_SCALE);
  //   imageData.data[4 * i + 2] = 255;
  //   imageData.data[4 * i + 3] = 100;
  // }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.style.border = "1px solid black";
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);

  function f(x: number, y: number): [number, number] {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    if (X < 0 || X >= W) {
      return [0, 0];
    }
    if (Y < 0 || Y >= H) {
      return [0, 0];
    }
    return [data[2 * (Y * W + X) + 0]!, data[2 * (Y * W + X) + 1]!];
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";

  const SEGMENT_LENGTH = 0.1;

  ctx.strokeStyle = "rgba(60, 160, 220, 0.2)";

  function trace(field: (x: number, y: number) => [number, number], x0: number, y0: number) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let t = 0;
    let c = 0;
    
    let x = x0;
    let y = y0;
    
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
      ctx.lineTo(x, y);
      c++;
    }
    
    ctx.stroke();
  }

  for (let i = 0; i < 20000; i++) {
    trace(f, Math.round(Math.random() * W), Math.round(Math.random() * H));
  }

  return ctx.getImageData(0, 0, W, H);
}

export class SharedResources extends BaseSharedResources {
  programs: HashMap<{
    program: WebGLProgram;
    uniforms: HashMap<WebGLUniformLocation>
  }> | null = null;

  override attach(gl: WebGLRenderingContext): void {
    const vertexSource = `
      attribute vec2 a_Position;
      attribute vec2 a_TexCoord;
      
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_ClipFromScreen;
      
      varying vec2 v_TexCoord;
      
      void main(void) {
        gl_Position = u_ClipFromScreen * u_ScreenFromLocal * vec4(a_Position / 8.0, 0.0, 1.0);
        v_TexCoord = a_TexCoord;
      }`;
      
    const fragmentSource = `
      precision mediump float;

      uniform sampler2D u_Texture;
      uniform float u_Opacity;
      
      varying vec2 v_TexCoord;
      
      void main(void) {
        gl_FragColor = texture2D(u_Texture, v_TexCoord);
        gl_FragColor.a *= u_Opacity;
        gl_FragColor.rgb *= gl_FragColor.a;
        // gl_FragColor = vec4(v_TexCoord, 0.0, 1.0);
        // gl_FragColor.a = 0.6;
        // gl_FragColor.rgb *= gl_FragColor.a;
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

    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
    console.log(gl.getProgramInfoLog(program));
    
    this.programs = {
      texture: {
        program,
        uniforms: {
          u_ScreenFromLocal: gl.getUniformLocation(program, "u_ScreenFromLocal")!,
          u_ClipFromScreen: gl.getUniformLocation(program, "u_ClipFromScreen")!,
          u_Texture: gl.getUniformLocation(program, "u_Texture")!,
          u_Opacity: gl.getUniformLocation(program, "u_Opacity")!
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
  texture: WebGLTexture | null = null;
  u_ScreenFromLocal = mat4.create();
  u_ClipFromScreen = mat4.create();
  private imageData: ImageData | null;

  constructor(extent: Extent, resolution: number, pixelBlock: any) {
    super(extent, resolution);

    this.imageData = symbolize(pixelBlock);

    // this.imageData = new ImageData(pixelBlock.width, pixelBlock.height);
    
    // for (let i = 0; i < pixelBlock.pixels[0].length; i++) {
    //   this.imageData.data[4 * i + 0] = pixelBlock.pixels[0][i];
    //   this.imageData.data[4 * i + 1] = pixelBlock.pixels[1][i];
    //   this.imageData.data[4 * i + 2] = 0;
    //   this.imageData.data[4 * i + 3] = 255;
    // }
  }

  override attach(gl: WebGLRenderingContext): void {
    const vertexBuffer = gl.createBuffer();
    defined(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Int16Array([
      0, 0, 0, 32767,
      this.size[0] * 8, 0, 32767, 32767,
      0, this.size[1] * 8, 0, 0,
      this.size[0] * 8, this.size[1] * 8, 32767, 0
    ]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    defined(this.imageData);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.imageData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.imageData = null;
  
    this.vertexBuffer = vertexBuffer;
    this.texture = texture;
  }

  override detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteTexture(this.texture);
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

  constructor(params: any) {
    super(params);

    // https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer
    // https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/World_Wind/ImageServer
    // https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer

    // this._imageryLayer = new ImageryLayer({
    //   
    // });

    this._imageryTileLayer = new ImageryTileLayer({
      // url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/World_Wind/ImageServer"
      url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer"
    });

    // this._imageryLayer = new ImageryLayer({
    //   url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer"
    // });
  }
  
  override loadSharedResources(): Promise<SharedResources> {
    return Promise.resolve(new SharedResources());
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
    gl.vertexAttribPointer(0, 2, gl.SHORT, false, 8, 0);
    gl.vertexAttribPointer(1, 2, gl.SHORT, true, 8, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [2 / renderParams.size[0], -2 / renderParams.size[1], 1]);
  
    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [renderParams.translation[0], renderParams.translation[1], 1]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [renderParams.scale, renderParams.scale, 1]);
    // mat4.translate();

    const solidProgram = sharedResources.programs!["texture"]?.program!;
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform1i(sharedResources.programs!["texture"]?.uniforms["u_Texture"]!, 0);
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_Opacity"]!, renderParams.opacity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, localResources.texture);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
