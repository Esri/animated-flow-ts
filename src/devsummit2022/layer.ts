import { property, subclass } from "esri/core/accessorSupport/decorators";
import Layer from "esri/layers/Layer";
import { DevSummit2022LayerView2D } from "./view";

@subclass("animated-flow-ts.flow.layer.FlowLayer")
export class DevSummit2022Layer extends Layer {
  @property()
  featureUrl: string = "";

  @property()
  rasterUrl: string = "";

  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new DevSummit2022LayerView2D({
        view,
        layer: this
      } as any);
    }
  }
}
 