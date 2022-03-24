import { Extent } from "esri/geometry";
import { mat4 } from "gl-matrix";
import { VisualizationStyle } from "../../core/rendering";
import { Pixels, Resources, VisualizationRenderParams } from "../../core/types";

export class GlobalResources implements Resources {
  program: WebGLProgram | null = null;
  uniforms: HashMap<WebGLUniformLocation> = {};
  vertexBuffer: WebGLBuffer | null = null;

  attach(gl: WebGLRenderingContext): void {
    // Compile the shaders.
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vertexShader,
      `
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
      }`
    );
    gl.compileShader(vertexShader);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      fragmentShader,
      `
      precision mediump float;
      varying vec2 v_Texcoord;
      uniform sampler2D u_Texture;
      void main(void) {
        gl_FragColor = vec4(v_Texcoord, 0.0, 1.0);
        gl_FragColor = texture2D(u_Texture, v_Texcoord);
        gl_FragColor.rgb *= gl_FragColor.a;
      }`
    );
    gl.compileShader(fragmentShader);

    // Link the program.
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.bindAttribLocation(program, 0, "a_Position");
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    this.uniforms["u_ScreenFromLocal"] = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
    this.uniforms["u_ClipFromScreen"] = gl.getUniformLocation(program, "u_ClipFromScreen")!;
    this.uniforms["u_Size"] = gl.getUniformLocation(program, "u_Size")!;
    this.uniforms["u_Texture"] = gl.getUniformLocation(program, "u_Texture")!;
    this.program = program;

    // Create the quad mesh.
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
  texture: WebGLTexture | null = null;

  constructor(private _extent: Extent, public size: [number, number]) {}

  attach(gl: WebGLRenderingContext): void {
    // Create test image using Canvas2D. This is inefficient, you should use
    // WebGL instead. But for this first example, we rather keep things simple.
    const image = document.createElement("canvas");
    image.width = this.size[0];
    image.height = this.size[1];
    const ctx = image.getContext("2d")!;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, 0, image.width, image.height);
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.strokeRect(0, 0, image.width, image.height);
    ctx.font = "35px monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillText(`xmin: ${this._extent.xmin}`, image.width / 2, image.height / 2 - 60);
    ctx.fillText(`xmax: ${this._extent.xmax}`, image.width / 2, image.height / 2 - 20);
    ctx.fillText(`ymin: ${this._extent.ymin}`, image.width / 2, image.height / 2 + 20);
    ctx.fillText(`ymax: ${this._extent.ymax}`, image.width / 2, image.height / 2 + 60);

    // Upload the test image to a texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.texture = texture;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteTexture(this.texture);
  }
}

export class TestPatternVisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  override async loadGlobalResources(): Promise<GlobalResources> {
    return new GlobalResources();
  }

  override async loadLocalResources(
    extent: Extent,
    size: [Pixels, Pixels]
  ): Promise<LocalResources> {
    return new LocalResources(extent, size);
  }

  override renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    globalResources: GlobalResources,
    localResources: LocalResources
  ): void {
    // Compute the `u_ScreenFromLocal` matrix. This matrix converts from local
    // pixel-like coordinates to actual screen positions. It scales, rotates and
    // translates by the amounts dictated by the render parameters.
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

    // Compute the `u_ClipFromScreen` matrix. This matrix converts from screen
    // coordinates in pixels to clip coordinates in the range [-1, +1].
    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [
      2 / (renderParams.size[0] * renderParams.pixelRatio),
      -2 / (renderParams.size[1] * renderParams.pixelRatio),
      1
    ]);

    // Bind the shader program and updates the uniforms.
    gl.useProgram(globalResources.program);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform2fv(globalResources.uniforms["u_Size"]!, localResources.size);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, localResources.texture);
    gl.uniform1i(globalResources.uniforms["u_Texture"]!, 0);

    // Enable premultiplied alpha blending.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Bind the quad mesh.
    gl.bindBuffer(gl.ARRAY_BUFFER, globalResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.UNSIGNED_BYTE, false, 2, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);

    // Draw the quad.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
