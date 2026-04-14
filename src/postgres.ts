import { _isArray, _pad, squel } from "./core"
import type { Squel } from "./types"

squel.flavours.postgres = (_squel: Squel) => {
  const cls = _squel.cls as any

  cls.DefaultQueryBuilderOptions.numberedParameters = true
  cls.DefaultQueryBuilderOptions.numberedParametersStartAt = 1
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false
  cls.DefaultQueryBuilderOptions.useAsForTableAliasNames = true

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

    onConflict(conflictFields: any, fields: any): void {
      this._onConflict = true
      if (!conflictFields) return
      if (!_isArray(conflictFields)) {
        conflictFields = [conflictFields]
      }
      this._dupFields = conflictFields.map(this._sanitizeField.bind(this))
      if (fields) {
        Object.keys(fields).forEach((key) => {
          this._set(key, fields[key])
        })
      }
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

  cls.ReturningBlock = class extends cls.Block {
    _fields: any[]

    constructor(options: any) {
      super(options)
      this._fields = []
    }

    returning(field: any, alias: any = null, options: any = {}): any {
      alias = alias ? this._sanitizeFieldAlias(alias) : alias
      field = this._sanitizeField(field)
      const existingField = this._fields.filter(
        (f: any) => f.name === field && f.alias === alias,
      )
      if (existingField.length) return this
      this._fields.push({ name: field, alias, options })
    }

    _toParamString(options: any = {}): any {
      const { buildParameterized } = options
      let totalStr = ""
      const totalValues: any[] = []
      for (const field of this._fields) {
        totalStr = _pad(totalStr, ", ")
        const { name, alias, options: fieldOptions } = field
        if (typeof name === "string") {
          totalStr += this._formatFieldName(name, fieldOptions)
        } else {
          const ret = name._toParamString({ nested: true, buildParameterized })
          totalStr += ret.text
          ret.values.forEach((v: any) => totalValues.push(v))
        }
        if (alias) totalStr += ` AS ${this._formatFieldAlias(alias)}`
      }
      return {
        text: totalStr.length > 0 ? `RETURNING ${totalStr}` : "",
        values: totalValues,
      }
    }
  }

  cls.WithBlock = class extends cls.Block {
    _tables: any[]

    constructor(options: any) {
      super(options)
      this._tables = []
    }

    with(alias: any, table: any): void {
      this._tables.push({ alias, table })
    }

    _toParamString(options: any = {}): any {
      const parts: string[] = []
      const values: any[] = []
      for (const { alias, table } of this._tables) {
        const ret = table._toParamString({
          buildParameterized: options.buildParameterized,
          nested: true,
        })
        parts.push(`${alias} AS ${ret.text}`)
        ret.values.forEach((v: any) => values.push(v))
      }
      return {
        text: parts.length ? `WITH ${parts.join(", ")}` : "",
        values,
      }
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

  cls.Select = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
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
      ]
      super(options, blocks)
    }
  }

  cls.Insert = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
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
        new cls.WithBlock(options),
        new cls.StringBlock(options, "DELETE"),
        new cls.TargetTableBlock(options),
        new cls.FromTableBlock({ ...options, singleTable: true }),
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
