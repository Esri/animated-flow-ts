import { Extent } from "esri/geometry";
import ImageryTileLayer from "esri/layers/ImageryTileLayer";
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
      uniform float u_Time;
      void main(void) {
        float h = texture2D(u_Texture, v_Texcoord).r;
        float intensity = 0.5 + 0.5 * sin(h * 20.0 + u_Time);;
        gl_FragColor = vec4(0.2, 0.4, 1.0, intensity * h);
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
    this.uniforms["u_Time"] = gl.getUniformLocation(program, "u_Time")!;
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
  size: [number, number];

  private _image: TexImageSource | null = null;

  constructor(image: TexImageSource) {
    this._image = image;
    this.size = [image.width, image.height];
  }

  attach(gl: WebGLRenderingContext): void {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._image!);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.texture = texture;
    this._image = null;
  }

  detach(gl: WebGLRenderingContext): void {
    gl.deleteTexture(this.texture);
  }
}

export class FancyRasterVisualizationStyle extends VisualizationStyle<GlobalResources, LocalResources> {
  private _imageryTileLayer: ImageryTileLayer;

  constructor(url: string) {
    super();

    this._imageryTileLayer = new ImageryTileLayer({ url });
  }

  override async loadGlobalResources(): Promise<GlobalResources> {
    return new GlobalResources();
  }

  override async loadLocalResources(
    extent: Extent,
    size: [Pixels, Pixels],
    __: number,
    signal: AbortSignal
  ): Promise<LocalResources> {
    await this._imageryTileLayer.load();

    // Create a blank image data.
    const image = new ImageData(size[0], size[1]);

    // Fetch data from the imagery layer.
    const result = await this._imageryTileLayer.fetchPixels(extent, size[0], size[1], { signal });

    if (result) {
      // If fetching is successful, find the minimum and maximum values
      // in the data raster.
      const { pixelBlock } = result;
      let max = 0;
      let min = 1000000;

      for (let y = 0; y < pixelBlock.height; y++) {
        for (let x = 0; x < pixelBlock.width; x++) {
          max = Math.max(max, pixelBlock.pixels[0][y * size[0] + x]);
          min = Math.min(min, pixelBlock.pixels[0][y * size[0] + x]);
        }
      }

      // Convert the data to a 8-bit RGBA image. Map the minimum value to
      // black and the maximum value to red.
      for (let y = 0; y < pixelBlock.height; y++) {
        for (let x = 0; x < pixelBlock.width; x++) {
          const h = (pixelBlock.pixels[0][y * size[0] + x] - min) / (max - min);
          image.data[(y * size[0] + x) * 4 + 0] = Math.floor(h * 255);
          image.data[(y * size[0] + x) * 4 + 1] = 0;
          image.data[(y * size[0] + x) * 4 + 2] = 0;
          image.data[(y * size[0] + x) * 4 + 3] = 255;
        }
      }
    }

    return new LocalResources(image);
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
      0
    ]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [
      renderParams.scale,
      renderParams.scale,
      1
    ]);

    // Compute the `u_ClipFromScreen` matrix. This matrix converts from screen
    // coordinates in pixels to clip coordinates in the range [-1, +1].
    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [
      2 / renderParams.size[0],
      -2 / renderParams.size[1],
      1
    ]);

    // Bind the shader program and updates the uniforms.
    gl.useProgram(globalResources.program);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(globalResources.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform2fv(globalResources.uniforms["u_Size"]!, localResources.size);
    gl.uniform1f(globalResources.uniforms["u_Time"]!, performance.now() / 1000);
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
