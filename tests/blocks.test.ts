import { beforeEach, describe, expect, it, spyOn } from "bun:test"
import squel from "../src/index"

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

describe("Blocks", () => {
  describe("Block base class", () => {
    let inst: any

    beforeEach(() => {
      inst = new squel.cls.Block()
    })

    it("instanceof of BaseBuilder", () => {
      expect(inst).toBeInstanceOf(squel.cls.BaseBuilder)
    })

    it("options", () => {
      const expectedOptions = {
        ...squel.cls.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true,
        dummy: true,
      }
      inst = new squel.cls.Block({
        usingValuePlaceholders: true,
        dummy: true,
      } as any)
      expect(inst.options).toEqual(expectedOptions)
    })

    it("_toParamString()", () => {
      expect(() => inst.toString()).toThrow("Not yet implemented")
    })

    describe("exposedMethods()", () => {
      it("returns methods", () => {
        inst.method1 = () => false
        inst.method2 = () => false

        const names: string[] = []
        for (const name in inst.exposedMethods()) names.push(name)
        expect(names).toEqual(["method1", "method2"])
      })

      it("ignores methods prefixed with _", () => {
        inst._method = () => false
        const names: string[] = []
        for (const name in inst.exposedMethods()) names.push(name)
        expect(names.find((name: string) => name === "_method")).toBeUndefined()
      })

      it("ignores toString()", () => {
        const names: string[] = []
        for (const name in inst.exposedMethods()) names.push(name)
        expect(
          names.find((name: string) => name === "toString"),
        ).toBeUndefined()
      })
    })

    it("cloning copies the options over", () => {
      inst.options.dummy = true
      const newinst = inst.clone()
      inst.options.dummy = false
      expect(newinst.options.dummy).toBe(true)
    })
  })

  describe("StringBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.StringBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("_toParamString()", () => {
      it("non-parameterized", () => {
        inst = new Cls({}, "TAG")
        expect(inst._toParamString()).toEqual({ text: "TAG", values: [] })
      })

      it("parameterized", () => {
        inst = new Cls({}, "TAG")
        expect(inst._toParamString({ buildParameterized: true })).toEqual({
          text: "TAG",
          values: [],
        })
      })
    })
  })

  describe("FunctionBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.FunctionBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    it("initial member values", () => {
      expect(inst._values).toEqual([])
      expect(inst._strings).toEqual([])
    })

    describe("_toParamString()", () => {
      it("when not set", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      it("non-parameterized", () => {
        inst.function("bla")
        inst.function("bla2")
        expect(inst._toParamString()).toEqual({
          text: "bla bla2",
          values: [],
        })
      })

      it("parameterized", () => {
        inst.function("bla ?", 2)
        inst.function("bla2 ?", 3)
        expect(inst._toParamString({ buildParameterized: true })).toEqual({
          text: "bla ? bla2 ?",
          values: [2, 3],
        })
      })
    })
  })

  describe("AbstractTableBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.AbstractTableBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    it("initial field values", () => {
      expect(inst._tables).toEqual([])
    })

    describe("has table", () => {
      it("no", () => {
        expect(inst._hasTable()).toBe(false)
      })

      it("yes", () => {
        inst._table("blah")
        expect(inst._hasTable()).toBe(true)
      })
    })

    describe("_table()", () => {
      it("saves inputs", () => {
        inst._table("table1")
        inst._table("table2", "alias2")
        inst._table("table3")

        expect(inst._tables).toEqual([
          { table: "table1", alias: null },
          { table: "table2", alias: "alias2" },
          { table: "table3", alias: null },
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeTableSpy = spyOn(
          Cls.prototype,
          "_sanitizeTable",
        ).mockReturnValue("_t")
        const sanitizeAliasSpy = spyOn(
          Cls.prototype,
          "_sanitizeTableAlias",
        ).mockReturnValue("_a")

        try {
          inst._table("table", "alias")

          expect(
            sanitizeTableSpy.mock.calls.some((c: any) => c[0] === "table"),
          ).toBe(true)
          expect(
            sanitizeAliasSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "alias",
            ),
          ).toBe(true)

          expect(inst._tables).toEqual([{ table: "_t", alias: "_a" }])
        } finally {
          sanitizeTableSpy.mockRestore()
          sanitizeAliasSpy.mockRestore()
        }
      })

      it("handles single-table mode", () => {
        inst.options.singleTable = true
        inst._table("table1")
        inst._table("table2")
        inst._table("table3")
        expect(inst._tables).toEqual([{ table: "table3", alias: null }])
      })

      it("builder as table", () => {
        const sanitizeTableSpy = spyOn(Cls.prototype, "_sanitizeTable")
        try {
          const innerTable1 = squel.select()
          const innerTable2 = squel.select()
          inst._table(innerTable1)
          inst._table(innerTable2, "Inner2")

          expect(
            sanitizeTableSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === innerTable1,
            ),
          ).toBe(true)
          expect(
            sanitizeTableSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === innerTable2,
            ),
          ).toBe(true)

          expect(inst._tables).toEqual([
            { alias: null, table: innerTable1 },
            { alias: "Inner2", table: innerTable2 },
          ])
        } finally {
          sanitizeTableSpy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      let innerTable1: any

      beforeEach(() => {
        innerTable1 = squel.select().from("inner1").where("a = ?", 3)
      })

      it("no table", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      it("prefix", () => {
        inst.options.prefix = "TEST"
        inst._table("table2", "alias2")
        expect(inst._toParamString()).toEqual({
          text: "TEST table2 `alias2`",
          values: [],
        })
      })

      it("non-parameterized", () => {
        inst._table(innerTable1)
        inst._table("table2", "alias2")
        inst._table("table3")
        expect(inst._toParamString()).toEqual({
          text: "(SELECT * FROM inner1 WHERE (a = 3)), table2 `alias2`, table3",
          values: [],
        })
      })

      it("parameterized", () => {
        inst._table(innerTable1)
        inst._table("table2", "alias2")
        inst._table("table3")
        expect(inst._toParamString({ buildParameterized: true })).toEqual({
          text: "(SELECT * FROM inner1 WHERE (a = ?)), table2 `alias2`, table3",
          values: [3],
        })
      })
    })
  })

  describe("FromTableBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.FromTableBlock
      inst = new Cls()
    })

    it("check prefix", () => {
      expect(inst.options.prefix).toBe("FROM")
    })

    it("instanceof of AbstractTableBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractTableBlock)
    })

    describe("from()", () => {
      it("calls base class handler", () => {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)
        try {
          inst.from("table1")
          inst.from("table2", "alias2")
          expect(baseMethodSpy.mock.calls.length).toBe(2)
          expect(
            baseMethodSpy.mock.calls.some(
              (c: any) => c.length === 2 && c[0] === "table1" && c[1] === null,
            ),
          ).toBe(true)
          expect(
            baseMethodSpy.mock.calls.some(
              (c: any) =>
                c.length === 2 && c[0] === "table2" && c[1] === "alias2",
            ),
          ).toBe(true)
        } finally {
          baseMethodSpy.mockRestore()
        }
      })
    })
  })

  describe("UpdateTableBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.UpdateTableBlock
      inst = new Cls()
    })

    it("instanceof of AbstractTableBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractTableBlock)
    })

    it("check prefix", () => {
      expect(inst.options.prefix).toBeUndefined()
    })

    describe("table()", () => {
      it("calls base class handler", () => {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)
        try {
          inst.table("table1")
          inst.table("table2", "alias2")
          expect(baseMethodSpy.mock.calls.length).toBe(2)
          expect(
            baseMethodSpy.mock.calls.some(
              (c: any) => c.length === 2 && c[0] === "table1" && c[1] === null,
            ),
          ).toBe(true)
          expect(
            baseMethodSpy.mock.calls.some(
              (c: any) =>
                c.length === 2 && c[0] === "table2" && c[1] === "alias2",
            ),
          ).toBe(true)
        } finally {
          baseMethodSpy.mockRestore()
        }
      })
    })
  })

  describe("TargetTableBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.TargetTableBlock
      inst = new Cls()
    })

    it("instanceof of AbstractTableBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractTableBlock)
    })

    it("check prefix", () => {
      expect(inst.options.prefix).toBeUndefined()
    })

    describe("table()", () => {
      it("calls base class handler", () => {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)
        try {
          inst.target("table1")
          inst.target("table2")
          expect(baseMethodSpy.mock.calls.length).toBe(2)
          expect(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table1"),
          ).toBe(true)
          expect(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table2"),
          ).toBe(true)
        } finally {
          baseMethodSpy.mockRestore()
        }
      })
    })
  })

  describe("IntoTableBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.IntoTableBlock
      inst = new Cls()
    })

    it("instanceof of AbstractTableBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractTableBlock)
    })

    it("check prefix", () => {
      expect(inst.options.prefix).toBe("INTO")
    })

    it("single table", () => {
      expect(inst.options.singleTable).toBeTruthy()
    })

    describe("into()", () => {
      it("calls base class handler", () => {
        const baseMethodSpy = spyOn(
          squel.cls.AbstractTableBlock.prototype,
          "_table",
        ).mockImplementation(() => undefined)
        try {
          inst.into("table1")
          inst.into("table2")
          expect(baseMethodSpy.mock.calls.length).toBe(2)
          expect(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table1"),
          ).toBe(true)
          expect(
            baseMethodSpy.mock.calls.some((c: any) => c[0] === "table2"),
          ).toBe(true)
        } finally {
          baseMethodSpy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      it("requires table to have been provided", () => {
        try {
          inst._toParamString()
          throw new Error("should not reach here")
        } catch (err: any) {
          expect(err.toString()).toBe("Error: into() needs to be called")
        }
      })
    })
  })

  describe("GetFieldBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.GetFieldBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("fields() - object", () => {
      it("saves inputs", () => {
        const fieldSpy = spyOn(inst, "field")
        inst.fields(
          { field1: null, field2: "alias2", field3: null },
          { dummy: true },
        )

        const expected = [
          { name: "field1", alias: null, options: { dummy: true } },
          { name: "field2", alias: "alias2", options: { dummy: true } },
          { name: "field3", alias: null, options: { dummy: true } },
        ]

        expect(fieldSpy.mock.calls.length).toBe(3)
        expect(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field1" &&
              c[1] === null &&
              isEqual(c[2], { dummy: true }),
          ),
        ).toBe(true)
        expect(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field2" &&
              c[1] === "alias2" &&
              isEqual(c[2], { dummy: true }),
          ),
        ).toBe(true)
        expect(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field3" &&
              c[1] === null &&
              isEqual(c[2], { dummy: true }),
          ),
        ).toBe(true)
        expect(inst._fields).toEqual(expected)
      })
    })

    describe("fields() - array", () => {
      it("saves inputs", () => {
        const fieldSpy = spyOn(inst, "field")
        inst.fields(["field1", "field2", "field3"], { dummy: true })

        const expected = [
          { name: "field1", alias: null, options: { dummy: true } },
          { name: "field2", alias: null, options: { dummy: true } },
          { name: "field3", alias: null, options: { dummy: true } },
        ]

        expect(fieldSpy.mock.calls.length).toBe(3)
        expect(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field1" &&
              c[1] === null &&
              isEqual(c[2], { dummy: true }),
          ),
        ).toBe(true)
        expect(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field2" &&
              c[1] === null &&
              isEqual(c[2], { dummy: true }),
          ),
        ).toBe(true)
        expect(
          fieldSpy.mock.calls.some(
            (c: any) =>
              c[0] === "field3" &&
              c[1] === null &&
              isEqual(c[2], { dummy: true }),
          ),
        ).toBe(true)
        expect(inst._fields).toEqual(expected)
      })
    })

    describe("field()", () => {
      it("saves inputs", () => {
        inst.field("field1")
        inst.field("field2", "alias2")
        inst.field("field3")

        expect(inst._fields).toEqual([
          { name: "field1", alias: null, options: {} },
          { name: "field2", alias: "alias2", options: {} },
          { name: "field3", alias: null, options: {} },
        ])
      })
    })

    describe("field() - discard duplicates", () => {
      it("saves inputs", () => {
        inst.field("field1")
        inst.field("field2", "alias2")
        inst.field("field2", "alias2")
        inst.field("field1", "alias1")

        expect(inst._fields).toEqual([
          { name: "field1", alias: null, options: {} },
          { name: "field2", alias: "alias2", options: {} },
          { name: "field1", alias: "alias1", options: {} },
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeAliasSpy = spyOn(
          Cls.prototype,
          "_sanitizeFieldAlias",
        ).mockReturnValue("_a")

        try {
          inst.field("field1", "alias1", { dummy: true })

          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          ).toBe(true)
          expect(
            sanitizeAliasSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "alias1",
            ),
          ).toBe(true)

          expect(inst._fields).toEqual([
            { name: "_f", alias: "_a", options: { dummy: true } },
          ])
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeAliasSpy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      let queryBuilder: any
      let fromTableBlock: any

      beforeEach(() => {
        queryBuilder = squel.select()
        fromTableBlock = queryBuilder.getBlock(squel.cls.FromTableBlock)
      })

      it("returns all fields when none provided and table is set", () => {
        fromTableBlock._hasTable = () => true
        expect(inst._toParamString({ queryBuilder })).toEqual({
          text: "*",
          values: [],
        })
      })

      it("but returns nothing if no table set", () => {
        fromTableBlock._hasTable = () => false
        expect(inst._toParamString({ queryBuilder })).toEqual({
          text: "",
          values: [],
        })
      })

      describe("returns formatted query phrase", () => {
        beforeEach(() => {
          fromTableBlock._hasTable = () => true
          inst.field(squel.str("GETDATE(?)", 3), "alias1")
          inst.field("field2", "alias2", { dummy: true })
          inst.field("field3")
        })

        it("non-parameterized", () => {
          expect(inst._toParamString({ queryBuilder })).toEqual({
            text: '(GETDATE(3)) AS "alias1", field2 AS "alias2", field3',
            values: [],
          })
        })

        it("parameterized", () => {
          expect(
            inst._toParamString({ queryBuilder, buildParameterized: true }),
          ).toEqual({
            text: '(GETDATE(?)) AS "alias1", field2 AS "alias2", field3',
            values: [3],
          })
        })
      })
    })
  })

  describe("AbstractSetFieldBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.AbstractSetFieldBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("_set()", () => {
      it("saves inputs", () => {
        inst._set("field1", "value1", { dummy: 1 })
        inst._set("field2", "value2", { dummy: 2 })
        inst._set("field3", "value3", { dummy: 3 })
        inst._set("field4")

        expect(inst._fields).toEqual(["field1", "field2", "field3", "field4"])
        expect(inst._values).toEqual([
          ["value1", "value2", "value3", undefined],
        ])
        expect(inst._valueOptions).toEqual([
          [{ dummy: 1 }, { dummy: 2 }, { dummy: 3 }, {}],
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeValueSpy = spyOn(
          Cls.prototype,
          "_sanitizeValue",
        ).mockReturnValue("_v")

        try {
          inst._set("field1", "value1", { dummy: true })
          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          ).toBe(true)
          expect(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value1",
            ),
          ).toBe(true)
          expect(inst._fields).toEqual(["_f"])
          expect(inst._values).toEqual([["_v"]])
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeValueSpy.mockRestore()
        }
      })
    })

    describe("_setFields()", () => {
      it("saves inputs", () => {
        inst._setFields({
          field1: "value1",
          field2: "value2",
          field3: "value3",
        })
        expect(inst._fields).toEqual(["field1", "field2", "field3"])
        expect(inst._values).toEqual([["value1", "value2", "value3"]])
        expect(inst._valueOptions).toEqual([[{}, {}, {}]])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeValueSpy = spyOn(
          Cls.prototype,
          "_sanitizeValue",
        ).mockReturnValue("_v")

        try {
          inst._setFields({ field1: "value1" }, { dummy: true })
          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          ).toBe(true)
          expect(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value1",
            ),
          ).toBe(true)
          expect(inst._fields).toEqual(["_f"])
          expect(inst._values).toEqual([["_v"]])
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeValueSpy.mockRestore()
        }
      })
    })

    describe("_setFieldsRows()", () => {
      it("saves inputs", () => {
        inst._setFieldsRows([
          { field1: "value1", field2: "value2", field3: "value3" },
          { field1: "value21", field2: "value22", field3: "value23" },
        ])
        expect(inst._fields).toEqual(["field1", "field2", "field3"])
        expect(inst._values).toEqual([
          ["value1", "value2", "value3"],
          ["value21", "value22", "value23"],
        ])
        expect(inst._valueOptions).toEqual([
          [{}, {}, {}],
          [{}, {}, {}],
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        const sanitizeValueSpy = spyOn(
          Cls.prototype,
          "_sanitizeValue",
        ).mockReturnValue("_v")

        try {
          inst._setFieldsRows([{ field1: "value1" }, { field1: "value21" }], {
            dummy: true,
          })
          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          ).toBe(true)
          expect(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value1",
            ),
          ).toBe(true)
          expect(
            sanitizeValueSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "value21",
            ),
          ).toBe(true)
          expect(inst._fields).toEqual(["_f"])
          expect(inst._values).toEqual([["_v"], ["_v"]])
        } finally {
          sanitizeFieldSpy.mockRestore()
          sanitizeValueSpy.mockRestore()
        }
      })
    })

    it("_toParamString()", () => {
      expect(() => inst._toParamString()).toThrow("Not yet implemented")
    })
  })

  describe("SetFieldBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.SetFieldBlock
      inst = new Cls()
    })

    it("instanceof of AbstractSetFieldBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractSetFieldBlock)
    })

    describe("set()", () => {
      it("calls to _set()", () => {
        const spy = spyOn(inst, "_set").mockImplementation(() => undefined)
        try {
          inst.set("f", "v", { dummy: true })
          expect(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 3 &&
                c[0] === "f" &&
                c[1] === "v" &&
                isEqual(c[2], { dummy: true }),
            ),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })
    })

    describe("setFields()", () => {
      it("calls to _setFields()", () => {
        const spy = spyOn(inst, "_setFields").mockImplementation(
          () => undefined,
        )
        try {
          inst.setFields("f", { dummy: true })
          expect(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 2 &&
                c[0] === "f" &&
                isEqual(c[1], { dummy: true }),
            ),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      it("needs at least one field to have been provided", () => {
        try {
          inst.toString()
          throw new Error("should not reach here")
        } catch (err: any) {
          expect(err.toString()).toBe("Error: set() needs to be called")
        }
      })

      describe("fields set", () => {
        beforeEach(() => {
          inst.set("field0 = field0 + 1")
          inst.set("field1", "value1", { dummy: true })
          inst.set("field2", "value2")
          inst.set("field3", squel.str("GETDATE(?)", 4))
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "SET field0 = field0 + 1, field1 = 'value1', field2 = 'value2', field3 = (GETDATE(4))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "SET field0 = field0 + 1, field1 = ?, field2 = ?, field3 = (GETDATE(?))",
            values: ["value1", "value2", 4],
          })
        })
      })
    })
  })

  describe("InsertFieldValueBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.InsertFieldValueBlock
      inst = new Cls()
    })

    it("instanceof of AbstractSetFieldBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractSetFieldBlock)
    })

    describe("set()", () => {
      it("calls to _set()", () => {
        const spy = spyOn(inst, "_set").mockImplementation(() => undefined)
        try {
          inst.set("f", "v", { dummy: true })
          expect(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 3 &&
                c[0] === "f" &&
                c[1] === "v" &&
                isEqual(c[2], { dummy: true }),
            ),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })
    })

    describe("setFields()", () => {
      it("calls to _setFields()", () => {
        const spy = spyOn(inst, "_setFields").mockImplementation(
          () => undefined,
        )
        try {
          inst.setFields("f", { dummy: true })
          expect(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 2 &&
                c[0] === "f" &&
                isEqual(c[1], { dummy: true }),
            ),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })
    })

    describe("setFieldsRows()", () => {
      it("calls to _setFieldsRows()", () => {
        const spy = spyOn(inst, "_setFieldsRows").mockImplementation(
          () => undefined,
        )
        try {
          inst.setFieldsRows("f", { dummy: true })
          expect(
            spy.mock.calls.some(
              (c: any) =>
                c.length === 2 &&
                c[0] === "f" &&
                isEqual(c[1], { dummy: true }),
            ),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      it("needs at least one field to have been provided", () => {
        expect(inst.toString()).toBe("")
      })

      describe("got fields", () => {
        beforeEach(() => {
          inst.setFieldsRows([
            {
              field1: 9,
              field2: "value2",
              field3: squel.str("GETDATE(?)", 5),
            },
            { field1: 8, field2: true, field3: null },
          ])
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "(field1, field2, field3) VALUES (9, 'value2', (GETDATE(5))), (8, TRUE, NULL)",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "(field1, field2, field3) VALUES (?, ?, (GETDATE(?))), (?, ?, ?)",
            values: [9, "value2", 5, 8, true, null],
          })
        })
      })
    })
  })

  describe("InsertFieldsFromQueryBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.InsertFieldsFromQueryBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("fromQuery()", () => {
      it("sanitizes field names", () => {
        const spy = spyOn(inst, "_sanitizeField").mockReturnValue(1 as any)
        try {
          const qry = squel.select()
          inst.fromQuery(["test", "one", "two"], qry)
          expect(spy.mock.calls.length).toBe(3)
          expect(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === "test"),
          ).toBe(true)
          expect(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === "one"),
          ).toBe(true)
          expect(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === "two"),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })

      it("sanitizes query", () => {
        const spy = spyOn(inst, "_sanitizeBaseBuilder").mockReturnValue(
          1 as any,
        )
        try {
          const qry = 123
          inst.fromQuery(["test", "one", "two"], qry)
          expect(spy.mock.calls.length).toBe(1)
          expect(
            spy.mock.calls.some((c: any) => c.length === 1 && c[0] === qry),
          ).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })

      it("overwrites existing values", () => {
        inst._fields = 1
        inst._query = 2
        const qry = squel.select()
        inst.fromQuery(["test", "one", "two"], qry)
        expect(inst._query).toBe(qry)
        expect(inst._fields).toEqual(["test", "one", "two"])
      })
    })

    describe("_toParamString()", () => {
      it("needs fromQuery() to have been called", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      describe("default", () => {
        let qry: any

        beforeEach(() => {
          qry = squel.select().from("mega").where("a = ?", 5)
          inst.fromQuery(["test", "one", "two"], qry)
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "(test, one, two) (SELECT * FROM mega WHERE (a = 5))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "(test, one, two) (SELECT * FROM mega WHERE (a = ?))",
            values: [5],
          })
        })
      })
    })
  })

  describe("DistinctBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.DistinctBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("_toParamString()", () => {
      it("output nothing if not set", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      it("output DISTINCT if set", () => {
        inst.distinct()
        expect(inst._toParamString()).toEqual({ text: "DISTINCT", values: [] })
      })
    })
  })

  describe("GroupByBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.GroupByBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("group()", () => {
      it("adds to list", () => {
        inst.group("field1")
        inst.group("field2")
        expect(inst._groups).toEqual(["field1", "field2"])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        try {
          inst.group("field1")
          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          ).toBe(true)
          expect(inst._groups).toEqual(["_f"])
        } finally {
          sanitizeFieldSpy.mockRestore()
        }
      })
    })

    describe("toString()", () => {
      it("output nothing if no fields set", () => {
        inst._groups = []
        expect(inst.toString()).toBe("")
      })

      it("output GROUP BY", () => {
        inst.group("field1")
        inst.group("field2")
        expect(inst.toString()).toBe("GROUP BY field1, field2")
      })
    })
  })

  describe("AbstractVerbSingleValueBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.AbstractVerbSingleValueBlock
      inst = new Cls({ verb: "TEST" })
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("offset()", () => {
      it("set value", () => {
        inst._setValue(1)
        expect(inst._value).toBe(1)
        inst._setValue(22)
        expect(inst._value).toBe(22)
      })

      it("sanitizes inputs", () => {
        const sanitizeSpy = spyOn(
          Cls.prototype,
          "_sanitizeLimitOffset",
        ).mockReturnValue(234)
        try {
          inst._setValue(23)
          expect(
            sanitizeSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === 23,
            ),
          ).toBe(true)
          expect(inst._value).toBe(234)
        } finally {
          sanitizeSpy.mockRestore()
        }
      })
    })

    describe("toString()", () => {
      it("output nothing if not set", () => {
        expect(inst.toString()).toBe("")
      })

      it("output verb", () => {
        inst._setValue(12)
        expect(inst.toString()).toBe("TEST 12")
      })
    })

    describe("toParam()", () => {
      it("output nothing if not set", () => {
        expect(inst.toParam()).toEqual({ text: "", values: [] })
      })

      it("output verb", () => {
        inst._setValue(12)
        expect(inst.toParam()).toEqual({ text: "TEST ?", values: [12] })
      })
    })
  })

  describe("OffsetBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.OffsetBlock
      inst = new Cls()
    })

    it("instanceof of AbstractVerbSingleValueBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractVerbSingleValueBlock)
    })

    describe("offset()", () => {
      it("calls base method", () => {
        const callSpy = spyOn(Cls.prototype, "_setValue")
        try {
          inst.offset(1)
          expect(
            callSpy.mock.calls.some((c: any) => c.length === 1 && c[0] === 1),
          ).toBe(true)
        } finally {
          callSpy.mockRestore()
        }
      })
    })

    describe("toString()", () => {
      it("output nothing if not set", () => {
        expect(inst.toString()).toBe("")
      })

      it("output verb", () => {
        inst.offset(12)
        expect(inst.toString()).toBe("OFFSET 12")
      })
    })

    describe("toParam()", () => {
      it("output nothing if not set", () => {
        expect(inst.toParam()).toEqual({ text: "", values: [] })
      })

      it("output verb", () => {
        inst.offset(12)
        expect(inst.toParam()).toEqual({ text: "OFFSET ?", values: [12] })
      })
    })

    it("can be removed using null", () => {
      inst.offset(1)
      inst.offset(null)
      expect(inst.toParam()).toEqual({ text: "", values: [] })
    })
  })

  describe("LimitBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.LimitBlock
      inst = new Cls()
    })

    it("instanceof of AbstractVerbSingleValueBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractVerbSingleValueBlock)
    })

    describe("limit()", () => {
      it("calls base method", () => {
        const callSpy = spyOn(Cls.prototype, "_setValue")
        try {
          inst.limit(1)
          expect(
            callSpy.mock.calls.some((c: any) => c.length === 1 && c[0] === 1),
          ).toBe(true)
        } finally {
          callSpy.mockRestore()
        }
      })
    })

    describe("toString()", () => {
      it("output nothing if not set", () => {
        expect(inst.toString()).toBe("")
      })

      it("output verb", () => {
        inst.limit(12)
        expect(inst.toString()).toBe("LIMIT 12")
      })
    })

    describe("toParam()", () => {
      it("output nothing if not set", () => {
        expect(inst.toParam()).toEqual({ text: "", values: [] })
      })

      it("output verb", () => {
        inst.limit(12)
        expect(inst.toParam()).toEqual({ text: "LIMIT ?", values: [12] })
      })
    })

    it("can be removed using null", () => {
      inst.limit(1)
      inst.limit(null)
      expect(inst.toParam()).toEqual({ text: "", values: [] })
    })
  })

  describe("AbstractConditionBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.AbstractConditionBlock
      inst = new Cls({ verb: "ACB" })

      class MockConditionBlock extends squel.cls.AbstractConditionBlock {
        constructor(options: any) {
          super({ ...options, verb: "MOCKVERB" })
        }
        mockCondition(condition: any, ...values: any[]): void {
          ;(this as any)._condition(condition, ...values)
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
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("_condition()", () => {
      it("adds to list", () => {
        inst._condition("a = 1")
        inst._condition("b = 2 OR c = 3")
        expect(inst._conditions).toEqual([
          { expr: "a = 1", values: [] },
          { expr: "b = 2 OR c = 3", values: [] },
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeExpression",
        ).mockReturnValue("_c")
        try {
          inst._condition("a = 1")
          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "a = 1",
            ),
          ).toBe(true)
          expect(inst._conditions).toEqual([{ expr: "_c", values: [] }])
        } finally {
          sanitizeFieldSpy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      it("output nothing if no conditions set", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      describe("output QueryBuilder ", () => {
        beforeEach(() => {
          const subquery = new (squel.cls as any).MockSelectWithCondition()
          subquery.field("col1").from("table1").mockCondition("field1 = ?", 10)
          inst._condition("a in ?", subquery)
          inst._condition("b = ? OR c = ?", 2, 3)
          inst._condition("d in ?", [4, 5, 6])
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [10, 2, 3, 4, 5, 6],
          })
        })
      })

      describe("Fix for #64 - toString() does not change object", () => {
        beforeEach(() => {
          inst._condition("a = ?", 1)
          inst._condition("b = ? OR c = ?", 2, 3)
          inst._condition("d in ?", [4, 5, 6])
          inst._toParamString()
          inst._toParamString()
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "ACB (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "ACB (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [1, 2, 3, 4, 5, 6],
          })
        })
      })

      describe("Fix for #226 - empty expressions", () => {
        beforeEach(() => {
          inst._condition("a = ?", 1)
          inst._condition(squel.expr())
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "ACB (a = 1)",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "ACB (a = ?)",
            values: [1],
          })
        })
      })
    })
  })

  describe("WhereBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.WhereBlock
      inst = new Cls()
    })

    it("instanceof of AbstractConditionBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractConditionBlock)
    })

    it("sets verb to WHERE", () => {
      inst = new Cls()
      expect(inst.options.verb).toBe("WHERE")
    })

    describe("_toParamString()", () => {
      it("output nothing if no conditions set", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      describe("output", () => {
        beforeEach(() => {
          const subquery = new squel.cls.Select()
          ;(subquery as any)
            .field("col1")
            .from("table1")
            .where("field1 = ?", 10)
          inst.where("a in ?", subquery)
          inst.where("b = ? OR c = ?", 2, 3)
          inst.where("d in ?", [4, 5, 6])
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [10, 2, 3, 4, 5, 6],
          })
        })
      })
    })
  })

  describe("HavingBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.HavingBlock
      inst = new Cls()
    })

    it("instanceof of AbstractConditionBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractConditionBlock)
    })

    it("sets verb", () => {
      inst = new Cls()
      expect(inst.options.verb).toBe("HAVING")
    })

    describe("_toParamString()", () => {
      it("output nothing if no conditions set", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      describe("output", () => {
        beforeEach(() => {
          const subquery = new squel.cls.Select()
          ;(subquery as any)
            .field("col1")
            .from("table1")
            .where("field1 = ?", 10)
          inst.having("a in ?", subquery)
          inst.having("b = ? OR c = ?", 2, 3)
          inst.having("d in ?", [4, 5, 6])
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))",
            values: [10, 2, 3, 4, 5, 6],
          })
        })
      })
    })
  })

  describe("OrderByBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.OrderByBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("order()", () => {
      it("adds to list", () => {
        inst.order("field1")
        inst.order("field2", false)
        inst.order("field3", true)
        expect(inst._orders).toEqual([
          { field: "field1", dir: "ASC", values: [] },
          { field: "field2", dir: "DESC", values: [] },
          { field: "field3", dir: "ASC", values: [] },
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeFieldSpy = spyOn(
          Cls.prototype,
          "_sanitizeField",
        ).mockReturnValue("_f")
        try {
          inst.order("field1")
          expect(
            sanitizeFieldSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "field1",
            ),
          ).toBe(true)
          expect(inst._orders).toEqual([
            { field: "_f", dir: "ASC", values: [] },
          ])
        } finally {
          sanitizeFieldSpy.mockRestore()
        }
      })

      it("saves additional values", () => {
        inst.order("field1", false, 1.2, 4)
        expect(inst._orders).toEqual([
          { field: "field1", dir: "DESC", values: [1.2, 4] },
        ])
      })
    })

    describe("_toParamString()", () => {
      it("empty", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      describe("default", () => {
        beforeEach(() => {
          inst.order("field1")
          inst.order("field2", false)
          inst.order("GET(?, ?)", true, 2.5, 5)
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "ORDER BY field1 ASC, field2 DESC, GET(2.5, 5) ASC",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "ORDER BY field1 ASC, field2 DESC, GET(?, ?) ASC",
            values: [2.5, 5],
          })
        })
      })
    })
  })

  describe("JoinBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.JoinBlock
      inst = new Cls()
    })

    it("instanceof of Block", () => {
      expect(inst).toBeInstanceOf(squel.cls.Block)
    })

    describe("join()", () => {
      it("adds to list", () => {
        inst.join("table1")
        inst.join("table2", null, "b = 1", "LEFT")
        inst.join("table3", "alias3", "c = 1", "RIGHT")
        inst.join("table4", "alias4", "d = 1", "OUTER")
        inst.join("table5", "alias5", null, "CROSS")

        expect(inst._joins).toEqual([
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
        ])
      })

      it("sanitizes inputs", () => {
        const sanitizeTableSpy = spyOn(
          Cls.prototype,
          "_sanitizeTable",
        ).mockReturnValue("_t")
        const sanitizeAliasSpy = spyOn(
          Cls.prototype,
          "_sanitizeTableAlias",
        ).mockReturnValue("_a")
        const sanitizeConditionSpy = spyOn(
          Cls.prototype,
          "_sanitizeExpression",
        ).mockReturnValue("_c")

        try {
          inst.join("table1", "alias1", "a = 1")
          expect(
            sanitizeTableSpy.mock.calls.some(
              (c: any) => c.length === 2 && c[0] === "table1" && c[1] === true,
            ),
          ).toBe(true)
          expect(
            sanitizeAliasSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "alias1",
            ),
          ).toBe(true)
          expect(
            sanitizeConditionSpy.mock.calls.some(
              (c: any) => c.length === 1 && c[0] === "a = 1",
            ),
          ).toBe(true)

          expect(inst._joins).toEqual([
            { type: "INNER", table: "_t", alias: "_a", condition: "_c" },
          ])
        } finally {
          sanitizeTableSpy.mockRestore()
          sanitizeAliasSpy.mockRestore()
          sanitizeConditionSpy.mockRestore()
        }
      })

      it("nested queries", () => {
        const inner1 = squel.select()
        const inner2 = squel.select()
        const inner3 = squel.select()
        const inner4 = squel.select()
        const inner5 = squel.select()
        const inner6 = squel.select()
        inst.join(inner1)
        inst.join(inner2, null, "b = 1", "LEFT")
        inst.join(inner3, "alias3", "c = 1", "RIGHT")
        inst.join(inner4, "alias4", "d = 1", "OUTER")
        inst.join(inner5, "alias5", "e = 1", "FULL")
        inst.join(inner6, "alias6", null, "CROSS")

        expect(inst._joins).toEqual([
          { type: "INNER", table: inner1, alias: null, condition: null },
          { type: "LEFT", table: inner2, alias: null, condition: "b = 1" },
          {
            type: "RIGHT",
            table: inner3,
            alias: "alias3",
            condition: "c = 1",
          },
          {
            type: "OUTER",
            table: inner4,
            alias: "alias4",
            condition: "d = 1",
          },
          { type: "FULL", table: inner5, alias: "alias5", condition: "e = 1" },
          { type: "CROSS", table: inner6, alias: "alias6", condition: null },
        ])
      })
    })

    describe("left_join()", () => {
      it("calls join()", () => {
        const joinSpy = spyOn(inst, "join").mockImplementation(() => undefined)
        try {
          inst.left_join("t", "a", "c")
          expect(joinSpy.mock.calls.length).toBe(1)
          expect(
            joinSpy.mock.calls.some(
              (c: any) =>
                c.length === 4 &&
                c[0] === "t" &&
                c[1] === "a" &&
                c[2] === "c" &&
                c[3] === "LEFT",
            ),
          ).toBe(true)
        } finally {
          joinSpy.mockRestore()
        }
      })
    })

    describe("_toParamString()", () => {
      it("output nothing if nothing set", () => {
        expect(inst._toParamString()).toEqual({ text: "", values: [] })
      })

      describe("output JOINs with nested queries", () => {
        beforeEach(() => {
          const inner2 = squel.select().function("GETDATE(?)", 2)
          const inner3 = squel.select().from("3")
          const inner4 = squel.select().from("4")
          const inner5 = squel.select().from("5")
          const expr = squel.expr().and("field1 = ?", 99)

          inst.join("table")
          inst.join(inner2, null, "b = 1", "LEFT")
          inst.join(inner3, "alias3", "c = 1", "RIGHT")
          inst.join(inner4, "alias4", "e = 1", "FULL")
          inst.join(inner5, "alias5", expr, "CROSS")
        })

        it("non-parameterized", () => {
          expect(inst._toParamString()).toEqual({
            text: "INNER JOIN table LEFT JOIN (SELECT GETDATE(2)) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5` ON (field1 = 99)",
            values: [],
          })
        })

        it("parameterized", () => {
          expect(inst._toParamString({ buildParameterized: true })).toEqual({
            text: "INNER JOIN table LEFT JOIN (SELECT GETDATE(?)) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5` ON (field1 = ?)",
            values: [2, 99],
          })
        })
      })
    })
  })
})
