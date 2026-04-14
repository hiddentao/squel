import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import squel from "../src/index"
import { pick } from "./testbase"

describe("UPDATE builder", () => {
  let func: any
  let inst: any

  beforeEach(() => {
    func = squel.update
    inst = func()
  })

  it("instanceof QueryBuilder", () => {
    expect(inst).toBeInstanceOf(squel.cls.QueryBuilder)
  })

  describe("constructor", () => {
    it("override options", () => {
      inst = squel.update({ usingValuePlaceholders: true, dummy: true } as any)
      const expectedOptions = {
        ...squel.cls.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true,
        dummy: true,
      }
      for (const block of inst.blocks) {
        expect(pick(block.options, Object.keys(expectedOptions))).toEqual(
          expectedOptions,
        )
      }
    })

    it("override blocks", () => {
      const block = new squel.cls.StringBlock({}, "SELECT")
      inst = func({}, [block])
      expect(inst.blocks).toEqual([block])
    })
  })

  describe("build query", () => {
    it("need to call set() first", () => {
      inst.table("table")
      expect(() => inst.toString()).toThrow("set() needs to be called")
    })

    describe(">> table(table, t1).set(field, 1)", () => {
      beforeEach(() => {
        inst.table("table", "t1").set("field", 1)
      })

      it("toString", () => {
        expect(inst.toString()).toBe("UPDATE table `t1` SET field = 1")
      })

      describe(">> set(field2, 1.2)", () => {
        beforeEach(() => {
          inst.set("field2", 1.2)
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = 1, field2 = 1.2",
          )
        })
      })

      describe(">> set(field2, true)", () => {
        beforeEach(() => {
          inst.set("field2", true)
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = 1, field2 = TRUE",
          )
        })
      })

      describe('>> set(field2, "str")', () => {
        beforeEach(() => {
          inst.set("field2", "str")
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = 1, field2 = 'str'",
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: "UPDATE table `t1` SET field = ?, field2 = ?",
            values: [1, "str"],
          })
        })
      })

      describe('>> set(field2, "str", { dontQuote: true })', () => {
        beforeEach(() => {
          inst.set("field2", "str", { dontQuote: true })
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = 1, field2 = str",
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: "UPDATE table `t1` SET field = ?, field2 = ?",
            values: [1, "str"],
          })
        })
      })

      describe(">> set(field, query builder)", () => {
        let subQuery: any

        beforeEach(() => {
          subQuery = squel.select().field("MAX(score)").from("scores")
          inst.set("field", subQuery)
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = (SELECT MAX(score) FROM scores)",
          )
        })

        it("toParam", () => {
          const parameterized = inst.toParam()
          expect(parameterized.text).toBe(
            "UPDATE table `t1` SET field = (SELECT MAX(score) FROM scores)",
          )
          expect(parameterized.values).toEqual([])
        })
      })

      describe(">> set(custom value type)", () => {
        beforeEach(() => {
          class MyClass {}
          inst.registerValueHandler(MyClass, (_a: any) => "abcd")
          inst.set("field", new MyClass())
        })

        it("toString", () => {
          expect(inst.toString()).toBe("UPDATE table `t1` SET field = (abcd)")
        })

        it("toParam", () => {
          const parameterized = inst.toParam()
          expect(parameterized.text).toBe("UPDATE table `t1` SET field = ?")
          expect(parameterized.values).toEqual(["abcd"])
        })
      })

      describe(">> setFields({field2: 'value2', field3: true })", () => {
        beforeEach(() => {
          inst.setFields({ field2: "value2", field3: true })
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = 1, field2 = 'value2', field3 = TRUE",
          )
        })

        it("toParam", () => {
          const parameterized = inst.toParam()
          expect(parameterized.text).toBe(
            "UPDATE table `t1` SET field = ?, field2 = ?, field3 = ?",
          )
          expect(parameterized.values).toEqual([1, "value2", true])
        })
      })

      describe(">> setFields({field2: 'value2', field: true })", () => {
        beforeEach(() => {
          inst.setFields({ field2: "value2", field: true })
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = TRUE, field2 = 'value2'",
          )
        })
      })

      describe(">> set(field2, null)", () => {
        beforeEach(() => {
          inst.set("field2", null)
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field = 1, field2 = NULL",
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: "UPDATE table `t1` SET field = ?, field2 = ?",
            values: [1, null],
          })
        })

        describe(">> table(table2)", () => {
          beforeEach(() => {
            inst.table("table2")
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "UPDATE table `t1`, table2 SET field = 1, field2 = NULL",
            )
          })

          describe(">> where(a = 1)", () => {
            beforeEach(() => {
              inst.where("a = 1")
            })

            it("toString", () => {
              expect(inst.toString()).toBe(
                "UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1)",
              )
            })

            describe(">> order(a, true)", () => {
              beforeEach(() => {
                inst.order("a", true)
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  "UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC",
                )
              })

              describe(">> limit(2)", () => {
                beforeEach(() => {
                  inst.limit(2)
                })

                it("toString", () => {
                  expect(inst.toString()).toBe(
                    "UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC LIMIT 2",
                  )
                })
              })
            })
          })
        })
      })
    })

    describe(">> table(table, t1).setFields({field1: 1, field2: 'value2'})", () => {
      beforeEach(() => {
        inst.table("table", "t1").setFields({ field1: 1, field2: "value2" })
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "UPDATE table `t1` SET field1 = 1, field2 = 'value2'",
        )
      })

      describe(">> set(field1, 1.2)", () => {
        beforeEach(() => {
          inst.set("field1", 1.2)
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field1 = 1.2, field2 = 'value2'",
          )
        })
      })

      describe(">> setFields({field3: true, field4: 'value4'})", () => {
        beforeEach(() => {
          inst.setFields({ field3: true, field4: "value4" })
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field1 = 1, field2 = 'value2', field3 = TRUE, field4 = 'value4'",
          )
        })
      })

      describe(">> setFields({field1: true, field3: 'value3'})", () => {
        beforeEach(() => {
          inst.setFields({ field1: true, field3: "value3" })
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "UPDATE table `t1` SET field1 = TRUE, field2 = 'value2', field3 = 'value3'",
          )
        })
      })
    })

    describe('>> table(table, t1).set("count = count + 1")', () => {
      beforeEach(() => {
        inst.table("table", "t1").set("count = count + 1")
      })

      it("toString", () => {
        expect(inst.toString()).toBe("UPDATE table `t1` SET count = count + 1")
      })
    })
  })

  describe("str()", () => {
    beforeEach(() => {
      inst
        .table("students")
        .set("field", squel.str("GETDATE(?, ?)", 2014, '"feb"'))
    })

    it("toString", () => {
      expect(inst.toString()).toBe(
        "UPDATE students SET field = (GETDATE(2014, '\"feb\"'))",
      )
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "UPDATE students SET field = (GETDATE(?, ?))",
        values: [2014, '"feb"'],
      })
    })
  })

  describe("string formatting", () => {
    beforeEach(() => {
      inst.updateOptions({ stringFormatter: (str: string) => `N'${str}'` })
      inst.table("students").set("field", "jack")
    })

    it("toString", () => {
      expect(inst.toString()).toBe("UPDATE students SET field = N'jack'")
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "UPDATE students SET field = ?",
        values: ["jack"],
      })
    })
  })

  it("fix for hiddentao/squel#63", () => {
    const newinst = inst.table("students").set("field = field + 1")
    newinst.set("field2", 2).set("field3", true)
    expect(inst.toParam()).toEqual({
      text: "UPDATE students SET field = field + 1, field2 = ?, field3 = ?",
      values: [2, true],
    })
  })

  describe("dontQuote and replaceSingleQuotes set(field2, \"ISNULL('str', str)\", { dontQuote: true })", () => {
    beforeEach(() => {
      inst = squel.update({ replaceSingleQuotes: true })
      inst.table("table", "t1").set("field", 1)
      inst.set("field2", "ISNULL('str', str)", { dontQuote: true })
    })

    it("toString", () => {
      expect(inst.toString()).toBe(
        "UPDATE table `t1` SET field = 1, field2 = ISNULL('str', str)",
      )
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "UPDATE table `t1` SET field = ?, field2 = ?",
        values: [1, "ISNULL('str', str)"],
      })
    })
  })

  describe("fix for #223 - careful about array looping methods", () => {
    beforeEach(() => {
      ;(Array.prototype as any).substr = () => 1
    })

    afterEach(() => {
      delete (Array.prototype as any).substr
    })

    it("check", () => {
      inst = squel
        .update()
        .table("users")
        .where("id = ?", 123)
        .set("active", 1)
        .set("regular", 0)
        .set("moderator", 1)

      expect(inst.toParam()).toEqual({
        text: "UPDATE users SET active = ?, regular = ?, moderator = ? WHERE (id = ?)",
        values: [1, 0, 1, 123],
      })
    })
  })

  it("fix for #225 - autoquoting field names", () => {
    inst = squel
      .update({ autoQuoteFieldNames: true })
      .table("users")
      .where("id = ?", 123)
      .set("active", 1)
      .set("regular", 0)
      .set("moderator", 1)

    expect(inst.toParam()).toEqual({
      text: "UPDATE users SET `active` = ?, `regular` = ?, `moderator` = ? WHERE (id = ?)",
      values: [1, 0, 1, 123],
    })
  })

  describe("fix for #243 - ampersand in conditions", () => {
    beforeEach(() => {
      inst = squel.update().table("a").set("a = a & ?", 2)
    })

    it("toString", () => {
      expect(inst.toString()).toBe("UPDATE a SET a = a & 2")
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "UPDATE a SET a = a & ?",
        values: [2],
      })
    })
  })

  it("cloning", () => {
    const newinst = inst.table("students").set("field", 1).clone()
    newinst.set("field", 2).set("field2", true)
    expect(inst.toString()).toBe("UPDATE students SET field = 1")
    expect(newinst.toString()).toBe(
      "UPDATE students SET field = 2, field2 = TRUE",
    )
  })
})
