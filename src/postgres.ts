import { _isArray, _pad, squel } from "./core"
import type { Squel } from "./types"

squel.flavours.postgres = (_squel: Squel) => {
  const cls = _squel.cls as any

  cls.DefaultQueryBuilderOptions.numberedParameters = true
  cls.DefaultQueryBuilderOptions.numberedParametersStartAt = 1
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false
  cls.DefaultQueryBuilderOptions.useAsForTableAliasNames = true

  class PostgresOnConflictUpdateHelper {
    constructor(
      public builder: any,
      public block: any,
    ) {}
  }

  cls.PostgresOnConflictKeyUpdateBlock = class extends (
    cls.AbstractSetFieldBlock
  ) {
    _onConflict: boolean
    _dupFields: any[]

    constructor(options: any) {
      super(options)
      this._onConflict = false
      this._dupFields = []
    }

    onConflict(conflictFields: any, fields: any): any {
      this._onConflict = true
      if (conflictFields) {
        if (!_isArray(conflictFields)) {
          conflictFields = [conflictFields]
        }
        this._dupFields = conflictFields.map(this._sanitizeField.bind(this))
      }
      if (fields) {
        Object.keys(fields).forEach((key) => {
          this._set(key, fields[key])
        })
      }
      return this._queryBuilder
    }

    doUpdate(): any {
      const helper = new PostgresOnConflictUpdateHelper(
        this._queryBuilder,
        this,
      )
      return new Proxy(helper, {
        get(target, prop, receiver) {
          if (prop === "set") {
            return (field: any, value: any, options?: any) => {
              target.block._set(field, value, options)
              return receiver
            }
          }
          const val = target.builder[prop]
          if (typeof val === "function") {
            return (...args: any[]) => {
              const ret = val.apply(target.builder, args)
              return ret === target.builder ? receiver : ret
            }
          }
          return val
        },
      })
    }

    doNothing(): any {
      this._onConflict = true
      this._fields = []
      this._values = [[]]
      this._valueOptions = [[]]
      return this._queryBuilder
    }

    _toParamString(options: any = {}): any {
      let totalStr = ""
      const totalValues: any[] = []
      for (let i = 0; i < this._fields.length; ++i) {
        totalStr = _pad(totalStr, ", ")
        const field = this._fields[i]
        const value = this._values[0][i]
        const valueOptions = this._valueOptions[0][i]
        if (typeof value === "undefined") {
          totalStr += field
        } else {
          const ret = this._buildString(
            `${field} = ${this.options.parameterCharacter}`,
            [value],
            {
              buildParameterized: options.buildParameterized,
              formattingOptions: valueOptions,
            },
          )
          totalStr += ret.text
          ret.values.forEach((v: any) => totalValues.push(v))
        }
      }
      const returned = { text: "", values: totalValues }
      if (this._onConflict) {
        const conflictFields = this._dupFields.length
          ? `(${this._dupFields.join(", ")}) `
          : ""
        const action = totalStr.length ? `UPDATE SET ${totalStr}` : "NOTHING"
        returned.text = `ON CONFLICT ${conflictFields}DO ${action}`
      }
      return returned
    }
  }

  cls.UsingBlock = class extends cls.AbstractTableBlock {
    constructor(options: any) {
      super({ ...options, prefix: "USING" })
    }

    using(table: unknown, alias: string | null = null): void {
      this._table(table, alias)
    }
  }
  cls.DistinctOnBlock = class extends cls.Block {
    _useDistinct = false
    _distinctFields: any[]

    constructor(options: any) {
      super(options)
      this._distinctFields = []
    }

    distinct(...fields: any[]): void {
      this._useDistinct = true
      fields.forEach((field) => {
        this._distinctFields.push(this._sanitizeField(field))
      })
    }

    _toParamString(): any {
      let text = ""
      if (this._useDistinct) {
        text = "DISTINCT"
        if (this._distinctFields.length) {
          text += ` ON (${this._distinctFields.join(", ")})`
        }
      }
      return { text, values: [] }
    }
  }

  // Renders a pg_hint_plan hint comment (e.g. `/*+ IndexScan(t) */`) at the very
  // start of the statement. Multiple hints accumulate space-separated inside a
  // single comment. Requires the pg_hint_plan extension to have any effect; it is
  // an inert SQL comment otherwise. See https://pg-hint-plan.readthedocs.io/
  cls.PgHintPlanBlock = class extends cls.Block {
    _hints: string[]

    constructor(options: any) {
      super(options)
      this._hints = []
    }

    hint(hintStr: string): void {
      this._hints.push(hintStr)
    }

    _toParamString(): any {
      const text = this._hints.length ? `/*+ ${this._hints.join(" ")} */` : ""
      return { text, values: [] }
    }
  }

  cls.Select = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.PgHintPlanBlock(options),
        new cls.WithBlock(options),
        new cls.StringBlock(options, "SELECT"),
        new cls.FunctionBlock(options),
        new cls.DistinctOnBlock(options),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.HavingBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.OffsetBlock(options),
        new cls.UnionBlock(options),
        new cls.ForBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Insert = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.PgHintPlanBlock(options),
        new cls.WithBlock(options),
        new cls.StringBlock(options, "INSERT"),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.PostgresOnConflictKeyUpdateBlock(options),
        new cls.ReturningBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Update = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.PgHintPlanBlock(options),
        new cls.WithBlock(options),
        new cls.StringBlock(options, "UPDATE"),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.ReturningBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Delete = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.PgHintPlanBlock(options),
        new cls.WithBlock(options),
        new cls.StringBlock(options, "DELETE"),
        new cls.TargetTableBlock(options),
        new cls.FromTableBlock({ ...options, singleTable: true }),
        new cls.UsingBlock(options),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.ReturningBlock(options),
      ]
      super(options, blocks)
    }
  }
}
