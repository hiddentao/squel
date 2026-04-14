import { beforeEach, describe, expect, it } from "bun:test"
import squel from "../src/index"
import { pick } from "./testbase"

describe("DELETE builder", () => {
  let func: any
  let inst: any

  beforeEach(() => {
    func = squel.delete
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
    it("no need to call from()", () => {
      inst.toString()
    })

    describe(">> from(table)", () => {
      beforeEach(() => {
        inst.from("table")
      })

      it("toString", () => {
        expect(inst.toString()).toBe("DELETE FROM table")
      })

      describe(">> table(table2, t2)", () => {
        beforeEach(() => {
          inst.from("table2", "t2")
        })

        it("toString", () => {
          expect(inst.toString()).toBe("DELETE FROM table2 `t2`")
        })

        describe(">> where(a = 1)", () => {
          beforeEach(() => {
            inst.where("a = 1")
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              "DELETE FROM table2 `t2` WHERE (a = 1)",
            )
          })

          describe(">> join(other_table)", () => {
            beforeEach(() => {
              inst.join("other_table", "o", "o.id = t2.id")
            })

            it("toString", () => {
              expect(inst.toString()).toBe(
                "DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1)",
              )
            })

            describe(">> order(a, true)", () => {
              beforeEach(() => {
                inst.order("a", true)
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  "DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1) ORDER BY a ASC",
                )
              })

              describe(">> limit(2)", () => {
                beforeEach(() => {
                  inst.limit(2)
                })

                it("toString", () => {
                  expect(inst.toString()).toBe(
                    "DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1) ORDER BY a ASC LIMIT 2",
                  )
                })
              })
            })
          })
        })
      })
    })

    describe('>> target(table1).from(table1).left_join(table2, null, "table1.a = table2.b")', () => {
      beforeEach(() => {
        inst
          .target("table1")
          .from("table1")
          .left_join("table2", null, "table1.a = table2.b")
          .where("c = ?", 3)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "DELETE table1 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = 3)",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "DELETE table1 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = ?)",
          values: [3],
        })
      })

      describe(">> target(table2)", () => {
        beforeEach(() => {
          inst.target("table2")
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            "DELETE table1, table2 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = 3)",
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: "DELETE table1, table2 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = ?)",
            values: [3],
          })
        })
      })
    })

    describe('>> from(table1).left_join(table2, null, "table1.a = table2.b")', () => {
      beforeEach(() => {
        inst
          .from("table1")
          .left_join("table2", null, "table1.a = table2.b")
          .where("c = ?", 3)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "DELETE FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = 3)",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "DELETE FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = ?)",
          values: [3],
        })
      })
    })
  })

  it("cloning", () => {
    const newinst = inst.from("students").limit(10).clone()
    newinst.limit(20)
    expect(inst.toString()).toBe("DELETE FROM students LIMIT 10")
    expect(newinst.toString()).toBe("DELETE FROM students LIMIT 20")
  })
})
