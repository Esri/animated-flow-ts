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
 * @module wind-es/core/view
 *
 * This module contains the definition of `VisualizationLayerView2D`, a
 * a type of 2D layer view that can be used as a higher level base class
 * for creating custom WebGL layers.
 * 
 * Developers can extend the ArcGIS API for JavaScript using custom WebGL code
 * that will run alongside the basemap and the other layers in `MapView` of
 * `SceneView`.
 * 
 * For `MapView` the extension point is a base class called
 * [`BaseLayerViewGL2D`](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-2d-layers-BaseLayerViewGL2D.html).
 * 
 * To create a custom WebGL layer, the user normally does the following.
 * 
 * - Create a custom layer by subclassing [`Layer`](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-Layer.html) or some other suitable layer type.
 *   - Override method `Layer.createLayerView()` to return an instance of the custom layer view.
 * - Create a custom 2D layer view by subclassing [`BaseLayerViewGL2D`](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-2d-layers-BaseLayerViewGL2D.html).
 *   - Override `BaseLayerViewGL2D.attach()`.
 *   - Override `BaseLayerViewGL2D.render()`.
 *   - Override `BaseLayerViewGL2D.detach()`.
 * 
 * This way of creating custom layers is very powerful, very flexible, but it
 * is fairly low level; to enhance productivity developers can sometimes
 * base their custom visualizations using a third party rendering engine such
 * as deck.gl or Three.js.
 * 
 * In wind-es, we introduce `VisualizationLayerView2D` as a more convenient
 * starting point to create custom WebGL visualizations.
 */

import { property, subclass } from "esri/core/accessorSupport/decorators";
import Extent from "esri/geometry/Extent";
import BaseLayerViewGL2D from "esri/views/2d/layers/BaseLayerViewGL2D";
import { attach, detach, VisualizationStyle } from "./rendering";
import { LocalResourcesEntry, Resources, GlobalResourcesEntry, VisualizationRenderParams, Pixels } from "./types";
import { defined, degreesToRadians } from "./util";
import settings from "./settings";

/**
 * A 2D layer view designed around the concept of "visualizations".
 * 
 * A visualization is a visual representation of an extent. Subclasses
 * of `VisualizationLayerView2D` need to specify how individual visualizations
 * are attached, rendered and detached. They do so by overriding method
 * `VisualizationLayerView2D.createVisualizationStyle()`.
 * 
 * `VisualizationLayerView2D` will swap visualizations in and out as needed,
 * according to an internal strategy, so that the current view extent is
 * always covered.
 * 
 * The only strategy implemented so far is such that visualizations cover the
 * entire view, and only the visualization corresponding to the most recent
 * view state is rendered.
 * 
 * In the future maybe more strategies will be implemented, such as a "patchwork"
 * strategy, in which some visualizations only cover part of the screen, but when
 * stiched together they form a full coverage. There could even be a "tiled"
 * strategy, in which visualizations are regularly spaced and equally sized.
 */
@subclass("wind-es.core.visualization.LayerView2D")
export abstract class VisualizationLayerView2D<GR extends Resources, LR extends Resources> extends BaseLayerViewGL2D {
  /**
   * Global resources are used by all visualizations. An example of a global
   * resource is a shader program, which can be used to render multiple visualizations.
   */
  private _globalResources: GlobalResourcesEntry<GR> | null = null;

  /**
   * Local resources are tied to an extent and are specific for a 
   */
  private _localResources: LocalResourcesEntry<LR>[] = [];

  /**
   * Whether the visualizations are animated or not.
   *
   * Setting this to `true` causes the map to continuously redraw and can
   * drain the battery of mobile devices more quickly than a static map.
   */
  @property({
    type: Boolean
  })
  animate = false;

  /**
   * The visualization style used by this layer view.
   *
   * The visualization style is initialized when the layer view is
   * first attached by calling protected abstract method `VisualizationLayerView2D.createVisualizationStyle()`.
   * Derived classes must provide an implementation for it.
   */
  private visualizationStyle: VisualizationStyle<GR, LR> | null = null;

  /**
   * Creates the visualization style for the layer view.
   * 
   * Derived classes must implement this method. `VisualizationLayerView2D`
   * will invoke it only once, when the layer view is first attached.
   * 
   * @returns The visualization style which will be adopted by this layer view.
   */
  protected abstract createVisualizationStyle(): VisualizationStyle<GR, LR>;

  /**
   * Attach the layer view.
   * 
   * This method is invoked by `MapView` when the layer view is created
   * and added to the `MapView`. This method is akin to a constructor as
   * it initializes the newly created layer view.
   * 
   * See [BaseLayerViewGL2D.attach()](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-2d-layers-BaseLayerViewGL2D.html#attach).
   */
  override attach(): void {
    // Initialize the visualization style.
    this.visualizationStyle = this.createVisualizationStyle();

    // Create and start loading the global resource object.
    const abortController = new AbortController();
    const entry: GlobalResourcesEntry<GR> = { state: { name: "loading", abortController } };
    this._globalResources = entry;
    this.visualizationStyle.loadGlobalResources(abortController.signal).then((resources) => {
      // Once loaded, store the loaded resource object in the global resource entry.
      entry.state = { name: "loaded", resources };
    });

    // Every time that the view becomes stationary, reload
    // a visualization for the current view state.
    // Note that `MapView` is guaranteed to signal this condition
    // at load time, so that there is no need for a separate
    // initialization path.
    this.view.watch("stationary", (stationary) => {
      if (stationary) {
        this._loadVisualization();
      }
    });
  }

  /**
   * Load a visualization for the current view state.
   */
  private _loadVisualization(): void {
    // Abort all local resources that were being loaded.
    for (const localResources of this._localResources) {
      if (localResources.state.name === "loading") {
        console.log("ABORT!!!"); // TODO: Remove this!
        localResources.state.abortController.abort();
        this._localResources.splice(this._localResources.indexOf(localResources), 1);
      }
    }

    // Account for map rotation. This is done by rotating the
    // rectangle of the original extent and computing its bounding
    // extent. This "rotated" extent is what needs to be loaded.
    // Fetching the original extent would lead to the corners of a
    // rotated map not being covered by the new visualization.
    const extent = this.view.extent;
    const center = extent.center;
    const extentWidth = extent.xmax - extent.xmin;
    const extentHeight = extent.ymax - extent.ymin;
    const aco = Math.abs(Math.cos(degreesToRadians(this.view.rotation)));
    const asi = Math.abs(Math.sin(degreesToRadians(this.view.rotation)));
    const rotatedExtentWidth = aco * extentWidth + asi * extentHeight;
    const rotatedExtentHeight = asi * extentWidth + aco * extentHeight;
    const rotatedExtent = new Extent({
      xmin: center.x - rotatedExtentWidth / 2,
      ymin: center.y - rotatedExtentHeight / 2,
      xmax: center.x + rotatedExtentWidth / 2,
      ymax: center.y + rotatedExtentHeight / 2
    });
    rotatedExtent.centerAt(center);

    const expandedExtent = rotatedExtent.clone().expand(settings.extentExpandFactor);
    
    // Compute the rest of the parameters needed for the load operation.
    const resolution = this.view.resolution;
    const pixelRatio = devicePixelRatio;
    const size: [Pixels, Pixels] = [
      Math.round((expandedExtent.xmax - expandedExtent.xmin) / resolution),
      Math.round((expandedExtent.ymax - expandedExtent.ymin) / resolution)
    ];

    // Create and start loading a new local resource object
    // specific for the current view state.
    const abortController = new AbortController();
    const entry: LocalResourcesEntry<LR> = {
      state: { name: "loading", abortController },
      extent: expandedExtent,
      resolution,
      pixelRatio,
      size
    };
    this._localResources.push(entry);
    defined(this.visualizationStyle);
    this.visualizationStyle
      .loadLocalResources(expandedExtent, resolution, size, pixelRatio, abortController.signal)
      .then((resources) => {
        // Once loaded, store the loaded resource object in the local resource entry.
        entry.state = { name: "loaded", resources };
      });
  }

  /**
   * Render the layer view.
   * 
   * This method is invoked by `MapView` when the layer view must be rendered.
   * 
   * See [BaseLayerViewGL2D.render()](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-2d-layers-BaseLayerViewGL2D.html#render).
   * 
   * @param renderParams The render parameters.
   */
  override render(renderParams: any): void {
    // If the global resources have not been loaded yet it is necessary
    // to try again on the next frame.
    if (!this._globalResources || this._globalResources.state.name === "loading") {
      this.requestRender();
      return;
    }

    // The WebGL context is needed for all rendering operations.
    const gl: WebGLRenderingContext = renderParams.context;

    // If the global resources have been loaded, but they are not attached
    // yet, then attach them now.
    if (this._globalResources.state.name === "loaded") {
      attach(gl, this._globalResources);
    }

    // The only visualization strategy implemented at the time being
    // is such that only one visualization per frame is rendered; this
    // variable holds its local resources.
    let mostRecentRenderableLocalResources: LocalResourcesEntry<LR> | null = null;

    // The local resources are scanned in reverse order of creation.
    // Some resource objects in this list will be in a "loading" state,
    // others will be "loaded" and at most another one could be "attached".
    for (let i = this._localResources.length - 1; i >= 0; i--) {
      const localResources = this._localResources[i];
      defined(localResources);

      // What to do is determined by whether a renderable local resource
      // object has already been found or not.
      if (mostRecentRenderableLocalResources) {
        // If it has, then any other local resource object before it
        // must be detached...
        if (localResources.state.name === "attached") {
          detach(gl, localResources);
        }

        // ...and then removed.
        this._localResources.splice(i, 1);
      } else {
        // TODOTODOTODO!

        // If it hasn't, then object that are loading.
        if (localResources.state.name === "loading") {
          this.requestRender();
        } else {
          if (localResources.state.name === "loaded") {
            attach(gl, localResources);
          }

          mostRecentRenderableLocalResources = localResources;
        }
      }
    }

    if (this._globalResources.state.name === "attached" && mostRecentRenderableLocalResources && mostRecentRenderableLocalResources.state.name === "attached") {
      const xMap = mostRecentRenderableLocalResources.extent.xmin;
      const yMap = mostRecentRenderableLocalResources.extent.ymax;
      const translation: [Pixels, Pixels] = [0, 0];
      renderParams.state.toScreen(translation, xMap, yMap);

      const visualizationRenderParams: VisualizationRenderParams = {
        size: renderParams.state.size,
        translation,
        rotation: degreesToRadians(renderParams.state.rotation),
        scale: mostRecentRenderableLocalResources.resolution / renderParams.state.resolution,
        opacity: 1,
        pixelRatio: devicePixelRatio
      };

      defined(this.visualizationStyle);
      this.visualizationStyle.renderVisualization(
        gl,
        visualizationRenderParams,
        this._globalResources.state.resources,
        mostRecentRenderableLocalResources.state.resources
      );
    }

    if (this.animate) {
      this.requestRender();
    }
  }

  /**
   * Detach the layer view.
   * 
   * This method is invoked by `MapView` when the layer view is removed
   * to the `MapView`. This method is akin to a destructor and is
   * responsible for cleaning up used resources.
   * 
   * See [BaseLayerViewGL2D.detach()](https://developers.arcgis.com/javascript/latest/api-reference/esri-views-2d-layers-BaseLayerViewGL2D.html#detach).
   */
  override detach(): void {
    // The WebGL context is needed to detach the resources.
    const gl: WebGLRenderingContext = this.context;

    // Iterate on the local resources; abort the ones that
    // were being loaded and detach the ones that were attached.
    for (const localResources of this._localResources) {
      if (localResources.state.name === "loading") {
        localResources.state.abortController.abort();
      } else if (localResources.state.name === "attached") {
        detach(gl, localResources);
      }
    }

    // Remove all local resource objects.
    this._localResources = [];

    // If there are global resources, abort their loading or
    // detach them.
    if (this._globalResources) {
      if (this._globalResources.state.name === "loading") {
        this._globalResources.state.abortController.abort();
      } else if (this._globalResources.state.name === "attached") {
        detach(gl, this._globalResources);
      }

      // Remove the reference to the global resource object.
      this._globalResources = null;
    }
  }
}
