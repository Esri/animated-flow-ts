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
 * @module animated-flow-ts/flow/view
 *
 * This module defines `FlowLayerView2D`.
 */

import { subclass } from "esri/core/accessorSupport/decorators";
import { VisualizationLayerView2D } from "../core/view";
import { FlowLayer } from "./layer";
import { FlowLocalResources, FlowGlobalResources, FlowVisualizationStyle } from "./rendering";
import { VisualizationStyle } from "../core/rendering";

@subclass("animated-flow-ts.flow.layer.FlowLayerView2D")
export class FlowLayerView2D extends VisualizationLayerView2D<FlowGlobalResources, FlowLocalResources> {
  override animate = true;

  createVisualizationStyle(): VisualizationStyle<FlowGlobalResources, FlowLocalResources> {
    const layer = this.layer as FlowLayer;

    return new FlowVisualizationStyle(layer.source, layer.processor, layer.color);
  }
}
