import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../../core/view";
import { LocalResources, GlobalResources, TestPatternVisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../../core/rendering";

@subclass("animated-flow-ts.jumpstart.01-testpattern.view.TestPatternLayerView2D")
export class TestPatternLayerView2D extends VisualizationLayerView2D<GlobalResources, LocalResources> {
  override animate = false;

  protected createVisualizationStyle(): VisualizationStyle<GlobalResources, LocalResources> {
    return new TestPatternVisualizationStyle();
  }
}
