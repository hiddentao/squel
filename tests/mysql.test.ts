import { beforeEach, describe, expect, it } from "bun:test"
import squelBase from "../src/index"

describe("MySQL flavour", () => {
  let squel: any

  beforeEach(() => {
    squel = squelBase.useFlavour("mysql")
  })

  describe("MysqlOnDuplicateKeyUpdateBlock", () => {
    let Cls: any
    let inst: any

    beforeEach(() => {
      Cls = squel.cls.MysqlOnDuplicateKeyUpdateBlock
      inst = new Cls()
    })

    it("instanceof of AbstractSetFieldBlock", () => {
      expect(inst).toBeInstanceOf(squel.cls.AbstractSetFieldBlock)
    })

    describe("onDupUpdate()", () => {
      it("calls to _set()", () => {
        const calls: any[] = []
        inst._set = (...args: any[]) => {
          calls.push(args)
        }
        inst.onDupUpdate("f", "v", { dummy: true })
        expect(calls.length).toBe(1)
        expect(calls[0]).toEqual(["f", "v", { dummy: true }])
      })
    })

    describe("_toParamString()", () => {
      beforeEach(() => {
        inst.onDupUpdate("field1 = field1 + 1")
        inst.onDupUpdate("field2", "value2", { dummy: true })
        inst.onDupUpdate("field3", "value3")
      })

      it("non-parameterized", () => {
        expect(inst._toParamString()).toEqual({
          text: "ON DUPLICATE KEY UPDATE field1 = field1 + 1, field2 = 'value2', field3 = 'value3'",
          values: [],
        })
      })

      it("parameterized", () => {
        expect(inst._toParamString({ buildParameterized: true })).toEqual({
          text: "ON DUPLICATE KEY UPDATE field1 = field1 + 1, field2 = ?, field3 = ?",
          values: ["value2", "value3"],
        })
      })
    })
  })

  describe("INSERT builder", () => {
    let inst: any

    beforeEach(() => {
      inst = squel.insert()
    })

    describe('>> into(table).set(field, 1).set(field1, 2).onDupUpdate(field, 5).onDupUpdate(field1, "str")', () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field", 1)
          .set("field1", 2)
          .onDupUpdate("field", 5)
          .onDupUpdate("field1", "str")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field, field1) VALUES (1, 2) ON DUPLICATE KEY UPDATE field = 5, field1 = 'str'",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "INSERT INTO table (field, field1) VALUES (?, ?) ON DUPLICATE KEY UPDATE field = ?, field1 = ?",
          values: [1, 2, 5, "str"],
        })
      })
    })

    describe('>> into(table).set(field2, 3).onDupUpdate(field2, "str", { dontQuote: true })', () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field2", 3)
          .onDupUpdate("field2", "str", { dontQuote: true })
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field2) VALUES (3) ON DUPLICATE KEY UPDATE field2 = str",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "INSERT INTO table (field2) VALUES (?) ON DUPLICATE KEY UPDATE field2 = ?",
          values: [3, "str"],
        })
      })
    })
  })

  describe("REPLACE builder", () => {
    let inst: any

    beforeEach(() => {
      inst = squel.replace()
    })

    describe(">> into(table).set(field, 1).set(field1, 2)", () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).set("field1", 2)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "REPLACE INTO table (field, field1) VALUES (1, 2)",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "REPLACE INTO table (field, field1) VALUES (?, ?)",
          values: [1, 2],
        })
      })
    })
  })
})
