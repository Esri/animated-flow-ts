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