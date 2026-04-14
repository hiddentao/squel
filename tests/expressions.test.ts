import { beforeEach, describe, expect, it } from "bun:test"
import squel from "../src/index"

describe("Expression builder base class", () => {
  let inst: any

  beforeEach(() => {
    inst = squel.expr()
  })

  it("extends BaseBuilder", () => {
    expect(inst).toBeInstanceOf(squel.cls.BaseBuilder)
  })

  it("toString() returns empty", () => {
    expect(inst.toString()).toBe("")
  })

  describe("options", () => {
    it("default options", () => {
      expect(inst.options).toEqual(squel.cls.DefaultQueryBuilderOptions)
    })

    it("custom options", () => {
      const e = squel.expr({ separator: ",asdf" } as any)
      expect(e.options).toEqual({
        ...squel.cls.DefaultQueryBuilderOptions,
        separator: ",asdf",
      })
    })
  })

  describe("and()", () => {
    it("without an argument throws an error", () => {
      expect(() => inst.and()).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with an array throws an error", () => {
      expect(() => inst.and([1])).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with an object throws an error", () => {
      expect(() => inst.and(new Object())).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with a function throws an error", () => {
      expect(() => inst.and(() => 1)).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with an Expression returns object instance", () => {
      expect(inst.and(squel.expr())).toBe(inst)
    })

    it("with a builder returns object instance", () => {
      expect(inst.and(squel.str())).toBe(inst)
    })

    it("with a string returns object instance", () => {
      expect(inst.and("bla")).toBe(inst)
    })
  })

  describe("or()", () => {
    it("without an argument throws an error", () => {
      expect(() => inst.or()).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with an array throws an error", () => {
      expect(() => inst.or([1])).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with an object throws an error", () => {
      expect(() => inst.or(new Object())).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with a function throws an error", () => {
      expect(() => inst.or(() => 1)).toThrow(
        "expression must be a string or builder instance",
      )
    })

    it("with an Expression returns object instance", () => {
      expect(inst.or(squel.expr())).toBe(inst)
    })

    it("with a builder returns object instance", () => {
      expect(inst.or(squel.str())).toBe(inst)
    })

    it("with a string returns object instance", () => {
      expect(inst.or("bla")).toBe(inst)
    })
  })

  describe('and("test = 3")', () => {
    beforeEach(() => {
      inst.and("test = 3")
    })

    it(">> toString()", () => {
      expect(inst.toString()).toBe("test = 3")
    })

    it(">> toParam()", () => {
      expect(inst.toParam()).toEqual({ text: "test = 3", values: [] })
    })

    describe(">> and(\"flight = '4'\")", () => {
      beforeEach(() => {
        inst.and("flight = '4'")
      })

      it(">> toString()", () => {
        expect(inst.toString()).toBe("test = 3 AND flight = '4'")
      })

      it(">> toParam()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = 3 AND flight = '4'",
          values: [],
        })
      })

      describe('>> or("dummy IN (1,2,3)")', () => {
        beforeEach(() => {
          inst.or("dummy IN (1,2,3)")
        })

        it(">> toString()", () => {
          expect(inst.toString()).toBe(
            "test = 3 AND flight = '4' OR dummy IN (1,2,3)",
          )
        })

        it(">> toParam()", () => {
          expect(inst.toParam()).toEqual({
            text: "test = 3 AND flight = '4' OR dummy IN (1,2,3)",
            values: [],
          })
        })
      })
    })
  })

  describe('and("test = ?", null)', () => {
    beforeEach(() => {
      inst.and("test = ?", null)
    })

    it(">> toString()", () => {
      expect(inst.toString()).toBe("test = NULL")
    })

    it(">> toParam()", () => {
      expect(inst.toParam()).toEqual({ text: "test = ?", values: [null] })
    })
  })

  describe('and("test = ?", 3)', () => {
    beforeEach(() => {
      inst.and("test = ?", 3)
    })

    it(">> toString()", () => {
      expect(inst.toString()).toBe("test = 3")
    })

    it(">> toParam()", () => {
      expect(inst.toParam()).toEqual({ text: "test = ?", values: [3] })
    })

    describe('>> and("flight = ?", "4")', () => {
      beforeEach(() => {
        inst.and("flight = ?", "4")
      })

      it(">> toString()", () => {
        expect(inst.toString()).toBe("test = 3 AND flight = '4'")
      })

      it(">> toParam()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = ? AND flight = ?",
          values: [3, "4"],
        })
      })

      describe('>> or("dummy IN ?", [false, 2, null, "str"])', () => {
        beforeEach(() => {
          inst.or("dummy IN ?", [false, 2, null, "str"])
        })

        it(">> toString()", () => {
          expect(inst.toString()).toBe(
            "test = 3 AND flight = '4' OR dummy IN (FALSE, 2, NULL, 'str')",
          )
        })

        it(">> toParam()", () => {
          expect(inst.toParam()).toEqual({
            text: "test = ? AND flight = ? OR dummy IN (?, ?, ?, ?)",
            values: [3, "4", false, 2, null, "str"],
          })
        })
      })
    })
  })

  describe('or("test = 3")', () => {
    beforeEach(() => {
      inst.or("test = 3")
    })

    it(">> toString()", () => {
      expect(inst.toString()).toBe("test = 3")
    })

    it(">> toParam()", () => {
      expect(inst.toParam()).toEqual({ text: "test = 3", values: [] })
    })

    describe(">> or(\"flight = '4'\")", () => {
      beforeEach(() => {
        inst.or("flight = '4'")
      })

      it(">> toString()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = 3 OR flight = '4'",
          values: [],
        })
      })

      describe('>> and("dummy IN (1,2,3)")', () => {
        beforeEach(() => {
          inst.and("dummy IN (1,2,3)")
        })

        it(">> toString()", () => {
          expect(inst.toString()).toBe(
            "test = 3 OR flight = '4' AND dummy IN (1,2,3)",
          )
        })

        it(">> toParam()", () => {
          expect(inst.toParam()).toEqual({
            text: "test = 3 OR flight = '4' AND dummy IN (1,2,3)",
            values: [],
          })
        })
      })
    })
  })

  describe('or("test = ?", 3)', () => {
    beforeEach(() => {
      inst.or("test = ?", 3)
    })

    it(">> toString()", () => {
      expect(inst.toString()).toBe("test = 3")
    })

    it(">> toParam()", () => {
      expect(inst.toParam()).toEqual({ text: "test = ?", values: [3] })
    })

    describe('>> or("flight = ?", "4")', () => {
      beforeEach(() => {
        inst.or("flight = ?", "4")
      })

      it(">> toString()", () => {
        expect(inst.toString()).toBe("test = 3 OR flight = '4'")
      })

      it(">> toParam()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = ? OR flight = ?",
          values: [3, "4"],
        })
      })

      describe('>> and("dummy IN ?", [false, 2, null, "str"])', () => {
        beforeEach(() => {
          inst.and("dummy IN ?", [false, 2, null, "str"])
        })

        it(">> toString()", () => {
          expect(inst.toString()).toBe(
            "test = 3 OR flight = '4' AND dummy IN (FALSE, 2, NULL, 'str')",
          )
        })

        it(">> toParam()", () => {
          expect(inst.toParam()).toEqual({
            text: "test = ? OR flight = ? AND dummy IN (?, ?, ?, ?)",
            values: [3, "4", false, 2, null, "str"],
          })
        })
      })
    })
  })

  describe('or("test = ?", 4)', () => {
    beforeEach(() => {
      inst.or("test = ?", 4)
    })

    describe('>> and(expr().or("inner = ?", 1))', () => {
      beforeEach(() => {
        inst.and(squel.expr().or("inner = ?", 1))
      })

      it(">> toString()", () => {
        expect(inst.toString()).toBe("test = 4 AND (inner = 1)")
      })

      it(">> toParam()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = ? AND (inner = ?)",
          values: [4, 1],
        })
      })
    })

    describe('>> and(expr().or("inner = ?", 1).or(expr().and("another = ?", 34)))', () => {
      beforeEach(() => {
        inst.and(
          squel
            .expr()
            .or("inner = ?", 1)
            .or(squel.expr().and("another = ?", 34)),
        )
      })

      it(">> toString()", () => {
        expect(inst.toString()).toBe(
          "test = 4 AND (inner = 1 OR (another = 34))",
        )
      })

      it(">> toParam()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = ? AND (inner = ? OR (another = ?))",
          values: [4, 1, 34],
        })
      })
    })
  })

  describe("custom parameter character: @@", () => {
    beforeEach(() => {
      inst.options.parameterCharacter = "@@"
    })

    describe('and("test = @@", 3).and("flight = @@", "4").or("dummy IN @@", [false, 2, null, "str"])', () => {
      beforeEach(() => {
        inst
          .and("test = @@", 3)
          .and("flight = @@", "4")
          .or("dummy IN @@", [false, 2, null, "str"])
      })

      it(">> toString()", () => {
        expect(inst.toString()).toBe(
          "test = 3 AND flight = '4' OR dummy IN (FALSE, 2, NULL, 'str')",
        )
      })

      it(">> toParam()", () => {
        expect(inst.toParam()).toEqual({
          text: "test = @@ AND flight = @@ OR dummy IN (@@, @@, @@, @@)",
          values: [3, "4", false, 2, null, "str"],
        })
      })
    })
  })

  it("cloning", () => {
    const newinst = inst.or("test = 4").or("inner = 1").or("inner = 2").clone()
    newinst.or("inner = 3")
    expect(inst.toString()).toBe("test = 4 OR inner = 1 OR inner = 2")
    expect(newinst.toString()).toBe(
      "test = 4 OR inner = 1 OR inner = 2 OR inner = 3",
    )
  })

  it("custom array prototype methods (Issue #210)", () => {
    ;(Array.prototype as any).last = function () {
      return this[this.length - 1]
    }
    inst.or("foo = ?", "bar")
    delete (Array.prototype as any).last
  })

  describe("any type of builder", () => {
    beforeEach(() => {
      inst.or("b = ?", 5).or(squel.select().from("blah").where("a = ?", 9))
    })

    it("toString", () => {
      expect(inst.toString()).toBe(
        "b = 5 OR (SELECT * FROM blah WHERE (a = 9))",
      )
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "b = ? OR (SELECT * FROM blah WHERE (a = ?))",
        values: [5, 9],
      })
    })
  })

  describe("#286 - nesting", () => {
    beforeEach(() => {
      inst = squel
        .expr()
        .and(
          squel
            .expr()
            .and(squel.expr().and("A").and("B"))
            .or(squel.expr().and("C").and("D")),
        )
        .and("E")
    })

    it("toString", () => {
      expect(inst.toString()).toBe("((A AND B) OR (C AND D)) AND E")
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "((A AND B) OR (C AND D)) AND E",
        values: [],
      })
    })
  })
})
