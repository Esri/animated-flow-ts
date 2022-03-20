import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../../core/view";
import { LocalResources, GlobalResources, ShimmerVisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../../core/rendering";

@subclass("animated-flow-ts.jumpstart.03-shimmer.view.ShimmerLayerView2D")
export class ShimmerLayerView2D extends VisualizationLayerView2D<GlobalResources, LocalResources> {
  override animate = true;

  createVisualizationStyle(): VisualizationStyle<GlobalResources, LocalResources> {
    return new ShimmerVisualizationStyle();
  }
}
