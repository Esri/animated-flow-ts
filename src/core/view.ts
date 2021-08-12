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
import BaseLayerViewGL2D from "esri/views/2d/layers/BaseLayerViewGL2D";
import { attach, detach, VisualizationStyle } from "./rendering";
import { LocalResourcesEntry, Resources, SharedResourcesEntry, VisualizationRenderParams } from "./types";
import { defined } from "./util";

/**
 * A 2D layer view designed around the concept of "visualizations".
 * 
 * A visualization is a visual representation of an extent. Subclasses
 * of `VisualizationLayerView2D` need to specify how individual visualizations
 * are attached, rendered and detached.
 */
@subclass("wind-es.core.visualization.LayerView2D")
export abstract class VisualizationLayerView2D<SR extends Resources, LR extends Resources> extends BaseLayerViewGL2D {
  /**
   * Shared resources are used by all visualizations. An example of a shared
   * resource is a shader program, which can be used to render multiple visualizations.
   */
  private _sharedResources: SharedResourcesEntry<SR> | null = null;

  /**
   * Local resources are tied to an extent and are specific for a 
   */
  private _localResources: LocalResourcesEntry<LR>[] = [];

  @property({
    type: Boolean
  })
  animate = false;

  private visualizationStyle: VisualizationStyle<SR, LR> | null = null;

  protected abstract createVisualizationStyle(): VisualizationStyle<SR, LR>;

  override attach(): void {
    if (!this.visualizationStyle) {
      this.visualizationStyle = this.createVisualizationStyle();
      this.requestRender();
    }

    const abortController = new AbortController();
    const entry: SharedResourcesEntry<SR> = { state: { name: "loading", abortController } };
    this._sharedResources = entry;
    this.visualizationStyle.loadSharedResources(abortController.signal).then((resources) => {
      entry.state = { name: "loaded", resources };
    });

    this.view.watch("stationary", (stationary) => {
      if (stationary) {
        this._loadVisualization();
      }
    });
  }

  private _loadVisualization(): void {
    for (const localResources of this._localResources) {
      if (localResources.state.name === "loading") {
        localResources.state.abortController.abort();
        this._localResources.splice(this._localResources.indexOf(localResources), 1);
      }
    }

    const abortController = new AbortController();

    const extent = this.view.extent;
    const resolution = this.view.resolution;
    const pixelRatio = devicePixelRatio;
    const size: [number, number] = [
      Math.round((extent.xmax - extent.xmin) / resolution),
      Math.round((extent.ymax - extent.ymin) / resolution)
    ];
    const entry: LocalResourcesEntry<LR> = {
      state: { name: "loading", abortController },
      extent,
      resolution,
      size,
      pixelRatio
    };
    this._localResources.push(entry);
    defined(this.visualizationStyle);
    this.visualizationStyle
      .loadLocalResources(extent, resolution, size, pixelRatio, abortController.signal)
      .then((resources) => {
        entry.state = { name: "loaded", resources };
      });
  }

  override render(renderParams: any): void {
    if (!this._sharedResources || this._sharedResources.state.name === "loading") {
      this.requestRender();
      return;
    }

    const gl: WebGLRenderingContext = renderParams.context;

    if (this._sharedResources.state.name === "loaded") {
      attach(gl, this._sharedResources);
    }

    let toRender: LocalResourcesEntry<LR> | null = null;

    for (let i = this._localResources.length - 1; i >= 0; i--) {
      const localResources = this._localResources[i];
      defined(localResources);

      if (toRender) {
        if (localResources.state.name === "attached") {
          detach(gl, localResources);
        }
        this._localResources.splice(i, 1);
      } else {
        if (localResources.state.name === "loading") {
          this.requestRender();
        } else {
          if (localResources.state.name === "loaded") {
            attach(gl, localResources);
          }

          toRender = localResources;
        }
      }
    }

    if (this._sharedResources.state.name === "attached" && toRender && toRender.state.name === "attached") {
      const xMap = toRender.extent.xmin;
      const yMap = toRender.extent.ymax;
      const translation: [number, number] = [0, 0];
      renderParams.state.toScreen(translation, xMap, yMap);

      const visualizationRenderParams: VisualizationRenderParams = {
        size: renderParams.state.size,
        translation,
        rotation: (Math.PI * renderParams.state.rotation) / 180,
        scale: toRender.resolution / renderParams.state.resolution,
        opacity: 1,
        pixelRatio: devicePixelRatio
      };

      defined(this.visualizationStyle);
      this.visualizationStyle.renderVisualization(
        gl,
        visualizationRenderParams,
        this._sharedResources.state.resources,
        toRender.state.resources
      );
    }

    if (this.animate) {
      this.requestRender();
    }
  }

  override detach(): void {
    const gl: WebGLRenderingContext = this.context;

    for (const localResources of this._localResources) {
      if (localResources.state.name === "loading") {
        localResources.state.abortController.abort();
      } else if (localResources.state.name === "attached") {
        detach(gl, localResources);
      }
    }

    this._localResources = [];

    if (this._sharedResources) {
      if (this._sharedResources.state.name === "loading") {
        this._sharedResources.state.abortController.abort();
      } else if (this._sharedResources.state.name === "attached") {
        detach(gl, this._sharedResources);
      }

      this._sharedResources = null;
    }

    this.destroy();
  }
}
