import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../../core/view";
import { LocalResources, GlobalResources, FancyRasterVisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../../core/rendering";
import { FancyRasterLayer } from "./layer";

@subclass("animated-flow-ts.jumpstart.02-fancyraster.view.FancyRasterLayerView2D")
export class FancyRasterLayerView2D extends VisualizationLayerView2D<GlobalResources, LocalResources> {
  override animate = true;

  protected createVisualizationStyle(): VisualizationStyle<GlobalResources, LocalResources> {
    const layer = this.layer as FancyRasterLayer;

    return new FancyRasterVisualizationStyle(layer.imageryUrl);
  }
}
