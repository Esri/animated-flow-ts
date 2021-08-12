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
 * @module wind-es/core/util
 *
 * This module contains utilities of general interest.
 */

/**
 * Raise a runtime exception if a value is `null` or `undefined`.
 *
 * @param value The value to be asserted.
 */
export function defined(value: unknown): asserts value {
  if (value == null) {
    throw new Error("Value is not defined.");
  }
}

/**
 * Raise a runtime exception if a condition is not verified.
 *
 * @param value The condition to be checked.
 */
export function assert(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error("Condition is not verified.");
  }
}

/**
 * Create a seeded, pseudo-random number generator.
 *
 * @param seed The seed that determines the sequence of pseudo-random values.
 * @returns A function with no arguments that returns values in the range [0, 1);
 * such function is a plug-in replacement for `Math.random()`.
 */
export function createRand(seed = 3): () => number {
  const m = 1 << 23;
  const a = 65793;
  const c = 4282663;

  let z = seed;

  return () => {
    z = (a * z + c) % m;
    return ((z >> 8) & ((1 << 15) - 1)) / (1 << 15);
  };
}

/**
 * Throw an `AbortError` if a given `AbortSignal` is aborted.
 *
 * @param signal The abort signal to check.
 */
export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("Operation was aborted.", "AbortError");
  }
}

/**
 * Relinquish control to the event loop.
 *
 * This function is called by long-running processes
 * to make them abortable halfway through the computation.
 *
 * @param signal An abort signal
 * @returns A promise that resolves when execution should
 * continue.
 */
export async function rest(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (signal.aborted) {
        reject(new DOMException("Operation was aborted.", "AbortError"));
      }

      resolve();
    }, 0);
  });
}
