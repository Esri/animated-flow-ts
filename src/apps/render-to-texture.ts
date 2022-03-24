import { SpatialReference } from "esri/geometry";
import Extent from "esri/geometry/Extent";
import { ShimmerVisualizationStyle } from "../jumpstart/03-shimmer/rendering";

const canvas = document.createElement("canvas");
canvas.width = 640;
canvas.height = 360;
canvas.style.border = "1px solid black";
document.body.appendChild(canvas);

const gl = canvas.getContext("webgl")!;
gl.getExtension("OES_element_index_uint");

const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(
  vertexShader,
  `
  attribute vec2 a_Position;
  attribute vec2 a_Texcoord;
  varying vec2 v_Texcoord;
  void main(void) {
    gl_Position = vec4(a_Position, 0.0, 1.0);
    v_Texcoord = a_Texcoord;
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
    gl_FragColor = texture2D(u_Texture, v_Texcoord);
  }`
);
gl.compileShader(fragmentShader);

const program = gl.createProgram()!;
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.bindAttribLocation(program, 0, "a_Position");
gl.bindAttribLocation(program, 1, "a_Texcoord");
gl.linkProgram(program);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);
const loc_Texture = gl.getUniformLocation(program, "u_Texture")!;

const FBO_SIZE: [number, number] = [512, 512];

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, new ImageData(FBO_SIZE[0], FBO_SIZE[1]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.bindTexture(gl.TEXTURE_2D, null);

const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

const style = new ShimmerVisualizationStyle(
  "https://services.arcgis.com/AgwDJMQH12AGieWa/arcgis/rest/services/global_power_plant_database_June_2018/FeatureServer",
  "fuel1",
  {
    Wind: [1, 0, 0, 1],
    Solar: [0, 1, 0, 1],
    Hydro: [0, 0, 1, 1]
  },
  [1, 1, 1, 1]
);

async function main(): Promise<void> {
  const globalResources = await style.loadGlobalResources();
  const localResources = await style.loadLocalResources(
    new Extent({ xmin: -140, xmax: -60, ymin: 0, ymax: 80, spatialReference: SpatialReference.WGS84 }),
    FBO_SIZE,
    1,
    new AbortController().signal
  );
  let attached = false;

  function render(): void {
    if (!attached) {
      globalResources.attach(gl);
      localResources.attach(gl);
      attached = true;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, FBO_SIZE[0], FBO_SIZE[1]);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    style.renderVisualization(
      gl,
      {
        size: FBO_SIZE,
        translation: [0, 0],
        rotation: 0,
        scale: 1,
        opacity: 1,
        pixelRatio: 1
      },
      globalResources,
      localResources
    );

    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.2, 0.3, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(loc_Texture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.BYTE, false, 4, 0);
    gl.vertexAttribPointer(1, 2, gl.BYTE, false, 4, 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(): void {
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main();
