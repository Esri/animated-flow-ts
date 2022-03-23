import Color from "esri/Color";
import { property, subclass } from "esri/core/accessorSupport/decorators";
import Layer from "esri/layers/Layer";
import { ShimmerLayerView2D } from "./view";

@subclass("animated-flow-ts.jumpstart.03-shimmer.layer.ShimmerLayer")
export class ShimmerLayer extends Layer {
  @property()
  featureUrl: string = "";

  @property()
  fieldName: string = "";

  @property()
  colorMap: HashMap<Color> = {};

  @property()
  defaultColor = Color.fromString("white");

  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new ShimmerLayerView2D({
        view,
        layer: this
      } as any);
    }
  }
}
