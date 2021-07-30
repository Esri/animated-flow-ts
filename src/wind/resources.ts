import { LocalResources as BaseLocalResources, SharedResources as BaseSharedResources } from "../base/resources";
import { defined } from "../util";
import { mat4 } from "gl-matrix";
import Extent from "@arcgis/core/geometry/Extent";

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
      }`;
      
    const fragmentSource = `
      precision mediump float;

      uniform sampler2D u_Texture;
      
      varying vec2 v_TexCoord;
      
      void main(void) {
        gl_FragColor = texture2D(u_Texture, v_TexCoord);
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

  constructor(extent: Extent, resolution: number, rasterData: any) {
    super(extent, resolution);

    const pixelBlock = rasterData.pixelData.pixelBlock;

    this.imageData = new ImageData(pixelBlock.width, pixelBlock.height);

    for (let y = 0; y < pixelBlock.height; y++) {
      for (let x = 0; x < pixelBlock.width; x++) {
        this.imageData.data[4 * (y * pixelBlock.width + x) + 0] = pixelBlock.pixels[0][y * pixelBlock.width + x];
        this.imageData.data[4 * (y * pixelBlock.width + x) + 1] = pixelBlock.pixels[1][y * pixelBlock.width + x];
        this.imageData.data[4 * (y * pixelBlock.width + x) + 2] = pixelBlock.pixels[2][y * pixelBlock.width + x];
        this.imageData.data[4 * (y * pixelBlock.width + x) + 3] = 255;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = this.imageData.width;
    canvas.height = this.imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(this.imageData, 0, 0);
    document.body.appendChild(canvas);

    // for (let i = 0; i < pixelBlock.pixels[0].length; i++) {
    //   this.imageData.data[4 * i + 0] = pixelBlock.pixels[0][i];
    //   this.imageData.data[4 * i + 1] = pixelBlock.pixels[1][i];
    //   this.imageData.data[4 * i + 2] = pixelBlock.pixels[2][i];
    //   this.imageData.data[4 * i + 3] = 255;
    // }

    // for (let y = 0; y < pixelBlock.height; y++) {
    //   for (let x = 0; x < pixelBlock.width; x++) {
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 0] = pixelBlock.pixels[0][y * pixelBlock.width + x];
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 1] = pixelBlock.pixels[1][y * pixelBlock.width + x];
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 2] = pixelBlock.pixels[2][y * pixelBlock.width + x];
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 3] = 255;
    //   }
    // }

    // for (let y = 0; y < pixelBlock.height; y++) {
    //   for (let x = 0; x < pixelBlock.width; x++) {
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 0] = pixelBlock.pixels[0][x * pixelBlock.height + y];
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 1] = pixelBlock.pixels[1][x * pixelBlock.height + y];
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 2] = pixelBlock.pixels[2][x * pixelBlock.height + y];
    //     this.imageData.data[4 * (y * pixelBlock.width + x) + 3] = 255;
    //   }
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
