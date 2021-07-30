import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Extent from "@arcgis/core/geometry/Extent";
import Visualization from "../base/Visualization";
import BaseLayerView2D from "../base/LayerView2D";
import WindVisualization from "./Visualization";

@subclass("wind-es.wind.LayerView2D")
export default class LayerView2D extends BaseLayerView2D {  
  private _programs: HashMap<{ program: WebGLProgram; uniforms: HashMap<WebGLUniformLocation>; }> | null = null;

  initialize(): void {
    // TODO!
    // Async?
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

    this._programs = {
      solid: {
        program,
        uniforms: {
          u_ScreenFromLocal: gl.getUniformLocation(program, "u_ScreenFromLocal")!,
          u_ClipFromScreen: gl.getUniformLocation(program, "u_ClipFromScreen")!
        }
      }
    };
  }
  
  loadVisualization(extent: Extent, resolution: number): Promise<Visualization> {
    return new Promise<Visualization>((resolve) => {
      setTimeout(() => {
        const visualization = new WindVisualization(extent, resolution);
        resolve(visualization)
      }, 1000);
    });
  }
}


// import * as workers from "@arcgis/core/core/workers";

// attach() {
//   const href = new URL("./worker", document.baseURI).href;
//   console.log("href", href);

//   workers.open(href)
//   .then((connection) => {
//     return connection.invoke("getMaxNumber", [0, 1, 2, 3, 4]);
//   })
//   .then((result) => {
//     console.log(result);
//   });
// },

// import { subclass } from "@arcgis/core/core/accessorSupport/decorators";

// @subclass("windes/WindLayerView2D")
// export default class WindLayerView2D extends BaseLayerViewGL2D {
//   attach() {
//     console.log("MIAO");

//     workers.open(this, new URL("./worker", document.baseURI).href)
//     .then((connection) => {
//       return connection.invoke("getMaxNumber", [0, 1, 2, 3, 4]);
//     })
//     .then((result) => {
//       console.log(result);
//     });
//   }

//   render(renderParams) {
//     const { context: gl } = renderParams;

//     gl.clearColor(0.2, 0.3, 0.5, 1.0);
//     gl.clear(gl.COLOR_BUFFER_BIT);
//   }

//   detach() {

//   }
// }