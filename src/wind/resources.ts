import { LocalResources as BaseLocalResources, SharedResources as BaseSharedResources } from "../base/resources";
import { defined } from "../util";
import { mat4 } from "gl-matrix";

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
      
      varying vec2 v_TexCoord;
      
      void main(void) {
        gl_FragColor = vec4(v_TexCoord, 0.0, 1.0);
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
          u_ScreenFromLocal: gl.getUniformLocation(program, "u_ScreenFromLocal")!,
          u_ClipFromScreen: gl.getUniformLocation(program, "u_ClipFromScreen")!
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
  u_ScreenFromLocal = mat4.create();
  u_ClipFromScreen = mat4.create();

  override attach(gl: WebGLRenderingContext): void {
    const vertexBuffer = gl.createBuffer();
    defined(vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
    this.vertexBuffer = vertexBuffer;
  }

  override detach(gl: WebGLRenderingContext): void {
    gl.deleteBuffer(this.vertexBuffer);
  }
}
