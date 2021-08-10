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
 * Visualizations are renderable extents. They...
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
   * Create the internal WebGL and non-WebGL objects.
   *
   * Internally...
   *
   * @param gl The WebGL context.
   */
  abstract attach(gl: WebGLRenderingContext): void;
  abstract detach(gl: WebGLRenderingContext): void;
}

export abstract class SharedResources extends Resources {}

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

type ResourcesEntry<R> =
  | { resources: R; attached: boolean; loadTime: number }
  | { abortController: AbortController; loadTime: number };

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
