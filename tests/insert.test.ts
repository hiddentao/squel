import { beforeEach, describe, expect, it } from "bun:test"
import squel from "../src/index"
import { pick } from "./testbase"

describe("INSERT builder", () => {
  let func: any
  let inst: any

  beforeEach(() => {
    func = squel.insert
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
    it("need to call into() first", () => {
      expect(() => inst.toString()).toThrow("into() needs to be called")
    })

    it("when set() not called", () => {
      expect(inst.into("table").toString()).toBe("INSERT INTO table")
    })

    describe(">> into(table).set(field, null)", () => {
      beforeEach(() => {
        inst.into("table").set("field", null)
      })

      it("toString", () => {
        expect(inst.toString()).toBe("INSERT INTO table (field) VALUES (NULL)")
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "INSERT INTO table (field) VALUES (?)",
          values: [null],
        })
      })
    })

    describe(">> into(table)", () => {
      beforeEach(() => {
        inst.into("table")
      })

      describe(">> set(field, 1)", () => {
        beforeEach(() => {
          inst.set("field", 1)
        })

        it("toString", () => {
          expect(inst.toString()).toBe("INSERT INTO table (field) VALUES (1)")
        })

        describe(">> set(field2, 1.2)", () => {
          beforeEach(() => {
            inst.set("field2", 1.2)
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2) VALUES (1, 1.2)",
            )
          })
        })

        describe('>> set(field2, "str")', () => {
          beforeEach(() => {
            inst.set("field2", "str")
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2) VALUES (1, 'str')",
            )
          })

          it("toParam", () => {
            expect(inst.toParam()).toEqual({
              text: "INSERT INTO table (field, field2) VALUES (?, ?)",
              values: [1, "str"],
            })
          })
        })

        describe('>> set(field2, "str", { dontQuote: true } )', () => {
          beforeEach(() => {
            inst.set("field2", "str", { dontQuote: true })
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2) VALUES (1, str)",
            )
          })

          it("toParam", () => {
            expect(inst.toParam()).toEqual({
              text: "INSERT INTO table (field, field2) VALUES (?, ?)",
              values: [1, "str"],
            })
          })
        })

        describe(">> set(field2, true)", () => {
          beforeEach(() => {
            inst.set("field2", true)
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2) VALUES (1, TRUE)",
            )
          })
        })

        describe(">> set(field2, null)", () => {
          beforeEach(() => {
            inst.set("field2", null)
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2) VALUES (1, NULL)",
            )
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
              "INSERT INTO table (field) VALUES ((SELECT MAX(score) FROM scores))",
            )
          })

          it("toParam", () => {
            const parameterized = inst.toParam()
            expect(parameterized.text).toBe(
              "INSERT INTO table (field) VALUES ((SELECT MAX(score) FROM scores))",
            )
            expect(parameterized.values).toEqual([])
          })
        })

        describe(">> setFields({field2: 'value2', field3: true })", () => {
          beforeEach(() => {
            inst.setFields({ field2: "value2", field3: true })
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2, field3) VALUES (1, 'value2', TRUE)",
            )
          })

          it("toParam", () => {
            const parameterized = inst.toParam()
            expect(parameterized.text).toBe(
              "INSERT INTO table (field, field2, field3) VALUES (?, ?, ?)",
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
              "INSERT INTO table (field, field2) VALUES (TRUE, 'value2')",
            )
          })

          it("toParam", () => {
            const parameterized = inst.toParam()
            expect(parameterized.text).toBe(
              "INSERT INTO table (field, field2) VALUES (?, ?)",
            )
            expect(parameterized.values).toEqual([true, "value2"])
          })
        })

        describe(">> setFields(custom value type)", () => {
          beforeEach(() => {
            class MyClass {}
            inst.registerValueHandler(MyClass, () => "abcd")
            inst.setFields({ field: new MyClass() })
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field) VALUES ((abcd))",
            )
          })

          it("toParam", () => {
            const parameterized = inst.toParam()
            expect(parameterized.text).toBe(
              "INSERT INTO table (field) VALUES (?)",
            )
            expect(parameterized.values).toEqual(["abcd"])
          })
        })

        describe(">> setFieldsRows([{field: 'value2', field2: true },{field: 'value3', field2: 13 }]])", () => {
          beforeEach(() => {
            inst.setFieldsRows([
              { field: "value2", field2: true },
              { field: "value3", field2: 13 },
            ])
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "INSERT INTO table (field, field2) VALUES ('value2', TRUE), ('value3', 13)",
            )
          })

          it("toParam", () => {
            const parameterized = inst.toParam()
            expect(parameterized.text).toBe(
              "INSERT INTO table (field, field2) VALUES (?, ?), (?, ?)",
            )
            expect(parameterized.values).toEqual(["value2", true, "value3", 13])
          })
        })
      })

      describe("Function values", () => {
        beforeEach(() => {
          inst.set("field", squel.str("GETDATE(?, ?)", 2014, "feb"))
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "INSERT INTO table (field) VALUES ((GETDATE(2014, 'feb')))",
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: "INSERT INTO table (field) VALUES ((GETDATE(?, ?)))",
            values: [2014, "feb"],
          })
        })
      })

      describe(">> fromQuery([field1, field2], select query)", () => {
        beforeEach(() => {
          inst.fromQuery(
            ["field1", "field2"],
            squel.select().from("students").where("a = ?", 2),
          )
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "INSERT INTO table (field1, field2) (SELECT * FROM students WHERE (a = 2))",
          )
        })

        it("toParam", () => {
          const parameterized = inst.toParam()
          expect(parameterized.text).toBe(
            "INSERT INTO table (field1, field2) (SELECT * FROM students WHERE (a = ?))",
          )
          expect(parameterized.values).toEqual([2])
        })
      })

      it(">> setFieldsRows([{field1: 13, field2: 'value2'},{field1: true, field3: 'value4'}])", () => {
        expect(() =>
          inst
            .setFieldsRows([
              { field1: 13, field2: "value2" },
              { field1: true, field3: "value4" },
            ])
            .toString(),
        ).toThrow(
          "All fields in subsequent rows must match the fields in the first row",
        )
      })
    })
  })

  describe("dontQuote and replaceSingleQuotes set(field2, \"ISNULL('str', str)\", { dontQuote: true })", () => {
    beforeEach(() => {
      inst = squel.insert({ replaceSingleQuotes: true })
      inst.into("table").set("field", 1)
      inst.set("field2", "ISNULL('str', str)", { dontQuote: true })
    })

    it("toString", () => {
      expect(inst.toString()).toBe(
        "INSERT INTO table (field, field2) VALUES (1, ISNULL('str', str))",
      )
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "INSERT INTO table (field, field2) VALUES (?, ?)",
        values: [1, "ISNULL('str', str)"],
      })
    })
  })

  it("fix for #225 - autoquoting field names", () => {
    inst = squel
      .insert({ autoQuoteFieldNames: true })
      .into("users")
      .set("active", 1)
      .set("regular", 0)
      .set("moderator", 1)

    expect(inst.toParam()).toEqual({
      text: "INSERT INTO users (`active`, `regular`, `moderator`) VALUES (?, ?, ?)",
      values: [1, 0, 1],
    })
  })

  it("cloning", () => {
    const newinst = inst.into("students").set("field", 1).clone()
    newinst.set("field", 2).set("field2", true)
    expect(inst.toString()).toBe("INSERT INTO students (field) VALUES (1)")
    expect(newinst.toString()).toBe(
      "INSERT INTO students (field, field2) VALUES (2, TRUE)",
    )
  })
})
