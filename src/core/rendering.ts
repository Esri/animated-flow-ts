/*
  Copyright 2021 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/**
 * @module wind-es/core/rendering
 *
 * This module introduces abstract rendering classes and functionality that are shared
 * by concrete layer and layer view types. So far the only concrete visualization
 * implemented is the "flow" visualization contained in the `flow` directory.
 *
 * The custom rendering system is designed around the concept of "visualizations".
 * Visualizations are renderable extents. They are comprised of a set of "shared"
 * resources and another one of "local" resources. The shared resources are shared
 * by multiple visualizations, while the local resources are extent-specific and
 * hence are used solely by the visualization associated with that specific extent.
 */

import Extent from "esri/geometry/Extent";
import BaseLayerViewGL2D from "esri/views/2d/layers/BaseLayerViewGL2D";
import { property, subclass } from "esri/core/accessorSupport/decorators";
import { defined } from "./util";
import { VisualizationRenderParams } from "./types";

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
   * Initializes the resources in this object.
   *
   * @param gl The WebGL context.
   */
  abstract attach(gl: WebGLRenderingContext): void;

  /**
   * Releases the resources in this object.
   *
   * @param gl The WebGL context.
   */
  abstract detach(gl: WebGLRenderingContext): void;
}

/**
 * Shared resources are just like resources.
 */
export abstract class SharedResources extends Resources {}

/**
 * Local resources augment resources with an extent and details
 * about how that extent is mapped to screen space.
 */
export abstract class LocalResources extends Resources {
  /**
   * Local resources can be thought as existing in screen space.
   * 
   * The size property is the size of the drawing surface to which
   * these resources mut be mapped.
   * 
   * For instance, when the first visualization is loaded into a
   * newly created map, it will be created with a size equal to
   * the drawing surface of the `MapView`.
   */
  private _size: [number, number];

  /**
   * Create some local resources.
   *
   * @param _extent The extent associated to the local resources.
   * @param _resolution The resolution of the local resources.
   * @param _pixelRatio The pixel ratio; this information can
   * be used by concrete classes to decide whether to load hi-res
   * or lo-res sprites, for instance.
   */
  constructor(private _extent: Extent, private _resolution: number, private _pixelRatio: number) {
    super();

    this._size = [
      Math.round((_extent.xmax - _extent.xmin) / _resolution),
      Math.round((_extent.ymax - _extent.ymin) / _resolution)
    ];
  }

  /**
   * The extent associated to the local resources.
   */
  get extent(): Extent {
    return this._extent;
  }

  /**
   * The resolution of the local resources.
   */
  get resolution(): number {
    return this._resolution;
  }

  /**
   * The size in pixels of the local resources; it is obtained
   * by dividing the extent by the resolution.
   */
  get size(): [number, number] {
    return this._size;
  }

  /**
   * The pixel ratio; this information can
   * be used by concrete classes to decide whether to load hi-res
   * or lo-res sprites, for instance.
   */
  get pixelRatio(): number {
    return this._pixelRatio;
  }
}

/**
 * A resource entry describe
 * 
 * - For resources that are being loaded, the entry is the abort controller that
 *   can be used to abort the loading.
 * - For resources that are loaded, the entry is the resource object plus its
 *   attachment state, i.e. whether `attach()` has been called or not.
 */
type ResourcesEntry<R extends Resources> =
  | { resources: R; attached: boolean; }
  | { abortController: AbortController; };

@subclass("wind-es.core.visualization.LayerView2D")
export abstract class VisualizationLayerView2D<
  SR extends SharedResources,
  LR extends LocalResources
> extends BaseLayerViewGL2D {
  private _sharedResources: ResourcesEntry<SR> | null = null;
  private _localResources: ResourcesEntry<LR>[] = [];

  @property({
    type: Boolean
  })
  animate = false;

  override attach(): void {
    // TODO: Actually abort when possible?
    const abortController = new AbortController();
    const loadTime = performance.now();
    const entry: ResourcesEntry<SR> = { abortController, loadTime };
    this._sharedResources = entry;
    this.loadSharedResources(abortController.signal).then((resources) => {
      this._sharedResources = { resources, attached: false, loadTime };
    });

    this.view.watch("stationary", (stationary) => {
      if (stationary) {
        this._loadVisualization();
      }
    });
  }

  private _loadVisualization(): void {
    for (let i = this._localResources.length - 1; i >= 0; i--) {
      const localResources = this._localResources[i];
      defined(localResources);

      if ("abortController" in localResources) {
        console.log("ABORTING!");
        localResources.abortController.abort();
        this._localResources.splice(i, 1);
      }
    }

    // TODO: Actually abort when possible?
    const abortController = new AbortController();
    const loadTime = performance.now();
    const entry: ResourcesEntry<LR> = { abortController, loadTime };
    this._localResources.push(entry);
    this.loadLocalResources(this.view.extent, this.view.resolution, abortController.signal).then((resources) => {
      this._localResources[this._localResources.indexOf(entry)] = { resources, attached: false, loadTime };
      this._localResources.sort((a, b) => a.loadTime - b.loadTime);
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

    let toRender: ResourcesEntry<LR> | null = null;

    for (let i = this._localResources.length - 1; i >= 0; i--) {
      const localResources = this._localResources[i];
      defined(localResources);

      if (toRender) {
        if ("abortController" in localResources) {
          localResources.abortController.abort();
        } else if (localResources.attached) {
          localResources.resources.detach(gl);
          localResources.attached = false;
        }
        this._localResources.splice(i, 1);
      } else {
        if ("abortController" in localResources) {
          this.requestRender();
        } else {
          if (!localResources.attached) {
            localResources.resources.attach(gl);
            localResources.attached = true;
          }

          toRender = localResources;
        }
      }
    }

    if (toRender) {
      const xMap = toRender.resources.extent.xmin;
      const yMap = toRender.resources.extent.ymax;
      const translation: [number, number] = [0, 0];
      renderParams.state.toScreen(translation, xMap, yMap);

      const visualizationRenderParams: VisualizationRenderParams = {
        size: renderParams.state.size,
        translation,
        rotation: (Math.PI * renderParams.state.rotation) / 180,
        scale: toRender.resources.resolution / renderParams.state.resolution,
        opacity: 1,
        pixelRatio: devicePixelRatio
      };

      this.renderVisualization(gl, visualizationRenderParams, this._sharedResources.resources, toRender.resources);
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
  abstract renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    sharedResources: SR,
    localResources: LR
  ): void;
}
