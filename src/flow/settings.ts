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
 * @module animated-flow-ts/flow/settings
 *
 * This module contains parameters used by the `flow` package.
 */

import { Milliseconds } from "../core/types";
import { Cells, PixelsPerCell, PixelsPerSecond } from "./types";

// The size of cell in pixels.
const fixedCellSize: PixelsPerCell = 5;

// The size of the smoothing kernel in cells.
const smoothing: Cells = 3;

// The length of a streamline segment.
const segmentLength: Cells = 1;

// Maximum number of vertices in a streamline.
const verticesPerLine = 30;

// Controls the speed of particles during simulation.
const speedScale = 0.1;

// How many streamlines per screen.
const linesPerVisualization = 6000;

// Below this speed, the simulation of a particle is stopped.
const minSpeedThreshold: PixelsPerSecond = 0.001;

// Protection against division-by-zero during smoothing with gaussian kernel.
const minWeightThreshold = 0.001;

// The generation of the streamlines mesh has a chance of being stopped
// once in a while; this allows to cancel the process when it is detected
// that the viewpoint has changed and the mesh is not needed anymore.
const flowProcessingQuanta: Milliseconds = 100;

// The width of a streamline in pixels.
const lineWidth = 2;

// The length of a streamline trail expressed in seconds.
const trailDuration: number = 1;

// The period after which a streamline animation repeats.
const trailPeriod: number = 3;

// Controls the animation speed of the streamlines trails.
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
