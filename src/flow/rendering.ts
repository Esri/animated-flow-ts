import Extent from "esri/geometry/Extent";
import { mat4 } from "gl-matrix";
import { LocalResources, SharedResources } from "../core/rendering";
import { defined } from "../core/util";

export class FlowSharedResources extends SharedResources {
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

export class FlowLocalResources extends LocalResources {
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
    pixelRatio: number,
    downsample: number,
    vertexData: Float32Array,
    indexData: Uint32Array
  ) {
    super(extent, resolution, pixelRatio);

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

export class FlowVisualization {

}