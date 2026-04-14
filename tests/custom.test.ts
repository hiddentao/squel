import { describe, expect, it } from "bun:test"
import squel from "../src/index"

describe("Custom queries", () => {
  it("custom query", () => {
    class CommandBlock extends squel.cls.Block {
      _command: string | undefined
      _arg: unknown

      constructor(options?: any) {
        super(options)
      }

      command(command: string, arg: unknown) {
        this._command = command
        this._arg = arg
      }

      compress(level: number) {
        this.command("compress", level)
      }

      _toParamString(options: { buildParameterized?: boolean }) {
        let text = (this._command ?? "").toUpperCase()
        const values: unknown[] = []
        if (options.buildParameterized) {
          text += " ?"
          values.push(this._arg)
        } else {
          text += ` ${this._arg}`
        }
        return { text, values }
      }
    }

    class PragmaQuery extends squel.cls.QueryBuilder {
      constructor(options?: any) {
        super(options, [
          new squel.cls.StringBlock(options, "PRAGMA"),
          new CommandBlock(options),
        ])
      }
    }
    ;(squel as any).pragma = (options?: any) => new PragmaQuery(options)

    const qry = (squel as any).pragma().compress(9)
    expect(qry.toString()).toBe("PRAGMA COMPRESS 9")
    expect(qry.toParam()).toEqual({ text: "PRAGMA COMPRESS ?", values: [9] })
  })
})
