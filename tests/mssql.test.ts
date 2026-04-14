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
    })
  })
})
