/**
 * @module wind-es/visualization
 *
 * This module introduces abstract classes and functionality that are shared
 * by concrete layer and layer view types. So far the only concrete visualization
 * implemented is the wind visualization contained in the `wind` directory.
 * 
 * The custom rendering system is designed around the concept of "visualizations".
 * Visualizations are renderable...
 */

import Extent from "@arcgis/core/geometry/Extent";
import BaseLayerViewGL2D from "@arcgis/core/views/2d/layers/BaseLayerViewGL2D";
import { property, subclass } from "@arcgis/core/core/accessorSupport/decorators";
import { defined } from "./util";

/**
 * A visualization is a graphic representation of an extent.
 *
 * When constructed and rendered correctly it naturally aligns
 * with the underlying basemap.
 * 
 * When a visualization is rendered, a `VisualizationRenderParams`
 * object is passed to the `wind-es.base.LayerView2D.renderVisualization()`
 * that defines its position, orientation and scale.
 */
export type VisualizationRenderParams = {
  /**
   * Size of the drawing surface.
   * 
   * This coincides with the size of the MapView when the device pixel ratio
   * is 1. For retina displays it is going to be larger than 1.
   */
  size: [number, number];

  /**
   * The position on the drawing surface of the upper-left corner of the extent.
   */
  translation: [number, number];
  
  /**
   * The rotation of the visualization in radians.
   *
   * This is the same as the rotation of the `MapView`
   * but expressed in radians.
   */
  rotation: number;

  /**
   * The relative scale at which the visualization mush be rendered.
   *
   * A scale of 1 means that the visualization is rendering at its
   * "natural" size; for instance, it was loaded when the zoom level
   * was Z, and then the use started panning and rotating, but not
   * zooming in and out. One such visualization is still rendering
   * at scale 1. A scale > 1 means that the user is zooming in, and
   * a scale < 1 means that the user is zooming out.
   */
  scale: number;

  /**
   * The opacity at which the visualization mush be rendered.
   *
   * This will be used to fade out old visualizations and they get
   * replaced with fresher visualizations with more recent data.
   */
  opacity: number;
}

/**
 * Resources are things needed to render a visualization.
 * 
 * These are typically WebGL resources.
 * 
 * Resource objects are possibly created asynchronously
 * in a detached state; then they synchronously attached;
 * finally, when they are not needed anymore, they are
 * detached; a resource object that has been detached
 * cannot be reattached.
 */
export abstract class Resources {
  /**
   * Create the internal WebGL and non-WebGL objects.
   * 
   * Internally...
   *
   * @param gl The WebGL context.
   */
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
export abstract class VisualizationLayerView2D<SR extends SharedResources, LR extends LocalResources> extends BaseLayerViewGL2D {
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

    this.view.watch("stationary", (stationary) => {
      if (stationary) {
        this._loadVisualization();
      }
    });
  }

  private _loadVisualization(): void {
    const abortController = new AbortController();
    const entry: ResourcesEntry<LR> = { abortController };
    this._localResources.push(entry);
    this.loadLocalResources(this.view.extent, this.view.resolution, abortController.signal).then((resources) => {
      this._localResources[this._localResources.indexOf(entry)] = { resources, attached: false };
    });
  }

  cnt = 0;

  override render(renderParams: any): void {
    ++this.cnt;

    if (this.cnt % 60 === 0) {
      console.log(renderParams.state.size, renderParams.state.scale, renderParams.state.resolution, renderParams.state.extent.width, renderParams.state.extent.height);
    }

    if (!this._sharedResources || "abortController" in this._sharedResources) {
      this.requestRender();
      return;
    }

    const gl: WebGLRenderingContext = renderParams.context;

    if (!this._sharedResources.attached) {
      this._sharedResources.resources.attach(gl);
      this._sharedResources.attached = true;
    }

    let toRender: LR | null = null;

    for (let i = this._localResources.length - 1; i >= 0; i--) {
      const localResources = this._localResources[i];
      defined(localResources);
    
      if (toRender) {
        if ("abortController" in localResources) {
          localResources.abortController.abort();
        } else if (localResources.attached) {
          localResources.resources.detach(gl);
          localResources.attached = false;
          this._localResources.splice(i, 1);
        }
      } else {
        if ("abortController" in localResources) {
          this.requestRender();
        } else {
          if (!localResources.attached) {
            localResources.resources.attach(gl);
            localResources.attached = true;
          }

          toRender = localResources.resources;
        }
      }
    }


    if (toRender) {
      const xMap = toRender.extent.xmin;
      const yMap = toRender.extent.ymax;
      const translation: [number, number] = [0, 0];
      renderParams.state.toScreen(translation, xMap, yMap);

      const visualizationRenderParams: VisualizationRenderParams = {
        size: renderParams.state.size,
        translation,
        rotation: Math.PI * renderParams.state.rotation / 180,
        scale: toRender.resolution / renderParams.state.resolution,
        opacity: 1
      };
      
      this.renderVisualization(gl, visualizationRenderParams, this._sharedResources.resources, toRender);
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

    this.destroy();
  }

  abstract loadSharedResources(signal: AbortSignal): Promise<SR>;
  abstract loadLocalResources(extent: Extent, resolution: number, signal: AbortSignal): Promise<LR>;
  abstract renderVisualization(gl: WebGLRenderingContext, renderParams: VisualizationRenderParams, sharedResources: SR, localResources: LR): void;

  afterDetach(): void {
  }
}