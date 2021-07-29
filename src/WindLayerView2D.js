import BaseLayerViewGL2D from "@arcgis/core/views/2d/layers/BaseLayerViewGL2D";
import LocalScreenLoader from "./LocalScreenLoader";

const WindLayerView2D = BaseLayerViewGL2D.createSubclass({
  attach() {
    this.screens = [];
    this.screenLoader = new LocalScreenLoader();
    this.screenLoader.load(this.view.extent).then((screen) => {
      this.screens.push(screen);
    });
  },

  render(renderParams) {
    for (const screen of this.screens) {
      screen.render(renderParams);
    }
  },

  detach() {

  }
});

export default WindLayerView2D;

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