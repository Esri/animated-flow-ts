import { mat4 } from "gl-matrix";
import { VisualizationStyle } from "../../core/rendering";
import { Resources, VisualizationRenderParams } from "../../core/types";
import { defined } from "../../core/util";

export class GlobalResources implements Resources {
  program: WebGLProgram | null = null;
  uniforms: HashMap<WebGLUniformLocation> = {};
  vertexBuffer: WebGLBuffer | null = null;

  attach(gl: WebGLRenderingContext): void {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, `
      attribute vec2 a_Position;
      uniform mat4 u_ScreenFromLocal;
      uniform mat4 u_ClipFromScreen;
      uniform vec2 u_Size;
      varying vec2 v_Texcoord;
      void main(void) {
        vec2 pos = a_Position * u_Size;
        vec4 screen = u_ScreenFromLocal * vec4(pos, 0.0, 1.0);
        vec4 clip = u_ClipFromScreen * screen;
        gl_Position = clip;
        v_Texcoord = vec2(a_Position.x, 1.0 - a_Position.y);
      }`);
    gl.compileShader(vertexShader);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, `
      precision mediump float;
      varying vec2 v_Texcoord;
      void main(void) {
        gl_FragColor = vec4(v_Texcoord, 0.0, 1.0);
        gl_FragColor.rgb *= gl_FragColor.a;
      }`);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "a_Position");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.program = program;
    this.uniforms["u_ScreenFromLocal"] = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
    this.uniforms["u_ClipFromScreen"] = gl.getUniformLocation(program, "u_ClipFromScreen")!;
    this.uniforms["u_Size"] = gl.getUniformLocation(program, "u_Size")!;

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.vertexBuffer = vertexBuffer;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.vertexBuffer);
  }
}

export class LocalResources implements Resources {
  u_ScreenFromLocal = mat4.create();
  u_ClipFromScreen = mat4.create();

  attach(): void {
  }

  detach(): void {
  }
}

export class TestPatternVisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  constructor() {
    super();
  }

  override async loadGlobalResources(): Promise<GlobalResources> {
    return new GlobalResources();
  }

  override async loadLocalResources(): Promise<LocalResources> {
    return new LocalResources();
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
      globalResources.uniforms["u_ClipFromScreen"]!,
      false,
      localResources.u_ClipFromScreen
    );

    defined(globalResources.vertexBuffer);
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const solidProgram = globalResources.program;
    gl.useProgram(solidProgram);

    gl.uniform2fv(
      globalResources.uniforms["u_Size"]!,
      renderParams.size
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, globalResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.UNSIGNED_BYTE, false, 2, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
