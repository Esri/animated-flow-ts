import Layer from "@arcgis/core/layers/Layer";
import WindLayerView2D from "./WindLayerView2D";
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";

@subclass("wind-es.wind.WindLayer")
export default class WindLayer extends Layer {
  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new WindLayerView2D({
        view: view,
        layer: this
      } as any);
    }
  }
}