import Extent from "@arcgis/core/geometry/Extent";
import BaseLayerViewGL2D from "@arcgis/core/views/2d/layers/BaseLayerViewGL2D";
import { VisualizationRenderParams } from "./types";
import Visualization from "./Visualization";
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";

@subclass("wind-es.base.VisualizationLayerView2D")
export default abstract class VisualizationLayerView2D extends BaseLayerViewGL2D {
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
        screenOriginInPixels: [0, 0],
        rotationInRadians: Math.PI * renderParams.state.rotation / 180,
        viewResolution: renderParams.state.resolution,
        opacity: 1
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