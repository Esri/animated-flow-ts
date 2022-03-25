/**
 * This app is a self-contained WebGL sample, intended as a primer
 * on WebGL rendering and graphic programming. There is nothing
 * "geographical" about it, and instead its focus is on explaining
 * how to render a colored triangle using WebGL.
 *
 * The rendering techniques used in this file are also used in
 * another app, named `triangle-mapview.ts`, which focuses on
 * their integration with `MapView` using a custom WebGL layer.
 */

/**
 * We use the `gl-matrix` library for matrix algebra. Matrices are
 * the most popular way to express translations, rotations and scale
 * in WebGL apps. A single 4x4 matrix, a.k.a. `mat4` can encode any
 * number of 3D translations, rotations and scale operations, in any
 * order, without ambiguities.
 *
 * For 2D rendering, a `mat3` would be enough but in this codebase
 * we decided to stick with `mat4` because it is more generic, way
 * more popular in samples online, and a better starting point shall
 * we decide to add 3D effects to any of the samples in this repo.
 */
import { mat4 } from "gl-matrix";

/**
 * In this tutorial we will initialize the WebGL rendering context
 * ourselves. A rendering context is an object, customarily named
 * `gl`, that maintains the WebGL state and implements the WebGL API.
 *
 * We start by creating a HTML <canvas> element.
 */
const canvas = document.createElement("canvas");
canvas.width = 640;
canvas.height = 360;
canvas.style.border = "1px solid black";
document.body.appendChild(canvas);

/**
 * Then we retrieve the WebGL context object. We do this
 * using the `getContext()` function, by passing in the
 * "webgl" string. We could create a WebGL 2 context by
 * passing "webgl2" instead.
 *
 * There are chiefly 3 kinds of methods that can be
 * invoked on a WebGL context:
 *
 * 1) methods that configure the WebGL state;
 * 2) methods that create and modify WebGL resources;
 * 3) methods that render visuals.
 *
 * Most methods in the second and third category depend
 * on the WebGL state that is configured by the methods
 * in the first category. So, usually, before creating,
 * modifying and rendering resources, it is necessary to
 * properly configure the WebGL state.
 */
const gl = canvas.getContext("webgl")!;

/**
 * Vertex shaders are a type of WebGL resource. A vertex shader
 * is a function that runs of the GPU and is invoked for each
 * vertex in the mesh. The main responsibility of the vertex shader
 * is to compute the position of a vertex, together with additional
 * vertex properties that may be needed by subsequent stages.
 * Vertex shaders are created by calling `gl.createShader()` and passing in the `gl.VERTEX_SHADER`
 * constant. The source code for the function is specified in
 * a language called GLSL and uploaded using `gl.shaderSource()`.
 * Finally, the shader is compiled using `gl.compileShader()`.
 * In a real-world application it may be necessary to check
 * for compile errors using methods `gl.getShaderParameter()`
 * and `gl.getShaderInfoLog()` but in this sample we skipping
 * this step.
 *
 * Vertex shaders take inputs in the form of `attribute` and
 * `uniform` variables.
 *
 * Vertex shaders must output a position in the `gl_Position` implicit
 * variable, and can also output additional per-vertex values, such as colors,
 * by declaring and setting `varying` variables.
 */
const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(
  vertexShader,
  `
  attribute vec2 a_Position;
  attribute vec3 a_Color;
  uniform mat4 u_ScreenFromLocal;
  uniform mat4 u_ClipFromScreen;
  varying vec3 v_Color;
  void main(void) {
    vec4 screenPosition = u_ScreenFromLocal * vec4(a_Position, 0.0, 1.0);
    gl_Position = u_ClipFromScreen * screenPosition;
    v_Color = a_Color;
  }`
);
gl.compileShader(vertexShader);

/**
 * Fragment shaders are another type of WebGL resource. A fragment shader
 * is a function that runs of the GPU and is invoked for each
 * rendered fragment. A fragment is a "pixel-like piece" of rendered
 * geometry.  The main responsibility of the fragment shader
 * is to compute the color of a fragment, and store it in the `gl_FragColor`
 * implicit variable.
 *
 * Fragment shaders take inputs in the form of `varying` variables; these
 * are the same `varying` that the vertex shader computed, but interpolated
 * for each fragment across the entire rendered mesh.
 *
 * As an example, a square whose size in pixels is 100x100, has 4 vertices and
 * could have about 10,000 fragments (the exact number depends on many factors).
 * Each vertex may have its own color as output by the vertex shader; each fragment
 * receives an interpolated color based on its distance from the vertex; fragments
 * that are close to a red vertex will be a shade of red, while fragment that are
 * close to a green vertex will be a shade of green; pixels that are midway between
 * a red vertex and a green vertex will be a dull/dirty yellow.
 *
 * Anything else that was said about vertex shaders also applies to vertex shaders.
 */
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
gl.shaderSource(
  fragmentShader,
  `
  precision mediump float;
  varying vec3 v_Color;
  void main(void) {
    gl_FragColor = vec4(v_Color, 1.0);
  }`
);
gl.compileShader(fragmentShader);

/**
 * Vertex and fragment shaders cannot execute by themselves; this is because
 * a vertex shader needs a fragment shader, and vice versa. This is the reason
 * why shaders need to be linked together into another WebGL resource, called
 * a shader program.
 *
 * A program is created by calling `gl.createProgram()`. After that, individual shaders
 * are added to it by calling `attachShader()`. Then, for each attribute in the
 * attached vertex shader, a call to `gl.bindAttribLocation()` is needed to
 * assign it to a numeric index, called an attribute location. The attribute location
 * is important when the shader program executes, because it drives how attribute
 * values are delivered to the GLSL attribute variables.
 *
 * Next step is to call `gl.linkProgram()` that actually links the shaders together
 * and makes the program ready to be used. At this point, the actual shader objects
 * can, and should, be deleted by calling `gl.deleteShader()`. Just like shader compilation,
 * also program linking can fail and in a real-world application you should use `gl.getProgramParameter()`
 * and `gl.getProgramInfoLog()` to check for errors.
 *
 * Once the program is linked, it is necessary to retrieve the uniform locations;
 * these are WebGL objects that are used to represent uniform variables in Javascript.
 * They are used to deliver data to GLSL uniform variables. They are retrieved from
 * the linked program by calling `gl.getUniformLocation()`.
 */
const program = gl.createProgram()!;
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
const a_Position = 0;
const a_Color = 1;
gl.bindAttribLocation(program, a_Position, "a_Position");
gl.bindAttribLocation(program, a_Color, "a_Color");
gl.linkProgram(program);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);
const loc_ScreenFromLocal = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
const loc_ClipFromScreen = gl.getUniformLocation(program, "u_ClipFromScreen")!;

/**
 * The other WebGL resource that we need is a buffer. Buffers hold data that
 * can be consumed by shader programs. Specifically, we need a vertex buffer.
 * To create a vertex buffer, call `gl.createBuffer()`. In order to do anything
 * with a vertex buffer, we need to modify the WebGL state so that the buffer becomes bound
 * to the `gl.ARRAY_BUFFER` binding point. To do so, we use the `gl.bindBuffer()` method.
 * Next, we invoke `gl.bufferData()` on the same binding point, and we pass a
 * typed array of floating point values and the `gl.STATIC_DRAW` flag, which
 * informs WebGL that we do not intend to modify the data very often, or at all.
 * After uploading the data, it is a good practice to unbind the buffer by calling
 * `gl.bindBuffer()` and passing `null`.
 *
 * For this demo, we are passing the following floating point values, which can be intepreted
 * as 3 distincts 5-uple containing a `(x, y)` position and a `(r, g, b)` normalized color.
 *
 *  0    0    1    0    0  320    0    0    1    0    0  180    0    0    1
 *
 * x1   y1   r1   g1   b1   x2   y2   r2   g2   b2   x3   y3   r3   g3   b3
 *
 * We are going to use them to render a multicolored triangle.
 */
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 320, 0, 0, 1, 0, 0, 180, 0, 0, 1]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

/**
 * These are the transform matrices. We will compute them using `gl-matrix`
 * and upload them to the shader program by referencing the uniform locations
 * that we retrieved after linking the program.
 */
const u_ScreenFromLocal = mat4.create();
const u_ClipFromScreen = mat4.create();

/**
 * The view state. This is simply a set of variables that we will be using to
 * compute the `u_ScreenFromLocal` every frame. Translation and scale are constants;
 * the rotation will be animated by changing its value slightly every frame.
 */
const translation: [number, number] = [150, 50];
const scale = 1.5;
let rotation: number;

function render(): void {
  /**
   * Animate the rotation. We are going to rock the triangle by animating the
   * rotation periodically between 0.3 and 0.5 radians, with a frequency of 1 hertz (Hz).
   */
  const frequency = 1; /* hertz (Hz) */
  rotation = 0.4 + 0.1 * Math.sin((2 * Math.PI * frequency * performance.now()) / 1000);

  /**
   * Compute the `u_ScreenFromLocal` matrix. This matrix converts from local
   * pixel-like coordinates to actual screen positions. It scales, rotates and
   * translates, in this order, by the amounts dictated by the render parameters.
   * Note that `gl-matrix` works by post-multiplying matrices, so in order to scale,
   * rotate and translate, you need to write the function calls in reverse order.
   *
   * The code below is equivalent to the following.
   *
   *   u_ScreenFromLocal := Identity(4)
   *   u_ScreenFromLocal := u_ScreenFromLocal * Translate
   *   u_ScreenFromLocal := u_ScreenFromLocal * RotateZ
   *   u_ScreenFromLocal := u_ScreenFromLocal * Scale
   *
   * Which is equivalent to:
   *
   *   u_ScreenFromLocal := Translate * RotateZ * Scale
   *
   * If you were to take a point and multiply it by that matrix, you would put the
   * matrix to the left and the point to the right.
   *
   *   TransformedPoint := u_ScreenFromLocal * Point
   *
   * Which is the same as:
   *
   *   TransformedPoint := Translate * RotateZ * Scale * Point
   *
   * As you can see, the scale acts first, then the rotation, then the translation.
   */
  mat4.identity(u_ScreenFromLocal);
  mat4.translate(u_ScreenFromLocal, u_ScreenFromLocal, [translation[0], translation[1], 0]);
  mat4.rotateZ(u_ScreenFromLocal, u_ScreenFromLocal, rotation);
  mat4.scale(u_ScreenFromLocal, u_ScreenFromLocal, [scale, scale, 1]);

  /**
   * Compute the `u_ClipFromScreen` matrix. This matrix converts from screen
   * coordinates in pixels to clip coordinates in the range [-1, +1].
   */
  mat4.identity(u_ClipFromScreen);
  mat4.translate(u_ClipFromScreen, u_ClipFromScreen, [-1, 1, 0]);
  mat4.scale(u_ClipFromScreen, u_ClipFromScreen, [2 / canvas.width, -2 / canvas.height, 1]);

  /**
   * Bind the program and update the uniform matrices in the shader program.
   */
  gl.useProgram(program);
  gl.uniformMatrix4fv(loc_ScreenFromLocal, false, u_ScreenFromLocal);
  gl.uniformMatrix4fv(loc_ClipFromScreen, false, u_ClipFromScreen);

  /**
   * Bind the buffer and configure the vertex state. This is where
   * we need to tell WebGL how to read the data from the buffer.
   * We need to call `gl.vertexAttribPointer()` once for each
   * attribute location.
   *
   * Here, `a_Position` consists of 2 floats, while `a_Color` consists
   * of 3 floats. The `false` constant is the `normalized` flag, which
   * is ignored for floating point types. 20 is the stride, i.e., how many
   * bytes stand between the beginning of a vertex and the beginning
   * of the next vertex. 0 and 8 are offsets; the offset is 0 for
   * `a_Position` because it comes first in the buffer; 2 floats, or
   * 8 bytes after the position, is the color.
   *
   * We also need to enable the locations, i.e., tell WebGL to actually
   * read from the buffer and deliver data to them; this is done by
   * calling `gl.enableVertexAttribArray()`.
   */
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 20, 8);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.enableVertexAttribArray(a_Position);
  gl.enableVertexAttribArray(a_Color);

  /**
   * Draw the triangle. This is done by calling `gl.drawArrays()` and passing
   * the `gl.TRIANGLES` flag, the index of the first vertex to render, and the
   * total number of consecutive vertices to read from the buffer.
   */
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/**
 * The `frame()` function needs to be called every frame. Here we keep things simple
 * by making the `frame()` function self-reschedule itself by adding a call to
 * `requestAnimationFrame(frame)` at the end of the body. This is a pretty common
 * sight in basic WebGL demos. In most operating systems and browsers, this will
 * result in a 60 FPS animation.
 */
function frame(): void {
  /**
   * Clearing means to make the entire WebGL canvas become the
   * same color. The color of choice must first be set on the
   * WebGL state by calling `gl.clearColor()` and passing a normalized
   * RGBA color. Then, `gl.clear()` is called and the `gl.COLOR_BUFFER_BIT`
   * flag is specified, which actually clears the canvas.
   */
  gl.clearColor(0.2, 0.3, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  /**
   * This is the function that renders the triangle. We wanted to keep
   * the clearing code outside of the `render()` function itself.
   */
  render();

  /**
   * Schedule the next frame.
   */
  requestAnimationFrame(frame);
}

/**
 * Schedule the first frame.
 */
requestAnimationFrame(frame);
