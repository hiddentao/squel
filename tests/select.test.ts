import { beforeEach, describe, expect, it } from "bun:test"
import squel from "../src/index"
import { pick } from "./testbase"

describe("SELECT builder", () => {
  let func: any
  let inst: any

  beforeEach(() => {
    func = squel.select
    inst = func()
  })

  it("instanceof QueryBuilder", () => {
    expect(inst).toBeInstanceOf(squel.cls.QueryBuilder)
  })

  describe("constructor", () => {
    it("override options", () => {
      inst = squel.select({ usingValuePlaceholders: true, dummy: true } as any)
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
    it("no need to call from() first", () => {
      inst.toString()
    })

    describe(">> function(1)", () => {
      beforeEach(() => {
        inst.function("1")
      })

      it("toString", () => {
        expect(inst.toString()).toBe("SELECT 1")
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({ text: "SELECT 1", values: [] })
      })
    })

    describe(">> function(MAX(?,?), 3, 5)", () => {
      beforeEach(() => {
        inst.function("MAX(?, ?)", 3, 5)
      })

      it("toString", () => {
        expect(inst.toString()).toBe("SELECT MAX(3, 5)")
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "SELECT MAX(?, ?)",
          values: [3, 5],
        })
      })
    })

    describe(">> from(table).from(table2, alias2)", () => {
      beforeEach(() => {
        inst.from("table").from("table2", "alias2")
      })

      it("toString", () => {
        expect(inst.toString()).toBe("SELECT * FROM table, table2 `alias2`")
      })

      describe('>> field(squel.select().field("MAX(score)").FROM("scores"), fa1)', () => {
        beforeEach(() => {
          inst.field(squel.select().field("MAX(score)").from("scores"), "fa1")
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            'SELECT (SELECT MAX(score) FROM scores) AS "fa1" FROM table, table2 `alias2`',
          )
        })
      })

      describe(">> field(squel.case().when(score > ?, 1).then(1), fa1)", () => {
        beforeEach(() => {
          inst.field(squel.case().when("score > ?", 1).then(1), "fa1")
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            'SELECT CASE WHEN (score > 1) THEN 1 ELSE NULL END AS "fa1" FROM table, table2 `alias2`',
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: 'SELECT CASE WHEN (score > ?) THEN 1 ELSE NULL END AS "fa1" FROM table, table2 `alias2`',
            values: [1],
          })
        })
      })

      describe(">> field( squel.str(SUM(?), squel.case().when(score > ?, 1).then(1) ), fa1)", () => {
        beforeEach(() => {
          inst.field(
            squel.str("SUM(?)", squel.case().when("score > ?", 1).then(1)),
            "fa1",
          )
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            'SELECT (SUM((CASE WHEN (score > 1) THEN 1 ELSE NULL END))) AS "fa1" FROM table, table2 `alias2`',
          )
        })

        it("toParam", () => {
          expect(inst.toParam()).toEqual({
            text: 'SELECT (SUM(CASE WHEN (score > ?) THEN 1 ELSE NULL END)) AS "fa1" FROM table, table2 `alias2`',
            values: [1],
          })
        })
      })

      describe(">> field(field1, fa1) >> field(field2)", () => {
        beforeEach(() => {
          inst.field("field1", "fa1").field("field2")
        })

        it("toString", () => {
          expect(inst.toString()).toBe(
            'SELECT field1 AS "fa1", field2 FROM table, table2 `alias2`',
          )
        })

        describe(">> distinct()", () => {
          beforeEach(() => {
            inst.distinct()
          })

          it("toString", () => {
            expect(inst.toString()).toBe(
              'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2`',
            )
          })

          describe(">> group(field) >> group(field2)", () => {
            beforeEach(() => {
              inst.group("field").group("field2")
            })

            it("toString", () => {
              expect(inst.toString()).toBe(
                'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2',
              )
            })

            describe('>> where(a = ?, squel.select().field("MAX(score)").from("scores"))', () => {
              let subQuery: any

              beforeEach(() => {
                subQuery = squel.select().field("MAX(score)").from("scores")
                inst.where("a = ?", subQuery)
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT MAX(score) FROM scores)) GROUP BY field, field2',
                )
              })

              it("toParam", () => {
                expect(inst.toParam()).toEqual({
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT MAX(score) FROM scores)) GROUP BY field, field2',
                  values: [],
                })
              })
            })

            describe(">> where(squel.expr().and(a = ?, 1).and( expr().or(b = ?, 2).or(c = ?, 3) ))", () => {
              beforeEach(() => {
                inst.where(
                  squel
                    .expr()
                    .and("a = ?", 1)
                    .and(squel.expr().or("b = ?", 2).or("c = ?", 3)),
                )
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1 AND (b = 2 OR c = 3)) GROUP BY field, field2',
                )
              })

              it("toParam", () => {
                expect(inst.toParam()).toEqual({
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ? AND (b = ? OR c = ?)) GROUP BY field, field2',
                  values: [1, 2, 3],
                })
              })
            })

            describe(">> where(squel.expr().and(a = ?, QueryBuilder).and( expr().or(b = ?, 2).or(c = ?, 3) ))", () => {
              beforeEach(() => {
                const subQuery = squel
                  .select()
                  .field("field1")
                  .from("table1")
                  .where("field2 = ?", 10)
                inst.where(
                  squel
                    .expr()
                    .and("a = ?", subQuery)
                    .and(squel.expr().or("b = ?", 2).or("c = ?", 3)),
                )
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT field1 FROM table1 WHERE (field2 = 10)) AND (b = 2 OR c = 3)) GROUP BY field, field2',
                )
              })

              it("toParam", () => {
                expect(inst.toParam()).toEqual({
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT field1 FROM table1 WHERE (field2 = ?)) AND (b = ? OR c = ?)) GROUP BY field, field2',
                  values: [10, 2, 3],
                })
              })
            })

            describe(">> having(squel.expr().and(a = ?, QueryBuilder).and( expr().or(b = ?, 2).or(c = ?, 3) ))", () => {
              beforeEach(() => {
                const subQuery = squel
                  .select()
                  .field("field1")
                  .from("table1")
                  .having("field2 = ?", 10)
                inst.having(
                  squel
                    .expr()
                    .and("a = ?", subQuery)
                    .and(squel.expr().or("b = ?", 2).or("c = ?", 3)),
                )
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2 HAVING (a = (SELECT field1 FROM table1 HAVING (field2 = 10)) AND (b = 2 OR c = 3))',
                )
              })

              it("toParam", () => {
                expect(inst.toParam()).toEqual({
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2 HAVING (a = (SELECT field1 FROM table1 HAVING (field2 = ?)) AND (b = ? OR c = ?))',
                  values: [10, 2, 3],
                })
              })
            })

            describe(">> where(a = ?, null)", () => {
              beforeEach(() => {
                inst.where("a = ?", null)
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = NULL) GROUP BY field, field2',
                )
              })

              it("toParam", () => {
                expect(inst.toParam()).toEqual({
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ?) GROUP BY field, field2',
                  values: [null],
                })
              })
            })

            describe(">> where(a = ?, 1)", () => {
              beforeEach(() => {
                inst.where("a = ?", 1)
              })

              it("toString", () => {
                expect(inst.toString()).toBe(
                  'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1) GROUP BY field, field2',
                )
              })

              it("toParam", () => {
                expect(inst.toParam()).toEqual({
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ?) GROUP BY field, field2',
                  values: [1],
                })
              })

              describe(">> join(other_table)", () => {
                beforeEach(() => {
                  inst.join("other_table")
                })

                it("toString", () => {
                  expect(inst.toString()).toBe(
                    'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2',
                  )
                })

                describe(">> order(a)", () => {
                  beforeEach(() => {
                    inst.order("a")
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC',
                    )
                  })
                })

                describe(">> order(a, null)", () => {
                  beforeEach(() => {
                    inst.order("a", null)
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a',
                    )
                  })
                })

                describe(">> order(a, 'asc nulls last')", () => {
                  beforeEach(() => {
                    inst.order("a", "asc nulls last" as any)
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a asc nulls last',
                    )
                  })
                })

                describe(">> order(a, true)", () => {
                  beforeEach(() => {
                    inst.order("a", true)
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC',
                    )
                  })

                  describe(">> limit(2)", () => {
                    beforeEach(() => {
                      inst.limit(2)
                    })

                    it("toString", () => {
                      expect(inst.toString()).toBe(
                        'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2',
                      )
                    })

                    it("toParam", () => {
                      expect(inst.toParam()).toEqual({
                        text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ?',
                        values: [1, 2],
                      })
                    })

                    describe(">> limit(0)", () => {
                      beforeEach(() => {
                        inst.limit(0)
                      })

                      it("toString", () => {
                        expect(inst.toString()).toBe(
                          'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 0',
                        )
                      })

                      it("toParam", () => {
                        expect(inst.toParam()).toEqual({
                          text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ?',
                          values: [1, 0],
                        })
                      })
                    })

                    describe(">> offset(3)", () => {
                      beforeEach(() => {
                        inst.offset(3)
                      })

                      it("toString", () => {
                        expect(inst.toString()).toBe(
                          'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2 OFFSET 3',
                        )
                      })

                      it("toParam", () => {
                        expect(inst.toParam()).toEqual({
                          text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ? OFFSET ?',
                          values: [1, 2, 3],
                        })
                      })

                      describe(">> offset(0)", () => {
                        beforeEach(() => {
                          inst.offset(0)
                        })

                        it("toString", () => {
                          expect(inst.toString()).toBe(
                            'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2 OFFSET 0',
                          )
                        })

                        it("toParam", () => {
                          expect(inst.toParam()).toEqual({
                            text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY a ASC LIMIT ? OFFSET ?',
                            values: [1, 2, 0],
                          })
                        })
                      })
                    })
                  })
                })

                describe(">> order(DIST(?,?), true, 2, 3)", () => {
                  beforeEach(() => {
                    inst.order("DIST(?, ?)", true, 2, false)
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY DIST(2, FALSE) ASC',
                    )
                  })

                  it("toParam", () => {
                    expect(inst.toParam()).toEqual({
                      text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY DIST(?, ?) ASC',
                      values: [1, 2, false],
                    })
                  })
                })

                describe(">> order(a) dup", () => {
                  beforeEach(() => {
                    inst.order("a")
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC',
                    )
                  })
                })

                describe(">> order(b, null)", () => {
                  beforeEach(() => {
                    inst.order("b", null)
                  })

                  it("toString", () => {
                    expect(inst.toString()).toBe(
                      'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY b',
                    )
                  })
                })
              })

              describe(">> join(other_table, condition = expr())", () => {
                beforeEach(() => {
                  const subQuery = squel
                    .select()
                    .field("abc")
                    .from("table1")
                    .where("adf = ?", "today1")
                  const subQuery2 = squel
                    .select()
                    .field("xyz")
                    .from("table2")
                    .where("adf = ?", "today2")
                  const expr = squel.expr().and("field1 = ?", subQuery)
                  inst.join("other_table", null, expr)
                  inst.where("def IN ?", subQuery2)
                })

                it("toString", () => {
                  expect(inst.toString()).toBe(
                    "SELECT DISTINCT field1 AS \"fa1\", field2 FROM table, table2 `alias2` INNER JOIN other_table ON (field1 = (SELECT abc FROM table1 WHERE (adf = 'today1'))) WHERE (a = 1) AND (def IN (SELECT xyz FROM table2 WHERE (adf = 'today2'))) GROUP BY field, field2",
                  )
                })

                it("toParam", () => {
                  expect(inst.toParam()).toEqual({
                    text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table ON (field1 = (SELECT abc FROM table1 WHERE (adf = ?))) WHERE (a = ?) AND (def IN (SELECT xyz FROM table2 WHERE (adf = ?))) GROUP BY field, field2',
                    values: ["today1", 1, "today2"],
                  })
                })
              })
            })
          })
        })
      })
    })

    describe("nested queries", () => {
      it("basic", () => {
        const inner1 = squel.select().from("students")
        const inner2 = squel.select().from("scores")
        inst.from(inner1).from(inner2, "scores")
        expect(inst.toString()).toBe(
          "SELECT * FROM (SELECT * FROM students), (SELECT * FROM scores) `scores`",
        )
      })

      it("deep nesting", () => {
        const inner1 = squel.select().from("students")
        const inner2 = squel.select().from(inner1)
        inst.from(inner2)
        expect(inst.toString()).toBe(
          "SELECT * FROM (SELECT * FROM (SELECT * FROM students))",
        )
      })

      it("nesting in JOINs", () => {
        const inner1 = squel.select().from("students")
        const inner2 = squel.select().from(inner1)
        inst.from("schools").join(inner2, "meh", "meh.ID = ID")
        expect(inst.toString()).toBe(
          "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students)) `meh` ON (meh.ID = ID)",
        )
      })

      it("nesting in JOINs with params", () => {
        const inner1 = squel.select().from("students").where("age = ?", 6)
        const inner2 = squel.select().from(inner1)
        inst
          .from("schools")
          .where("school_type = ?", "junior")
          .join(inner2, "meh", "meh.ID = ID")
        expect(inst.toString()).toBe(
          "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = 6))) `meh` ON (meh.ID = ID) WHERE (school_type = 'junior')",
        )
        expect(inst.toParam()).toEqual({
          text: "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = ?))) `meh` ON (meh.ID = ID) WHERE (school_type = ?)",
          values: [6, "junior"],
        })
        expect(inst.toParam({ numberedParameters: true })).toEqual({
          text: "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = $1))) `meh` ON (meh.ID = ID) WHERE (school_type = $2)",
          values: [6, "junior"],
        })
      })
    })
  })

  describe("Complex table name, e.g. LATERAL (#230)", () => {
    beforeEach(() => {
      inst = squel
        .select()
        .from("foo")
        .from(
          squel.str(
            "LATERAL(?)",
            squel.select().from("bar").where("bar.id = ?", 2),
          ),
          "ss",
        )
    })

    it("toString", () => {
      expect(inst.toString()).toBe(
        "SELECT * FROM foo, (LATERAL((SELECT * FROM bar WHERE (bar.id = 2)))) `ss`",
      )
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "SELECT * FROM foo, (LATERAL((SELECT * FROM bar WHERE (bar.id = ?)))) `ss`",
        values: [2],
      })
    })
  })

  describe("cloning", () => {
    it("basic", () => {
      const newinst = inst.from("students").limit(10).clone()
      newinst.limit(20)
      expect(inst.toString()).toBe("SELECT * FROM students LIMIT 10")
      expect(newinst.toString()).toBe("SELECT * FROM students LIMIT 20")
    })

    it("with expressions (ticket #120)", () => {
      const expr = squel.expr().and("a = 1")
      const newinst = inst
        .from("table")
        .left_join("table_2", "t", expr)
        .clone()
        .where("c = 1")
      expr.and("b = 2")
      expect(inst.toString()).toBe(
        "SELECT * FROM table LEFT JOIN table_2 `t` ON (a = 1 AND b = 2)",
      )
      expect(newinst.toString()).toBe(
        "SELECT * FROM table LEFT JOIN table_2 `t` ON (a = 1) WHERE (c = 1)",
      )
    })

    it("with sub-queries (ticket #120)", () => {
      const newinst = inst
        .from(squel.select().from("students"))
        .limit(30)
        .clone()
        .where("c = 1")
        .limit(35)
      expect(inst.toString()).toBe(
        "SELECT * FROM (SELECT * FROM students) LIMIT 30",
      )
      expect(newinst.toString()).toBe(
        "SELECT * FROM (SELECT * FROM students) WHERE (c = 1) LIMIT 35",
      )
    })

    it("with complex expressions", () => {
      const expr = squel
        .expr()
        .and(
          squel.expr().or("b = 2").or(squel.expr().and("c = 3").and("d = 4")),
        )
        .and("a = 1")
      const newinst = inst
        .from("table")
        .left_join("table_2", "t", expr)
        .clone()
        .where("c = 1")
      expr.and("e = 5")
      expect(inst.toString()).toBe(
        "SELECT * FROM table LEFT JOIN table_2 `t` ON ((b = 2 OR (c = 3 AND d = 4)) AND a = 1 AND e = 5)",
      )
      expect(newinst.toString()).toBe(
        "SELECT * FROM table LEFT JOIN table_2 `t` ON ((b = 2 OR (c = 3 AND d = 4)) AND a = 1) WHERE (c = 1)",
      )
    })
  })

  it("can specify block separator", () => {
    expect(
      squel.select({ separator: "\n" }).field("thing").from("table").toString(),
    ).toBe("SELECT\nthing\nFROM table")
  })

  describe("#242 - auto-quote table names", () => {
    beforeEach(() => {
      inst = squel
        .select({ autoQuoteTableNames: true })
        .field("name")
        .where("age > ?", 15)
    })

    describe("using string", () => {
      beforeEach(() => {
        inst.from("students", "s")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "SELECT name FROM `students` `s` WHERE (age > 15)",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "SELECT name FROM `students` `s` WHERE (age > ?)",
          values: [15],
        })
      })
    })

    describe("using query builder", () => {
      beforeEach(() => {
        inst.from(squel.select().from("students"), "s")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "SELECT name FROM (SELECT * FROM students) `s` WHERE (age > 15)",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "SELECT name FROM (SELECT * FROM students) `s` WHERE (age > ?)",
          values: [15],
        })
      })
    })
  })

  describe("UNION JOINs", () => {
    describe("Two Queries NO Params", () => {
      let qry1: any
      let qry2: any

      beforeEach(() => {
        qry1 = squel.select().field("name").from("students").where("age > 15")
        qry2 = squel.select().field("name").from("students").where("age < 6")
        qry1.union(qry2)
      })

      it("toString", () => {
        expect(qry1.toString()).toBe(
          "SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))",
        )
      })

      it("toParam", () => {
        expect(qry1.toParam()).toEqual({
          text: "SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))",
          values: [],
        })
      })
    })

    describe("Two Queries with Params", () => {
      let qry1: any
      let qry2: any

      beforeEach(() => {
        qry1 = squel
          .select()
          .field("name")
          .from("students")
          .where("age > ?", 15)
        qry2 = squel.select().field("name").from("students").where("age < ?", 6)
        qry1.union(qry2)
      })

      it("toString", () => {
        expect(qry1.toString()).toBe(
          "SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))",
        )
      })

      it("toParam", () => {
        expect(qry1.toParam()).toEqual({
          text: "SELECT name FROM students WHERE (age > ?) UNION (SELECT name FROM students WHERE (age < ?))",
          values: [15, 6],
        })
      })
    })

    describe("Three Queries", () => {
      let qry1: any
      let qry2: any
      let qry3: any

      beforeEach(() => {
        qry1 = squel
          .select()
          .field("name")
          .from("students")
          .where("age > ?", 15)
        qry2 = squel.select().field("name").from("students").where("age < 6")
        qry3 = squel.select().field("name").from("students").where("age = ?", 8)
        qry1.union(qry2)
        qry1.union(qry3)
      })

      it("toParam", () => {
        expect(qry1.toParam()).toEqual({
          text: "SELECT name FROM students WHERE (age > ?) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = ?))",
          values: [15, 8],
        })
      })

      it("toParam(2)", () => {
        expect(
          qry1.toParam({
            numberedParameters: true,
            numberedParametersStartAt: 2,
          }),
        ).toEqual({
          text: "SELECT name FROM students WHERE (age > $2) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = $3))",
          values: [15, 8],
        })
      })
    })

    describe("Multi-Parameter Query", () => {
      let qry1: any
      let qry2: any
      let qry3: any
      let qry4: any

      beforeEach(() => {
        qry1 = squel
          .select()
          .field("name")
          .from("students")
          .where("age > ?", 15)
        qry2 = squel.select().field("name").from("students").where("age < ?", 6)
        qry3 = squel.select().field("name").from("students").where("age = ?", 8)
        qry4 = squel
          .select()
          .field("name")
          .from("students")
          .where("age IN [?, ?]", 2, 10)
        qry1.union(qry2)
        qry1.union(qry3)
        qry4.union_all(qry1)
      })

      it("toString", () => {
        expect(qry4.toString()).toBe(
          "SELECT name FROM students WHERE (age IN [2, 10]) UNION ALL (SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = 8)))",
        )
      })

      it("toParam", () => {
        expect(qry4.toParam({ numberedParameters: true })).toEqual({
          text: "SELECT name FROM students WHERE (age IN [$1, $2]) UNION ALL (SELECT name FROM students WHERE (age > $3) UNION (SELECT name FROM students WHERE (age < $4)) UNION (SELECT name FROM students WHERE (age = $5)))",
          values: [2, 10, 15, 6, 8],
        })
      })
    })

    describe("Where builder expression", () => {
      beforeEach(() => {
        inst = squel
          .select()
          .from("table")
          .where("a = ?", 5)
          .where(
            squel.str(
              "EXISTS(?)",
              squel.select().from("blah").where("b > ?", 6),
            ),
          )
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "SELECT * FROM table WHERE (a = 5) AND (EXISTS((SELECT * FROM blah WHERE (b > 6))))",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "SELECT * FROM table WHERE (a = ?) AND (EXISTS((SELECT * FROM blah WHERE (b > ?))))",
          values: [5, 6],
        })
      })
    })

    describe("Join on builder expression", () => {
      beforeEach(() => {
        inst = squel
          .select()
          .from("table")
          .join(
            "table2",
            "t2",
            squel.str(
              "EXISTS(?)",
              squel.select().from("blah").where("b > ?", 6),
            ),
          )
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "SELECT * FROM table INNER JOIN table2 `t2` ON (EXISTS((SELECT * FROM blah WHERE (b > 6))))",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "SELECT * FROM table INNER JOIN table2 `t2` ON (EXISTS((SELECT * FROM blah WHERE (b > ?))))",
          values: [6],
        })
      })
    })

    describe("#301 - FROM rstr() with nesting", () => {
      beforeEach(() => {
        inst = squel
          .select()
          .from(squel.rstr("generate_series(?,?,?)", 1, 10, 2), "tblfn(odds)")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "SELECT * FROM generate_series(1,10,2) `tblfn(odds)`",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "SELECT * FROM generate_series(?,?,?) `tblfn(odds)`",
          values: [1, 10, 2],
        })
      })
    })
  })
})
