/** Preserve Date/Decimal JSON behavior and encode every nested BigInt losslessly. */
export function jsonSafe(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === 'bigint' ? item.toString() : item));
}
