import Extent from "@arcgis/core/geometry/Extent";
import BaseLayerViewGL2D from "@arcgis/core/views/2d/layers/BaseLayerViewGL2D";
import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import { LocalResources, SharedResources } from "./resources";
import { VisualizationRenderParams } from "./types";

type ResourcesEntry<R> = { resources: R; attached: boolean; } | { abortController: AbortController };

@subclass("wind-es.base.LayerView2D")
export default abstract class LayerView2D<SR extends SharedResources, LR extends LocalResources> extends BaseLayerViewGL2D {
  private _sharedResources: ResourcesEntry<SR> | null = null;
  private _localResources: ResourcesEntry<LR>[] = [];

  override attach(): void {
    const abortController = new AbortController();
    const entry: ResourcesEntry<SR> = { abortController };
    this._sharedResources = entry;
    this.loadSharedResources(abortController.signal).then((resources) => {
      this._sharedResources = { resources, attached: false };
    });

    setTimeout(() => {
      this._loadInitialVisualization();
    }, 2000);
  }

  private _loadInitialVisualization(): void {
    const abortController = new AbortController();
    const entry: ResourcesEntry<LR> = { abortController };
    this._localResources.push(entry);
    this.loadLocalResources(this.view.extent, this.view.resolution, abortController.signal).then((resources) => {
      this._localResources[this._localResources.indexOf(entry)] = { resources, attached: false };
    });
  }

  override render(renderParams: any): void {
    if (!this._sharedResources || "abortController" in this._sharedResources) {
      this.requestRender();
      return;
    }

    const gl: WebGLRenderingContext = renderParams.context;

    if (!this._sharedResources.attached) {
      this._sharedResources.resources.attach(gl);
      this._sharedResources.attached = true;
    }

    for (const localResources of this._localResources) {
      if ("abortController" in localResources) {
        this.requestRender();
        continue;
      }

      if (!localResources.attached) {
        localResources.resources.attach(gl);
        localResources.attached = true;
      }

      const visualizationRenderParams: VisualizationRenderParams = {
        screenSizeInPixels: renderParams.state.size,
        screenOriginInPixels: [100, 60],
        rotationInRadians: Math.PI * renderParams.state.rotation / 180,
        relativeScale: 0.5 * renderParams.state.resolution / localResources.resources.resolution,
        opacity: 0.7
      };
      
      this.renderVisualization(gl, visualizationRenderParams, this._sharedResources.resources, localResources.resources);
    }
  }

  override detach(): void {
    const gl: WebGLRenderingContext = this.context;

    for (const localResources of this._localResources) {
      if ("abortController" in localResources) {
        localResources.abortController.abort();
      } else if (localResources.attached) {
        localResources.resources.detach(gl);
      }
    }

    this._localResources = [];

    if (this._sharedResources) {
      if ("abortController" in this._sharedResources) {
        this._sharedResources.abortController.abort();
      } else if (this._sharedResources.attached) {
        this._sharedResources.resources.detach(gl);
      }

      this._sharedResources = null;
    }
  }

  abstract loadSharedResources(signal: AbortSignal): Promise<SR>;
  abstract loadLocalResources(extent: Extent, resolution: number, signal: AbortSignal): Promise<LR>;
  abstract renderVisualization(gl: WebGLRenderingContext, renderParams: VisualizationRenderParams, sharedResources: SR, localResources: LR): void;
}