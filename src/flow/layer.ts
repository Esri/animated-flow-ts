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
 * @module animated-flow-ts/flow/layer
 *
 * This module contains the definition of `FlowLayer`, a layer type
 * that supports animated visualization of flow in `MapView`.
 */

import Color from "esri/Color";
import { property, subclass } from "esri/core/accessorSupport/decorators";
import Layer from "esri/layers/Layer";
import { MainFlowProcessor, WorkerFlowProcessor } from "./processors";
import { FlowLayerView2D } from "./view";
import { ImageryTileLayerFlowSource } from "./sources";
import { FlowSource, FlowProcessor } from "./types";

/**
 * A layer that supports 2D visualizations of animated flow lines in `MapView`.
 */
@subclass("animated-flow-ts.flow.layer.FlowLayer")
export class FlowLayer extends Layer {
  /**
   * A promise to a flow source.
   *
   * This is used by `FlowLayerView2D` to retrieve flow data
   * for a given extent.
   */
  source: Promise<FlowSource>;

  /**
   * Whether the flow source is owned by the layer or
   * was passed from outside.
   *
   * This determines whether the layer will try to destroy the
   * source once it is not needed anymore or not.
   */
  ownSource: boolean;

  /**
   * A promise to a flow processor.
   *
   * This is used by `FlowLayerView2D` to convert the retrieved
   * flow data to a mesh of triangles renderable with WebGL.
   */
  processor: Promise<FlowProcessor>;

  /**
   * The [blend mode](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#blendMode)
   * in use on this layer.
   *
   * This property must be explicitly declared by a custom layer in order for it to support blend modes.
   *
   * See the **Important** remark in [the official docs](https://developers.arcgis.com/javascript/latest/sample-code/custom-gl-visuals/)
   * for more info.
   */
  @property({
    type: String
  })
  blendMode?: string;

  /**
   * The [layer effect](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#effect)
   * in use on this layer.
   *
   * This property must be explicitly declared by a custom layer in order for it to support layer effects.
   *
   * See the **Important** remark in [the official docs](https://developers.arcgis.com/javascript/latest/sample-code/custom-gl-visuals/)
   * for more info.
   */
  @property({
    type: String
  })
  effect?: string;

  /**
   * The color of the animated flow lines.
   */
  @property({
    type: Color
  })
  color = new Color([255, 255, 255, 1]);

  /**
   * Constructs a new `FlowLayer`.
   *
   * It supports both UV and MagDir imagery tile layers, and client-side
   * flow sources such as `VectorFieldFlowSource`.
   *
   * @param params A `url` string or `source` object to fetch the data from,
   * and optionally the `useWebWorkers` flag if worker support is desired.
   */
  constructor(params: any) {
    super(params);

    if (params.url && params.source) {
      throw new Error("Only one of 'url' or 'source' parameters can be specified when creating a FlowLayer.");
    }

    if (params.url) {
      this.source = Promise.resolve(new ImageryTileLayerFlowSource(params.url));
      this.ownSource = true;
    } else {
      this.source = Promise.resolve(params.source);
      this.ownSource = false;
    }

    const useWebWorkers = "useWebWorkers" in params ? params.useWebWorkers : true;
    this.processor = Promise.resolve(useWebWorkers ? new WorkerFlowProcessor() : new MainFlowProcessor());
  }

  /**
   * Creates the layer view for this layer.
   *
   * @param view `The MapView`.
   * @returns An instance of `FlowLayerView2D`.
   */
  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new FlowLayerView2D({
        view,
        layer: this
      } as any);
    }
  }

  /**
   * Destroy the layer.
   */
  override destroy(): void {
    if (this.ownSource) {
      this.source.then((source) => {
        source.destroy();
      });
    }

    this.processor.then((processor) => {
      processor.destroy();
    });

    super.destroy();
  }
}
