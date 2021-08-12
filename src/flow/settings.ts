import { Milliseconds, Pixels } from "../core/types";
import { Cells, PixelsPerSecond } from "./types";

// What shall I do with the cellSize?

const smoothing: Cells = 30;
const segmentLength: Pixels = 3;
const verticesPerLine = 100;
const speedScale = 0.1;
const linesPerVisualization = 4000;
const minSpeedThreshold: PixelsPerSecond = 0.001;
const minWeightThreshold = 0.001;
const flowProcessingQuanta: Milliseconds = 100;
const speedFactor = 100;
const lineWidth = 2;
const speed50 = 50;
const time2 = 2;
const trailDecay = 0.01;
const trailSpeedAttenuationExponent = 100;

export default {
  smoothing,
  segmentLength,
  verticesPerLine,
  speedScale,
  linesPerVisualization,
  minSpeedThreshold,
  minWeightThreshold,
  flowProcessingQuanta,
  speedFactor,
  lineWidth,
  speed50,
  time2,
  trailDecay,
  trailSpeedAttenuationExponent
};