import { spyOn } from "bun:test"
import squel from "../src/index"
import { assert, _, run } from "./testbase"

run("Blocks", {
  "Block base class": {
    beforeEach(this: any) {
      this.inst = new squel.cls.Block()
    },

    "instanceof of BaseBuilder"(this: any) {
      assert.instanceOf(this.inst, squel.cls.BaseBuilder)
    },

    options(this: any) {
      const expectedOptions = _.extend(
        {},
        squel.cls.DefaultQueryBuilderOptions,
        {
          usingValuePlaceholders: true,
          dummy: true,
        } as any,
      )

      this.inst = new squel.cls.Block({
        usingValuePlaceholders: true,
        dummy: true,
      } as any)

      assert.same(expectedOptions, this.inst.options)
    },

    "_toParamString()"(this: any) {
      assert.throws(() => this.inst.toString(), "Not yet implemented")
    },

    "exposedMethods()": {
      "returns methods"(this: any) {
        this.inst.method1 = () => false
        this.inst.method2 = () => false

        const names: string[] = []
        for (const name in this.inst.exposedMethods()) names.push(name)
        assert.ok(["method1", "method2"], names as any)
      },

      "ignores methods prefixed with _"(this: any) {
        this.inst._method = () => false

        const names: string[] = []
        for (const name in this.inst.exposedMethods()) names.push(name)
        assert.ok(
          undefined === _.find(names, (name: string) => name === "_method"),
        )
      },

      "ignores toString()"(this: any) {
        const names: string[] = []
        for (const name in this.inst.exposedMethods()) names.push(name)
        assert.ok(
          undefined === _.find(names, (name: string) => name === "toString"),
        )
      },
    },

    "cloning copies the options over"(this: any) {
      this.inst.options.dummy = true

      const newinst = this.inst.clone()

      this.inst.options.dummy = false

      assert.same(true, newinst.options.dummy)
    },
  },

  StringBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.StringBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "_toParamString()": {
      "non-parameterized"(this: any) {
        this.inst = new this.cls({}, "TAG")

        assert.same(this.inst._toParamString(), {
          text: "TAG",
          values: [],
        })
      },
      parameterized(this: any) {
        this.inst = new this.cls({}, "TAG")

        assert.same(this.inst._toParamString({ buildParameterized: true }), {
          text: "TAG",
          values: [],
        })
      },
    },
  },

  FunctionBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.FunctionBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "initial member values"(this: any) {
      assert.same([], this.inst._values)
      assert.same([], this.inst._strings)
    },

    "_toParamString()": {
      "when not set"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },
      "non-parameterized"(this: any) {
        this.inst.function("bla")
        this.inst.function("bla2")

        assert.same(this.inst._toParamString(), {
          text: "bla bla2",
          values: [],
        })
      },
      parameterized(this: any) {
        this.inst.function("bla ?", 2)
        this.inst.function("bla2 ?", 3)

        assert.same(this.inst._toParamString({ buildParameterized: true }), {
          text: "bla ? bla2 ?",
          values: [2, 3],
        })
      },
    },
  },

  AbstractTableBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.AbstractTableBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "initial field values"(this: any) {
      assert.same([], this.inst._tables)
    },

    "has table": {
      no(this: any) {
        assert.same(false, this.inst._hasTable())
      },
      yes(this: any) {
        this.inst._table("blah")
        assert.same(true, this.inst._hasTable())
      },
    },

    "_table()": {
      "saves inputs"(this: any) {
        this.inst._table("table1")
        this.inst._table("table2", "alias2")
        this.inst._table("table3")

        const expectedFroms = [
          { table: "table1", alias: null },
          { table: "table2", alias: "alias2" },
          { table: "table3", alias: null },
        ]

        assert.same(expectedFroms, this.inst._tables)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeTableSpy = spyOn(
          this.cls.prototype,
          "_sanitizeTable",
        ).mockReturnValue("_t")
        const sanitizeAliasSpy = spyOn(
          this.cls.prototype,
          "_sanitizeTableAlias",
        ).mockReturnValue("_a")

        try {
          this.inst._table("table", "alias")

          assert.ok(
            sanitizeTableSpy.mock.calls.some((c: any) => c[0] === "table"),
          )
          assert.ok(
            sanitizeAliasSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "alias",
            ),
          )

          assert.same([{ table: "_t", alias: "_a" }], this.inst._tables)
        } finally {
          sanitizeTableSpy.mockRestore()
          sanitizeAliasSpy.mockRestore()
        }
      },

      "handles single-table mode"(this: any) {
        this.inst.options.singleTable = true

        this.inst._table("table1")
        this.inst._table("table2")
        this.inst._table("table3")

        const expected = [{ table: "table3", alias: null }]

        assert.same(expected, this.inst._tables)
      },

      "builder as table"(this: any) {
        const sanitizeTableSpy = spyOn(this.cls.prototype, "_sanitizeTable")

        try {
          const innerTable1 = squel.select()
          const innerTable2 = squel.select()

          this.inst._table(innerTable1)
          this.inst._table(innerTable2, "Inner2")

          assert.ok(
            sanitizeTableSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === innerTable1,
            ),
          )
          assert.ok(
            sanitizeTableSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === innerTable2,
            ),
          )

          const expected = [
            { alias: null, table: innerTable1 },
            { alias: "Inner2", table: innerTable2 },
          ]

          assert.same(expected, this.inst._tables)
        } finally {
          sanitizeTableSpy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      beforeEach(this: any) {
        this.innerTable1 = squel.select().from("inner1").where("a = ?", 3)
      },

      "no table"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      prefix(this: any) {
        this.inst.options.prefix = "TEST"

        this.inst._table("table2", "alias2")

        assert.same(this.inst._toParamString(), {
          text: "TEST table2 `alias2`",
          values: [],
        })
      },

      "non-parameterized"(this: any) {
        this.inst._table(this.innerTable1)
        this.inst._table("table2", "alias2")
        this.inst._table("table3")

        assert.same(this.inst._toParamString(), {
          text: "(SELECT * FROM inner1 WHERE (a = 3)), table2 `alias2`, table3",
          values: [],
        })
      },
      parameterized(this: any) {
        this.inst._table(this.innerTable1)
        this.inst._table("table2", "alias2")
        this.inst._table("table3")

        assert.same(this.inst._toParamString({ buildParameterized: true }), {
          text: "(SELECT * FROM inner1 WHERE (a = ?)), table2 `alias2`, table3",
          values: [3],
        })
      },
    },
  },

  FromTableBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.FromTableBlock
      this.inst = new this.cls()
    },

    "check prefix"(this: any) {
      assert.same(this.inst.options.prefix, "FROM")
    },

    "instanceof of AbstractTableBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractTableBlock)
    },

    "from()": {
      "calls base class handler"(this: any) {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)

        try {
          this.inst.from("table1")
          this.inst.from("table2", "alias2")

          assert.same(2, baseMethodSpy.mock.calls.length)
          assert.ok(
            baseMethodSpy.mock.calls.some(
              (c: any) => c.length === 2 && c[0] === "table1" && c[1] === null,
            ),
          )
          assert.ok(
            baseMethodSpy.mock.calls.some(
              (c: any) =>
                c.length === 2 && c[0] === "table2" && c[1] === "alias2",
            ),
          )
        } finally {
          baseMethodSpy.mockRestore()
        }
      },
    },
  },

  UpdateTableBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.UpdateTableBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractTableBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractTableBlock)
    },

    "check prefix"(this: any) {
      assert.same(this.inst.options.prefix, undefined)
    },

    "table()": {
      "calls base class handler"(this: any) {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)

        try {
          this.inst.table("table1")
          this.inst.table("table2", "alias2")

          assert.same(2, baseMethodSpy.mock.calls.length)
          assert.ok(
            baseMethodSpy.mock.calls.some(
              (c: any) => c.length === 2 && c[0] === "table1" && c[1] === null,
            ),
          )
          assert.ok(
            baseMethodSpy.mock.calls.some(
              (c: any) =>
                c.length === 2 && c[0] === "table2" && c[1] === "alias2",
            ),
          )
        } finally {
          baseMethodSpy.mockRestore()
        }
      },
    },
  },

  TargetTableBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.TargetTableBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractTableBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractTableBlock)
    },

    "check prefix"(this: any) {
      assert.same(this.inst.options.prefix, undefined)
    },

    "table()": {
      "calls base class handler"(this: any) {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)

        try {
          this.inst.target("table1")
          this.inst.target("table2")

          assert.same(2, baseMethodSpy.mock.calls.length)
          assert.ok(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table1"),
          )
          assert.ok(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table2"),
          )
        } finally {
          baseMethodSpy.mockRestore()
        }
      },
    },
  },

  IntoTableBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.IntoTableBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractTableBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractTableBlock)
    },

    "check prefix"(this: any) {
      assert.same(this.inst.options.prefix, "INTO")
    },

    "single table"(this: any) {
      assert.ok(this.inst.options.singleTable)
    },

    "into()": {
      "calls base class handler"(this: any) {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)

        try {
          this.inst.into("table1")
          this.inst.into("table2")

          assert.same(2, baseMethodSpy.mock.calls.length)
          assert.ok(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table1"),
          )
          assert.ok(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table2"),
          )
        } finally {
          baseMethodSpy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      "requires table to have been provided"(this: any) {
        try {
          this.inst._toParamString()
          throw new Error("should not reach here")
        } catch (err: any) {
          assert.same("Error: into() needs to be called", err.toString())
        }
      },
    },
  },

  GetFieldBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.GetFieldBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "fields() - object": {
      "saves inputs"(this: any) {
        const fieldSpy = spyOn(this.inst, "field")

        this.inst.fields(
          {
            field1: null,
            field2: "alias2",
            field3: null,
          },
          { dummy: true },
        )

        const expected = [
          { name: "field1", alias: null, options: { dummy: true } },
          { name: "field2", alias: "alias2", options: { dummy: true } },
          { name: "field3", alias: null, options: { dummy: true } },
        ]

        assert.same(3, fieldSpy.mock.calls.length)
        assert.ok(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field1" &&
              c[1] === null &&
              _.isEqual(c[2], { dummy: true }),
          ),
        )
        assert.ok(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field2" &&
              c[1] === "alias2" &&
              _.isEqual(c[2], { dummy: true }),
          ),
        )
        assert.ok(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field3" &&
              c[1] === null &&
              _.isEqual(c[2], { dummy: true }),
          ),
        )

        assert.same(expected, this.inst._fields)
      },
    },

    "fields() - array": {
      "saves inputs"(this: any) {
        const fieldSpy = spyOn(this.inst, "field")

        this.inst.fields(["field1", "field2", "field3"], { dummy: true })

        const expected = [
          { name: "field1", alias: null, options: { dummy: true } },
          { name: "field2", alias: null, options: { dummy: true } },
          { name: "field3", alias: null, options: { dummy: true } },
        ]

        assert.same(3, fieldSpy.mock.calls.length)
        assert.ok(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field1" &&
              c[1] === null &&
              _.isEqual(c[2], { dummy: true }),
          ),
        )
        assert.ok(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field2" &&
              c[1] === null &&
              _.isEqual(c[2], { dummy: true }),
          ),
        )
        assert.ok(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field3" &&
              c[1] === null &&
              _.isEqual(c[2], { dummy: true }),
          ),
        )

        assert.same(expected, this.inst._fields)
      },
    },

    "field()": {
      "saves inputs"(this: any) {
        this.inst.field("field1")
        this.inst.field("field2", "alias2")
        this.inst.field("field3")

        const expected = [
          { name: "field1", alias: null, options: {} },
          { name: "field2", alias: "alias2", options: {} },
          { name: "field3", alias: null, options: {} },
        ]

        assert.same(expected, this.inst._fields)
      },
    },

    "field() - discard duplicates": {
      "saves inputs"(this: any) {
        this.inst.field("field1")
        this.inst.field("field2", "alias2")
        this.inst.field("field2", "alias2")
        this.inst.field("field1", "alias1")

        const expected = [
          { name: "field1", alias: null, options: {} },
          { name: "field2", alias: "alias2", options: {} },
          { name: "field1", alias: "alias1", options: {} },
        ]

        assert.same(expected, this.inst._fields)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeAliasSpy = spyOn(
          this.cls.prototype,
          "_sanitizeFieldAlias",
        ).mockReturnValue("_a")

        try {
          this.inst.field("field1", "alias1", { dummy: true })

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          )
          assert.ok(
            sanitizeAliasSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "alias1",
            ),
          )

          assert.same(this.inst._fields, [
            { name: "_f", alias: "_a", options: { dummy: true } },
          ])
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeAliasSpy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      beforeEach(this: any) {
        this.queryBuilder = squel.select()
        this.fromTableBlock = this.queryBuilder.getBlock(
          squel.cls.FromTableBlock,
        )
      },

      "returns all fields when none provided and table is set"(this: any) {
        this.fromTableBlock._hasTable = () => true

        assert.same(
          this.inst._toParamString({ queryBuilder: this.queryBuilder }),
          {
            text: "*",
            values: [],
          },
        )
      },

      "but returns nothing if no table set"(this: any) {
        this.fromTableBlock._hasTable = () => false

        assert.same(
          this.inst._toParamString({ queryBuilder: this.queryBuilder }),
          {
            text: "",
            values: [],
          },
        )
      },

      "returns formatted query phrase": {
        beforeEach(this: any) {
          this.fromTableBlock._hasTable = () => true
          this.inst.field(squel.str("GETDATE(?)", 3), "alias1")
          this.inst.field("field2", "alias2", { dummy: true })
          this.inst.field("field3")
        },
        "non-parameterized"(this: any) {
          assert.same(
            this.inst._toParamString({ queryBuilder: this.queryBuilder }),
            {
              text: '(GETDATE(3)) AS "alias1", field2 AS "alias2", field3',
              values: [],
            },
          )
        },
        parameterized(this: any) {
          assert.same(
            this.inst._toParamString({
              queryBuilder: this.queryBuilder,
              buildParameterized: true,
            }),
            {
              text: '(GETDATE(?)) AS "alias1", field2 AS "alias2", field3',
              values: [3],
            },
          )
        },
      },
    },
  },

  AbstractSetFieldBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.AbstractSetFieldBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "_set()": {
      "saves inputs"(this: any) {
        this.inst._set("field1", "value1", { dummy: 1 })
        this.inst._set("field2", "value2", { dummy: 2 })
        this.inst._set("field3", "value3", { dummy: 3 })
        this.inst._set("field4")

        const expectedFields = ["field1", "field2", "field3", "field4"]
        const expectedValues = [["value1", "value2", "value3", undefined]]
        const expectedFieldOptions = [
          [{ dummy: 1 }, { dummy: 2 }, { dummy: 3 }, {}],
        ]

        assert.same(expectedFields, this.inst._fields)
        assert.same(expectedValues, this.inst._values)
        assert.same(expectedFieldOptions, this.inst._valueOptions)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeValueSpy = spyOn(
          this.cls.prototype,
          "_sanitizeValue",
        ).mockReturnValue("_v")

        try {
          this.inst._set("field1", "value1", { dummy: true })

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          )
          assert.ok(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value1",
            ),
          )

          assert.same(["_f"], this.inst._fields)
          assert.same([["_v"]], this.inst._values)
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeValueSpy.mockRestore()
        }
      },
    },

    "_setFields()": {
      "saves inputs"(this: any) {
        this.inst._setFields({
          field1: "value1",
          field2: "value2",
          field3: "value3",
        })

        const expectedFields = ["field1", "field2", "field3"]
        const expectedValues = [["value1", "value2", "value3"]]
        const expectedFieldOptions = [[{}, {}, {}]]

        assert.same(expectedFields, this.inst._fields)
        assert.same(expectedValues, this.inst._values)
        assert.same(expectedFieldOptions, this.inst._valueOptions)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeValueSpy = spyOn(
          this.cls.prototype,
          "_sanitizeValue",
        ).mockReturnValue("_v")

        try {
          this.inst._setFields({ field1: "value1" }, { dummy: true })

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          )
          assert.ok(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value1",
            ),
          )

          assert.same(["_f"], this.inst._fields)
          assert.same([["_v"]], this.inst._values)
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeValueSpy.mockRestore()
        }
      },
    },

    "_setFieldsRows()": {
      "saves inputs"(this: any) {
        this.inst._setFieldsRows([
          { field1: "value1", field2: "value2", field3: "value3" },
          { field1: "value21", field2: "value22", field3: "value23" },
        ])

        const expectedFields = ["field1", "field2", "field3"]
        const expectedValues = [
          ["value1", "value2", "value3"],
          ["value21", "value22", "value23"],
        ]
        const expectedFieldOptions = [
          [{}, {}, {}],
          [{}, {}, {}],
        ]

        assert.same(expectedFields, this.inst._fields)
        assert.same(expectedValues, this.inst._values)
        assert.same(expectedFieldOptions, this.inst._valueOptions)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeValueSpy = spyOn(
          this.cls.prototype,
          "_sanitizeValue",
        ).mockReturnValue("_v")

        try {
          this.inst._setFieldsRows(
            [{ field1: "value1" }, { field1: "value21" }],
            { dummy: true },
          )

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          )
          assert.ok(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value1",
            ),
          )
          assert.ok(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value21",
            ),
          )

          assert.same(["_f"], this.inst._fields)
          assert.same([["_v"], ["_v"]], this.inst._values)
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeValueSpy.mockRestore()
        }
      },
    },

    "_toParamString()"(this: any) {
      assert.throws(() => this.inst._toParamString(), "Not yet implemented")
    },
  },

  SetFieldBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.SetFieldBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractSetFieldBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractSetFieldBlock)
    },

    "set()": {
      "calls to _set()"(this: any) {
        const spy = spyOn(this.inst, "_set").mockImplementation(() => undefined)

        try {
          this.inst.set("f", "v", { dummy: true })

          assert.ok(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 3 &&
                c[0] === "f" &&
                c[1] === "v" &&
                _.isEqual(c[2], { dummy: true }),
            ),
          )
        } finally {
          spy.mockRestore()
        }
      },
    },

    "setFields()": {
      "calls to _setFields()"(this: any) {
        const spy = spyOn(this.inst, "_setFields").mockImplementation(
          () => undefined,
        )

        try {
          this.inst.setFields("f", { dummy: true })

          assert.ok(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 2 &&
                c[0] === "f" &&
                _.isEqual(c[1], { dummy: true }),
            ),
          )
        } finally {
          spy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      "needs at least one field to have been provided"(this: any) {
        try {
          this.inst.toString()
          throw new Error("should not reach here")
        } catch (err: any) {
          assert.same("Error: set() needs to be called", err.toString())
        }
      },

      "fields set": {
        beforeEach(this: any) {
          this.inst.set("field0 = field0 + 1")
          this.inst.set("field1", "value1", { dummy: true })
          this.inst.set("field2", "value2")
          this.inst.set("field3", squel.str("GETDATE(?)", 4))
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "SET field0 = field0 + 1, field1 = 'value1', field2 = 'value2', field3 = (GETDATE(4))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "SET field0 = field0 + 1, field1 = ?, field2 = ?, field3 = (GETDATE(?))",
            values: ["value1", "value2", 4],
          })
        },
      },
    },
  },

  InsertFieldValueBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.InsertFieldValueBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractSetFieldBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractSetFieldBlock)
    },

    "set()": {
      "calls to _set()"(this: any) {
        const spy = spyOn(this.inst, "_set").mockImplementation(() => undefined)

        try {
          this.inst.set("f", "v", { dummy: true })

          assert.ok(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 3 &&
                c[0] === "f" &&
                c[1] === "v" &&
                _.isEqual(c[2], { dummy: true }),
            ),
          )
        } finally {
          spy.mockRestore()
        }
      },
    },

    "setFields()": {
      "calls to _setFields()"(this: any) {
        const spy = spyOn(this.inst, "_setFields").mockImplementation(
          () => undefined,
        )

        try {
          this.inst.setFields("f", { dummy: true })

          assert.ok(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 2 &&
                c[0] === "f" &&
                _.isEqual(c[1], { dummy: true }),
            ),
          )
        } finally {
          spy.mockRestore()
        }
      },
    },

    "setFieldsRows()": {
      "calls to _setFieldsRows()"(this: any) {
        const spy = spyOn(this.inst, "_setFieldsRows").mockImplementation(
          () => undefined,
        )

        try {
          this.inst.setFieldsRows("f", { dummy: true })

          assert.ok(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 2 &&
                c[0] === "f" &&
                _.isEqual(c[1], { dummy: true }),
            ),
          )
        } finally {
          spy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      "needs at least one field to have been provided"(this: any) {
        assert.same("", this.inst.toString())
      },

      "got fields": {
        beforeEach(this: any) {
          this.inst.setFieldsRows([
            { field1: 9, field2: "value2", field3: squel.str("GETDATE(?)", 5) },
            { field1: 8, field2: true, field3: null },
          ])
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "(field1, field2, field3) VALUES (9, 'value2', (GETDATE(5))), (8, TRUE, NULL)",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "(field1, field2, field3) VALUES (?, ?, (GETDATE(?))), (?, ?, ?)",
            values: [9, "value2", 5, 8, true, null],
          })
        },
      },
    },
  },

  InsertFieldsFromQueryBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.InsertFieldsFromQueryBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "fromQuery()": {
      "sanitizes field names"(this: any) {
        const spy = spyOn(this.inst, "_sanitizeField").mockReturnValue(1 as any)

        try {
          const qry = squel.select()

          this.inst.fromQuery(["test", "one", "two"], qry)

          assert.same(3, spy.mock.calls.length)
          assert.ok(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === "test"),
          )
          assert.ok(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === "one"),
          )
          assert.ok(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === "two"),
          )
        } finally {
          spy.mockRestore()
        }
      },

      "sanitizes query"(this: any) {
        const spy = spyOn(this.inst, "_sanitizeBaseBuilder").mockReturnValue(
          1 as any,
        )

        try {
          const qry = 123

          this.inst.fromQuery(["test", "one", "two"], qry)

          assert.same(1, spy.mock.calls.length)
          assert.ok(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === qry),
          )
        } finally {
          spy.mockRestore()
        }
      },

      "overwrites existing values"(this: any) {
        this.inst._fields = 1
        this.inst._query = 2

        const qry = squel.select()
        this.inst.fromQuery(["test", "one", "two"], qry)

        assert.same(qry, this.inst._query)
        assert.same(["test", "one", "two"], this.inst._fields)
      },
    },

    "_toParamString()": {
      "needs fromQuery() to have been called"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      default: {
        beforeEach(this: any) {
          this.qry = squel.select().from("mega").where("a = ?", 5)
          this.inst.fromQuery(["test", "one", "two"], this.qry)
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "(test, one, two) (SELECT * FROM mega WHERE (a = 5))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "(test, one, two) (SELECT * FROM mega WHERE (a = ?))",
            values: [5],
          })
        },
      },
    },
  },

  DistinctBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.DistinctBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "_toParamString()": {
      "output nothing if not set"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },
      "output DISTINCT if set"(this: any) {
        this.inst.distinct()
        assert.same(this.inst._toParamString(), {
          text: "DISTINCT",
          values: [],
        })
      },
    },
  },

  GroupByBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.GroupByBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "group()": {
      "adds to list"(this: any) {
        this.inst.group("field1")
        this.inst.group("field2")

        assert.same(["field1", "field2"], this.inst._groups)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")

        try {
          this.inst.group("field1")

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          )

          assert.same(["_f"], this.inst._groups)
        } finally {
          sanitizeFieldSpy.mockRestore()
        }
      },
    },

    "toString()": {
      "output nothing if no fields set"(this: any) {
        this.inst._groups = []
        assert.same("", this.inst.toString())
      },

      "output GROUP BY"(this: any) {
        this.inst.group("field1")
        this.inst.group("field2")

        assert.same("GROUP BY field1, field2", this.inst.toString())
      },
    },
  },

  AbstractVerbSingleValueBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.AbstractVerbSingleValueBlock
      this.inst = new this.cls({ verb: "TEST" })
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "offset()": {
      "set value"(this: any) {
        this.inst._setValue(1)

        assert.same(1, this.inst._value)

        this.inst._setValue(22)

        assert.same(22, this.inst._value)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeSpy = spyOn(
          this.cls.prototype,
          "_sanitizeLimitOffset",
        ).mockReturnValue(234)

        try {
          this.inst._setValue(23)

          assert.ok(
            sanitizeSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === 23,
            ),
          )

          assert.same(234, this.inst._value)
        } finally {
          sanitizeSpy.mockRestore()
        }
      },
    },

    "toString()": {
      "output nothing if not set"(this: any) {
        assert.same("", this.inst.toString())
      },

      "output verb"(this: any) {
        this.inst._setValue(12)

        assert.same("TEST 12", this.inst.toString())
      },
    },

    "toParam()": {
      "output nothing if not set"(this: any) {
        assert.same({ text: "", values: [] }, this.inst.toParam())
      },

      "output verb"(this: any) {
        this.inst._setValue(12)

        assert.same({ text: "TEST ?", values: [12] }, this.inst.toParam())
      },
    },
  },

  OffsetBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.OffsetBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractVerbSingleValueBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractVerbSingleValueBlock)
    },

    "offset()": {
      "calls base method"(this: any) {
        const callSpy = spyOn(this.cls.prototype, "_setValue")

        try {
          this.inst.offset(1)

          assert.ok(
            callSpy.mock.calls.some((c: any) => c.length === 1 && c[0] === 1),
          )
        } finally {
          callSpy.mockRestore()
        }
      },
    },

    "toString()": {
      "output nothing if not set"(this: any) {
        assert.same("", this.inst.toString())
      },

      "output verb"(this: any) {
        this.inst.offset(12)

        assert.same("OFFSET 12", this.inst.toString())
      },
    },

    "toParam()": {
      "output nothing if not set"(this: any) {
        assert.same({ text: "", values: [] }, this.inst.toParam())
      },

      "output verb"(this: any) {
        this.inst.offset(12)

        assert.same({ text: "OFFSET ?", values: [12] }, this.inst.toParam())
      },
    },

    "can be removed using null"(this: any) {
      this.inst.offset(1)
      this.inst.offset(null)

      assert.same({ text: "", values: [] }, this.inst.toParam())
    },
  },

  LimitBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.LimitBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractVerbSingleValueBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractVerbSingleValueBlock)
    },

    "limit()": {
      "calls base method"(this: any) {
        const callSpy = spyOn(this.cls.prototype, "_setValue")

        try {
          this.inst.limit(1)

          assert.ok(
            callSpy.mock.calls.some((c: any) => c.length === 1 && c[0] === 1),
          )
        } finally {
          callSpy.mockRestore()
        }
      },
    },

    "toString()": {
      "output nothing if not set"(this: any) {
        assert.same("", this.inst.toString())
      },

      "output verb"(this: any) {
        this.inst.limit(12)

        assert.same("LIMIT 12", this.inst.toString())
      },
    },

    "toParam()": {
      "output nothing if not set"(this: any) {
        assert.same({ text: "", values: [] }, this.inst.toParam())
      },

      "output verb"(this: any) {
        this.inst.limit(12)

        assert.same({ text: "LIMIT ?", values: [12] }, this.inst.toParam())
      },
    },

    "can be removed using null"(this: any) {
      this.inst.limit(1)
      this.inst.limit(null)

      assert.same({ text: "", values: [] }, this.inst.toParam())
    },
  },

  AbstractConditionBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.AbstractConditionBlock
      this.inst = new this.cls({ verb: "ACB" })

      class MockConditionBlock extends squel.cls.AbstractConditionBlock {
        constructor(options: any) {
          super(_.extend({}, options, { verb: "MOCKVERB" }))
        }

        mockCondition(condition: any, ...values: any[]): void {
          this._condition(condition, ...values)
        }
      }
      ;(squel.cls as any).MockConditionBlock = MockConditionBlock

      class MockSelectWithCondition extends squel.cls.Select {
        constructor(options?: any, blocks: any = null) {
          blocks = [
            new squel.cls.StringBlock(options, "SELECT"),
            new squel.cls.GetFieldBlock(options),
            new squel.cls.FromTableBlock(options),
            new MockConditionBlock(options),
          ]

          super(options, blocks)
        }
      }
      ;(squel.cls as any).MockSelectWithCondition = MockSelectWithCondition
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "_condition()": {
      "adds to list"(this: any) {
        this.inst._condition("a = 1")
        this.inst._condition("b = 2 OR c = 3")

        assert.same(
          [
            { expr: "a = 1", values: [] },
            { expr: "b = 2 OR c = 3", values: [] },
          ],
          this.inst._conditions,
        )
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeExpression",
        ).mockReturnValue("_c")

        try {
          this.inst._condition("a = 1")

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "a = 1",
            ),
          )

          assert.same([{ expr: "_c", values: [] }], this.inst._conditions)
        } finally {
          sanitizeFieldSpy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      "output nothing if no conditions set"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      "output QueryBuilder ": {
        beforeEach(this: any) {
          const subquery = new (squel.cls as any).MockSelectWithCondition()
          subquery.field("col1").from("table1").mockCondition("field1 = ?", 10)
          this.inst._condition("a in ?", subquery)
          this.inst._condition("b = ? OR c = ?", 2, 3)
          this.inst._condition("d in ?", [4, 5, 6])
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [10, 2, 3, 4, 5, 6],
          })
        },
      },

      "Fix for #64 - toString() does not change object": {
        beforeEach(this: any) {
          this.inst._condition("a = ?", 1)
          this.inst._condition("b = ? OR c = ?", 2, 3)
          this.inst._condition("d in ?", [4, 5, 6])
          this.inst._toParamString()
          this.inst._toParamString()
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "ACB (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "ACB (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [1, 2, 3, 4, 5, 6],
          })
        },
      },

      "Fix for #226 - empty expressions": {
        beforeEach(this: any) {
          this.inst._condition("a = ?", 1)
          this.inst._condition(squel.expr())
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "ACB (a = 1)",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "ACB (a = ?)",
            values: [1],
          })
        },
      },
    },
  },

  WhereBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.WhereBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractConditionBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractConditionBlock)
    },

    "sets verb to WHERE"(this: any) {
      this.inst = new this.cls()

      assert.same("WHERE", this.inst.options.verb)
    },

    "_toParamString()": {
      "output nothing if no conditions set"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      output: {
        beforeEach(this: any) {
          const subquery = new squel.cls.Select()
          subquery.field("col1").from("table1").where("field1 = ?", 10)
          this.inst.where("a in ?", subquery)
          this.inst.where("b = ? OR c = ?", 2, 3)
          this.inst.where("d in ?", [4, 5, 6])
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [10, 2, 3, 4, 5, 6],
          })
        },
      },
    },
  },

  HavingBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.HavingBlock
      this.inst = new this.cls()
    },

    "instanceof of AbstractConditionBlock"(this: any) {
      assert.instanceOf(this.inst, squel.cls.AbstractConditionBlock)
    },

    "sets verb"(this: any) {
      this.inst = new this.cls()

      assert.same("HAVING", this.inst.options.verb)
    },

    "_toParamString()": {
      "output nothing if no conditions set"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      output: {
        beforeEach(this: any) {
          const subquery = new squel.cls.Select()
          subquery.field("col1").from("table1").where("field1 = ?", 10)
          this.inst.having("a in ?", subquery)
          this.inst.having("b = ? OR c = ?", 2, 3)
          this.inst.having("d in ?", [4, 5, 6])
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [10, 2, 3, 4, 5, 6],
          })
        },
      },
    },
  },

  OrderByBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.OrderByBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "order()": {
      "adds to list"(this: any) {
        this.inst.order("field1")
        this.inst.order("field2", false)
        this.inst.order("field3", true)

        const expected = [
          { field: "field1", dir: "ASC", values: [] },
          { field: "field2", dir: "DESC", values: [] },
          { field: "field3", dir: "ASC", values: [] },
        ]

        assert.same(this.inst._orders, expected)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeFieldSpy = spyOn(
          this.cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")

        try {
          this.inst.order("field1")

          assert.ok(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          )

          assert.same(this.inst._orders, [
            { field: "_f", dir: "ASC", values: [] },
          ])
        } finally {
          sanitizeFieldSpy.mockRestore()
        }
      },

      "saves additional values"(this: any) {
        this.inst.order("field1", false, 1.2, 4)

        assert.same(this.inst._orders, [
          { field: "field1", dir: "DESC", values: [1.2, 4] },
        ])
      },
    },

    "_toParamString()": {
      empty(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      default: {
        beforeEach(this: any) {
          this.inst.order("field1")
          this.inst.order("field2", false)
          this.inst.order("GET(?, ?)", true, 2.5, 5)
        },
        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "ORDER BY field1 ASC, field2 DESC, GET(2.5, 5) ASC",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "ORDER BY field1 ASC, field2 DESC, GET(?, ?) ASC",
            values: [2.5, 5],
          })
        },
      },
    },
  },

  JoinBlock: {
    beforeEach(this: any) {
      this.cls = squel.cls.JoinBlock
      this.inst = new this.cls()
    },

    "instanceof of Block"(this: any) {
      assert.instanceOf(this.inst, squel.cls.Block)
    },

    "join()": {
      "adds to list"(this: any) {
        this.inst.join("table1")
        this.inst.join("table2", null, "b = 1", "LEFT")
        this.inst.join("table3", "alias3", "c = 1", "RIGHT")
        this.inst.join("table4", "alias4", "d = 1", "OUTER")
        this.inst.join("table5", "alias5", null, "CROSS")

        const expected = [
          { type: "INNER", table: "table1", alias: null, condition: null },
          { type: "LEFT", table: "table2", alias: null, condition: "b = 1" },
          {
            type: "RIGHT",
            table: "table3",
            alias: "alias3",
            condition: "c = 1",
          },
          {
            type: "OUTER",
            table: "table4",
            alias: "alias4",
            condition: "d = 1",
          },
          { type: "CROSS", table: "table5", alias: "alias5", condition: null },
        ]

        assert.same(this.inst._joins, expected)
      },

      "sanitizes inputs"(this: any) {
        const sanitizeTableSpy = spyOn(
          this.cls.prototype,
          "_sanitizeTable",
        ).mockReturnValue("_t")
        const sanitizeAliasSpy = spyOn(
          this.cls.prototype,
          "_sanitizeTableAlias",
        ).mockReturnValue("_a")
        const sanitizeConditionSpy = spyOn(
          this.cls.prototype,
          "_sanitizeExpression",
        ).mockReturnValue("_c")

        try {
          this.inst.join("table1", "alias1", "a = 1")

          assert.ok(
            sanitizeTableSpy.mock.calls.some(
              (c: any) => c.length === 2 && c[0] === "table1" && c[1] === true,
            ),
          )
          assert.ok(
            sanitizeAliasSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "alias1",
            ),
          )
          assert.ok(
            sanitizeConditionSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "a = 1",
            ),
          )

          const expected = [
            { type: "INNER", table: "_t", alias: "_a", condition: "_c" },
          ]

          assert.same(this.inst._joins, expected)
        } finally {
          sanitizeTableSpy.mockRestore()
          sanitizeAliasSpy.mockRestore()
          sanitizeConditionSpy.mockRestore()
        }
      },

      "nested queries"(this: any) {
        const inner1 = squel.select()
        const inner2 = squel.select()
        const inner3 = squel.select()
        const inner4 = squel.select()
        const inner5 = squel.select()
        const inner6 = squel.select()
        this.inst.join(inner1)
        this.inst.join(inner2, null, "b = 1", "LEFT")
        this.inst.join(inner3, "alias3", "c = 1", "RIGHT")
        this.inst.join(inner4, "alias4", "d = 1", "OUTER")
        this.inst.join(inner5, "alias5", "e = 1", "FULL")
        this.inst.join(inner6, "alias6", null, "CROSS")

        const expected = [
          { type: "INNER", table: inner1, alias: null, condition: null },
          { type: "LEFT", table: inner2, alias: null, condition: "b = 1" },
          { type: "RIGHT", table: inner3, alias: "alias3", condition: "c = 1" },
          { type: "OUTER", table: inner4, alias: "alias4", condition: "d = 1" },
          { type: "FULL", table: inner5, alias: "alias5", condition: "e = 1" },
          { type: "CROSS", table: inner6, alias: "alias6", condition: null },
        ]

        assert.same(this.inst._joins, expected)
      },
    },

    "left_join()": {
      "calls join()"(this: any) {
        const joinSpy = spyOn(this.inst, "join").mockImplementation(
          () => undefined,
        )

        try {
          this.inst.left_join("t", "a", "c")

          assert.same(1, joinSpy.mock.calls.length)
          assert.ok(
            joinSpy.mock.calls.some(
              (c: any) =>
                c.length === 4 &&
                c[0] === "t" &&
                c[1] === "a" &&
                c[2] === "c" &&
                c[3] === "LEFT",
            ),
          )
        } finally {
          joinSpy.mockRestore()
        }
      },
    },

    "_toParamString()": {
      "output nothing if nothing set"(this: any) {
        assert.same(this.inst._toParamString(), {
          text: "",
          values: [],
        })
      },

      "output JOINs with nested queries": {
        beforeEach(this: any) {
          const inner2 = squel.select().function("GETDATE(?)", 2)
          const inner3 = squel.select().from("3")
          const inner4 = squel.select().from("4")
          const inner5 = squel.select().from("5")
          const expr = squel.expr().and("field1 = ?", 99)

          this.inst.join("table")
          this.inst.join(inner2, null, "b = 1", "LEFT")
          this.inst.join(inner3, "alias3", "c = 1", "RIGHT")
          this.inst.join(inner4, "alias4", "e = 1", "FULL")
          this.inst.join(inner5, "alias5", expr, "CROSS")
        },

        "non-parameterized"(this: any) {
          assert.same(this.inst._toParamString(), {
            text: "INNER JOIN table LEFT JOIN (SELECT GETDATE(2)) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5` ON (field1 = 99)",
            values: [],
          })
        },
        parameterized(this: any) {
          assert.same(this.inst._toParamString({ buildParameterized: true }), {
            text: "INNER JOIN table LEFT JOIN (SELECT GETDATE(?)) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5` ON (field1 = ?)",
            values: [2, 99],
          })
        },
      },
    },
  },
})
