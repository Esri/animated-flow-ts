import { Milliseconds, Pixels } from "../core/types";
import { Cells, PixelsPerCell, PixelsPerSecond } from "./types";

const fixedCellSize: PixelsPerCell = 5;
const smoothing: Cells = 3;
const segmentLength: Pixels = 1;
const verticesPerLine = 30;
const speedScale = 0.1;
const linesPerVisualization = 12000;
const minSpeedThreshold: PixelsPerSecond = 0.001;
const minWeightThreshold = 0.001;
const flowProcessingQuanta: Milliseconds = 100;
const lineWidth = 2;
const trailDuration: number = 1;
const trailPeriod: number = 3;
const timeScale = 30;

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
  trailDuration,
  trailPeriod,
  timeScale
};