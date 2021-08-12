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
 * @module wind-es/flow/layer
 *
 * This module contains the definition of `FlowLayer`, a layer type
 * that supports animated visualization of flow in `MapView`.
 */

import Color from "esri/Color";
import { property, subclass } from "esri/core/accessorSupport/decorators";
import BaseLayer from "esri/layers/Layer";
import { MainFlowTracer, FlowTracer, WorkerFlowTracer } from "./meshing";
import { FlowLayerView2D } from "./view";
import { ImageryTileLayerFlowSource, FlowSource } from "./sources";

@subclass("wind-es.flow.layer.FlowLayer")
export class FlowLayer extends BaseLayer {
  source: Promise<FlowSource>;
  tracer: Promise<FlowTracer>;

  @property({
    type: String
  })
  blendMode?: string;

  @property({
    type: String
  })
  effect?: string;

  @property({
    type: Color
  })
  color = new Color([255, 255, 255, 1]);

  constructor(params: any) {
    super(params);

    if (params.url && params.source) {
      throw new Error("Only one of 'url' or 'source' parameters can be specified when creating a FlowLayer.");
    }

    const useWebWorkers = "useWebWorkers" in params ? params.useWebWorkers : true;

    this.source = Promise.resolve(
      params.url ? new ImageryTileLayerFlowSource(params.url, 0.1 /* TODO: Configure? */) : params.source
    );

    this.tracer = Promise.resolve(useWebWorkers ? new WorkerFlowTracer() : new MainFlowTracer());
  }

  override createLayerView(view: any): any {
    if (view.type === "2d") {
      return new FlowLayerView2D({
        view,
        layer: this
      } as any);
    }
  }

  override destroy(): void {
    super.destroy();
    // TODO: Abort?
    this.source.then((source) => source.destroy());
    this.tracer.then((tracer) => tracer.destroy());
  }
}
