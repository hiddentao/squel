import { beforeEach, describe, expect, it } from "bun:test"
import squel from "../src/index"

describe("Case expression builder base class", () => {
  let func: any
  let inst: any

  beforeEach(() => {
    func = squel.case
    inst = func()
  })

  it("extends BaseBuilder", () => {
    expect(inst).toBeInstanceOf(squel.cls.BaseBuilder)
  })

  it("toString() returns NULL", () => {
    expect(inst.toString()).toBe("NULL")
  })

  describe("options", () => {
    it("default options", () => {
      expect(inst.options).toEqual(squel.cls.DefaultQueryBuilderOptions)
    })

    it("custom options", () => {
      const e = func({ separator: ",asdf" })
      expect(e.options).toEqual({
        ...squel.cls.DefaultQueryBuilderOptions,
        separator: ",asdf",
      })
    })
  })

  describe("build expression", () => {
    describe(">> when().then()", () => {
      beforeEach(() => {
        inst.when("?", "foo").then("bar")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "CASE WHEN ('foo') THEN 'bar' ELSE NULL END",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "CASE WHEN (?) THEN 'bar' ELSE NULL END",
          values: ["foo"],
        })
      })
    })

    describe(">> when().then().else()", () => {
      beforeEach(() => {
        inst.when("?", "foo").then("bar").else("foobar")
      })

      it("toString", () => {
        expect(inst.toString()).toBe(
          "CASE WHEN ('foo') THEN 'bar' ELSE 'foobar' END",
        )
      })

      it("toParam", () => {
        expect(inst.toParam()).toEqual({
          text: "CASE WHEN (?) THEN 'bar' ELSE 'foobar' END",
          values: ["foo"],
        })
      })
    })
  })

  describe("field case", () => {
    beforeEach(() => {
      inst = func("name").when("?", "foo").then("bar")
    })

    it("toString", () => {
      expect(inst.toString()).toBe(
        "CASE name WHEN ('foo') THEN 'bar' ELSE NULL END",
      )
    })

    it("toParam", () => {
      expect(inst.toParam()).toEqual({
        text: "CASE name WHEN (?) THEN 'bar' ELSE NULL END",
        values: ["foo"],
      })
    })
  })
})
