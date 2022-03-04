import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../core/view";
import { DevSummit2022Layer } from "./layer";
import { LocalResources, GlobalResources, DevSummit2022VisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../core/rendering";

@subclass("animated-flow-ts.flow.layer.FlowLayerView2D")
export class DevSummit2022LayerView2D extends VisualizationLayerView2D<GlobalResources, LocalResources> {
  override animate = true;

  createVisualizationStyle(): VisualizationStyle<GlobalResources, LocalResources> {
    const layer = this.layer as DevSummit2022Layer;
    console.log(layer);
    return new DevSummit2022VisualizationStyle();
  }
}
