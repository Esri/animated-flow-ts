/**
 * @module wind-es/core/util
 * 
 * This module contains utilities of general interest.
 */

/**
 * Raise a runtime exception if the value is `null` or `undefined`.
 *
 * @param value The value to be asserted.
 */
 export function defined(value: unknown): asserts value {
  if (value == null) {
    throw new Error("Value is not defined.");
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