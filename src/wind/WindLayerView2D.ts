import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Extent from "@arcgis/core/geometry/Extent";
import Visualization from "../base/Visualization";
import VisualizationLayerView2D from "../base/VisualizationLayerView2D";
import WindVisualization from "./WindVisualization";

@subclass("wind-es.wind.WindLayerView2D")
export default class WindLayerView2D extends VisualizationLayerView2D {
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