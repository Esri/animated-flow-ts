/**
 * @module wind-es/util
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