import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../../core/view";
import { LocalResources, GlobalResources, FancyRasterVisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../../core/rendering";

@subclass("animated-flow-ts.jumpstart.01-testpattern.view.FancyRasterLayerView2D")
export class FancyRasterLayerView2D extends VisualizationLayerView2D<GlobalResources, LocalResources> {
  override animate = false;

  createVisualizationStyle(): VisualizationStyle<GlobalResources, LocalResources> {
    return new FancyRasterVisualizationStyle();
  }
}
