import Layer from "@arcgis/core/layers/Layer";
import WindLayerView2D from "./WindLayerView2D";

export default class WindLayer extends Layer {
  createLayerView(view) {
    if (view.type === "2d") {
      return new WindLayerView2D({
        view: view,
        layer: this
      });
    }
  }
}