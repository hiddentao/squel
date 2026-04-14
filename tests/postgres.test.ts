import { beforeEach, describe, expect, it } from "bun:test"
import squelDefault from "../src/index"

describe("Postgres flavour", () => {
  let squel: any

  beforeEach(() => {
    squel = squelDefault.useFlavour("postgres")
  })

  describe("INSERT builder", () => {
    let inst: any

    beforeEach(() => {
      inst = squel.insert()
    })

    describe('>> into(table).set(field, 1).set(field,2).onConflict("field", {field2:2})', () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field", 1)
          .set("field2", 2)
          .onConflict("field", { field2: 2 })
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field, field2) VALUES (1, 2) ON CONFLICT (field) DO UPDATE SET field2 = 2",
        )
      })
    })

    describe('>> into(table).set(field, 1).set(field,2).onConflict("field")', () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).set("field2", 2).onConflict("field")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field, field2) VALUES (1, 2) ON CONFLICT (field) DO NOTHING",
        )
      })
    })

    describe('>> into(table).set(field, 1).set(field,2).onConflict(["field", "field2"], {field3:3})', () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field", 1)
          .set("field2", 2)
          .onConflict(["field", "field2"], { field3: 3 })
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field, field2) VALUES (1, 2) ON CONFLICT (field, field2) DO UPDATE SET field3 = 3",
        )
      })
    })

    describe('>> into(table).set(field, 1).set(field,2).onConflict(["field", "field2"])', () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).set("field2", 2).onConflict("field")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field, field2) VALUES (1, 2) ON CONFLICT (field) DO NOTHING",
        )
      })
    })

    describe(">> into(table).set(field, 1).set(field,2).onConflict()", () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).set("field2", 2).onConflict()
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field, field2) VALUES (1, 2) ON CONFLICT DO NOTHING",
        )
      })
    })

    describe('>> into(table).set(field, 1).returning("*")', () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).returning("*")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) VALUES (1) RETURNING *",
        )
      })
    })

    describe('>> into(table).set(field, 1).returning("id")', () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).returning("id")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) VALUES (1) RETURNING id",
        )
      })
    })

    describe('>> into(table).set(field, 1).returning("id").returning("id")', () => {
      beforeEach(() => {
        inst.into("table").set("field", 1).returning("id").returning("id")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) VALUES (1) RETURNING id",
        )
      })
    })

    describe('>> into(table).set(field, 1).returning("id").returning("name", "alias")', () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field", 1)
          .returning("id")
          .returning("name", "alias")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) VALUES (1) RETURNING id, name AS alias",
        )
      })
    })

    describe('>> into(table).set(field, 1).returning(squel.str("id < ?", 100), "under100")', () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field", 1)
          .returning(squel.str("id < ?", 100), "under100")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) VALUES (1) RETURNING (id < 100) AS under100",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "INSERT INTO table (field) VALUES ($1) RETURNING (id < $2) AS under100",
          values: [1, 100],
        })
      })
    })

    describe(">> into(table).set(field, 1).with(alias, table)", () => {
      beforeEach(() => {
        inst
          .into("table")
          .set("field", 1)
          .with("alias", squel.select().from("table").where("field = ?", 2))
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "WITH alias AS (SELECT * FROM table WHERE (field = 2)) INSERT INTO table (field) VALUES (1)",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "WITH alias AS (SELECT * FROM table WHERE (field = $1)) INSERT INTO table (field) VALUES ($2)",
          values: [2, 1],
        })
      })
    })
  })

  describe("UPDATE builder", () => {
    let upd: any

    beforeEach(() => {
      upd = squel.update()
    })

    describe('>> table(table).set(field, 1).returning("*")', () => {
      beforeEach(() => {
        upd.table("table").set("field", 1).returning("*")
      })

      it("toString", () => {
        expect(upd.toString()).toBe("UPDATE table SET field = 1 RETURNING *")
      })
    })

    describe('>> table(table).set(field, 1).returning("field")', () => {
      beforeEach(() => {
        upd.table("table").set("field", 1).returning("field")
      })

      it("toString", () => {
        expect(upd.toString()).toBe(
          "UPDATE table SET field = 1 RETURNING field",
        )
      })
    })

    describe('>> table(table).set(field, 1).returning("name", "alias")', () => {
      beforeEach(() => {
        upd.table("table").set("field", 1).returning("name", "alias")
      })

      it("toString", () => {
        expect(upd.toString()).toBe(
          "UPDATE table SET field = 1 RETURNING name AS alias",
        )
      })
    })

    describe(">> table(table).set(field, 1).from(table2)", () => {
      beforeEach(() => {
        upd.table("table").set("field", 1).from("table2")
      })

      it("toString", () => {
        expect(upd.toString()).toBe("UPDATE table SET field = 1 FROM table2")
      })
    })

    describe(">> table(table).set(field, 1).with(alias, table)", () => {
      beforeEach(() => {
        upd
          .table("table")
          .set("field", 1)
          .with("alias", squel.select().from("table").where("field = ?", 2))
      })

      it("toString", () => {
        expect(upd.toString()).toBe(
          "WITH alias AS (SELECT * FROM table WHERE (field = 2)) UPDATE table SET field = 1",
        )
      })

      it("toParam", () => {
        expect(upd.toParam()).toEqual({
          text: "WITH alias AS (SELECT * FROM table WHERE (field = $1)) UPDATE table SET field = $2",
          values: [2, 1],
        })
      })
    })
  })

  describe("DELETE builder", () => {
    let del: any

    beforeEach(() => {
      del = squel.delete()
    })

    describe('>> from(table).where(field = 1).returning("*")', () => {
      beforeEach(() => {
        del.from("table").where("field = 1").returning("*")
      })

      it("toString", () => {
        expect(del.toString()).toBe(
          "DELETE FROM table WHERE (field = 1) RETURNING *",
        )
      })
    })

    describe('>> from(table).where(field = 1).returning("field")', () => {
      beforeEach(() => {
        del.from("table").where("field = 1").returning("field")
      })

      it("toString", () => {
        expect(del.toString()).toBe(
          "DELETE FROM table WHERE (field = 1) RETURNING field",
        )
      })
    })

    describe('>> from(table).where(field = 1).returning("field", "f")', () => {
      beforeEach(() => {
        del.from("table").where("field = 1").returning("field", "f")
      })

      it("toString", () => {
        expect(del.toString()).toBe(
          "DELETE FROM table WHERE (field = 1) RETURNING field AS f",
        )
      })
    })

    describe(">> from(table).where(field = 1).with(alias, table)", () => {
      beforeEach(() => {
        del
          .from("table")
          .where("field = ?", 1)
          .with("alias", squel.select().from("table").where("field = ?", 2))
      })

      it("toString", () => {
        expect(del.toString()).toBe(
          "WITH alias AS (SELECT * FROM table WHERE (field = 2)) DELETE FROM table WHERE (field = 1)",
        )
      })

      it("toParam", () => {
        expect(del.toParam()).toEqual({
          text: "WITH alias AS (SELECT * FROM table WHERE (field = $1)) DELETE FROM table WHERE (field = $2)",
          values: [2, 1],
        })
      })
    })
  })

  describe("SELECT builder", () => {
    let sel: any

    beforeEach(() => {
      sel = squel.select()
    })

    describe("select", () => {
      describe(">> from(table).where(field = 1)", () => {
        beforeEach(() => {
          sel.field("field1").from("table1").where("field1 = 1")
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT field1 FROM table1 WHERE (field1 = 1)",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT field1 FROM table1 WHERE (field1 = 1)",
            values: [],
          })
        })
      })

      describe(">> from(table).where(field = ?, 2)", () => {
        beforeEach(() => {
          sel.field("field1").from("table1").where("field1 = ?", 2)
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT field1 FROM table1 WHERE (field1 = 2)",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT field1 FROM table1 WHERE (field1 = $1)",
            values: [2],
          })
        })
      })
    })

    describe("distinct queries", () => {
      beforeEach(() => {
        sel.fields(["field1", "field2"]).from("table1")
      })

      describe(">> from(table).distinct()", () => {
        beforeEach(() => {
          sel.distinct()
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT DISTINCT field1, field2 FROM table1",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT DISTINCT field1, field2 FROM table1",
            values: [],
          })
        })
      })

      describe(">> from(table).distinct(field1)", () => {
        beforeEach(() => {
          sel.distinct("field1")
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT DISTINCT ON (field1) field1, field2 FROM table1",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT DISTINCT ON (field1) field1, field2 FROM table1",
            values: [],
          })
        })
      })

      describe(">> from(table).distinct(field1, field2)", () => {
        beforeEach(() => {
          sel.distinct("field1", "field2")
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT DISTINCT ON (field1, field2) field1, field2 FROM table1",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT DISTINCT ON (field1, field2) field1, field2 FROM table1",
            values: [],
          })
        })
      })
    })

    describe("cte queries", () => {
      let sel2: any
      let sel3: any

      beforeEach(() => {
        sel = squel.select()
        sel2 = squel.select()
        sel3 = squel.select()
      })

      describe(">> query1.with(alias, query2)", () => {
        beforeEach(() => {
          sel.from("table1").where("field1 = ?", 1)
          sel2.from("table2").where("field2 = ?", 2)
          sel.with("someAlias", sel2)
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = 2)) SELECT * FROM table1 WHERE (field1 = 1)",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = $1)) SELECT * FROM table1 WHERE (field1 = $2)",
            values: [2, 1],
          })
        })
      })

      describe(">> query1.with(alias1, query2).with(alias2, query2)", () => {
        beforeEach(() => {
          sel.from("table1").where("field1 = ?", 1)
          sel2.from("table2").where("field2 = ?", 2)
          sel3.from("table3").where("field3 = ?", 3)
          sel.with("someAlias", sel2).with("anotherAlias", sel3)
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = 2)), anotherAlias AS (SELECT * FROM table3 WHERE (field3 = 3)) SELECT * FROM table1 WHERE (field1 = 1)",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = $1)), anotherAlias AS (SELECT * FROM table3 WHERE (field3 = $2)) SELECT * FROM table1 WHERE (field1 = $3)",
            values: [2, 3, 1],
          })
        })
      })
    })

    describe("union queries", () => {
      let sel2: any

      beforeEach(() => {
        sel = squel.select()
        sel2 = squel.select()
      })

      describe(">> query1.union(query2)", () => {
        beforeEach(() => {
          sel.field("field1").from("table1").where("field1 = ?", 3)
          sel2.field("field1").from("table1").where("field1 < ?", 10)
          sel.union(sel2)
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT field1 FROM table1 WHERE (field1 = 3) UNION (SELECT field1 FROM table1 WHERE (field1 < 10))",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT field1 FROM table1 WHERE (field1 = $1) UNION (SELECT field1 FROM table1 WHERE (field1 < $2))",
            values: [3, 10],
          })
        })
      })

      describe(">> query1.union_all(query2)", () => {
        beforeEach(() => {
          sel.field("field1").from("table1").where("field1 = ?", 3)
          sel2.field("field1").from("table1").where("field1 < ?", 10)
          sel.union_all(sel2)
        })

        it("toString", () => {
          expect(sel.toString()).toBe(
            "SELECT field1 FROM table1 WHERE (field1 = 3) UNION ALL (SELECT field1 FROM table1 WHERE (field1 < 10))",
          )
        })

        it("toParam", () => {
          expect(sel.toParam()).toEqual({
            text: "SELECT field1 FROM table1 WHERE (field1 = $1) UNION ALL (SELECT field1 FROM table1 WHERE (field1 < $2))",
            values: [3, 10],
          })
        })
      })
    })
  })

  it("Default query builder options", () => {
    expect(squel.cls.DefaultQueryBuilderOptions).toEqual({
      replaceSingleQuotes: false,
      singleQuoteReplacement: "''",
      autoQuoteTableNames: false,
      autoQuoteFieldNames: false,
      autoQuoteAliasNames: false,
      useAsForTableAliasNames: true,
      nameQuoteCharacter: "`",
      tableAliasQuoteCharacter: "`",
      fieldAliasQuoteCharacter: '"',
      valueHandlers: [],
      parameterCharacter: "?",
      numberedParameters: true,
      numberedParametersPrefix: "$",
      numberedParametersStartAt: 1,
      separator: " ",
      stringFormatter: null,
      rawNesting: false,
    })
  })
})
