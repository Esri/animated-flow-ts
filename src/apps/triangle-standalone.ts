import { mat4 } from "gl-matrix";

const canvas = document.createElement("canvas");
canvas.width = 640;
canvas.height = 360;
canvas.style.border = "1px solid black";
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl")!;

// Create the quad mesh.
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  0, 0, 1, 0, 0,
  320, 0, 0, 1, 0,
  0, 180, 0, 0, 1
]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

// Compile the shaders.
const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(vertexShader, `
  attribute vec2 a_Position;
  attribute vec3 a_Color;
  uniform mat4 u_ScreenFromLocal;
  uniform mat4 u_ClipFromScreen;
  varying vec3 v_Color;
  void main(void) {
    vec4 screenPosition = u_ScreenFromLocal * vec4(a_Position, 0.0, 1.0);
    gl_Position = u_ClipFromScreen * screenPosition;
    v_Color = a_Color;
  }`);
gl.compileShader(vertexShader);
const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
gl.shaderSource(fragmentShader, `
  precision mediump float;
  varying vec3 v_Color;
  void main(void) {
    gl_FragColor = vec4(v_Color, 1.0);
  }`);
gl.compileShader(fragmentShader);

// Link the program.
const program = gl.createProgram()!;
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.bindAttribLocation(program, 0, "a_Position");
gl.bindAttribLocation(program, 1, "a_Color");
gl.linkProgram(program);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);
const loc_ScreenFromLocal = gl.getUniformLocation(program, "u_ScreenFromLocal")!;
const loc_ClipFromScreen = gl.getUniformLocation(program, "u_ClipFromScreen")!;

// Transform matrices.
const u_ScreenFromLocal = mat4.create();
const u_ClipFromScreen = mat4.create();

// View state.
const translation: [number, number] = [150, 50];
const scale = 1.5;
const rotation = 0.4;

function render(): void {
  // Compute the `u_ScreenFromLocal` matrix. This matrix converts from local
  // pixel-like coordinates to actual screen positions. It scales, rotates and
  // translates by the amounts dictated by the render parameters.
  mat4.identity(u_ScreenFromLocal);
  mat4.translate(u_ScreenFromLocal, u_ScreenFromLocal, [
    translation[0],
    translation[1],
    1
  ]);
  mat4.rotateZ(u_ScreenFromLocal, u_ScreenFromLocal, rotation);
  mat4.scale(u_ScreenFromLocal, u_ScreenFromLocal, [
    scale,
    scale,
    1
  ]);

  // Compute the `u_ClipFromScreen` matrix. This matrix converts from screen
  // coordinates in pixels to clip coordinates in the range [-1, +1].
  mat4.identity(u_ClipFromScreen);
  mat4.translate(u_ClipFromScreen, u_ClipFromScreen, [-1, 1, 0]);
  mat4.scale(u_ClipFromScreen, u_ClipFromScreen, [
    2 / canvas.width,
    -2 / canvas.height,
    1
  ]);

  gl.useProgram(program);
  gl.uniformMatrix4fv(
    loc_ScreenFromLocal,
    false,
    u_ScreenFromLocal
  );
  gl.uniformMatrix4fv(
    loc_ClipFromScreen,
    false,
    u_ClipFromScreen
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 20, 8);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);

  // Draw the triangle.
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function frame(): void {
  gl.clearColor(0.2, 0.3, 0.5, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);