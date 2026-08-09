import { beforeEach, describe, expect, it } from "bun:test"
import squelBase from "../src/index"

describe("MSSQL flavour", () => {
  let squel: any

  beforeEach(() => {
    squel = squelBase.useFlavour("mssql")
  })

  describe("DATE Conversion", () => {
    let inst: any

    beforeEach(() => {
      inst = squel.insert()
    })

    describe(">> into(table).set(field, new Date(2012-12-12T4:30:00Z))", () => {
      beforeEach(() => {
        inst.into("table").set("field", new Date("2012-12-12T04:30:00Z"))
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) VALUES (('2012-12-12 4:30:0'))",
        )
      })
    })
  })

  describe("SELECT builder", () => {
    let sel: any

    beforeEach(() => {
      sel = squel.select()
    })

    describe(">> from(table).field(field).top(10)", () => {
      beforeEach(() => {
        sel.from("table").field("field").top(10)
      })

      it("toString", () => {
        expect(sel.toString()).toBe("SELECT TOP (10) field FROM table")
      })
    })

    describe(">> from(table).field(field).limit(10)", () => {
      beforeEach(() => {
        sel.from("table").field("field").limit(10)
      })

      it("toString", () => {
        expect(sel.toString()).toBe("SELECT TOP (10) field FROM table")
      })
    })

    describe(">> from(table).field(field).limit(10).offset(5)", () => {
      beforeEach(() => {
        sel.from("table").field("field").limit(10).offset(5)
      })

      it("toString", () => {
        expect(sel.toString()).toBe(
          "SELECT field FROM table OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY",
        )
      })
    })

    describe(">> from(table).field(field).top(10).offset(5)", () => {
      beforeEach(() => {
        sel.from("table").field("field").top(10).offset(5)
      })

      it("toString", () => {
        expect(sel.toString()).toBe(
          "SELECT field FROM table OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY",
        )
      })
    })

    describe(">> from(table).field(field).offset(5)", () => {
      beforeEach(() => {
        sel.from("table").field("field").offset(5)
      })

      it("toString", () => {
        expect(sel.toString()).toBe("SELECT field FROM table OFFSET 5 ROWS")
      })
    })

    describe(">> from(table).field(field).offset(5).union(...)", () => {
      beforeEach(() => {
        sel
          .from("table")
          .field("field")
          .offset(5)
          .union(squel.select().from("table2").where("a = 2"))
      })

      it("toString", () => {
        expect(sel.toString()).toBe(
          "SELECT field FROM table OFFSET 5 ROWS UNION (SELECT * FROM table2 WHERE (a = 2))",
        )
      })
    })

    describe(">> check variables arent being shared", () => {
      it("toString", () => {
        expect(
          squel.select().from("table").field("field").top(10).toString(),
        ).toBe("SELECT TOP (10) field FROM table")
        expect(squel.select().from("table").field("field").toString()).toBe(
          "SELECT field FROM table",
        )
      })
    })

    describe(">> from(table).group(field).having(COUNT(*) > ?, 1)", () => {
      beforeEach(() => {
        sel.from("table").group("field").having("COUNT(*) > ?", 1)
      })

      it("toString", () => {
        expect(sel.toString()).toBe(
          "SELECT * FROM table GROUP BY field HAVING (COUNT(*) > 1)",
        )
      })
    })

    describe("APPLY (cross/outer apply)", () => {
      it("cross_apply with table name", () => {
        sel.from("table1").cross_apply("table2", "t2")
        expect(sel.toString()).toBe(
          "SELECT * FROM table1 CROSS APPLY table2 t2",
        )
      })

      it("outer_apply with table name", () => {
        sel.from("table1").outer_apply("table2", "t2")
        expect(sel.toString()).toBe(
          "SELECT * FROM table1 OUTER APPLY table2 t2",
        )
      })

      it("generic apply with uppercase type", () => {
        sel.from("table1").apply("table2", "t2", "CROSS")
        expect(sel.toString()).toBe(
          "SELECT * FROM table1 CROSS APPLY table2 t2",
        )
      })

      it("generic apply with lowercase/partial suffix type", () => {
        sel.from("table1").apply("table2", "t2", "outer apply")
        expect(sel.toString()).toBe(
          "SELECT * FROM table1 OUTER APPLY table2 t2",
        )
      })

      it("cross_apply with subquery and parameters", () => {
        const sub = squel
          .select()
          .from("bar")
          .where("bar.id = table1.id")
          .where("bar.status = ?", "active")
        sel.from("table1").cross_apply(sub, "s")
        expect(sel.toString()).toBe(
          "SELECT * FROM table1 CROSS APPLY (SELECT * FROM bar WHERE (bar.id = table1.id) AND (bar.status = 'active')) s",
        )
        expect(sel.toParam()).toEqual({
          text: "SELECT * FROM table1 CROSS APPLY (SELECT * FROM bar WHERE (bar.id = table1.id) AND (bar.status = ?)) s",
          values: ["active"],
        })
      })
    })
  })

  describe("INSERT builder", () => {
    let inst: any

    beforeEach(() => {
      inst = squel.insert()
    })

    describe(">> into(table).set(field, 1).output(id)", () => {
      beforeEach(() => {
        inst.into("table").output("id").set("field", 1)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) OUTPUT INSERTED.id VALUES (1)",
        )
      })
    })

    describe(">> into(table).set(field, 1).output(id, ident)", () => {
      beforeEach(() => {
        inst.into("table").output("id", "ident").set("field", 1)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) OUTPUT INSERTED.id AS ident VALUES (1)",
        )
      })
    })

    describe(">> into(table).set(field, 1).outputs({ id: 'ident', name: 'naming' })", () => {
      beforeEach(() => {
        inst
          .into("table")
          .outputs({ id: "ident", name: "naming" })
          .set("field", 1)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) OUTPUT INSERTED.id AS ident, INSERTED.name AS naming VALUES (1)",
        )
      })
    })

    describe(">> into(table).set(field, 1).output([id, name])", () => {
      beforeEach(() => {
        inst.into("table").output(["id", "name"]).set("field", 1)
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "INSERT INTO table (field) OUTPUT INSERTED.id, INSERTED.name VALUES (1)",
        )
      })
    })
  })

  describe("UPDATE builder", () => {
    let upt: any

    beforeEach(() => {
      upt = squel.update()
    })

    describe(">> table(table).set(field, 1).top(12)", () => {
      beforeEach(() => {
        upt.table("table").set("field", 1).top(12)
      })

      it("toString", () => {
        expect(upt.toString()).toBe("UPDATE TOP (12) table SET field = 1")
      })
    })

    describe(">> table(table).set(field, 1).limit(12)", () => {
      beforeEach(() => {
        upt.table("table").set("field", 1).limit(12)
      })

      it("toString", () => {
        expect(upt.toString()).toBe("UPDATE TOP (12) table SET field = 1")
      })
    })

    describe(">> table(table).set(field, 1).output(id)", () => {
      beforeEach(() => {
        upt.table("table").output("id").set("field", 1)
      })

      it("toString", () => {
        expect(upt.toString()).toBe(
          "UPDATE table SET field = 1 OUTPUT INSERTED.id",
        )
      })
    })

    describe(">> table(table).set(field, 1).outputs(id AS ident, name AS naming)", () => {
      beforeEach(() => {
        upt
          .table("table")
          .outputs({ id: "ident", name: "naming" })
          .set("field", 1)
      })

      it("toString", () => {
        expect(upt.toString()).toBe(
          "UPDATE table SET field = 1 OUTPUT INSERTED.id AS ident, INSERTED.name AS naming",
        )
      })
    })
  })

  describe("DELETE builder", () => {
    let upt: any

    beforeEach(() => {
      upt = squel.delete()
    })

    describe(">> from(table)", () => {
      beforeEach(() => {
        upt.from("table")
      })

      it("toString", () => {
        expect(upt.toString()).toBe("DELETE FROM table")
      })
    })

    describe(">> from(table).output(id)", () => {
      beforeEach(() => {
        upt.from("table").output("id")
      })

      it("toString", () => {
        expect(upt.toString()).toBe("DELETE FROM table OUTPUT DELETED.id")
      })
    })

    describe('>> from(table).outputs(id AS ident, name AS naming).where("a = 1")', () => {
      beforeEach(() => {
        upt
          .from("table")
          .outputs({ id: "ident", name: "naming" })
          .where("a = 1")
      })

      it("toString", () => {
        expect(upt.toString()).toBe(
          "DELETE FROM table OUTPUT DELETED.id AS ident, DELETED.name AS naming WHERE (a = 1)",
        )
      })
    })
  })

  describe("MERGE builder", () => {
    let merge: any

    beforeEach(() => {
      merge = squel.merge()
    })

    describe(">> basic MERGE with UPDATE and INSERT using column references", () => {
      beforeEach(() => {
        merge
          .into("target_table", "t")
          .using("source_table", "s", "t.id = s.id")
          .whenMatched()
          .update({ "t.name": squel.str("s.name"), "t.val": 42 })
          .whenNotMatched()
          .insert({ name: squel.str("s.name"), val: 100 })
      })

      it("toString", () => {
        expect(merge.toString()).toBe(
          "MERGE INTO target_table AS t USING source_table AS s ON (t.id = s.id) WHEN MATCHED THEN UPDATE SET t.name = s.name, t.val = 42 WHEN NOT MATCHED THEN INSERT (name, val) VALUES (s.name, 100);",
        )
      })

      it("toParam", () => {
        const param = merge.toParam()
        expect(param.text).toBe(
          "MERGE INTO target_table AS t USING source_table AS s ON (t.id = s.id) WHEN MATCHED THEN UPDATE SET t.name = s.name, t.val = ? WHEN NOT MATCHED THEN INSERT (name, val) VALUES (s.name, ?);",
        )
        expect(param.values).toEqual([42, 100])
      })
    })

    describe(">> MERGE with source query, delete action and matched conditions", () => {
      beforeEach(() => {
        const sourceQuery = squel
          .select()
          .from("source_table")
          .where("active = ?", true)
        merge
          .into("target_table")
          .using(sourceQuery, "s", "target_table.id = s.id")
          .whenMatched("s.delete_flag = 1")
          .delete()
      })

      it("toString", () => {
        expect(merge.toString()).toBe(
          "MERGE INTO target_table USING (SELECT * FROM source_table WHERE (active = TRUE)) AS s ON (target_table.id = s.id) WHEN MATCHED AND s.delete_flag = 1 THEN DELETE;",
        )
      })

      it("toParam", () => {
        const param = merge.toParam()
        expect(param.text).toBe(
          "MERGE INTO target_table USING (SELECT * FROM source_table WHERE (active = ?)) AS s ON (target_table.id = s.id) WHEN MATCHED AND s.delete_flag = 1 THEN DELETE;",
        )
        expect(param.values).toEqual([true])
      })
    })

    describe(">> MERGE with builder expression as condition", () => {
      beforeEach(() => {
        const cond = squel.expr().and("t.id = s.id").and("t.active = ?", 1)
        merge
          .into("target_table", "t")
          .using("source_table", "s", cond)
          .whenMatched()
          .delete()
      })

      it("toString", () => {
        expect(merge.toString()).toBe(
          "MERGE INTO target_table AS t USING source_table AS s ON (t.id = s.id AND t.active = 1) WHEN MATCHED THEN DELETE;",
        )
      })

      it("toParam", () => {
        const param = merge.toParam()
        expect(param.text).toBe(
          "MERGE INTO target_table AS t USING source_table AS s ON (t.id = s.id AND t.active = ?) WHEN MATCHED THEN DELETE;",
        )
        expect(param.values).toEqual([1])
      })
    })
  })

  it("Default query builder options", () => {
    expect(squel.cls.DefaultQueryBuilderOptions).toEqual({
      autoQuoteTableNames: false,
      autoQuoteFieldNames: false,
      autoQuoteAliasNames: false,
      useAsForTableAliasNames: false,
      nameQuoteCharacter: "`",
      tableAliasQuoteCharacter: "`",
      fieldAliasQuoteCharacter: '"',
      valueHandlers: [],
      parameterCharacter: "?",
      numberedParameters: false,
      numberedParametersPrefix: "@",
      numberedParametersStartAt: 1,
      replaceSingleQuotes: true,
      singleQuoteReplacement: "''",
      separator: " ",
      stringFormatter: null,
      rawNesting: false,
      useRecursiveKeyword: false,
    })
  })
})
