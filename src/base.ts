import Extent from "@arcgis/core/geometry/Extent";
import BaseLayerViewGL2D from "@arcgis/core/views/2d/layers/BaseLayerViewGL2D";
import { property, subclass } from "@arcgis/core/core/accessorSupport/decorators";

export type VisualizationRenderParams = {
  size: [number, number];
  translation: [number, number];
  rotation: number;
  scale: number;
  opacity: number;
}

export abstract class Resources {
  abstract attach(gl: WebGLRenderingContext): void;
  abstract detach(gl: WebGLRenderingContext): void;
}

export abstract class SharedResources extends Resources {
}

export abstract class LocalResources extends Resources {
  private _size: [number, number];

  constructor(private _extent: Extent, private _resolution: number) {
    super();
    
    this._size = [
      Math.round((_extent.xmax - _extent.xmin) / _resolution),
      Math.round((_extent.ymax - _extent.ymin) / _resolution)
    ];
  }

  get extent(): Extent {
    return this._extent;
  }

  get resolution(): number {
    return this._resolution;
  }
  
  get size(): [number, number] {
    return this._size;
  }
}

type ResourcesEntry<R> = { resources: R; attached: boolean; } | { abortController: AbortController };

@subclass("wind-es.base.LayerView2D")
export abstract class LayerView2D<SR extends SharedResources, LR extends LocalResources> extends BaseLayerViewGL2D {
  private _sharedResources: ResourcesEntry<SR> | null = null;
  private _localResources: ResourcesEntry<LR>[] = [];

  @property({
    type: Boolean
  })
  animate = false;

  override attach(): void {
    const abortController = new AbortController();
    const entry: ResourcesEntry<SR> = { abortController };
    this._sharedResources = entry;
    this.loadSharedResources(abortController.signal).then((resources) => {
      this._sharedResources = { resources, attached: false };
    });

    this._loadVisualization();
  }

  private _loadVisualization(): void {
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

      const xMap = localResources.resources.extent.xmin;
      const yMap = localResources.resources.extent.ymax;
      const translation: [number, number] = [0, 0];
      renderParams.state.toScreen(translation, xMap, yMap);

      const visualizationRenderParams: VisualizationRenderParams = {
        size: renderParams.state.size,
        translation,
        rotation: Math.PI * renderParams.state.rotation / 180,
        scale: localResources.resources.resolution / renderParams.state.resolution,
        opacity: 1
      };
      
      this.renderVisualization(gl, visualizationRenderParams, this._sharedResources.resources, localResources.resources);
    }

    if (this.animate) {
      this.requestRender();
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