export function pick(
  obj: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const k of keys) {
    if (k in obj) result[k] = obj[k]
  }
  return result
}
