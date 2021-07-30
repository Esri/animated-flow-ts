import Extent from "@arcgis/core/geometry/Extent";
import BaseLayerViewGL2D from "@arcgis/core/views/2d/layers/BaseLayerViewGL2D";
import { VisualizationRenderParams } from "./types";
import Visualization from "./Visualization";
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";

@subclass("wind-es.base.LayerView2D")
export default abstract class LayerView2D extends BaseLayerViewGL2D {
  private visualizations: { visualization: Visualization, attached: boolean }[] = [];

  override attach(): void {
    this.visualizations = [];

    this.loadVisualization(this.view.extent, this.view.resolution).then((visualization) => {
      this.visualizations.push({ visualization, attached: false });
    });
  }

  override render(renderParams: any): void {
    for (const visualizationAndAttached of this.visualizations) {
      const gl: WebGLRenderingContext = renderParams.context;
 
      if (!visualizationAndAttached.attached) {
        visualizationAndAttached.visualization.attach(gl);
        visualizationAndAttached.attached = true;
      }

      const visualizationRenderParams: VisualizationRenderParams = {
        screenSizeInPixels: renderParams.state.size,
        screenOriginInPixels: [100, 60],
        rotationInRadians: Math.PI * renderParams.state.rotation / 180,
        relativeScale: 0.5 * renderParams.state.resolution / visualizationAndAttached.visualization.resolution,
        opacity: 0.7
      };

      visualizationAndAttached.visualization.render(gl, visualizationRenderParams);
    }
  }

  override detach(): void {
    const gl: WebGLRenderingContext = this.context;

    for (const visualizationAndAttached of this.visualizations) {
      visualizationAndAttached.visualization.detach(gl);
      visualizationAndAttached.attached = false;
    }
  }

  abstract loadVisualization(extent: Extent, resolution: number): Promise<Visualization>;
}