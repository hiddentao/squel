import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test"
import pkg from "../package.json" with { type: "json" }
import squel from "../src/index"

function callArgsMatch(callArgs: any[], expected: any[]): boolean {
  if (callArgs.length < expected.length) return false
  for (let i = 0; i < expected.length; i++) {
    if (JSON.stringify(callArgs[i]) !== JSON.stringify(expected[i]))
      return false
  }
  return true
}

function callArgsExact(callArgs: any[], expected: any[]): boolean {
  if (callArgs.length !== expected.length) return false
  for (let i = 0; i < expected.length; i++) {
    if (
      callArgs[i] !== expected[i] &&
      JSON.stringify(callArgs[i]) !== JSON.stringify(expected[i])
    ) {
      return false
    }
  }
  return true
}

function spyCalledWith(spy: any, ...expected: any[]): boolean {
  return spy.mock.calls.some((call: any[]) => callArgsMatch(call, expected))
}

function spyCalledWithExactly(spy: any, ...expected: any[]): boolean {
  return spy.mock.calls.some((call: any[]) => callArgsExact(call, expected))
}

function spyCalledOn(spy: any, obj: any): boolean {
  return (spy.mock.contexts || []).some((ctx: any) => ctx === obj)
}

describe("Base classes", () => {
  afterEach(() => {
    mock.restore()
  })

  it("Version number", () => {
    expect(squel.VERSION).toBe(pkg.version)
  })

  it("Default flavour", () => {
    expect(squel.flavour).toBeNull()
  })

  describe("Cloneable base class", () => {
    it(">> clone()", () => {
      class Child extends squel.cls.Cloneable {
        a: any
        b: any
        c: any
        d: any
        e: any
        f: any
        constructor() {
          super()
          this.a = 1
          this.b = 2.2
          this.c = true
          this.d = "str"
          this.e = [1]
          this.f = { a: 1 }
        }
      }

      const child = new Child()
      const copy = child.clone()
      expect(copy).toBeInstanceOf(Child)

      child.a = 2
      child.b = 3.2
      child.c = false
      child.d = "str2"
      child.e.push(2)
      child.f.b = 1

      expect(copy.a).toBe(1)
      expect(copy.b).toBe(2.2)
      expect(copy.c).toBe(true)
      expect(copy.d).toBe("str")
      expect(copy.e).toEqual([1])
      expect(copy.f).toEqual({ a: 1 })
    })
  })

  describe("Default query builder options", () => {
    it("default options", () => {
      expect(squel.cls.DefaultQueryBuilderOptions).toEqual({
        autoQuoteTableNames: false,
        autoQuoteFieldNames: false,
        autoQuoteAliasNames: true,
        useAsForTableAliasNames: false,
        nameQuoteCharacter: "`",
        tableAliasQuoteCharacter: "`",
        fieldAliasQuoteCharacter: '"',
        valueHandlers: [],
        parameterCharacter: "?",
        numberedParameters: false,
        numberedParametersPrefix: "$",
        numberedParametersStartAt: 1,
        replaceSingleQuotes: false,
        singleQuoteReplacement: "''",
        separator: " ",
        stringFormatter: null,
        rawNesting: false,
      })
    })
  })

  describe("Register global custom value handler", () => {
    let originalHandlers: any[]

    beforeEach(() => {
      originalHandlers = ([] as any[]).concat(squel.cls.globalValueHandlers)
      squel.cls.globalValueHandlers = []
    })

    afterEach(() => {
      squel.cls.globalValueHandlers = originalHandlers
    })

    it("default", () => {
      const handler = () => "test"
      squel.registerValueHandler(Date, handler)
      squel.registerValueHandler(Object, handler)
      squel.registerValueHandler("boolean", handler)

      expect(squel.cls.globalValueHandlers.length).toBe(3)
      expect(squel.cls.globalValueHandlers[0]).toEqual({ type: Date, handler })
      expect(squel.cls.globalValueHandlers[1]).toEqual({
        type: Object,
        handler,
      })
      expect(squel.cls.globalValueHandlers[2]).toEqual({
        type: "boolean",
        handler,
      })
    })

    it("type should be class constructor", () => {
      expect(() => squel.registerValueHandler(1 as any, null as any)).toThrow(
        "type must be a class constructor or string",
      )
    })

    it("handler should be function", () => {
      class MyClass {}
      expect(() => squel.registerValueHandler(MyClass, 1 as any)).toThrow(
        "handler must be a function",
      )
    })

    it("overrides existing handler", () => {
      const handler = () => "test"
      const handler2 = () => "test2"
      squel.registerValueHandler(Date, handler)
      squel.registerValueHandler(Date, handler2)

      expect(squel.cls.globalValueHandlers.length).toBe(1)
      expect(squel.cls.globalValueHandlers[0]).toEqual({
        type: Date,
        handler: handler2,
      })
    })
  })

  describe("str()", () => {
    it("constructor", () => {
      const f = squel.str("GETDATE(?)", 12, 23)
      expect(f).toBeInstanceOf(squel.cls.FunctionBlock)
      expect((f as any)._strings[0]).toBe("GETDATE(?)")
      expect((f as any)._values[0]).toEqual([12, 23])
    })

    describe("custom value handler", () => {
      let inst: any
      let handler: any

      beforeEach(() => {
        inst = squel.str("G(?,?)", 12, 23, 65)
        const handlerConfig = squel.cls.globalValueHandlers.find(
          (hc: any) => hc.type === squel.cls.FunctionBlock,
        )
        handler = handlerConfig!.handler
      })

      it("toString", () => {
        expect(inst.toString()).toEqual(handler(inst))
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual(handler(inst, true))
      })
    })
  })

  describe("rstr()", () => {
    it("constructor", () => {
      const f = squel.rstr("GETDATE(?)", 12, 23)
      expect(f).toBeInstanceOf(squel.cls.FunctionBlock)
      expect((f as any)._strings[0]).toBe("GETDATE(?)")
      expect((f as any)._values[0]).toEqual([12, 23])
    })

    it("vsStr", () => {
      const f1 = squel.str("OUTER(?)", squel.str("INNER(?)", 2))
      expect(f1.toString()).toBe("OUTER((INNER(2)))")
      const f2 = squel.str("OUTER(?)", squel.rstr("INNER(?)", 2))
      expect(f2.toString()).toBe("OUTER(INNER(2))")
    })

    describe("custom value handler", () => {
      let inst: any
      let handler: any

      beforeEach(() => {
        inst = squel.rstr("G(?,?)", 12, 23, 65)
        const handlerConfig = squel.cls.globalValueHandlers.find(
          (hc: any) => hc.type === squel.cls.FunctionBlock,
        )
        handler = handlerConfig!.handler
      })

      it("toString", () => {
        expect(inst.toString()).toEqual(handler(inst))
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual(handler(inst, true))
      })
    })
  })

  describe("Load an SQL flavour", () => {
    let flavoursBackup: any

    beforeEach(() => {
      flavoursBackup = squel.flavours
      squel.flavours = {}
    })

    afterEach(() => {
      squel.flavours = flavoursBackup
    })

    it("invalid flavour", () => {
      expect(() => squel.useFlavour("test")).toThrow(
        "Flavour not available: test",
      )
    })

    it("flavour reference should be a function", () => {
      ;(squel.flavours as any).test = "blah"
      expect(() => squel.useFlavour("test")).toThrow(
        "Flavour not available: test",
      )
    })

    it("flavour setup function gets executed", () => {
      const spy = mock(() => undefined)
      ;(squel.flavours as any).test = spy
      const ret = squel.useFlavour("test")
      expect(spy.mock.calls.length).toBe(1)
      expect(!!ret.select()).toBe(true)
    })

    it("can switch flavours", () => {
      ;(squel.flavours as any).test = mock((s: any) => {
        s.cls.dummy = 1
      })
      ;(squel.flavours as any).test2 = mock((s: any) => {
        s.cls.dummy2 = 2
      })
      let ret = squel.useFlavour("test")
      expect(ret.cls.dummy).toBe(1)

      ret = squel.useFlavour("test2")
      expect(ret.cls.dummy).toBeUndefined()
      expect(ret.cls.dummy2).toBe(2)

      ret = squel.useFlavour()
      expect(ret.cls.dummy).toBeUndefined()
      expect(ret.cls.dummy2).toBeUndefined()
    })

    it("can get current flavour", () => {
      const flavour = "test"
      ;(squel.flavours as any)[flavour] = mock(() => undefined)
      const ret = squel.useFlavour(flavour)
      expect(ret.flavour).toBe(flavour)
    })

    it("can mix flavours - #255", () => {
      ;(squel.flavours as any).flavour1 = (s: any) => s
      ;(squel.flavours as any).flavour2 = (s: any) => s
      const squel1 = squel.useFlavour("flavour1" as any)
      const squel2 = squel.useFlavour("flavour2" as any)
      const expr1 = squel1.expr().and("1 = 1")
      expect(squel2.select().from("test", "t").where(expr1).toString()).toBe(
        "SELECT * FROM test `t` WHERE (1 = 1)",
      )
    })
  })

  describe("Builder base class", () => {
    let Cls: any
    let inst: any
    let originalHandlers: any[]

    beforeEach(() => {
      Cls = squel.cls.BaseBuilder
      inst = new Cls()
      originalHandlers = ([] as any[]).concat(squel.cls.globalValueHandlers)
    })

    afterEach(() => {
      squel.cls.globalValueHandlers = originalHandlers
    })

    it("instanceof Cloneable", () => {
      expect(inst).toBeInstanceOf(squel.cls.Cloneable)
    })

    describe("constructor", () => {
      it("default options", () => {
        expect(inst.options).toEqual(squel.cls.DefaultQueryBuilderOptions)
      })

      it("overridden options", () => {
        inst = new Cls({
          dummy1: "str",
          dummy2: 12.3,
          usingValuePlaceholders: true,
          dummy3: true,
          globalValueHandlers: [1],
        })
        const expectedOptions = {
          ...squel.cls.DefaultQueryBuilderOptions,
          dummy1: "str",
          dummy2: 12.3,
          usingValuePlaceholders: true,
          dummy3: true,
          globalValueHandlers: [1],
        }
        expect(inst.options).toEqual(expectedOptions)
      })
    })

    describe("registerValueHandler", () => {
      afterEach(() => {
        squel.cls.globalValueHandlers = []
      })

      it("default", () => {
        const handler = () => "test"
        inst.registerValueHandler(Date, handler)
        inst.registerValueHandler(Object, handler)
        inst.registerValueHandler("number", handler)

        expect(inst.options.valueHandlers.length).toBe(3)
        expect(inst.options.valueHandlers[0]).toEqual({ type: Date, handler })
        expect(inst.options.valueHandlers[1]).toEqual({ type: Object, handler })
        expect(inst.options.valueHandlers[2]).toEqual({
          type: "number",
          handler,
        })
      })

      it("type should be class constructor", () => {
        expect(() => inst.registerValueHandler(1, null)).toThrow(
          "type must be a class constructor or string",
        )
      })

      it("handler should be function", () => {
        class MyClass {}
        expect(() => inst.registerValueHandler(MyClass, 1)).toThrow(
          "handler must be a function",
        )
      })

      it("returns instance for chainability", () => {
        const handler = () => "test"
        expect(inst.registerValueHandler(Date, handler)).toBe(inst)
      })

      it("overrides existing handler", () => {
        const handler = () => "test"
        const handler2 = () => "test2"
        inst.registerValueHandler(Date, handler)
        inst.registerValueHandler(Date, handler2)

        expect(inst.options.valueHandlers.length).toBe(1)
        expect(inst.options.valueHandlers[0]).toEqual({
          type: Date,
          handler: handler2,
        })
      })

      it("does not touch global value handlers list", () => {
        const oldGlobalHandlers = squel.cls.globalValueHandlers
        const handler = () => "test"
        inst.registerValueHandler(Date, handler)
        expect(squel.cls.globalValueHandlers).toBe(oldGlobalHandlers)
      })
    })

    describe("_sanitizeExpression", () => {
      it("if Expression - empty expression", () => {
        const e = squel.expr()
        expect(inst._sanitizeExpression(e)).toBe(e)
      })

      it("if Expression - non-empty expression", () => {
        const e = squel.expr().and("s.name <> 'Fred'")
        expect(inst._sanitizeExpression(e)).toBe(e)
      })

      it("if builder", () => {
        const s = squel.str("s")
        expect(inst._sanitizeExpression(s)).toBe(s)
      })

      it("if string", () => {
        const s = "BLA BLA"
        expect(inst._sanitizeExpression(s)).toBe("BLA BLA")
      })

      it("if neither expression, builder nor String", () => {
        expect(() => inst._sanitizeExpression(1)).toThrow(
          "expression must be a string or builder instance",
        )
      })
    })

    describe("_sanitizeName", () => {
      beforeEach(() => {
        spyOn(inst, "_sanitizeName")
      })

      it("if string", () => {
        expect(inst._sanitizeName("bla")).toBe("bla")
      })

      it("if boolean", () => {
        expect(() => inst._sanitizeName(true, "bla")).toThrow(
          "bla must be a string",
        )
      })

      it("if integer", () => {
        expect(() => inst._sanitizeName(1)).toThrow(
          "undefined must be a string",
        )
      })

      it("if float", () => {
        expect(() => inst._sanitizeName(1.2, "meh")).toThrow(
          "meh must be a string",
        )
      })

      it("if array", () => {
        expect(() => inst._sanitizeName([1], "yes")).toThrow(
          "yes must be a string",
        )
      })

      it("if object", () => {
        expect(() => inst._sanitizeName(new Object(), "yes")).toThrow(
          "yes must be a string",
        )
      })

      it("if null", () => {
        expect(() => inst._sanitizeName(null, "no")).toThrow(
          "no must be a string",
        )
      })

      it("if undefined", () => {
        expect(() => inst._sanitizeName(undefined, "no")).toThrow(
          "no must be a string",
        )
      })
    })

    describe("_sanitizeField", () => {
      it("default", () => {
        const spy = spyOn(inst, "_sanitizeName")
        expect(inst._sanitizeField("abc")).toBe("abc")
        expect(spyCalledWithExactly(spy, "abc", "field name")).toBe(true)
      })

      it("QueryBuilder", () => {
        const s = squel.select().from("scores").field("MAX(score)")
        expect(inst._sanitizeField(s)).toBe(s)
      })
    })

    describe("_sanitizeBaseBuilder", () => {
      it("is not base builder", () => {
        expect(() => inst._sanitizeBaseBuilder(null)).toThrow(
          "must be a builder instance",
        )
      })

      it("is a query builder", () => {
        const qry = squel.select()
        expect(inst._sanitizeBaseBuilder(qry)).toBe(qry)
      })
    })

    describe("_sanitizeTable", () => {
      it("default", () => {
        const spy = spyOn(inst, "_sanitizeName")
        expect(inst._sanitizeTable("abc")).toBe("abc")
        expect(spyCalledWithExactly(spy, "abc", "table")).toBe(true)
      })

      it("not a string", () => {
        expect(() => inst._sanitizeTable(null)).toThrow(
          "table name must be a string or a builder",
        )
      })

      it("query builder", () => {
        const select = squel.select()
        expect(inst._sanitizeTable(select, true)).toBe(select)
      })
    })

    describe("_sanitizeFieldAlias", () => {
      it("default", () => {
        const spy = spyOn(inst, "_sanitizeName")
        inst._sanitizeFieldAlias("abc")
        expect(spyCalledWithExactly(spy, "abc", "field alias")).toBe(true)
      })
    })

    describe("_sanitizeTableAlias", () => {
      it("default", () => {
        const spy = spyOn(inst, "_sanitizeName")
        inst._sanitizeTableAlias("abc")
        expect(spyCalledWithExactly(spy, "abc", "table alias")).toBe(true)
      })
    })

    describe("_sanitizeLimitOffset", () => {
      it("undefined", () => {
        expect(() => inst._sanitizeLimitOffset()).toThrow(
          "limit/offset must be >= 0",
        )
      })

      it("null", () => {
        expect(() => inst._sanitizeLimitOffset(null)).toThrow(
          "limit/offset must be >= 0",
        )
      })

      it("float", () => {
        expect(inst._sanitizeLimitOffset(1.2)).toBe(1)
      })

      it("boolean", () => {
        expect(() => inst._sanitizeLimitOffset(false)).toThrow(
          "limit/offset must be >= 0",
        )
      })

      it("string", () => {
        expect(inst._sanitizeLimitOffset("2")).toBe(2)
      })

      it("array", () => {
        expect(inst._sanitizeLimitOffset([3])).toBe(3)
      })

      it("object", () => {
        expect(() => inst._sanitizeLimitOffset(new Object())).toThrow(
          "limit/offset must be >= 0",
        )
      })

      it("number >= 0", () => {
        expect(inst._sanitizeLimitOffset(0)).toBe(0)
        expect(inst._sanitizeLimitOffset(1)).toBe(1)
      })

      it("number < 0", () => {
        expect(() => inst._sanitizeLimitOffset(-1)).toThrow(
          "limit/offset must be >= 0",
        )
      })
    })

    describe("_sanitizeValue", () => {
      beforeEach(() => {
        spyOn(inst, "_sanitizeValue")
      })

      afterEach(() => {
        squel.cls.globalValueHandlers = []
      })

      it("if string", () => {
        expect(inst._sanitizeValue("bla")).toBe("bla")
      })

      it("if boolean", () => {
        expect(inst._sanitizeValue(true)).toBe(true)
        expect(inst._sanitizeValue(false)).toBe(false)
      })

      it("if integer", () => {
        expect(inst._sanitizeValue(-1)).toBe(-1)
        expect(inst._sanitizeValue(0)).toBe(0)
        expect(inst._sanitizeValue(1)).toBe(1)
      })

      it("if float", () => {
        expect(inst._sanitizeValue(-1.2)).toBe(-1.2)
        expect(inst._sanitizeValue(1.2)).toBe(1.2)
      })

      it("if array", () => {
        expect(() => inst._sanitizeValue([1])).toThrow(
          "field value must be a string, number, boolean, null or one of the registered custom value types",
        )
      })

      it("if object", () => {
        expect(() => inst._sanitizeValue(new Object())).toThrow(
          "field value must be a string, number, boolean, null or one of the registered custom value types",
        )
      })

      it("if null", () => {
        expect(inst._sanitizeValue(null)).toBeNull()
      })

      it("if BaseBuilder", () => {
        const s = squel.select()
        expect(inst._sanitizeValue(s)).toBe(s)
      })

      it("if undefined", () => {
        expect(() => inst._sanitizeValue(undefined)).toThrow(
          "field value must be a string, number, boolean, null or one of the registered custom value types",
        )
      })

      describe("custom handlers", () => {
        it("global", () => {
          squel.registerValueHandler(Date, (v: any) => v)
          const date = new Date()
          expect(inst._sanitizeValue(date)).toBe(date)
        })

        it("instance", () => {
          inst.registerValueHandler(Date, (v: any) => v)
          const date = new Date()
          expect(inst._sanitizeValue(date)).toBe(date)
        })
      })
    })

    it("_escapeValue", () => {
      inst.options.replaceSingleQuotes = false
      expect(inst._escapeValue("te'st")).toBe("te'st")

      inst.options.replaceSingleQuotes = true
      expect(inst._escapeValue("te'st")).toBe("te''st")

      inst.options.singleQuoteReplacement = "--"
      expect(inst._escapeValue("te'st")).toBe("te--st")

      inst.options.singleQuoteReplacement = "--"
      expect(inst._escapeValue()).toBeUndefined()
    })

    describe("_formatTableName", () => {
      it("default", () => {
        expect(inst._formatTableName("abc")).toBe("abc")
      })

      describe("auto quote names", () => {
        beforeEach(() => {
          inst.options.autoQuoteTableNames = true
        })

        it("default quote character", () => {
          expect(inst._formatTableName("abc")).toBe("`abc`")
        })

        it("custom quote character", () => {
          inst.options.nameQuoteCharacter = "|"
          expect(inst._formatTableName("abc")).toBe("|abc|")
        })
      })
    })

    describe("_formatTableAlias", () => {
      it("default", () => {
        expect(inst._formatTableAlias("abc")).toBe("`abc`")
      })

      it("custom quote character", () => {
        inst.options.tableAliasQuoteCharacter = "~"
        expect(inst._formatTableAlias("abc")).toBe("~abc~")
      })

      it("auto quote alias names is OFF", () => {
        inst.options.autoQuoteAliasNames = false
        expect(inst._formatTableAlias("abc")).toBe("abc")
      })

      it("AS is turned ON", () => {
        inst.options.autoQuoteAliasNames = false
        inst.options.useAsForTableAliasNames = true
        expect(inst._formatTableAlias("abc")).toBe("AS abc")
      })
    })

    describe("_formatFieldAlias", () => {
      it("default", () => {
        expect(inst._formatFieldAlias("abc")).toBe('"abc"')
      })

      it("custom quote character", () => {
        inst.options.fieldAliasQuoteCharacter = "~"
        expect(inst._formatFieldAlias("abc")).toBe("~abc~")
      })

      it("auto quote alias names is OFF", () => {
        inst.options.autoQuoteAliasNames = false
        expect(inst._formatFieldAlias("abc")).toBe("abc")
      })
    })

    describe("_formatFieldName", () => {
      it("default", () => {
        expect(inst._formatFieldName("abc")).toBe("abc")
      })

      describe("auto quote names", () => {
        beforeEach(() => {
          inst.options.autoQuoteFieldNames = true
        })

        it("default quote character", () => {
          expect(inst._formatFieldName("abc.def")).toBe("`abc`.`def`")
        })

        it("do not quote *", () => {
          expect(inst._formatFieldName("abc.*")).toBe("`abc`.*")
        })

        it("custom quote character", () => {
          inst.options.nameQuoteCharacter = "|"
          expect(inst._formatFieldName("abc.def")).toBe("|abc|.|def|")
        })

        it("ignore periods when quoting", () => {
          expect(
            inst._formatFieldName("abc.def", {
              ignorePeriodsForFieldNameQuotes: true,
            }),
          ).toBe("`abc.def`")
        })
      })
    })

    describe("_formatCustomValue", () => {
      it("not a custom value type", () => {
        expect(inst._formatCustomValue(null)).toEqual({
          formatted: false,
          value: null,
        })
        expect(inst._formatCustomValue("abc")).toEqual({
          formatted: false,
          value: "abc",
        })
        expect(inst._formatCustomValue(12)).toEqual({
          formatted: false,
          value: 12,
        })
        expect(inst._formatCustomValue(1.2)).toEqual({
          formatted: false,
          value: 1.2,
        })
        expect(inst._formatCustomValue(true)).toEqual({
          formatted: false,
          value: true,
        })
        expect(inst._formatCustomValue(false)).toEqual({
          formatted: false,
          value: false,
        })
      })

      describe("custom value type", () => {
        it("global", () => {
          class MyClass {}
          const myObj = new MyClass()

          squel.registerValueHandler(MyClass, () => 3.14)
          squel.registerValueHandler("boolean", (v: any) => `a${v}`)

          expect(inst._formatCustomValue(myObj)).toEqual({
            formatted: true,
            value: 3.14,
          })
          expect(inst._formatCustomValue(true)).toEqual({
            formatted: true,
            value: "atrue",
          })
        })

        it("instance", () => {
          class MyClass {}
          const myObj = new MyClass()

          inst.registerValueHandler(MyClass, () => 3.14)
          inst.registerValueHandler("number", (v: any) => `${v}a`)

          expect(inst._formatCustomValue(myObj)).toEqual({
            formatted: true,
            value: 3.14,
          })
          expect(inst._formatCustomValue(5.2)).toEqual({
            formatted: true,
            value: "5.2a",
          })
        })

        it("instance handler takes precedence over global", () => {
          inst.registerValueHandler(Date, () => "hello")
          squel.registerValueHandler(Date, () => "goodbye")

          expect(inst._formatCustomValue(new Date())).toEqual({
            formatted: true,
            value: "hello",
          })

          inst = new Cls({ valueHandlers: [] })
          expect(inst._formatCustomValue(new Date())).toEqual({
            formatted: true,
            value: "goodbye",
          })
        })

        it("whether to format for parameterized output", () => {
          inst.registerValueHandler(Date, (_d: any, asParam: any) =>
            asParam ? "foo" : "bar",
          )
          const val = new Date()
          expect(inst._formatCustomValue(val, true)).toEqual({
            formatted: true,
            value: "foo",
          })
          expect(inst._formatCustomValue(val)).toEqual({
            formatted: true,
            value: "bar",
          })
        })

        it("additional formatting options", () => {
          inst.registerValueHandler(
            Date,
            (_d: any, _asParam: any, options: any) =>
              options.dontQuote ? "foo" : '"foo"',
          )
          const val = new Date()
          expect(
            inst._formatCustomValue(val, true, { dontQuote: true }),
          ).toEqual({
            formatted: true,
            value: "foo",
          })
          expect(
            inst._formatCustomValue(val, true, { dontQuote: false }),
          ).toEqual({
            formatted: true,
            value: '"foo"',
          })
        })

        it("return raw", () => {
          inst.registerValueHandler(Date, () => ({
            rawNesting: true,
            value: "foo",
          }))
          const val = new Date()
          expect(inst._formatCustomValue(val, true)).toEqual({
            rawNesting: true,
            formatted: true,
            value: "foo",
          })
        })
      })
    })

    describe("_formatValueForParamArray", () => {
      it("Query builder", () => {
        const s = squel.select().from("table")
        expect(inst._formatValueForParamArray(s)).toBe(s)
      })

      it("else calls _formatCustomValue", () => {
        const spy = spyOn(inst, "_formatCustomValue").mockImplementation(
          (_v: any, asParam: any) => ({
            formatted: true,
            value: `test${asParam ? "foo" : "bar"}`,
          }),
        )

        expect(inst._formatValueForParamArray(null)).toBe("testfoo")
        expect(inst._formatValueForParamArray("abc")).toBe("testfoo")
        expect(inst._formatValueForParamArray(12)).toBe("testfoo")
        expect(inst._formatValueForParamArray(1.2)).toBe("testfoo")

        const opts = { dummy: true }
        expect(inst._formatValueForParamArray(true, opts)).toBe("testfoo")
        expect(inst._formatValueForParamArray(false)).toBe("testfoo")

        expect(spy.mock.calls.length).toBe(6)
        expect((spy.mock.calls[4] as any)[2]).toBe(opts)
      })

      it("Array - recursively calls itself on each element", () => {
        const spy = spyOn(inst, "_formatValueForParamArray")
        const v = [squel.select().from("table"), 1.2]
        const opts = { dummy: true }
        const res = inst._formatValueForParamArray(v, opts)
        expect(res).toEqual(v)
        expect(spy.mock.calls.length).toBe(3)
        expect(spyCalledWith(spy, v[0])).toBe(true)
        expect(spyCalledWith(spy, v[1])).toBe(true)
        expect((spy.mock.calls[1] as any)[1]).toBe(opts)
      })
    })

    describe("_formatValueForQueryString", () => {
      it("null", () => {
        expect(inst._formatValueForQueryString(null)).toBe("NULL")
      })

      it("boolean", () => {
        expect(inst._formatValueForQueryString(true)).toBe("TRUE")
        expect(inst._formatValueForQueryString(false)).toBe("FALSE")
      })

      it("integer", () => {
        expect(inst._formatValueForQueryString(12)).toBe(12)
      })

      it("float", () => {
        expect(inst._formatValueForQueryString(1.2)).toBe(1.2)
      })

      describe("string", () => {
        it("have string formatter function", () => {
          inst.options.stringFormatter = (str: string) => `N(${str})`
          expect(inst._formatValueForQueryString("test")).toBe("N(test)")
        })

        it("default", () => {
          let escapedValue: any
          const spy = spyOn(inst, "_escapeValue").mockImplementation(
            (str: any) => escapedValue || str,
          )
          expect(inst._formatValueForQueryString("test")).toBe("'test'")
          expect(spyCalledWithExactly(spy, "test")).toBe(true)
          escapedValue = "blah"
          expect(inst._formatValueForQueryString("test")).toBe("'blah'")
        })

        it("dont quote", () => {
          let escapedValue: any
          const spy = spyOn(inst, "_escapeValue").mockImplementation(
            (str: any) => escapedValue || str,
          )
          expect(
            inst._formatValueForQueryString("test", { dontQuote: true }),
          ).toBe("test")
          expect(spy.mock.calls.length).toBe(0)
        })
      })

      it("Array - recursively calls itself on each element", () => {
        const spy = spyOn(inst, "_formatValueForQueryString")
        const expected = "('test', 123, TRUE, 1.2, NULL)"
        expect(
          inst._formatValueForQueryString(["test", 123, true, 1.2, null]),
        ).toBe(expected)

        expect(spy.mock.calls.length).toBe(6)
        expect(spyCalledWith(spy, "test")).toBe(true)
        expect(spyCalledWith(spy, 123)).toBe(true)
        expect(spyCalledWith(spy, true)).toBe(true)
        expect(spyCalledWith(spy, 1.2)).toBe(true)
        expect(spyCalledWith(spy, null)).toBe(true)
      })

      it("BaseBuilder", () => {
        spyOn(inst, "_applyNestingFormatting").mockImplementation(
          (v: any) => `{{${v}}}`,
        )
        const s = squel.select().from("table")
        expect(inst._formatValueForQueryString(s)).toBe(
          "{{SELECT * FROM table}}",
        )
      })

      it("checks to see if it is custom value type first", () => {
        spyOn(inst, "_formatCustomValue").mockImplementation(
          (_val: any, asParam: any) => ({
            formatted: true,
            value: 12 + (asParam ? 25 : 65),
          }),
        )
        spyOn(inst, "_applyNestingFormatting").mockImplementation(
          (v: any) => `{${v}}`,
        )
        expect(inst._formatValueForQueryString(123)).toBe("{77}")
      })

      it("#292 - custom value type specifies raw nesting", () => {
        spyOn(inst, "_formatCustomValue").mockImplementation(() => ({
          rawNesting: true,
          formatted: true,
          value: 12,
        }))
        spyOn(inst, "_applyNestingFormatting").mockImplementation(
          (v: any) => `{${v}}`,
        )
        expect(inst._formatValueForQueryString(123)).toBe(12)
      })
    })

    describe("_applyNestingFormatting", () => {
      it("default", () => {
        expect(inst._applyNestingFormatting("77")).toBe("(77)")
        expect(inst._applyNestingFormatting("(77")).toBe("((77)")
        expect(inst._applyNestingFormatting("77)")).toBe("(77))")
        expect(inst._applyNestingFormatting("(77)")).toBe("(77)")
      })

      it("no nesting", () => {
        expect(inst._applyNestingFormatting("77", false)).toBe("77")
      })

      it("rawNesting turned on", () => {
        inst = new Cls({ rawNesting: true })
        expect(inst._applyNestingFormatting("77")).toBe("77")
      })
    })

    describe("_buildString", () => {
      it("empty", () => {
        expect(inst._buildString("", [])).toEqual({ text: "", values: [] })
      })

      describe("no params", () => {
        it("non-parameterized", () => {
          expect(inst._buildString("abc = 3", [])).toEqual({
            text: "abc = 3",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._buildString("abc = 3", [], { buildParameterized: true }),
          ).toEqual({ text: "abc = 3", values: [] })
        })
      })

      describe("non-array", () => {
        it("non-parameterized", () => {
          expect(
            inst._buildString("a = ? ? ? ?", [2, "abc", false, null]),
          ).toEqual({ text: "a = 2 'abc' FALSE NULL", values: [] })
        })

        it("parameterized", () => {
          expect(
            inst._buildString("a = ? ? ? ?", [2, "abc", false, null], {
              buildParameterized: true,
            }),
          ).toEqual({ text: "a = ? ? ? ?", values: [2, "abc", false, null] })
        })
      })

      describe("array", () => {
        it("non-parameterized", () => {
          expect(inst._buildString("a = ?", [[1, 2, 3]])).toEqual({
            text: "a = (1, 2, 3)",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._buildString("a = ?", [[1, 2, 3]], {
              buildParameterized: true,
            }),
          ).toEqual({ text: "a = (?, ?, ?)", values: [1, 2, 3] })
        })
      })

      describe("nested builder", () => {
        let s: any

        beforeEach(() => {
          s = squel.select().from("master").where("b = ?", 5)
        })

        it("non-parameterized", () => {
          expect(inst._buildString("a = ?", [s])).toEqual({
            text: "a = (SELECT * FROM master WHERE (b = 5))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._buildString("a = ?", [s], { buildParameterized: true }),
          ).toEqual({
            text: "a = (SELECT * FROM master WHERE (b = ?))",
            values: [5],
          })
        })
      })

      describe("return nested output", () => {
        it("non-parameterized", () => {
          expect(inst._buildString("a = ?", [3], { nested: true })).toEqual({
            text: "(a = 3)",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._buildString("a = ?", [3], {
              buildParameterized: true,
              nested: true,
            }),
          ).toEqual({ text: "(a = ?)", values: [3] })
        })
      })

      it("string formatting options", () => {
        const options = { formattingOptions: { dontQuote: true } }
        expect(inst._buildString("a = ?", ["NOW()"], options)).toEqual({
          text: "a = NOW()",
          values: [],
        })
      })

      it("passes formatting options even when doing parameterized query", () => {
        const spy = spyOn(inst, "_formatValueForParamArray")
        const options = {
          buildParameterized: true,
          formattingOptions: { dontQuote: true },
        }
        inst._buildString("a = ?", [3], options)
        expect((spy.mock.calls[0] as any)[1]).toBe(options.formattingOptions)
      })

      describe("custom parameter character", () => {
        beforeEach(() => {
          inst.options.parameterCharacter = "@@"
        })

        it("non-parameterized", () => {
          expect(inst._buildString("a = @@", [[1, 2, 3]])).toEqual({
            text: "a = (1, 2, 3)",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._buildString("a = @@", [[1, 2, 3]], {
              buildParameterized: true,
            }),
          ).toEqual({ text: "a = (@@, @@, @@)", values: [1, 2, 3] })
        })
      })
    })

    describe("_buildManyStrings", () => {
      it("empty", () => {
        expect(inst._buildManyStrings([], [])).toEqual({ text: "", values: [] })
      })

      describe("simple", () => {
        let strings: string[]
        let values: any[][]

        beforeEach(() => {
          strings = ["a = ?", "b IN ? AND c = ?"]
          values = [["elephant"], [[1, 2, 3], 4]]
        })

        it("non-parameterized", () => {
          expect(inst._buildManyStrings(strings, values)).toEqual({
            text: "a = 'elephant' b IN (1, 2, 3) AND c = 4",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._buildManyStrings(strings, values, {
              buildParameterized: true,
            }),
          ).toEqual({
            text: "a = ? b IN (?, ?, ?) AND c = ?",
            values: ["elephant", 1, 2, 3, 4],
          })
        })
      })

      describe("return nested", () => {
        it("non-parameterized", () => {
          expect(
            inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]], {
              nested: true,
            }),
          ).toEqual({ text: "(a = 1 b = 2)", values: [] })
        })

        it("parameterized", () => {
          expect(
            inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]], {
              buildParameterized: true,
              nested: true,
            }),
          ).toEqual({ text: "(a = ? b = ?)", values: [1, 2] })
        })
      })

      describe("custom separator", () => {
        beforeEach(() => {
          inst.options.separator = "|"
        })

        it("non-parameterized", () => {
          expect(
            inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]]),
          ).toEqual({ text: "a = 1|b = 2", values: [] })
        })

        it("parameterized", () => {
          expect(
            inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]], {
              buildParameterized: true,
            }),
          ).toEqual({ text: "a = ?|b = ?", values: [1, 2] })
        })
      })
    })

    it("toParam", () => {
      const spy = spyOn(inst, "_toParamString").mockImplementation(() => ({
        text: "dummy",
        values: [1],
      }))
      const options = { test: 2 }
      expect(inst.toParam(options)).toEqual({ text: "dummy", values: [1] })
      expect(spy.mock.calls.length).toBe(1)
      expect((spy.mock.calls[0] as any)[0].test).toBe(2)
      expect((spy.mock.calls[0] as any)[0].buildParameterized).toBe(true)
    })

    it("toString", () => {
      const spy = spyOn(inst, "_toParamString").mockImplementation(() => ({
        text: "dummy",
        values: [1],
      }))
      const options = { test: 2 }
      expect(inst.toString(options)).toBe("dummy")
      expect(spy.mock.calls.length).toBe(1)
      expect(spy.mock.calls[0][0]).toEqual(options)
    })
  })

  describe("QueryBuilder base class", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.QueryBuilder
      inst = new Cls()
    })

    it("instanceof base builder", () => {
      expect(inst).toBeInstanceOf(squel.cls.BaseBuilder)
    })

    describe("constructor", () => {
      it("default options", () => {
        expect(inst.options).toEqual(squel.cls.DefaultQueryBuilderOptions)
      })

      it("overridden options", () => {
        inst = new Cls({
          dummy1: "str",
          dummy2: 12.3,
          usingValuePlaceholders: true,
          dummy3: true,
        })
        const expectedOptions = {
          ...squel.cls.DefaultQueryBuilderOptions,
          dummy1: "str",
          dummy2: 12.3,
          usingValuePlaceholders: true,
          dummy3: true,
        }
        expect(inst.options).toEqual(expectedOptions)
      })

      it("default blocks - none", () => {
        expect(inst.blocks).toEqual([])
      })

      describe("blocks passed in", () => {
        it("exposes block methods", () => {
          const limitExposedMethodsSpy = spyOn(
            squel.cls.LimitBlock.prototype,
            "exposedMethods",
          )
          const distinctExposedMethodsSpy = spyOn(
            squel.cls.DistinctBlock.prototype,
            "exposedMethods",
          )
          const limitSpy = spyOn(squel.cls.LimitBlock.prototype, "limit")
          const distinctSpy = spyOn(
            squel.cls.DistinctBlock.prototype,
            "distinct",
          )

          const blocks = [
            new squel.cls.LimitBlock(),
            new squel.cls.DistinctBlock(),
          ]

          inst = new Cls({}, blocks)

          expect(limitExposedMethodsSpy.mock.calls.length).toBe(1)
          expect(distinctExposedMethodsSpy.mock.calls.length).toBe(1)

          expect(typeof inst.distinct).toBe("function")
          expect(typeof inst.limit).toBe("function")

          expect(inst.limit(2)).toBe(inst)
          expect(limitSpy.mock.calls.length).toBe(1)
          expect(spyCalledOn(limitSpy, blocks[0])).toBe(true)

          expect(inst.distinct()).toBe(inst)
          expect(distinctSpy.mock.calls.length).toBe(1)
          expect(spyCalledOn(distinctSpy, blocks[1])).toBe(true)
        })

        it("cannot expose the same method twice", () => {
          const blocks = [
            new squel.cls.DistinctBlock(),
            new squel.cls.DistinctBlock(),
          ]
          try {
            inst = new Cls({}, blocks)
            throw new Error("should not reach here")
          } catch (err: any) {
            expect(err.toString()).toBe(
              "Error: Builder already has a builder method called: distinct",
            )
          }
        })
      })
    })

    describe("updateOptions()", () => {
      it("updates query builder options", () => {
        const oldOptions = { ...inst.options }
        inst.updateOptions({ updated: false })
        const expected = { ...oldOptions, updated: false }
        expect(inst.options).toEqual(expected)
      })

      it("updates building block options", () => {
        inst.blocks = [new squel.cls.Block()]
        const oldOptions = { ...inst.blocks[0].options }
        inst.updateOptions({ updated: false })
        const expected = { ...oldOptions, updated: false }
        expect(inst.blocks[0].options).toEqual(expected)
      })
    })

    describe("toString()", () => {
      it("returns empty if no blocks", () => {
        expect(inst.toString()).toBe("")
      })

      it("skips empty block strings", () => {
        inst.blocks = [new squel.cls.StringBlock({}, "")]
        expect(inst.toString()).toBe("")
      })

      it("returns final query string", () => {
        let i = 1
        const toStringSpy = spyOn(
          squel.cls.StringBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({ text: `ret${++i}`, values: [] }))

        inst.blocks = [
          new squel.cls.StringBlock({}, "STR1"),
          new squel.cls.StringBlock({}, "STR2"),
          new squel.cls.StringBlock({}, "STR3"),
        ]

        expect(inst.toString()).toBe("ret2 ret3 ret4")
        expect(toStringSpy.mock.calls.length).toBe(3)
        expect(spyCalledOn(toStringSpy, inst.blocks[0])).toBe(true)
        expect(spyCalledOn(toStringSpy, inst.blocks[1])).toBe(true)
        expect(spyCalledOn(toStringSpy, inst.blocks[2])).toBe(true)
      })
    })

    describe("toParam()", () => {
      it("returns empty if no blocks", () => {
        expect(inst.toParam()).toEqual({ text: "", values: [] })
      })

      it("skips empty block strings", () => {
        inst.blocks = [new squel.cls.StringBlock({}, "")]
        expect(inst.toParam()).toEqual({ text: "", values: [] })
      })

      it("returns final query string", () => {
        inst.blocks = [
          new squel.cls.StringBlock({}, "STR1"),
          new squel.cls.StringBlock({}, "STR2"),
          new squel.cls.StringBlock({}, "STR3"),
        ]

        let i = 1
        const toStringSpy = spyOn(
          squel.cls.StringBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({ text: `ret${++i}`, values: [] }))

        expect(inst.toParam()).toEqual({ text: "ret2 ret3 ret4", values: [] })
        expect(toStringSpy.mock.calls.length).toBe(3)
        expect(spyCalledOn(toStringSpy, inst.blocks[0])).toBe(true)
        expect(spyCalledOn(toStringSpy, inst.blocks[1])).toBe(true)
        expect(spyCalledOn(toStringSpy, inst.blocks[2])).toBe(true)
      })

      it("returns query with unnumbered parameters", () => {
        inst.blocks = [new squel.cls.WhereBlock({})]
        inst.blocks[0]._toParamString = mock(() => ({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        }))
        expect(inst.toParam()).toEqual({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        })
      })

      it("returns query with numbered parameters", () => {
        inst = new Cls({ numberedParameters: true })
        inst.blocks = [new squel.cls.WhereBlock({})]
        spyOn(
          squel.cls.WhereBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        }))
        expect(inst.toParam()).toEqual({
          text: "a = $1 AND b in ($2, $3)",
          values: [1, 2, 3],
        })
      })

      it("returns query with numbered parameters and custom prefix", () => {
        inst = new Cls({
          numberedParameters: true,
          numberedParametersPrefix: "&%",
        })
        inst.blocks = [new squel.cls.WhereBlock({})]
        spyOn(
          squel.cls.WhereBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        }))
        expect(inst.toParam()).toEqual({
          text: "a = &%1 AND b in (&%2, &%3)",
          values: [1, 2, 3],
        })
      })
    })

    describe("cloning", () => {
      it("blocks get cloned properly", () => {
        spyOn(squel.cls.StringBlock.prototype, "clone")
        inst.blocks = [new squel.cls.StringBlock({}, "TEST")]
        const newinst = inst.clone()
        inst.blocks[0].str = "TEST2"
        expect(newinst.blocks[0].toString()).toBe("TEST")
      })
    })

    describe("registerValueHandler", () => {
      let originalHandlers: any[]

      beforeEach(() => {
        originalHandlers = ([] as any[]).concat(squel.cls.globalValueHandlers)
      })

      afterEach(() => {
        squel.cls.globalValueHandlers = originalHandlers
      })

      it("calls through to base class method", () => {
        const baseBuilderSpy = spyOn(
          squel.cls.BaseBuilder.prototype,
          "registerValueHandler",
        )
        const handler = () => "test"
        inst.registerValueHandler(Date, handler)
        inst.registerValueHandler("number", handler)
        expect(baseBuilderSpy.mock.calls.length).toBe(2)
        expect(spyCalledOn(baseBuilderSpy, inst)).toBe(true)
      })

      it("returns instance for chainability", () => {
        const handler = () => "test"
        expect(inst.registerValueHandler(Date, handler)).toBe(inst)
      })

      it("calls through to blocks", () => {
        inst.blocks = [new squel.cls.StringBlock({}, "")]
        const baseBuilderSpy = spyOn(inst.blocks[0], "registerValueHandler")
        const handler = () => "test"
        inst.registerValueHandler(Date, handler)
        expect(baseBuilderSpy.mock.calls.length).toBe(1)
        expect(spyCalledOn(baseBuilderSpy, inst.blocks[0])).toBe(true)
      })
    })

    describe("get block", () => {
      it("valid", () => {
        const block = new squel.cls.FunctionBlock()
        inst.blocks.push(block)
        expect(inst.getBlock(squel.cls.FunctionBlock)).toBe(block)
      })

      it("invalid", () => {
        expect(inst.getBlock(squel.cls.FunctionBlock)).toBeUndefined()
      })
    })
  })
})
