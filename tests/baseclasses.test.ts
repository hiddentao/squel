import { mock, spyOn } from "bun:test"
import pkg from "../package.json" with { type: "json" }
import squel from "../src/index"
import { assert, _, run } from "./testbase"

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

run("Base classes", {
  afterEach() {
    mock.restore()
  },

  "Version number"() {
    assert.same(squel.VERSION, pkg.version)
  },

  "Default flavour"() {
    assert.isNull(squel.flavour)
  },

  "Cloneable base class": {
    ">> clone()"() {
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
      assert.instanceOf(copy, Child)

      child.a = 2
      child.b = 3.2
      child.c = false
      child.d = "str2"
      child.e.push(2)
      child.f.b = 1

      assert.same(copy.a, 1)
      assert.same(copy.b, 2.2)
      assert.same(copy.c, true)
      assert.same(copy.d, "str")
      assert.same(copy.e, [1])
      assert.same(copy.f, { a: 1 })
    },
  },

  "Default query builder options": {
    "default options"() {
      assert.same(
        {
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
        },
        squel.cls.DefaultQueryBuilderOptions,
      )
    },
  },

  "Register global custom value handler": {
    beforeEach(this: any) {
      this.originalHandlers = ([] as any[]).concat(
        squel.cls.globalValueHandlers,
      )
      squel.cls.globalValueHandlers = []
    },
    afterEach(this: any) {
      squel.cls.globalValueHandlers = this.originalHandlers
    },
    default() {
      const handler = () => "test"
      squel.registerValueHandler(Date, handler)
      squel.registerValueHandler(Object, handler)
      squel.registerValueHandler("boolean", handler)

      assert.same(3, squel.cls.globalValueHandlers.length)
      assert.same({ type: Date, handler }, squel.cls.globalValueHandlers[0])
      assert.same({ type: Object, handler }, squel.cls.globalValueHandlers[1])
      assert.same(
        { type: "boolean", handler },
        squel.cls.globalValueHandlers[2],
      )
    },

    "type should be class constructor"() {
      assert.throws(
        () => squel.registerValueHandler(1 as any, null as any),
        "type must be a class constructor or string",
      )
    },

    "handler should be function"() {
      class MyClass {}
      assert.throws(
        () => squel.registerValueHandler(MyClass, 1 as any),
        "handler must be a function",
      )
    },

    "overrides existing handler"() {
      const handler = () => "test"
      const handler2 = () => "test2"
      squel.registerValueHandler(Date, handler)
      squel.registerValueHandler(Date, handler2)

      assert.same(1, squel.cls.globalValueHandlers.length)
      assert.same(
        { type: Date, handler: handler2 },
        squel.cls.globalValueHandlers[0],
      )
    },
  },

  "str()": {
    constructor() {
      const f = squel.str("GETDATE(?)", 12, 23)
      assert.ok(f instanceof squel.cls.FunctionBlock)
      assert.same("GETDATE(?)", (f as any)._strings[0])
      assert.same([12, 23], (f as any)._values[0])
    },

    "custom value handler": {
      beforeEach(this: any) {
        this.inst = squel.str("G(?,?)", 12, 23, 65)

        const handlerConfig = _.find(
          squel.cls.globalValueHandlers,
          (hc: any) => hc.type === squel.cls.FunctionBlock,
        )

        this.handler = handlerConfig.handler
      },

      toString(this: any) {
        assert.same(this.inst.toString(), this.handler(this.inst))
      },
      toParam(this: any) {
        assert.same(this.inst.toParam(), this.handler(this.inst, true))
      },
    },
  },

  "rstr()": {
    constructor() {
      const f = squel.rstr("GETDATE(?)", 12, 23)
      assert.ok(f instanceof squel.cls.FunctionBlock)
      assert.same("GETDATE(?)", (f as any)._strings[0])
      assert.same([12, 23], (f as any)._values[0])
    },

    vsStr() {
      const f1 = squel.str("OUTER(?)", squel.str("INNER(?)", 2))
      assert.same("OUTER((INNER(2)))", f1.toString())
      const f2 = squel.str("OUTER(?)", squel.rstr("INNER(?)", 2))
      assert.same("OUTER(INNER(2))", f2.toString())
    },

    "custom value handler": {
      beforeEach(this: any) {
        this.inst = squel.rstr("G(?,?)", 12, 23, 65)

        const handlerConfig = _.find(
          squel.cls.globalValueHandlers,
          (hc: any) => hc.type === squel.cls.FunctionBlock,
        )

        this.handler = handlerConfig.handler
      },

      toString(this: any) {
        assert.same(this.inst.toString(), this.handler(this.inst))
      },
      toParam(this: any) {
        assert.same(this.inst.toParam(), this.handler(this.inst, true))
      },
    },
  },

  "Load an SQL flavour": {
    beforeEach(this: any) {
      this.flavoursBackup = squel.flavours
      squel.flavours = {}
    },

    afterEach(this: any) {
      squel.flavours = this.flavoursBackup
    },

    "invalid flavour"() {
      assert.throws(
        () => squel.useFlavour("test"),
        "Flavour not available: test",
      )
    },

    "flavour reference should be a function"() {
      ;(squel.flavours as any)["test"] = "blah"
      assert.throws(
        () => squel.useFlavour("test"),
        "Flavour not available: test",
      )
    },

    "flavour setup function gets executed"() {
      const spy = mock(() => undefined)
      ;(squel.flavours as any)["test"] = spy
      const ret = squel.useFlavour("test")
      assert.ok(spy.mock.calls.length === 1)
      assert.ok(!!ret.select())
    },

    "can switch flavours"() {
      ;(squel.flavours as any)["test"] = mock((s: any) => {
        s.cls.dummy = 1
      })
      ;(squel.flavours as any)["test2"] = mock((s: any) => {
        s.cls.dummy2 = 2
      })
      let ret = squel.useFlavour("test")
      assert.same(ret.cls.dummy, 1)

      ret = squel.useFlavour("test2")
      assert.same(ret.cls.dummy, undefined)
      assert.same(ret.cls.dummy2, 2)

      ret = squel.useFlavour()
      assert.same(ret.cls.dummy, undefined)
      assert.same(ret.cls.dummy2, undefined)
    },

    "can get current flavour"() {
      const flavour = "test"
      ;(squel.flavours as any)[flavour] = mock(() => undefined)

      const ret = squel.useFlavour(flavour)
      assert.same(ret.flavour, flavour)
    },

    "can mix flavours - #255"() {
      ;(squel.flavours as any).flavour1 = (s: any) => s
      ;(squel.flavours as any).flavour2 = (s: any) => s
      const squel1 = squel.useFlavour("flavour1" as any)
      const squel2 = squel.useFlavour("flavour2" as any)

      const expr1 = squel1.expr().and("1 = 1")
      assert.same(
        squel2.select().from("test", "t").where(expr1).toString(),
        "SELECT * FROM test `t` WHERE (1 = 1)",
      )
    },
  },

  "Builder base class": {
    beforeEach(this: any) {
      this.cls = squel.cls.BaseBuilder
      this.inst = new this.cls()
      this.originalHandlers = ([] as any[]).concat(
        squel.cls.globalValueHandlers,
      )
    },

    afterEach(this: any) {
      squel.cls.globalValueHandlers = this.originalHandlers
    },

    "instanceof Cloneable"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Cloneable)
    },

    constructor: {
      "default options"(this: any) {
        assert.same(squel.cls.DefaultQueryBuilderOptions, this.inst.options)
      },

      "overridden options"(this: any) {
        this.inst = new this.cls({
          dummy1: "str",
          dummy2: 12.3,
          usingValuePlaceholders: true,
          dummy3: true,
          globalValueHandlers: [1],
        })

        const expectedOptions = _.extend(
          {},
          squel.cls.DefaultQueryBuilderOptions,
          {
            dummy1: "str",
            dummy2: 12.3,
            usingValuePlaceholders: true,
            dummy3: true,
            globalValueHandlers: [1],
          },
        )

        assert.same(expectedOptions, this.inst.options)
      },
    },

    registerValueHandler: {
      afterEach() {
        squel.cls.globalValueHandlers = []
      },

      default(this: any) {
        const handler = () => "test"
        this.inst.registerValueHandler(Date, handler)
        this.inst.registerValueHandler(Object, handler)
        this.inst.registerValueHandler("number", handler)

        assert.same(3, this.inst.options.valueHandlers.length)
        assert.same({ type: Date, handler }, this.inst.options.valueHandlers[0])
        assert.same(
          { type: Object, handler },
          this.inst.options.valueHandlers[1],
        )
        assert.same(
          { type: "number", handler },
          this.inst.options.valueHandlers[2],
        )
      },

      "type should be class constructor"(this: any) {
        assert.throws(
          () => this.inst.registerValueHandler(1, null),
          "type must be a class constructor or string",
        )
      },

      "handler should be function"(this: any) {
        class MyClass {}
        assert.throws(
          () => this.inst.registerValueHandler(MyClass, 1),
          "handler must be a function",
        )
      },

      "returns instance for chainability"(this: any) {
        const handler = () => "test"
        assert.same(this.inst, this.inst.registerValueHandler(Date, handler))
      },

      "overrides existing handler"(this: any) {
        const handler = () => "test"
        const handler2 = () => "test2"
        this.inst.registerValueHandler(Date, handler)
        this.inst.registerValueHandler(Date, handler2)

        assert.same(1, this.inst.options.valueHandlers.length)
        assert.same(
          { type: Date, handler: handler2 },
          this.inst.options.valueHandlers[0],
        )
      },

      "does not touch global value handlers list"(this: any) {
        const oldGlobalHandlers = squel.cls.globalValueHandlers

        const handler = () => "test"
        this.inst.registerValueHandler(Date, handler)

        assert.same(oldGlobalHandlers, squel.cls.globalValueHandlers)
      },
    },

    _sanitizeExpression: {
      "if Expression - empty expression"(this: any) {
        const e = squel.expr()
        assert.same(e, this.inst._sanitizeExpression(e))
      },
      "if Expression - non-empty expression"(this: any) {
        const e = squel.expr().and("s.name <> 'Fred'")
        assert.same(e, this.inst._sanitizeExpression(e))
      },
      "if builder"(this: any) {
        const s = squel.str("s")
        assert.same(s, this.inst._sanitizeExpression(s))
      },
      "if string"(this: any) {
        const s = "BLA BLA"
        assert.same("BLA BLA", this.inst._sanitizeExpression(s))
      },
      "if neither expression, builder nor String"(this: any) {
        const testFn = () => this.inst._sanitizeExpression(1)
        assert.throws(testFn, "expression must be a string or builder instance")
      },
    },

    _sanitizeName: {
      beforeEach(this: any) {
        spyOn(this.inst, "_sanitizeName")
      },

      "if string"(this: any) {
        assert.same("bla", this.inst._sanitizeName("bla"))
      },

      "if boolean"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName(true, "bla"),
          "bla must be a string",
        )
      },

      "if integer"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName(1),
          "undefined must be a string",
        )
      },

      "if float"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName(1.2, "meh"),
          "meh must be a string",
        )
      },

      "if array"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName([1], "yes"),
          "yes must be a string",
        )
      },

      "if object"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName(new Object(), "yes"),
          "yes must be a string",
        )
      },

      "if null"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName(null, "no"),
          "no must be a string",
        )
      },

      "if undefined"(this: any) {
        assert.throws(
          () => this.inst._sanitizeName(undefined, "no"),
          "no must be a string",
        )
      },
    },

    _sanitizeField: {
      default(this: any) {
        const spy = spyOn(this.inst, "_sanitizeName")

        assert.same("abc", this.inst._sanitizeField("abc"))

        assert.ok(spyCalledWithExactly(spy, "abc", "field name"))
      },

      QueryBuilder(this: any) {
        const s = squel.select().from("scores").field("MAX(score)")
        assert.same(s, this.inst._sanitizeField(s))
      },
    },

    _sanitizeBaseBuilder: {
      "is not base builder"(this: any) {
        assert.throws(
          () => this.inst._sanitizeBaseBuilder(null),
          "must be a builder instance",
        )
      },

      "is a query builder"(this: any) {
        const qry = squel.select()
        assert.same(qry, this.inst._sanitizeBaseBuilder(qry))
      },
    },

    _sanitizeTable: {
      default(this: any) {
        const spy = spyOn(this.inst, "_sanitizeName")

        assert.same("abc", this.inst._sanitizeTable("abc"))

        assert.ok(spyCalledWithExactly(spy, "abc", "table"))
      },

      "not a string"(this: any) {
        assert.throws(
          () => this.inst._sanitizeTable(null),
          "table name must be a string or a builder",
        )
      },

      "query builder"(this: any) {
        const select = squel.select()
        assert.same(select, this.inst._sanitizeTable(select, true))
      },
    },

    _sanitizeFieldAlias: {
      default(this: any) {
        const spy = spyOn(this.inst, "_sanitizeName")

        this.inst._sanitizeFieldAlias("abc")

        assert.ok(spyCalledWithExactly(spy, "abc", "field alias"))
      },
    },

    _sanitizeTableAlias: {
      default(this: any) {
        const spy = spyOn(this.inst, "_sanitizeName")

        this.inst._sanitizeTableAlias("abc")

        assert.ok(spyCalledWithExactly(spy, "abc", "table alias"))
      },
    },

    _sanitizeLimitOffset: {
      undefined(this: any) {
        assert.throws(
          () => this.inst._sanitizeLimitOffset(),
          "limit/offset must be >= 0",
        )
      },

      null(this: any) {
        assert.throws(
          () => this.inst._sanitizeLimitOffset(null),
          "limit/offset must be >= 0",
        )
      },

      float(this: any) {
        assert.same(1, this.inst._sanitizeLimitOffset(1.2))
      },

      boolean(this: any) {
        assert.throws(
          () => this.inst._sanitizeLimitOffset(false),
          "limit/offset must be >= 0",
        )
      },

      string(this: any) {
        assert.same(2, this.inst._sanitizeLimitOffset("2"))
      },

      array(this: any) {
        assert.same(3, this.inst._sanitizeLimitOffset([3]))
      },

      object(this: any) {
        assert.throws(
          () => this.inst._sanitizeLimitOffset(new Object()),
          "limit/offset must be >= 0",
        )
      },

      "number >= 0"(this: any) {
        assert.same(0, this.inst._sanitizeLimitOffset(0))
        assert.same(1, this.inst._sanitizeLimitOffset(1))
      },

      "number < 0"(this: any) {
        assert.throws(
          () => this.inst._sanitizeLimitOffset(-1),
          "limit/offset must be >= 0",
        )
      },
    },

    _sanitizeValue: {
      beforeEach(this: any) {
        spyOn(this.inst, "_sanitizeValue")
      },

      afterEach() {
        squel.cls.globalValueHandlers = []
      },

      "if string"(this: any) {
        assert.same("bla", this.inst._sanitizeValue("bla"))
      },

      "if boolean"(this: any) {
        assert.same(true, this.inst._sanitizeValue(true))
        assert.same(false, this.inst._sanitizeValue(false))
      },

      "if integer"(this: any) {
        assert.same(-1, this.inst._sanitizeValue(-1))
        assert.same(0, this.inst._sanitizeValue(0))
        assert.same(1, this.inst._sanitizeValue(1))
      },

      "if float"(this: any) {
        assert.same(-1.2, this.inst._sanitizeValue(-1.2))
        assert.same(1.2, this.inst._sanitizeValue(1.2))
      },

      "if array"(this: any) {
        assert.throws(
          () => this.inst._sanitizeValue([1]),
          "field value must be a string, number, boolean, null or one of the registered custom value types",
        )
      },

      "if object"(this: any) {
        assert.throws(
          () => this.inst._sanitizeValue(new Object()),
          "field value must be a string, number, boolean, null or one of the registered custom value types",
        )
      },

      "if null"(this: any) {
        assert.same(null, this.inst._sanitizeValue(null))
      },

      "if BaseBuilder"(this: any) {
        const s = squel.select()
        assert.same(s, this.inst._sanitizeValue(s))
      },

      "if undefined"(this: any) {
        assert.throws(
          () => this.inst._sanitizeValue(undefined),
          "field value must be a string, number, boolean, null or one of the registered custom value types",
        )
      },

      "custom handlers": {
        global(this: any) {
          squel.registerValueHandler(Date, (v: any) => v)
          const date = new Date()
          assert.same(date, this.inst._sanitizeValue(date))
        },

        instance(this: any) {
          this.inst.registerValueHandler(Date, (v: any) => v)
          const date = new Date()
          assert.same(date, this.inst._sanitizeValue(date))
        },
      },
    },

    _escapeValue(this: any) {
      this.inst.options.replaceSingleQuotes = false
      assert.same("te'st", this.inst._escapeValue("te'st"))

      this.inst.options.replaceSingleQuotes = true
      assert.same("te''st", this.inst._escapeValue("te'st"))

      this.inst.options.singleQuoteReplacement = "--"
      assert.same("te--st", this.inst._escapeValue("te'st"))

      this.inst.options.singleQuoteReplacement = "--"
      assert.same(undefined, this.inst._escapeValue())
    },

    _formatTableName: {
      default(this: any) {
        assert.same("abc", this.inst._formatTableName("abc"))
      },

      "auto quote names": {
        beforeEach(this: any) {
          this.inst.options.autoQuoteTableNames = true
        },

        "default quote character"(this: any) {
          assert.same("`abc`", this.inst._formatTableName("abc"))
        },

        "custom quote character"(this: any) {
          this.inst.options.nameQuoteCharacter = "|"
          assert.same("|abc|", this.inst._formatTableName("abc"))
        },
      },
    },

    _formatTableAlias: {
      default(this: any) {
        assert.same("`abc`", this.inst._formatTableAlias("abc"))
      },

      "custom quote character"(this: any) {
        this.inst.options.tableAliasQuoteCharacter = "~"
        assert.same("~abc~", this.inst._formatTableAlias("abc"))
      },

      "auto quote alias names is OFF"(this: any) {
        this.inst.options.autoQuoteAliasNames = false
        assert.same("abc", this.inst._formatTableAlias("abc"))
      },

      "AS is turned ON"(this: any) {
        this.inst.options.autoQuoteAliasNames = false
        this.inst.options.useAsForTableAliasNames = true
        assert.same("AS abc", this.inst._formatTableAlias("abc"))
      },
    },

    _formatFieldAlias: {
      default(this: any) {
        assert.same('"abc"', this.inst._formatFieldAlias("abc"))
      },

      "custom quote character"(this: any) {
        this.inst.options.fieldAliasQuoteCharacter = "~"
        assert.same("~abc~", this.inst._formatFieldAlias("abc"))
      },

      "auto quote alias names is OFF"(this: any) {
        this.inst.options.autoQuoteAliasNames = false
        assert.same("abc", this.inst._formatFieldAlias("abc"))
      },
    },

    _formatFieldName: {
      default(this: any) {
        assert.same("abc", this.inst._formatFieldName("abc"))
      },

      "auto quote names": {
        beforeEach(this: any) {
          this.inst.options.autoQuoteFieldNames = true
        },

        "default quote character"(this: any) {
          assert.same("`abc`.`def`", this.inst._formatFieldName("abc.def"))
        },

        "do not quote *"(this: any) {
          assert.same("`abc`.*", this.inst._formatFieldName("abc.*"))
        },

        "custom quote character"(this: any) {
          this.inst.options.nameQuoteCharacter = "|"
          assert.same("|abc|.|def|", this.inst._formatFieldName("abc.def"))
        },

        "ignore periods when quoting"(this: any) {
          assert.same(
            "`abc.def`",
            this.inst._formatFieldName("abc.def", {
              ignorePeriodsForFieldNameQuotes: true,
            }),
          )
        },
      },
    },

    _formatCustomValue: {
      "not a custom value type"(this: any) {
        assert.same(
          { formatted: false, value: null },
          this.inst._formatCustomValue(null),
        )
        assert.same(
          { formatted: false, value: "abc" },
          this.inst._formatCustomValue("abc"),
        )
        assert.same(
          { formatted: false, value: 12 },
          this.inst._formatCustomValue(12),
        )
        assert.same(
          { formatted: false, value: 1.2 },
          this.inst._formatCustomValue(1.2),
        )
        assert.same(
          { formatted: false, value: true },
          this.inst._formatCustomValue(true),
        )
        assert.same(
          { formatted: false, value: false },
          this.inst._formatCustomValue(false),
        )
      },

      "custom value type": {
        global(this: any) {
          class MyClass {}
          const myObj = new MyClass()

          squel.registerValueHandler(MyClass, () => 3.14)
          squel.registerValueHandler("boolean", (v: any) => `a${v}`)

          assert.same(
            { formatted: true, value: 3.14 },
            this.inst._formatCustomValue(myObj),
          )
          assert.same(
            { formatted: true, value: "atrue" },
            this.inst._formatCustomValue(true),
          )
        },

        instance(this: any) {
          class MyClass {}
          const myObj = new MyClass()

          this.inst.registerValueHandler(MyClass, () => 3.14)
          this.inst.registerValueHandler("number", (v: any) => `${v}a`)

          assert.same(
            { formatted: true, value: 3.14 },
            this.inst._formatCustomValue(myObj),
          )
          assert.same(
            { formatted: true, value: "5.2a" },
            this.inst._formatCustomValue(5.2),
          )
        },

        "instance handler takes precedence over global"(this: any) {
          this.inst.registerValueHandler(Date, () => "hello")
          squel.registerValueHandler(Date, () => "goodbye")

          assert.same(
            { formatted: true, value: "hello" },
            this.inst._formatCustomValue(new Date()),
          )

          this.inst = new this.cls({ valueHandlers: [] })
          assert.same(
            { formatted: true, value: "goodbye" },
            this.inst._formatCustomValue(new Date()),
          )
        },

        "whether to format for parameterized output"(this: any) {
          this.inst.registerValueHandler(Date, (_d: any, asParam: any) => {
            return asParam ? "foo" : "bar"
          })

          const val = new Date()

          assert.same(
            { formatted: true, value: "foo" },
            this.inst._formatCustomValue(val, true),
          )
          assert.same(
            { formatted: true, value: "bar" },
            this.inst._formatCustomValue(val),
          )
        },

        "additional formatting options"(this: any) {
          this.inst.registerValueHandler(
            Date,
            (_d: any, _asParam: any, options: any) => {
              return options.dontQuote ? "foo" : '"foo"'
            },
          )

          const val = new Date()

          assert.same(
            { formatted: true, value: "foo" },
            this.inst._formatCustomValue(val, true, { dontQuote: true }),
          )
          assert.same(
            { formatted: true, value: '"foo"' },
            this.inst._formatCustomValue(val, true, { dontQuote: false }),
          )
        },

        "return raw"(this: any) {
          this.inst.registerValueHandler(Date, () => ({
            rawNesting: true,
            value: "foo",
          }))

          const val = new Date()

          assert.same(
            { rawNesting: true, formatted: true, value: "foo" },
            this.inst._formatCustomValue(val, true),
          )
        },
      },
    },

    _formatValueForParamArray: {
      "Query builder"(this: any) {
        const s = squel.select().from("table")
        assert.same(s, this.inst._formatValueForParamArray(s))
      },

      "else calls _formatCustomValue"(this: any) {
        const spy = spyOn(this.inst, "_formatCustomValue").mockImplementation(
          (_v: any, asParam: any) => ({
            formatted: true,
            value: `test${asParam ? "foo" : "bar"}`,
          }),
        )

        assert.same("testfoo", this.inst._formatValueForParamArray(null))
        assert.same("testfoo", this.inst._formatValueForParamArray("abc"))
        assert.same("testfoo", this.inst._formatValueForParamArray(12))
        assert.same("testfoo", this.inst._formatValueForParamArray(1.2))

        const opts = { dummy: true }
        assert.same("testfoo", this.inst._formatValueForParamArray(true, opts))

        assert.same("testfoo", this.inst._formatValueForParamArray(false))

        assert.same(6, spy.mock.calls.length)

        assert.same(spy.mock.calls[4][2], opts)
      },

      "Array - recursively calls itself on each element"(this: any) {
        const spy = spyOn(this.inst, "_formatValueForParamArray")

        const v = [squel.select().from("table"), 1.2]

        const opts = { dummy: true }
        const res = this.inst._formatValueForParamArray(v, opts)

        assert.same(v, res)

        assert.same(3, spy.mock.calls.length)
        assert.ok(spyCalledWith(spy, v[0]))
        assert.ok(spyCalledWith(spy, v[1]))

        assert.same(spy.mock.calls[1][1], opts)
      },
    },

    _formatValueForQueryString: {
      null(this: any) {
        assert.same("NULL", this.inst._formatValueForQueryString(null))
      },

      boolean(this: any) {
        assert.same("TRUE", this.inst._formatValueForQueryString(true))
        assert.same("FALSE", this.inst._formatValueForQueryString(false))
      },

      integer(this: any) {
        assert.same(12, this.inst._formatValueForQueryString(12))
      },

      float(this: any) {
        assert.same(1.2, this.inst._formatValueForQueryString(1.2))
      },

      string: {
        "have string formatter function"(this: any) {
          this.inst.options.stringFormatter = (str: string) => `N(${str})`

          assert.same("N(test)", this.inst._formatValueForQueryString("test"))
        },

        default(this: any) {
          let escapedValue: any
          const spy = spyOn(this.inst, "_escapeValue").mockImplementation(
            (str: any) => escapedValue || str,
          )

          assert.same("'test'", this.inst._formatValueForQueryString("test"))

          assert.ok(spyCalledWithExactly(spy, "test"))
          escapedValue = "blah"
          assert.same("'blah'", this.inst._formatValueForQueryString("test"))
        },

        "dont quote"(this: any) {
          let escapedValue: any
          const spy = spyOn(this.inst, "_escapeValue").mockImplementation(
            (str: any) => escapedValue || str,
          )

          assert.same(
            "test",
            this.inst._formatValueForQueryString("test", { dontQuote: true }),
          )

          assert.ok(spy.mock.calls.length === 0)
        },
      },

      "Array - recursively calls itself on each element"(this: any) {
        const spy = spyOn(this.inst, "_formatValueForQueryString")

        const expected = "('test', 123, TRUE, 1.2, NULL)"
        assert.same(
          expected,
          this.inst._formatValueForQueryString(["test", 123, true, 1.2, null]),
        )

        assert.same(6, spy.mock.calls.length)
        assert.ok(spyCalledWith(spy, "test"))
        assert.ok(spyCalledWith(spy, 123))
        assert.ok(spyCalledWith(spy, true))
        assert.ok(spyCalledWith(spy, 1.2))
        assert.ok(spyCalledWith(spy, null))
      },

      BaseBuilder(this: any) {
        spyOn(this.inst, "_applyNestingFormatting").mockImplementation(
          (v: any) => `{{${v}}}`,
        )
        const s = squel.select().from("table")
        assert.same(
          "{{SELECT * FROM table}}",
          this.inst._formatValueForQueryString(s),
        )
      },

      "checks to see if it is custom value type first"(this: any) {
        spyOn(this.inst, "_formatCustomValue").mockImplementation(
          (_val: any, asParam: any) => ({
            formatted: true,
            value: 12 + (asParam ? 25 : 65),
          }),
        )
        spyOn(this.inst, "_applyNestingFormatting").mockImplementation(
          (v: any) => `{${v}}`,
        )
        assert.same("{77}", this.inst._formatValueForQueryString(123))
      },

      "#292 - custom value type specifies raw nesting"(this: any) {
        spyOn(this.inst, "_formatCustomValue").mockImplementation(() => ({
          rawNesting: true,
          formatted: true,
          value: 12,
        }))
        spyOn(this.inst, "_applyNestingFormatting").mockImplementation(
          (v: any) => `{${v}}`,
        )
        assert.same(12, this.inst._formatValueForQueryString(123))
      },
    },

    _applyNestingFormatting: {
      default(this: any) {
        assert.same("(77)", this.inst._applyNestingFormatting("77"))
        assert.same("((77)", this.inst._applyNestingFormatting("(77"))
        assert.same("(77))", this.inst._applyNestingFormatting("77)"))
        assert.same("(77)", this.inst._applyNestingFormatting("(77)"))
      },
      "no nesting"(this: any) {
        assert.same("77", this.inst._applyNestingFormatting("77", false))
      },
      "rawNesting turned on"(this: any) {
        this.inst = new this.cls({ rawNesting: true })
        assert.same("77", this.inst._applyNestingFormatting("77"))
      },
    },

    _buildString: {
      empty(this: any) {
        assert.same(this.inst._buildString("", []), {
          text: "",
          values: [],
        })
      },
      "no params": {
        "non-parameterized"(this: any) {
          assert.same(this.inst._buildString("abc = 3", []), {
            text: "abc = 3",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildString("abc = 3", [], { buildParameterized: true }),
            {
              text: "abc = 3",
              values: [],
            },
          )
        },
      },
      "non-array": {
        "non-parameterized"(this: any) {
          assert.same(
            this.inst._buildString("a = ? ? ? ?", [2, "abc", false, null]),
            {
              text: "a = 2 'abc' FALSE NULL",
              values: [],
            },
          )
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildString("a = ? ? ? ?", [2, "abc", false, null], {
              buildParameterized: true,
            }),
            {
              text: "a = ? ? ? ?",
              values: [2, "abc", false, null],
            },
          )
        },
      },
      array: {
        "non-parameterized"(this: any) {
          assert.same(this.inst._buildString("a = ?", [[1, 2, 3]]), {
            text: "a = (1, 2, 3)",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildString("a = ?", [[1, 2, 3]], {
              buildParameterized: true,
            }),
            {
              text: "a = (?, ?, ?)",
              values: [1, 2, 3],
            },
          )
        },
      },
      "nested builder": {
        beforeEach(this: any) {
          this.s = squel.select().from("master").where("b = ?", 5)
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._buildString("a = ?", [this.s]), {
            text: "a = (SELECT * FROM master WHERE (b = 5))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildString("a = ?", [this.s], {
              buildParameterized: true,
            }),
            {
              text: "a = (SELECT * FROM master WHERE (b = ?))",
              values: [5],
            },
          )
        },
      },
      "return nested output": {
        "non-parameterized"(this: any) {
          assert.same(this.inst._buildString("a = ?", [3], { nested: true }), {
            text: "(a = 3)",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildString("a = ?", [3], {
              buildParameterized: true,
              nested: true,
            }),
            {
              text: "(a = ?)",
              values: [3],
            },
          )
        },
      },
      "string formatting options"(this: any) {
        const options = {
          formattingOptions: {
            dontQuote: true,
          },
        }

        assert.same(this.inst._buildString("a = ?", ["NOW()"], options), {
          text: "a = NOW()",
          values: [],
        })
      },
      "passes formatting options even when doing parameterized query"(
        this: any,
      ) {
        const spy = spyOn(this.inst, "_formatValueForParamArray")

        const options = {
          buildParameterized: true,
          formattingOptions: {
            dontQuote: true,
          },
        }

        this.inst._buildString("a = ?", [3], options)

        assert.same(spy.mock.calls[0][1], options.formattingOptions)
      },
      "custom parameter character": {
        beforeEach(this: any) {
          this.inst.options.parameterCharacter = "@@"
        },

        "non-parameterized"(this: any) {
          assert.same(this.inst._buildString("a = @@", [[1, 2, 3]]), {
            text: "a = (1, 2, 3)",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildString("a = @@", [[1, 2, 3]], {
              buildParameterized: true,
            }),
            {
              text: "a = (@@, @@, @@)",
              values: [1, 2, 3],
            },
          )
        },
      },
    },

    _buildManyStrings: {
      empty(this: any) {
        assert.same(this.inst._buildManyStrings([], []), {
          text: "",
          values: [],
        })
      },
      simple: {
        beforeEach(this: any) {
          this.strings = ["a = ?", "b IN ? AND c = ?"]

          this.values = [["elephant"], [[1, 2, 3], 4]]
        },

        "non-parameterized"(this: any) {
          assert.same(this.inst._buildManyStrings(this.strings, this.values), {
            text: "a = 'elephant' b IN (1, 2, 3) AND c = 4",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildManyStrings(this.strings, this.values, {
              buildParameterized: true,
            }),
            {
              text: "a = ? b IN (?, ?, ?) AND c = ?",
              values: ["elephant", 1, 2, 3, 4],
            },
          )
        },
      },

      "return nested": {
        "non-parameterized"(this: any) {
          assert.same(
            this.inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]], {
              nested: true,
            }),
            {
              text: "(a = 1 b = 2)",
              values: [],
            },
          )
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]], {
              buildParameterized: true,
              nested: true,
            }),
            {
              text: "(a = ? b = ?)",
              values: [1, 2],
            },
          )
        },
      },

      "custom separator": {
        beforeEach(this: any) {
          this.inst.options.separator = "|"
        },
        "non-parameterized"(this: any) {
          assert.same(
            this.inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]]),
            {
              text: "a = 1|b = 2",
              values: [],
            },
          )
        },
        parameterized(this: any) {
          assert.same(
            this.inst._buildManyStrings(["a = ?", "b = ?"], [[1], [2]], {
              buildParameterized: true,
            }),
            {
              text: "a = ?|b = ?",
              values: [1, 2],
            },
          )
        },
      },
    },

    toParam(this: any) {
      const spy = spyOn(this.inst, "_toParamString").mockImplementation(() => ({
        text: "dummy",
        values: [1],
      }))

      const options = { test: 2 }
      assert.same(this.inst.toParam(options), {
        text: "dummy",
        values: [1],
      })

      assert.ok(spy.mock.calls.length === 1)
      assert.same((spy.mock.calls[0] as any)[0].test, 2)
      assert.same((spy.mock.calls[0] as any)[0].buildParameterized, true)
    },

    toString(this: any) {
      const spy = spyOn(this.inst, "_toParamString").mockImplementation(() => ({
        text: "dummy",
        values: [1],
      }))

      const options = { test: 2 }
      assert.same(this.inst.toString(options), "dummy")

      assert.ok(spy.mock.calls.length === 1)
      assert.same(spy.mock.calls[0][0], options)
    },
  },

  "QueryBuilder base class": {
    beforeEach(this: any) {
      this.cls = squel.cls.QueryBuilder
      this.inst = new this.cls()
    },

    "instanceof base builder"(this: any) {
      assert.instanceOf(this.inst, squel.cls.BaseBuilder)
    },

    constructor: {
      "default options"(this: any) {
        assert.same(squel.cls.DefaultQueryBuilderOptions, this.inst.options)
      },

      "overridden options"(this: any) {
        this.inst = new this.cls({
          dummy1: "str",
          dummy2: 12.3,
          usingValuePlaceholders: true,
          dummy3: true,
        })

        const expectedOptions = _.extend(
          {},
          squel.cls.DefaultQueryBuilderOptions,
          {
            dummy1: "str",
            dummy2: 12.3,
            usingValuePlaceholders: true,
            dummy3: true,
          },
        )

        assert.same(expectedOptions, this.inst.options)
      },

      "default blocks - none"(this: any) {
        assert.same([], this.inst.blocks)
      },

      "blocks passed in": {
        "exposes block methods"(this: any) {
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

          this.inst = new this.cls({}, blocks)

          assert.ok(limitExposedMethodsSpy.mock.calls.length === 1)
          assert.ok(distinctExposedMethodsSpy.mock.calls.length === 1)

          assert.typeOf(this.inst.distinct, "function")
          assert.typeOf(this.inst.limit, "function")

          assert.same(this.inst, this.inst.limit(2))
          assert.ok(limitSpy.mock.calls.length === 1)
          assert.ok(spyCalledOn(limitSpy, blocks[0]))

          assert.same(this.inst, this.inst.distinct())
          assert.ok(distinctSpy.mock.calls.length === 1)
          assert.ok(spyCalledOn(distinctSpy, blocks[1]))
        },

        "cannot expose the same method twice"(this: any) {
          const blocks = [
            new squel.cls.DistinctBlock(),
            new squel.cls.DistinctBlock(),
          ]

          try {
            this.inst = new this.cls({}, blocks)
            throw new Error("should not reach here")
          } catch (err: any) {
            assert.same(
              "Error: Builder already has a builder method called: distinct",
              err.toString(),
            )
          }
        },
      },
    },

    "updateOptions()": {
      "updates query builder options"(this: any) {
        const oldOptions = _.extend({}, this.inst.options)

        this.inst.updateOptions({
          updated: false,
        })

        const expected = _.extend(oldOptions, {
          updated: false,
        })

        assert.same(expected, this.inst.options)
      },

      "updates building block options"(this: any) {
        this.inst.blocks = [new squel.cls.Block()]
        const oldOptions = _.extend({}, this.inst.blocks[0].options)

        this.inst.updateOptions({
          updated: false,
        })

        const expected = _.extend(oldOptions, {
          updated: false,
        })

        assert.same(expected, this.inst.blocks[0].options)
      },
    },

    "toString()": {
      "returns empty if no blocks"(this: any) {
        assert.same("", this.inst.toString())
      },

      "skips empty block strings"(this: any) {
        this.inst.blocks = [new squel.cls.StringBlock({}, "")]

        assert.same("", this.inst.toString())
      },

      "returns final query string"(this: any) {
        let i = 1
        const toStringSpy = spyOn(
          squel.cls.StringBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({
          text: `ret${++i}`,
          values: [],
        }))

        this.inst.blocks = [
          new squel.cls.StringBlock({}, "STR1"),
          new squel.cls.StringBlock({}, "STR2"),
          new squel.cls.StringBlock({}, "STR3"),
        ]

        assert.same("ret2 ret3 ret4", this.inst.toString())

        assert.ok(toStringSpy.mock.calls.length === 3)
        assert.ok(spyCalledOn(toStringSpy, this.inst.blocks[0]))
        assert.ok(spyCalledOn(toStringSpy, this.inst.blocks[1]))
        assert.ok(spyCalledOn(toStringSpy, this.inst.blocks[2]))
      },
    },

    "toParam()": {
      "returns empty if no blocks"(this: any) {
        assert.same({ text: "", values: [] }, this.inst.toParam())
      },

      "skips empty block strings"(this: any) {
        this.inst.blocks = [new squel.cls.StringBlock({}, "")]

        assert.same({ text: "", values: [] }, this.inst.toParam())
      },

      "returns final query string"(this: any) {
        this.inst.blocks = [
          new squel.cls.StringBlock({}, "STR1"),
          new squel.cls.StringBlock({}, "STR2"),
          new squel.cls.StringBlock({}, "STR3"),
        ]

        let i = 1
        const toStringSpy = spyOn(
          squel.cls.StringBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({
          text: `ret${++i}`,
          values: [],
        }))

        assert.same({ text: "ret2 ret3 ret4", values: [] }, this.inst.toParam())

        assert.ok(toStringSpy.mock.calls.length === 3)
        assert.ok(spyCalledOn(toStringSpy, this.inst.blocks[0]))
        assert.ok(spyCalledOn(toStringSpy, this.inst.blocks[1]))
        assert.ok(spyCalledOn(toStringSpy, this.inst.blocks[2]))
      },

      "returns query with unnumbered parameters"(this: any) {
        this.inst.blocks = [new squel.cls.WhereBlock({})]

        this.inst.blocks[0]._toParamString = mock(() => ({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        }))

        assert.same(
          { text: "a = ? AND b in (?, ?)", values: [1, 2, 3] },
          this.inst.toParam(),
        )
      },

      "returns query with numbered parameters"(this: any) {
        this.inst = new this.cls({
          numberedParameters: true,
        })

        this.inst.blocks = [new squel.cls.WhereBlock({})]

        spyOn(
          squel.cls.WhereBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        }))

        assert.same(this.inst.toParam(), {
          text: "a = $1 AND b in ($2, $3)",
          values: [1, 2, 3],
        })
      },

      "returns query with numbered parameters and custom prefix"(this: any) {
        this.inst = new this.cls({
          numberedParameters: true,
          numberedParametersPrefix: "&%",
        })

        this.inst.blocks = [new squel.cls.WhereBlock({})]

        spyOn(
          squel.cls.WhereBlock.prototype,
          "_toParamString",
        ).mockImplementation(() => ({
          text: "a = ? AND b in (?, ?)",
          values: [1, 2, 3],
        }))

        assert.same(this.inst.toParam(), {
          text: "a = &%1 AND b in (&%2, &%3)",
          values: [1, 2, 3],
        })
      },
    },

    cloning: {
      "blocks get cloned properly"(this: any) {
        spyOn(squel.cls.StringBlock.prototype, "clone")

        this.inst.blocks = [new squel.cls.StringBlock({}, "TEST")]

        const newinst = this.inst.clone()
        this.inst.blocks[0].str = "TEST2"

        assert.same("TEST", newinst.blocks[0].toString())
      },
    },

    registerValueHandler: {
      beforeEach(this: any) {
        this.originalHandlers = ([] as any[]).concat(
          squel.cls.globalValueHandlers,
        )
      },
      afterEach(this: any) {
        squel.cls.globalValueHandlers = this.originalHandlers
      },

      "calls through to base class method"(this: any) {
        const baseBuilderSpy = spyOn(
          squel.cls.BaseBuilder.prototype,
          "registerValueHandler",
        )

        const handler = () => "test"
        this.inst.registerValueHandler(Date, handler)
        this.inst.registerValueHandler("number", handler)

        assert.ok(baseBuilderSpy.mock.calls.length === 2)
        assert.ok(spyCalledOn(baseBuilderSpy, this.inst))
      },

      "returns instance for chainability"(this: any) {
        const handler = () => "test"
        assert.same(this.inst, this.inst.registerValueHandler(Date, handler))
      },

      "calls through to blocks"(this: any) {
        this.inst.blocks = [new squel.cls.StringBlock({}, "")]

        const baseBuilderSpy = spyOn(
          this.inst.blocks[0],
          "registerValueHandler",
        )

        const handler = () => "test"
        this.inst.registerValueHandler(Date, handler)

        assert.ok(baseBuilderSpy.mock.calls.length === 1)
        assert.ok(spyCalledOn(baseBuilderSpy, this.inst.blocks[0]))
      },
    },

    "get block": {
      valid(this: any) {
        const block = new squel.cls.FunctionBlock()
        this.inst.blocks.push(block)
        assert.same(block, this.inst.getBlock(squel.cls.FunctionBlock))
      },
      invalid(this: any) {
        assert.same(undefined, this.inst.getBlock(squel.cls.FunctionBlock))
      },
    },
  },
})
