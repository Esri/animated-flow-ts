import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../../core/view";
import { LocalResources, GlobalResources, ShimmerVisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../../core/rendering";
import { ShimmerLayer } from "./layer";

@subclass("animated-flow-ts.jumpstart.03-shimmer.view.ShimmerLayerView2D")
export class ShimmerLayerView2D extends VisualizationLayerView2D<GlobalResources, LocalResources> {
  override animate = true;

  createVisualizationStyle(): VisualizationStyle<GlobalResources, LocalResources> {
    const layer = this.layer as ShimmerLayer;

    // The feature URL and the field name are passed to the style as they are.
    const { featureUrl, fieldName } = layer;

    // The colors in the color map and the default color are converted from `esri/Color`
    // instances to normalized RGBA vectors with components in the range [0, 1].
    const colorMap: HashMap<[number, number, number, number]> = {};

    for (const key in layer.colorMap) {
      const esriColor = layer.colorMap[key]!;
      const color = esriColor.toRgba() as [number, number, number, number];
      color[0] /= 255;
      color[1] /= 255;
      color[2] /= 255;
      colorMap[key] = color;
    }

    const defaultColor = layer.defaultColor.toRgba() as [number, number, number, number];
    defaultColor[0] /= 255;
    defaultColor[1] /= 255;
    defaultColor[2] /= 255;

    return new ShimmerVisualizationStyle(featureUrl, fieldName, colorMap, defaultColor);
  }
}
