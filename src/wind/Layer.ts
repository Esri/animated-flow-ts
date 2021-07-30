import BaseLayer from "@arcgis/core/layers/Layer";
import LayerView2D from "./LayerView2D";
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";

@subclass("wind-es.wind.Layer")
export default class Layer extends BaseLayer {
  spatialReference = {
    wkid: 4326
  };

  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new LayerView2D({
        view: view,
        layer: this
      } as any);
    }
  }
}