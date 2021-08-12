import { property, subclass } from "esri/core/accessorSupport/decorators";
import BaseLayerViewGL2D from "esri/views/2d/layers/BaseLayerViewGL2D";
import { attach, detach, VisualizationStyle } from "./rendering";
import { LocalResourcesEntry, Resources, SharedResourcesEntry, VisualizationRenderParams } from "./types";
import { defined } from "./util";

@subclass("wind-es.core.visualization.LayerView2D")
export abstract class VisualizationLayerView2D<SR extends Resources, LR extends Resources> extends BaseLayerViewGL2D {
  private _sharedResources: SharedResourcesEntry<SR> | null = null;
  private _localResources: LocalResourcesEntry<LR>[] = [];

  @property({
    type: Boolean
  })
  animate = false;

  private visualizationStyle: VisualizationStyle<SR, LR> | null = null;

  protected abstract createVisualizationStyle(): VisualizationStyle<SR, LR>;

  override attach(): void {
    if (!this.visualizationStyle) {
      this.visualizationStyle = this.createVisualizationStyle();
      this.requestRender();
    }

    const abortController = new AbortController();
    const entry: SharedResourcesEntry<SR> = { state: { name: "loading", abortController } };
    this._sharedResources = entry;
    this.visualizationStyle.loadSharedResources(abortController.signal).then((resources) => {
      entry.state = { name: "loaded", resources };
    });

    this.view.watch("stationary", (stationary) => {
      if (stationary) {
        this._loadVisualization();
      }
    });
  }

  private _loadVisualization(): void {
    for (const localResources of this._localResources) {
      if (localResources.state.name === "loading") {
        localResources.state.abortController.abort();
        this._localResources.splice(this._localResources.indexOf(localResources), 1);
      }
    }

    const abortController = new AbortController();

    const extent = this.view.extent;
    const resolution = this.view.resolution;
    const pixelRatio = devicePixelRatio;
    const size: [number, number] = [
      Math.round((extent.xmax - extent.xmin) / resolution),
      Math.round((extent.ymax - extent.ymin) / resolution)
    ];
    const entry: LocalResourcesEntry<LR> = {
      state: { name: "loading", abortController },
      extent,
      resolution,
      size,
      pixelRatio
    };
    this._localResources.push(entry);
    defined(this.visualizationStyle);
    this.visualizationStyle
      .loadLocalResources(extent, resolution, size, pixelRatio, abortController.signal)
      .then((resources) => {
        entry.state = { name: "loaded", resources };
      });
  }

  override render(renderParams: any): void {
    if (!this._sharedResources || this._sharedResources.state.name === "loading") {
      this.requestRender();
      return;
    }

    const gl: WebGLRenderingContext = renderParams.context;

    if (this._sharedResources.state.name === "loaded") {
      attach(gl, this._sharedResources);
    }

    let toRender: LocalResourcesEntry<LR> | null = null;

    for (let i = this._localResources.length - 1; i >= 0; i--) {
      const localResources = this._localResources[i];
      defined(localResources);

      if (toRender) {
        if (localResources.state.name === "attached") {
          detach(gl, localResources);
        }
        this._localResources.splice(i, 1);
      } else {
        if (localResources.state.name === "loading") {
          this.requestRender();
        } else {
          if (localResources.state.name === "loaded") {
            attach(gl, localResources);
          }

          toRender = localResources;
        }
      }
    }

    if (this._sharedResources.state.name === "attached" && toRender && toRender.state.name === "attached") {
      const xMap = toRender.extent.xmin;
      const yMap = toRender.extent.ymax;
      const translation: [number, number] = [0, 0];
      renderParams.state.toScreen(translation, xMap, yMap);

      const visualizationRenderParams: VisualizationRenderParams = {
        size: renderParams.state.size,
        translation,
        rotation: (Math.PI * renderParams.state.rotation) / 180,
        scale: toRender.resolution / renderParams.state.resolution,
        opacity: 1,
        pixelRatio: devicePixelRatio
      };

      defined(this.visualizationStyle);
      this.visualizationStyle.renderVisualization(
        gl,
        visualizationRenderParams,
        this._sharedResources.state.resources,
        toRender.state.resources
      );
    }

    if (this.animate) {
      this.requestRender();
    }
  }

  override detach(): void {
    const gl: WebGLRenderingContext = this.context;

    for (const localResources of this._localResources) {
      if (localResources.state.name === "loading") {
        localResources.state.abortController.abort();
      } else if (localResources.state.name === "attached") {
        detach(gl, localResources);
      }
    }

    this._localResources = [];

    if (this._sharedResources) {
      if (this._sharedResources.state.name === "loading") {
        this._sharedResources.state.abortController.abort();
      } else if (this._sharedResources.state.name === "attached") {
        detach(gl, this._sharedResources);
      }

      this._sharedResources = null;
    }

    this.destroy();
  }
}
