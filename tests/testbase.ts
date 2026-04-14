import {
  afterEach as _afterEach,
  beforeEach as _beforeEach,
  describe,
  expect,
  it,
} from "bun:test"

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

/**
 * Legacy `assert` / `_` / `run` shims used by tests/baseclasses.test.ts and
 * tests/blocks.test.ts. New tests should use `describe` / `it` / `expect`
 * directly from "bun:test"; see e.g. tests/case.test.ts for the canonical
 * pattern. These shims exist so the two large legacy test files keep running
 * while their refactor is pending.
 */

export const assert = {
  same(actual: unknown, expected: unknown): void {
    expect(actual).toEqual(expected as any)
  },
  deepEqual(actual: unknown, expected: unknown): void {
    expect(actual).toEqual(expected as any)
  },
  strictEqual(actual: unknown, expected: unknown): void {
    expect(actual).toBe(expected as any)
  },
  equal(actual: unknown, expected: unknown): void {
    expect(actual).toEqual(expected as any)
  },
  ok(value: unknown): void {
    expect(!!value).toBe(true)
  },
  isTrue(value: unknown): void {
    expect(value).toBe(true)
  },
  isFalse(value: unknown): void {
    expect(value).toBe(false)
  },
  isNull(value: unknown): void {
    expect(value).toBeNull()
  },
  isUndefined(value: unknown): void {
    expect(value).toBeUndefined()
  },
  instanceOf(value: unknown, ctor: any): void {
    expect(value).toBeInstanceOf(ctor)
  },
  throws(fn: () => unknown, matcher?: RegExp | string | unknown): void {
    if (matcher === undefined) {
      expect(fn).toThrow()
    } else if (matcher instanceof RegExp || typeof matcher === "string") {
      expect(fn).toThrow(matcher)
    } else {
      expect(fn).toThrow(matcher as any)
    }
  },
  typeOf(value: unknown, type: string): void {
    expect(typeof value).toBe(type as any)
  },
}

export const _ = {
  extend<T extends object>(dst: T, ...sources: any[]): T {
    return Object.assign(dst, ...sources)
  },
  pick<T extends Record<string, any>>(
    obj: T,
    ...keys: any[]
  ): Record<string, any> {
    const flatKeys = keys.flat() as string[]
    return pick(obj, flatKeys) as Record<string, any>
  },
  keys(obj: object): string[] {
    return Object.keys(obj)
  },
  find<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
    return arr.find(predicate)
  },
  each<T>(arr: T[], fn: (item: T, idx: number) => void): void {
    arr.forEach(fn)
  },
  isEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
  },
}

type TestFn = (this: any) => void | Promise<void>
type TestTree = { [key: string]: TestTree | TestFn }

export function run(name: string, tree: TestTree, parentCtx?: any): void {
  describe(name, () => {
    const ctx: any = Object.create(parentCtx ?? null)

    for (const key of Object.keys(tree)) {
      const val = tree[key]
      if (key === "beforeEach" && typeof val === "function") {
        _beforeEach(() => val.call(ctx))
      } else if (key === "afterEach" && typeof val === "function") {
        _afterEach(() => val.call(ctx))
      } else if (typeof val === "function") {
        it(key, () => val.call(ctx))
      } else if (typeof val === "object" && val !== null) {
        run(key, val as TestTree, ctx)
      }
    }
  })
}
