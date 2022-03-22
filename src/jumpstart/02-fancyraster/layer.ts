import { property, subclass } from "esri/core/accessorSupport/decorators";
import Layer from "esri/layers/Layer";
import { FancyRasterLayerView2D } from "./view";

@subclass("animated-flow-ts.jumstart.01-testpattern.layer.FancyRasterLayer")
export class FancyRasterLayer extends Layer {
  @property()
  imageryUrl: string = "";

  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new FancyRasterLayerView2D({
        view,
        layer: this
      } as any);
    }
  }
}
