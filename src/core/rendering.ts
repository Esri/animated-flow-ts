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
import { assert, defined } from "./util";
import { Resources, ResourcesEntry, VisualizationRenderParams } from "./types";
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
 * Visualization styles define how to load shared and local resources
 * and how to render them.
 */
export abstract class VisualizationStyle<SR extends Resources, LR extends Resources> {
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
    size: [number, number],
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

  async createImage(gl: WebGLRenderingContext, center: Point, resolution: number, width: number, height: number, backgroundColor: string, signal: AbortSignal): Promise<HTMLCanvasElement> {
    const extent = new Extent({
      xmin: 0,
      ymin: 0,
      xmax: width * resolution,
      ymax: height * resolution
    });
    extent.centerAt(center);

    const renderParams: VisualizationRenderParams = {
      size: [width, height],
      translation: [0, 0],
      rotation: 0,
      scale: 1,
      opacity: 1,
      pixelRatio: 1
    };
    
    const sharedResources = await this.loadSharedResources(signal);
    sharedResources.attach(gl);
    const localResources = await this.loadLocalResources(extent, resolution, [width, height], 1, signal);
    localResources.attach(gl);
    this.renderVisualization(gl, renderParams, sharedResources, localResources);

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