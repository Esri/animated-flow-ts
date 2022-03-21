import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import LayerList from "esri/widgets/LayerList";
import { TestPatternLayer } from "../jumpstart/01-testpattern/layer";
import { FancyRasterLayer } from "../jumpstart/02-fancyraster/layer";
import { ShimmerLayer } from "../jumpstart/03-shimmer/layer";

const testPatternLayer = new TestPatternLayer({ title: "01 - Test pattern" } as any);
const fancyRasterLayer = new FancyRasterLayer({ title: "02 - Fancy raster" } as any);
const shimmerLayer = new ShimmerLayer({ title: "03 - Shimmering power plants" } as any);

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