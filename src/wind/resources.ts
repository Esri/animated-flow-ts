import { LocalResources as BaseLocalResources, SharedResources as BaseSharedResources } from "../base/resources";
import { defined } from "../util";
import { mat4 } from "gl-matrix";
import Extent from "@arcgis/core/geometry/Extent";

function smooth(data: Float32Array, W: number, H: number): Float32Array {
  const horizontal = new Float32Array(data.length);

  const HALF_RADIUS = 20;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let total = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = Math.max(-HALF_RADIUS, 0); d <= Math.min(HALF_RADIUS, W - 1); d++) {
        const w = Math.exp(-0.1 * d);

        total += w;
        s0 += w * data[2 * (y * W + (x + d)) + 0]!;
        s1 += w * data[2 * (y * W + (x + d)) + 1]!;
      }

      horizontal[2 * (y * W + x) + 0] = s0 / total;
      horizontal[2 * (y * W + x) + 1] = s1 / total;
    }
  }

  const final = new Float32Array(data.length);
  
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let total = 0;
      let s0 = 0;
      let s1 = 0;

      for (let d = Math.max(-HALF_RADIUS, 0); d <= Math.min(HALF_RADIUS, H - 1); d++) {
        const w = Math.exp(-0.1 * d);

        total += w;
        s0 += w * horizontal[2 * ((y + d) * W + x) + 0]!;
        s1 += w * horizontal[2 * ((y + d) * W + x) + 1]!;
      }

      final[2 * (y * W + x) + 0] = s0 / total;
      final[2 * (y * W + x) + 1] = s1 / total;
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

  const data = smooth(rawData, W, H);

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

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";

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
      attribute vec4 a_Position;
      
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_ClipFromScreen;
      
      varying vec2 v_TexCoord;
      
      void main(void) {
        gl_Position = u_ClipFromScreen * u_ScreenFromLocal * a_Position;
        v_TexCoord = a_Position.xy;
        v_TexCoord.y = 1.0 - v_TexCoord.y;
      }`;
      
    const fragmentSource = `
      precision mediump float;

      uniform sampler2D u_Texture;
      
      varying vec2 v_TexCoord;
      
      void main(void) {
        gl_FragColor = texture2D(u_Texture, v_TexCoord);
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
          u_Texture: gl.getUniformLocation(program, "u_Texture")!
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    defined(this.imageData);
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
