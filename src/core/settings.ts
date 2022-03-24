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
 * @module animated-flow-ts/core/settings
 *
 * This module contains parameters used by the `core` package.
 */

// The current extent is expanded a bit before being loaded for rendering.
// This is done to avoid artifacts caused by the graphic objects being
// too close to the edges of the loaded data.
const extentExpandFactor = 1.15;

export default {
  extentExpandFactor
};
