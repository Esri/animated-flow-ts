import { SpatialReference } from "esri/geometry";
import Extent from "esri/geometry/Extent";
import { mat4 } from "gl-matrix";
import { ShimmerVisualizationStyle } from "../jumpstart/03-shimmer/rendering";

// Create canvas.
const canvas = document.createElement("canvas");
canvas.width = 1280;
canvas.height = 720;
canvas.style.border = "1px solid black";
document.body.appendChild(canvas);

// Get context. The visual style that we instantiate in this app
// requires 32 bit indices.
const gl = canvas.getContext("webgl")!;
gl.getExtension("OES_element_index_uint");

// Projection vertex shader with texture coordinates.
const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(
  vertexShader,
  `
  attribute vec2 a_Position;
  attribute vec2 a_Texcoord;
  uniform mat4 u_View;
  uniform mat4 u_Project;
  varying vec2 v_Texcoord;
  void main(void) {
    gl_Position = u_Project * u_View * vec4(a_Position, 0.0, 1.0);
    v_Texcoord = a_Texcoord;
  }`
);
gl.compileShader(vertexShader);

// Texture mapping fragment shader.
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

// Link program.
const program = gl.createProgram()!;
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.bindAttribLocation(program, 0, "a_Position");
gl.bindAttribLocation(program, 1, "a_Texcoord");
gl.linkProgram(program);

// We don't need the shaders anymore.
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);

// Retrieve uniform locations.
const loc_Texture = gl.getUniformLocation(program, "u_Texture")!;
const loc_View = gl.getUniformLocation(program, "u_View")!;
const loc_Project = gl.getUniformLocation(program, "u_Project")!;

// We are going to take a visual style and render it to a texture.
// This is the size of the texture.
const FBO_SIZE: [number, number] = [1024, 1024];

// Create the texture.
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, new ImageData(FBO_SIZE[0], FBO_SIZE[1]));
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.bindTexture(gl.TEXTURE_2D, null);

// Put it in a framebuffer.
const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// This is a texture quad. We are going to spin it around the y-axis
// turntable style.
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

// Transform matrices.
const u_View = mat4.create();
const u_Project = mat4.create();

// This is the visual style. This will load power plants
// from a feature layer and render them as color-coded
// shimmering points.
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

// We create an asynchronous `main()` function because we want to use `await`.
async function main(): Promise<void> {
  // Load the global resources, i.e. the things that do not depend on the extent.
  const globalResources = await style.loadGlobalResources();

  // Load the local resources, i.e. the things that are extent dependent.
  const localResources = await style.loadLocalResources(
    new Extent({ xmin: -140, xmax: -60, ymin: 0, ymax: 80, spatialReference: SpatialReference.WGS84 }),
    FBO_SIZE,
    1,
    new AbortController().signal
  );

  // We are not going to attach the resources now; we are going to do it
  // on the first frame. We use this flag to make sure that we do not attach
  // the resources twice.
  let attached = false;

  // Render time!
  function render(): void {
    if (!attached) {
      // If the resources are not attached, we attach them now.
      globalResources.attach(gl);
      localResources.attach(gl);

      // And we make sure that we do not run this code again.
      attached = true;
    }

    // We bind the FBO and render the style to it.
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

    // Ugh, the WebGL state machine yuck! Internally, the visual style
    // object did some stuff that we need to undo here. We need a better
    // solution for this.
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.disable(gl.BLEND);

    // Now we bind the default framebuffer and we render the spinning
    // quad textured with the result of the previous render.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.2, 0.3, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Compute view matrix.
    mat4.identity(u_View);
    mat4.translate(u_View, u_View, [0, 0, -3]);
    mat4.rotateY(u_View, u_View, 0.1 * performance.now() / 1000);
    
    // Compute projection matrix.
    mat4.identity(u_Project);
    mat4.perspective(u_Project, 1, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    
    // Set program and update uniforms.
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(loc_Texture, 0);
    gl.uniformMatrix4fv(loc_View, false, u_View);
    gl.uniformMatrix4fv(loc_Project, false, u_Project);
    
    // Configure vertex state.
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.BYTE, false, 4, 0);
    gl.vertexAttribPointer(1, 2, gl.BYTE, false, 4, 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    // Render the quad!
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Frame loop that keeps requesting and rendering frames.
  function frame(): void {
    render();
    requestAnimationFrame(frame);
  }

  // Start rendering.
  requestAnimationFrame(frame);
}

// Let's do it!
main();
