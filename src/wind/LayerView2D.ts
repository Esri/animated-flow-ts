import { subclass } from "@arcgis/core/core/accessorSupport/decorators";
import Extent from "@arcgis/core/geometry/Extent";
import { mat4 } from "gl-matrix";
import BaseLayerView2D from "../base/LayerView2D";
import { VisualizationRenderParams } from "../base/types";
import { defined } from "../util";
import { SharedResources, LocalResources } from "./resources";
import ImageryTileLayer from "@arcgis/core/layers/ImageryTileLayer";

@subclass("wind-es.wind.LayerView2D")
export default class LayerView2D extends BaseLayerView2D<SharedResources, LocalResources> {
  private _imageryTileLayer: ImageryTileLayer;

  constructor(params: any) {
    super(params);

    // https://landsat2.arcgis.com/arcgis/rest/services/Landsat8_Views/ImageServer
    // https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/World_Wind/ImageServer
    // https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer

    // this._imageryLayer = new ImageryLayer({
    //   
    // });

    this._imageryTileLayer = new ImageryTileLayer({
      // url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/World_Wind/ImageServer"
      url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer"
    });

    // this._imageryLayer = new ImageryLayer({
    //   url: "https://tiledimageservicesdev.arcgis.com/03e6LFX6hxm1ywlK/arcgis/rest/services/NLCAS2011_daily_wind_magdir/ImageServer"
    // });
  }
  
  override loadSharedResources(): Promise<SharedResources> {
    return Promise.resolve(new SharedResources());
  }

  override async loadLocalResources(extent: Extent, resolution: number): Promise<LocalResources> {
    const width = Math.round((extent.xmax - extent.xmin) / resolution);
    const height = Math.round((extent.ymax - extent.ymin) / resolution);

    await this._imageryTileLayer.load();
    const rasterData = await this._imageryTileLayer.fetchPixels(extent, width, height);

    return new LocalResources(extent, resolution, rasterData.pixelBlock);
  }

  override renderVisualization(gl: WebGLRenderingContext, renderParams: VisualizationRenderParams, sharedResources: SharedResources, localResources: LocalResources): void {
    defined(localResources.vertexBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, localResources.vertexBuffer);
    gl.vertexAttribPointer(0, 2, gl.SHORT, false, 8, 0);
    gl.vertexAttribPointer(1, 2, gl.SHORT, true, 8, 4);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    mat4.identity(localResources.u_ClipFromScreen);
    mat4.translate(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [-1, 1, 0]);
    mat4.scale(localResources.u_ClipFromScreen, localResources.u_ClipFromScreen, [2 / renderParams.size[0], -2 / renderParams.size[1], 1]);
  
    mat4.identity(localResources.u_ScreenFromLocal);
    mat4.translate(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [renderParams.translation[0], renderParams.translation[1], 1]);
    mat4.rotateZ(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, renderParams.rotation);
    mat4.scale(localResources.u_ScreenFromLocal, localResources.u_ScreenFromLocal, [renderParams.scale, renderParams.scale, 1]);
    // mat4.translate();

    const solidProgram = sharedResources.programs!["texture"]?.program!;
    gl.useProgram(solidProgram);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ScreenFromLocal"]!, false, localResources.u_ScreenFromLocal);
    gl.uniformMatrix4fv(sharedResources.programs!["texture"]?.uniforms["u_ClipFromScreen"]!, false, localResources.u_ClipFromScreen);
    gl.uniform1i(sharedResources.programs!["texture"]?.uniforms["u_Texture"]!, 0);
    gl.uniform1f(sharedResources.programs!["texture"]?.uniforms["u_Opacity"]!, renderParams.opacity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, localResources.texture);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
