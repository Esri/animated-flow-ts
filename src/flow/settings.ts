import { Milliseconds, Pixels } from "../core/types";
import { Cells, PixelsPerCell, PixelsPerSecond } from "./types";

const fixedCellSize: PixelsPerCell = 5;
const smoothing: Cells = 3;
const segmentLength: Pixels = 1;
const verticesPerLine = 30;
const speedScale = 0.1;
const linesPerVisualization = 3000;
const minSpeedThreshold: PixelsPerSecond = 0.001;
const minWeightThreshold = 0.001;
const flowProcessingQuanta: Milliseconds = 100;
const lineWidth = 2;
const speed50 = 10;
const time2 = 2;
const trailDecay = 0.01;
const trailSpeedAttenuationExponent = 10000 * 100;

export default {
  fixedCellSize,
  smoothing,
  segmentLength,
  verticesPerLine,
  speedScale,
  linesPerVisualization,
  minSpeedThreshold,
  minWeightThreshold,
  flowProcessingQuanta,
  lineWidth,
  speed50,
  time2,
  trailDecay,
  trailSpeedAttenuationExponent
};