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
import { assert } from "./util";
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
export interface ResourcesEntry<R extends Resources> {
  state: 
  { name: "loading"; abortController: AbortController; } |
  { name: "loaded"; resources: R; } |
  { name: "attached"; resources: R; } |
  { name: "detached"; };
}

/**
 * Attach a resource object and reflect the state change in the resource entry.
 * 
 * @param gl The WebGL context.
 * @param entry The entry to be attached.
 */
export function attach<R extends Resources>(gl: WebGLRenderingContext, entry: ResourcesEntry<R>): void {
  assert(entry.state.name === "loaded");
  const resources = entry.state.resources;
  resources.attach(gl);
  entry.state = { name: "attached", resources };
}

/**
 * Detach a resource object and reflect the state change in the resource entry.
 * 
 * @param gl The WebGL context.
 * @param entry The entry to be detached.
 */
export function detach<R extends Resources>(gl: WebGLRenderingContext, entry: ResourcesEntry<R>): void {
  assert(entry.state.name === "attached");
  const resources = entry.state.resources;
  resources.detach(gl);
  entry.state = { name: "detached" };
}

/**
 * Visualization styles define how to load shared and local resources
 * and how to render them.
 */
export abstract class VisualizationStyle<SR extends SharedResources, LR extends LocalResources> {
  /**
   * Load the shared resources.
   * 
   * @param signal An abort signal.
   * @returns A promise to a shared resource object.
   */
  abstract loadSharedResources(signal: AbortSignal): Promise<SR>;

  /**
   * Load the local resources.
   * 
   * @param extent The extent to load.
   * @param resolution The resolution at which to load the resources.
   * @param pixelRatio The target pixel ratio; this is useful to scale user-specified sizes and lengths.
   * @param signal An abort signal.
   * @returns A promise to a shared resource object.
   */
  abstract loadLocalResources(
    extent: Extent,
    resolution: number,
    pixelRatio: number,
    signal: AbortSignal
  ): Promise<LR>;

  /**
   * Render a visualization.
   *
   * @param gl The WebGL context.
   * @param renderParams Define where to place the visualization on screen.
   * @param sharedResources The shared resources shared by all visualizations.
   * @param localResources The local resources specific to the visualization being rendered.
   */
  abstract renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    sharedResources: SR,
    localResources: LR
  ): void;
}