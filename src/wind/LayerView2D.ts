import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Extent from "@arcgis/core/geometry/Extent";
import { mat4 } from "gl-matrix";
import BaseLayerView2D from "../base/LayerView2D";
import { VisualizationRenderParams } from "../base/types";
import { defined } from "../util";
import { SharedResources, LocalResources } from "./resources";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";

@subclass("wind-es.wind.LayerView2D")
export default class LayerView2D extends BaseLayerView2D<SharedResources, LocalResources> {
  private _imageryLayer: ImageryLayer;

  constructor(params: any) {
    super(params);

    // https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/World_Wind/ImageServer
    // https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer

    this._imageryLayer = new ImageryLayer({
      url: "https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer"
    });
  }
  
  override loadSharedResources(): Promise<SharedResources> {
    return Promise.resolve(new SharedResources());
  }

  override async loadLocalResources(extent: Extent, resolution: number): Promise<LocalResources> {
    const width = (extent.xmax - extent.xmin) / resolution;
    const height = (extent.ymax - extent.ymin) / resolution;

    const rasterData = await this._imageryLayer.fetchImage(extent, width, height);

    return new LocalResources(extent, resolution, rasterData);
  }

  override renderVisualization(gl: WebGLRenderingContext, _renderParams: VisualizationRenderParams, sharedResources: SharedResources, localResources: LocalResources): void {
    defined(localResources.vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
  
    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [-0.9, -0.9, 0]);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [1.8, 1.8, 1]);
  
    const solidProgram = sharedResources.programs!["texture"]?.program!;
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_Texture"]!, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, localResources.texture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
