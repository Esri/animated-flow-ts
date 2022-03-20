import { subclass } from "esri/core/accessorSupport/decorators";
import Layer from "esri/layers/Layer";
import { TestPatternLayerView2D } from "./view";

@subclass("animated-flow-ts.jumstart.01-testpattern.layer.TestPatternLayer")
export class TestPatternLayer extends Layer {
  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new TestPatternLayerView2D({
        view,
        layer: this
      } as any);
    }
  }
}
