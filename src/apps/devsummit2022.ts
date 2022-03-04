import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import { DevSummit2022Layer } from "../devsummit2022/layer";

const myLayer = new DevSummit2022Layer({
} as any);

const map = new EsriMap({
  basemap: "dark-gray",
  layers: [myLayer]
});

new MapView({
  container: "viewDiv",
  map,
  zoom: 4,
  center: [-98, 39]
});
