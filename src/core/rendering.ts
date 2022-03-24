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
 * @module animated-flow-ts/core/rendering
 *
 * This module introduces abstract rendering classes and functionality that are shared
 * by concrete layer and layer view types. So far the only concrete visualization
 * implemented is the "flow" visualization contained in the `flow` directory.
 *
 * The custom rendering system is designed around the concept of "visualizations".
 * Visualizations are renderable extents. They are comprised of a set of "global"
 * resources and another one of "local" resources. The glboal resources are shared
 * by multiple visualizations, while the local resources are extent-specific and
 * hence are used solely by the visualization associated with that specific extent.
 */

import Extent from "esri/geometry/Extent";
import { assert, defined } from "./util";
import { MapUnitsPerPixel, Pixels, Resources, ResourcesEntry, VisualizationRenderParams } from "./types";
import Point from "esri/geometry/Point";

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
 * Visualization styles define how to load global and local resources
 * and how to render them.
 */
export abstract class VisualizationStyle<GR extends Resources, LR extends Resources> {
  /**
   * Load the global resources.
   *
   * @param signal An abort signal.
   * @returns A promise to a global resource object.
   */
  abstract loadGlobalResources(signal: AbortSignal): Promise<GR>;

  /**
   * Load the local resources.
   *
   * @param extent The extent to load.
   * @param resolution The resolution at which to load the resources.
   * @param pixelRatio The target pixel ratio; this is useful to scale user-specified sizes and lengths.
   * @param signal An abort signal.
   * @returns A promise to a local resource object.
   */
  abstract loadLocalResources(
    extent: Extent,
    resolution: MapUnitsPerPixel,
    size: [Pixels, Pixels],
    pixelRatio: number,
    signal: AbortSignal
  ): Promise<LR>;

  /**
   * Render a visualization.
   *
   * @param gl The WebGL context.
   * @param renderParams Define where to place the visualization on screen.
   * @param globalResources The global resources shared by all visualizations.
   * @param localResources The local resources specific to the visualization being rendered.
   */
  abstract renderVisualization(
    gl: WebGLRenderingContext,
    renderParams: VisualizationRenderParams,
    globalResources: GR,
    localResources: LR
  ): void;

  /**
   * Render a visualization into a HTML canvas.
   *
   * Useful for generating thumbnails and screenshots.
   *
   * @param gl The WebGL context to use. It must have been created with the `preserveDrawingBuffer` attribute.
   * @param center The geographic center of the image.
   * @param resolution The resolution of the image.
   * @param width The width of the image.
   * @param height The height of the image.
   * @param backgroundColor The bacground color or the image as a CSS color string.
   * @param signal An abort signal.
   * @returns A canvas element that contains the rendered visualization.
   */
  async createImage(
    gl: WebGLRenderingContext,
    center: Point,
    resolution: MapUnitsPerPixel,
    width: Pixels,
    height: Pixels,
    backgroundColor: string,
    signal: AbortSignal
  ): Promise<HTMLCanvasElement> {
    // Create an extent of the proper size centered on the given geographical point.
    const extent = new Extent({
      xmin: 0,
      ymin: 0,
      xmax: width * resolution,
      ymax: height * resolution
    });
    extent.centerAt(center);

    // Build the render params.
    const renderParams: VisualizationRenderParams = {
      size: [width, height],
      translation: [0, 0],
      rotation: 0,
      scale: 1,
      opacity: 1,
      pixelRatio: 1
    };

    // Load global and local resources.
    const globalResources = await this.loadGlobalResources(signal);
    globalResources.attach(gl);
    const localResources = await this.loadLocalResources(extent, resolution, [width, height], 1, signal);
    localResources.attach(gl);

    // Render the visualization.
    this.renderVisualization(gl, renderParams, globalResources, localResources);

    // Transfer the rendered image to a non-WebGL canvas and return it.
    // The original, WebGL canvas, is seen as a (possibly off-screen) work
    // area and it is not what should be added to the page. The element
    // that is returned from this function can be added to page as a regular
    // image.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    defined(ctx);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(gl.canvas, 0, 0);

    return canvas;
  }
}
