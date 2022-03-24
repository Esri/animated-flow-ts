import Color from "esri/Color";
import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import LayerList from "esri/widgets/LayerList";
import { TestPatternLayer } from "../jumpstart/01-testpattern/layer";
import { FancyRasterLayer } from "../jumpstart/02-fancyraster/layer";
import { ShimmerLayer } from "../jumpstart/03-shimmer/layer";

const testPatternLayer = new TestPatternLayer({
  title: "01 - Test pattern"
} as any);

const fancyRasterLayer = new FancyRasterLayer({
  title: "02 - Fancy raster",
  effect: "bloom(1.0, 1px, 0)",
  imageryUrl: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
} as any);

const shimmerLayer = new ShimmerLayer({
  title: "03 - Shimmering power plants",
  featureUrl:
    "https://services.arcgis.com/AgwDJMQH12AGieWa/arcgis/rest/services/global_power_plant_database_June_2018/FeatureServer",
  fieldName: "fuel1",
  colorMap: {
    Wind: Color.fromString("red"),
    Solar: Color.fromString("orange"),
    Hydro: Color.fromString("yellow"),
    Gas: Color.fromString("green"),
    Oil: Color.fromString("blue"),
    Coal: Color.fromString("purple"),
    Storage: Color.fromString("pink")
  }
} as any);

const map = new EsriMap({
  basemap: "dark-gray",
  layers: [fancyRasterLayer, shimmerLayer, testPatternLayer]
});

const view = new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-110, 40]
});

const layerList = new LayerList({
  view
});

view.ui.add(layerList, {
  position: "bottom-right"
});
