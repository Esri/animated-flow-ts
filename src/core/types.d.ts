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
 * @module wind-es/core/types
 *
 * This module contains simple type definitions used by the core visualization system.
 */

export type Pixels = number;
export type Radians = number;
export type MapUnits = number;
export type MapUnitsPerPixel = number;

/**
 * A value that can be accessed by using `await`.
 *
 * It could be `T` or a promise to `T`. After awaiting, it is resolved as `T` anyway.
 */
export type Awaitable<T> = T | Promise<T>;

/**
 * A visualization is a graphic representation of an extent.
 *
 * When constructed and rendered correctly it naturally aligns
 * with the underlying basemap.
 *
 * When a visualization is rendered, a `VisualizationRenderParams`
 * object is passed to the `wind-es.core.visualization.LayerView2D.renderVisualization()`
 * that defines its position, orientation and scale.
 */
export type VisualizationRenderParams = {
  /**
   * Size of the drawing surface.
   *
   * This coincides with the size of the MapView when the device pixel ratio
   * is 1.
   */
  size: [MapUnitsPerPixel, MapUnitsPerPixel];

  /**
   * The position on the drawing surface of the upper-left corner of the extent.
   */
  translation: [Pixels, Pixels];

  /**
   * The rotation of the visualization in radians.
   *
   * This is the same as the rotation of the `MapView`
   * but expressed in radians.
   */
  rotation: Radians;

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

  /**
   * The pixel ratio of the rendering device.
   * 
   * For retina displays it is going to be larger than 1.
   *
   * It is possible that `Resource.pixelRatio` is different from
   * `VisualizationRenderParams.pixelRatio`, for instance because
   * the visualization has been first loaded on a different screen
   * and then has been moved to another one; in this scenario, the
   * rendering code that overrides `VisualizationLayerView2D.renderVisualization()`
   * may need to rescale some visual elements on the fly so that
   * something reasonable can still be shown while waiting for a
   * new visualization, with a matching pixel ratio, to load.
   */
  pixelRatio: number;
};

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
export interface Resources {
  /**
   * Initializes the resources in this object.
   *
   * @param gl The WebGL context.
   */
  attach(gl: WebGLRenderingContext): void;

  /**
   * Releases the resources in this object.
   *
   * @param gl The WebGL context.
   */
  detach(gl: WebGLRenderingContext): void;
}

/**
 * A resource entry is a resource object plus additional information
 * about its internal state with respect to its "readiness" for rendering.
 *
 * - A resource in the "loading" state is being loaded; it is possibly
 *   fetching data from the network and it is not ready to be attached,
 *   yet alone rendered.
 * - A resource in the "loaded" state is loaded, and it is ready to be
 *   attached.
 * - A resource in the "attached" state is ready for rendering; it can
 *   be passed to `VisualizationStyle.renderVisualization()` and then
 *   can be detached when it is not needed anymore.
 * - A resource in the "detached" state has been detached; it cannot be
 *   used for rendering, or for anything really.
 */
export interface ResourcesEntry<R extends Resources> {
  /**
   * The state of the resource object associated to this entry.
   */
  state: // The resource object is being loaded.
  | { name: "loading"; abortController: AbortController }

    // The resource object `resources` is loaded but not attached.
    | { name: "loaded"; resources: R }

    // The resource object `resources` is attached and ready for rendering.
    | { name: "attached"; resources: R }

    // The resource object has been detached and should not be accessed anymore.
    | { name: "detached" };
}

/**
 * Global resouce entries do not extent the base interface.
 * 
 * This interface is defined for simmetry.
 */
export interface GlobalResourcesEntry<R extends Resources> extends ResourcesEntry<R> {}

/**
 * Local resource entries need to remember the extent of validity and details
 * about how that extent is mapped to screen space.
 */
export interface LocalResourcesEntry<R extends Resources> extends ResourcesEntry<R> {
  /**
   * Local resources can be thought as existing in screen space.
   *
   * The size property is the size of the drawing surface to which
   * these resources mut be mapped.
   *
   * For instance, when the first visualization is loaded into a
   * newly created map, it will be created with a size equal to
   * the drawing surface of the `MapView`.
   *
   * Size is obtained by dividing the with and height of the extent
   * by the resolution.
   */
  size: [Pixels, Pixels];

  /**
   * The extent associated to the local resources.
   */
  extent: Extent;

  /**
   * The resolution of the local resources.
   */
  resolution: MapUnitsPerPixel;

  /**
   * The pixel ratio at which these local resources were loaded.
   */
  pixelRatio: number;
}
