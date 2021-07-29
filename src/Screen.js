export default class Screen {
  render(renderParams) {
    const { context: gl } = renderParams;

    gl.clearColor(0.2, 0.3, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}