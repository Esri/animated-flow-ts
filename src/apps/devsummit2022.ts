// import ImageryLayer from "esri/layers/ImageryLayer";
import EsriMap from "esri/Map";
import MapView from "esri/views/MapView";
import { DevSummit2022Layer } from "../devsummit2022/layer";

const myLayer = new DevSummit2022Layer({
  // spatialReference: {
  //   wkid: 3857
  // }
} as any);

// const mountains = new ImageryLayer({
//   url: "https://kyraster.ky.gov/arcgis/rest/services/ElevationServices/Ky_DEM_KYAPED_5FT/ImageServer"
// });

const map = new EsriMap({
  basemap: "dark-gray",
  // layers: [mountains, myLayer]
  layers: [myLayer]
});

new MapView({
  container: "viewDiv",
  map,
  zoom: 9,
  center: [-85.3419, 37.3434]
});