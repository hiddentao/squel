import { _extend, _pad, squel } from "./core"
import type { Squel } from "./types"

const _limit = function (this: any, max: number): void {
  max = this._sanitizeLimitOffset(max)
  this._parent._limits = max
}

squel.flavours.mssql = (_squel: Squel) => {
  const cls = _squel.cls as any

  cls.DefaultQueryBuilderOptions.replaceSingleQuotes = true
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false
  cls.DefaultQueryBuilderOptions.numberedParametersPrefix = "@"
  cls.DefaultQueryBuilderOptions.useRecursiveKeyword = false

  _squel.registerValueHandler(Date, (value) => {
    const date = value as Date
    return `'${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}'`
  })

  cls.MssqlLimitOffsetTopBlock = class extends cls.Block {
    _limits: any
    _offsets: any
    ParentBlock: any
    LimitBlock: any
    TopBlock: any
    OffsetBlock: any

    constructor(options: any) {
      super(options)
      this._limits = null
      this._offsets = null

      this.ParentBlock = class extends cls.Block {
        _parent: any
        constructor(parent: any) {
          super(parent.options)
          this._parent = parent
        }
      }

      this.LimitBlock = class extends this.ParentBlock {
        limit: any
        constructor(parent: any) {
          super(parent)
          this.limit = _limit
        }

        _toParamString(): any {
          let str = ""
          if (this._parent._limits && this._parent._offsets) {
            str = `FETCH NEXT ${this._parent._limits} ROWS ONLY`
          }
          return { text: str, values: [] }
        }
      }

      this.TopBlock = class extends this.ParentBlock {
        top: any
        constructor(parent: any) {
          super(parent)
          this.top = _limit
        }

        _toParamString(): any {
          let str = ""
          if (this._parent._limits && !this._parent._offsets) {
            str = `TOP (${this._parent._limits})`
          }
          return { text: str, values: [] }
        }
      }

      this.OffsetBlock = class extends this.ParentBlock {
        offset(start: any): void {
          this._parent._offsets = this._sanitizeLimitOffset(start)
        }

        _toParamString(): any {
          let str = ""
          if (this._parent._offsets) {
            str = `OFFSET ${this._parent._offsets} ROWS`
          }
          return { text: str, values: [] }
        }
      }
    }

    LIMIT(): any {
      return new this.LimitBlock(this)
    }

    TOP(): any {
      return new this.TopBlock(this)
    }

    OFFSET(): any {
      return new this.OffsetBlock(this)
    }
  }

  cls.MssqlUpdateTopBlock = class extends cls.Block {
    _limits: any
    limit: any
    top: any

    constructor(options: any) {
      super(options)
      this._limits = null
      const setter = (max: any): void => {
        this._limits = this._sanitizeLimitOffset(max)
      }
      this.limit = setter
      this.top = setter
    }

    _toParamString(): any {
      return {
        text: this._limits ? `TOP (${this._limits})` : "",
        values: [],
      }
    }
  }

  cls.MssqlInsertFieldValueBlock = class extends cls.InsertFieldValueBlock {
    _outputs: any[]

    constructor(options: any) {
      super(options)
      this._outputs = []
    }

    outputs(outputs: any): void {
      for (const output in outputs) {
        this.output(output, outputs[output])
      }
    }

    output(output: any, alias: any = null): void {
      if (typeof output === "string") {
        output = this._sanitizeField(output)
        alias = alias ? this._sanitizeFieldAlias(alias) : alias
        this._outputs.push({
          name: `INSERTED.${output}`,
          alias,
        })
      } else if (Array.isArray(output)) {
        output.forEach((f: any) => {
          this.output(f)
        })
      }
    }

    _toParamString(options?: any): any {
      const ret = super._toParamString(options)
      if (ret.text.length && this._outputs.length > 0) {
        const parts = this._outputs.map((o: any) => {
          let str = o.name
          if (o.alias) {
            str += ` AS ${this._formatFieldAlias(o.alias)}`
          }
          return str
        })
        const innerStr = `OUTPUT ${parts.join(", ")} `
        const valuesPos = ret.text.indexOf("VALUES")
        ret.text =
          ret.text.substring(0, valuesPos) +
          innerStr +
          ret.text.substring(valuesPos)
      }
      return ret
    }
  }

  cls.MssqlUpdateDeleteOutputBlock = class extends cls.Block {
    _outputs: any[]

    constructor(options: any) {
      super(options)
      this._outputs = []
    }

    outputs(outputs: any): void {
      for (const output in outputs) {
        this.output(output, outputs[output])
      }
    }

    output(output: any, alias: any = null): void {
      output = this._sanitizeField(output)
      alias = alias ? this._sanitizeFieldAlias(alias) : alias
      this._outputs.push({
        name: this.options.forDelete
          ? `DELETED.${output}`
          : `INSERTED.${output}`,
        alias,
      })
    }

    _toParamString(_queryBuilder?: any): any {
      let totalStr = ""
      if (this._outputs.length) {
        for (const output of this._outputs) {
          totalStr = _pad(totalStr, ", ")
          totalStr += output.name
          if (output.alias) {
            totalStr += ` AS ${this._formatFieldAlias(output.alias)}`
          }
        }
        totalStr = `OUTPUT ${totalStr}`
      }
      return { text: totalStr, values: [] }
    }
  }

  cls.MssqlJoinBlock = class extends cls.JoinBlock {
    apply(table: unknown, alias: string | null = null, type = "CROSS"): void {
      table = this._sanitizeTable(table, true)
      alias = alias ? this._sanitizeTableAlias(alias) : alias

      let applyType = type.toUpperCase()
      if (!applyType.endsWith("APPLY")) {
        applyType = `${applyType} APPLY`
      }

      this._joins.push({
        type: applyType,
        table,
        alias,
        condition: null,
        isApply: true,
      })
    }

    cross_apply(table: unknown, alias: string | null = null): void {
      this.apply(table, alias, "CROSS")
    }

    outer_apply(table: unknown, alias: string | null = null): void {
      this.apply(table, alias, "OUTER")
    }
  }

  cls.Select = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      const limitOffsetTopBlock = new cls.MssqlLimitOffsetTopBlock(options)
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, "SELECT"),
        new cls.DistinctBlock(options),
        limitOffsetTopBlock.TOP(),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.MssqlJoinBlock(options),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.HavingBlock(options),
        new cls.OrderByBlock(options),
        limitOffsetTopBlock.OFFSET(),
        limitOffsetTopBlock.LIMIT(),
        new cls.UnionBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Update = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, "UPDATE"),
        new cls.MssqlUpdateTopBlock(options),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.MssqlUpdateDeleteOutputBlock(options),
        new cls.WhereBlock(options),
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
        new cls.FromTableBlock(_extend({}, options, { singleTable: true })),
        new cls.JoinBlock(options),
        new cls.MssqlUpdateDeleteOutputBlock(
          _extend({}, options, { forDelete: true }),
        ),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
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
        new cls.MssqlInsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.MergeIntoBlock = class extends cls.Block {
    _table: any = null
    _alias: any = null

    into(table: any, alias: any = null): void {
      this._table = this._sanitizeTable(table)
      this._alias = alias ? this._sanitizeTableAlias(alias) : null
    }

    _toParamString(): any {
      if (!this._table) throw new Error("into() needs to be called")
      let str = this._formatTableName(this._table)
      if (this._alias) {
        str += ` AS ${this._formatTableAlias(this._alias)}`
      }
      return { text: str, values: [] }
    }
  }

  cls.MergeUsingBlock = class extends cls.Block {
    _source: any = null
    _alias: any = null
    _condition: any = null

    using(source: any, alias: any = null, condition: any = null): void {
      this._source =
        typeof source === "string"
          ? this._sanitizeTable(source)
          : this._sanitizeBaseBuilder(source)
      this._alias = alias ? this._sanitizeTableAlias(alias) : null
      this._condition = condition ? this._sanitizeExpression(condition) : null
    }

    _toParamString(options: any = {}): any {
      if (!this._source) throw new Error("using() needs to be called")
      let sourceStr = ""
      const values: any[] = []
      if (typeof this._source === "string") {
        sourceStr = this._formatTableName(this._source)
      } else {
        const ret = this._source._toParamString({
          buildParameterized: options.buildParameterized,
          nested: true,
        })
        sourceStr = ret.text
        ret.values.forEach((v: any) => values.push(v))
      }
      if (this._alias) {
        sourceStr += ` AS ${this._formatTableAlias(this._alias)}`
      }
      let conditionStr = ""
      if (this._condition) {
        let ret: any
        if (typeof this._condition === "string") {
          ret = this._buildString(this._condition, [], {
            buildParameterized: options.buildParameterized,
          })
        } else {
          ret = this._condition._toParamString({
            buildParameterized: options.buildParameterized,
          })
        }
        conditionStr = ` ON ${this._applyNestingFormatting(ret.text)}`
        ret.values.forEach((v: any) => values.push(v))
      }
      return {
        text: `USING ${sourceStr}${conditionStr}`,
        values,
      }
    }
  }

  class MergeMatchedClauseHelper {
    constructor(
      private builder: any,
      private clause: any,
    ) {}
    update(fields: any): any {
      this.clause.action = { type: "UPDATE", fields }
      return this.builder
    }
    delete(): any {
      this.clause.action = { type: "DELETE" }
      return this.builder
    }
  }

  class MergeNotMatchedClauseHelper {
    constructor(
      private builder: any,
      private clause: any,
    ) {}
    insert(fields: any): any {
      this.clause.action = { type: "INSERT", fields }
      return this.builder
    }
  }

  cls.MergeWhenBlock = class extends cls.Block {
    _clauses: any[]

    constructor(options: any) {
      super(options)
      this._clauses = []
    }

    whenMatched(condition: any = null): any {
      const clause = { type: "MATCHED", condition, action: null }
      this._clauses.push(clause)
      return new MergeMatchedClauseHelper(this._queryBuilder, clause)
    }

    whenNotMatched(condition: any = null): any {
      const clause = { type: "NOT_MATCHED", condition, action: null }
      this._clauses.push(clause)
      return new MergeNotMatchedClauseHelper(this._queryBuilder, clause)
    }

    _toParamString(options: any = {}): any {
      let totalStr = ""
      const totalValues: any[] = []
      for (const clause of this._clauses) {
        if (!clause.action) continue
        totalStr = _pad(totalStr, " ")
        let condStr = ""
        if (clause.condition) {
          const ret = this._buildString(clause.condition, [], {
            buildParameterized: options.buildParameterized,
          })
          condStr = ` AND ${ret.text}`
          ret.values.forEach((v: any) => totalValues.push(v))
        }
        let actionStr = ""
        if (clause.action.type === "UPDATE") {
          let setStr = ""
          for (const key of Object.keys(clause.action.fields)) {
            setStr = _pad(setStr, ", ")
            const val = clause.action.fields[key]
            if (val && typeof val._toParamString === "function") {
              const ret = val._toParamString({
                buildParameterized: options.buildParameterized,
              })
              setStr += `${this._formatFieldName(key)} = ${ret.text}`
              ret.values.forEach((v: any) => totalValues.push(v))
            } else {
              const ret = this._buildString(
                `${this._formatFieldName(key)} = ${this.options.parameterCharacter}`,
                [val],
                {
                  buildParameterized: options.buildParameterized,
                },
              )
              setStr += ret.text
              ret.values.forEach((v: any) => totalValues.push(v))
            }
          }
          actionStr = `THEN UPDATE SET ${setStr}`
        } else if (clause.action.type === "DELETE") {
          actionStr = "THEN DELETE"
        } else if (clause.action.type === "INSERT") {
          const cols = Object.keys(clause.action.fields)
            .map((c) => this._formatFieldName(c))
            .join(", ")
          let valsStr = ""
          for (const key of Object.keys(clause.action.fields)) {
            valsStr = _pad(valsStr, ", ")
            const val = clause.action.fields[key]
            if (val && typeof val._toParamString === "function") {
              const ret = val._toParamString({
                buildParameterized: options.buildParameterized,
              })
              valsStr += ret.text
              ret.values.forEach((v: any) => totalValues.push(v))
            } else {
              const ret = this._buildString(
                this.options.parameterCharacter,
                [val],
                {
                  buildParameterized: options.buildParameterized,
                },
              )
              valsStr += ret.text
              ret.values.forEach((v: any) => totalValues.push(v))
            }
          }
          actionStr = `THEN INSERT (${cols}) VALUES (${valsStr})`
        }
        const whenWord =
          clause.type === "MATCHED" ? "WHEN MATCHED" : "WHEN NOT MATCHED"
        totalStr += `${whenWord}${condStr} ${actionStr}`
      }
      return {
        text: totalStr.length ? `${totalStr};` : "",
        values: totalValues,
      }
    }
  }

  cls.Merge = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, "MERGE INTO"),
        new cls.MergeIntoBlock(options),
        new cls.MergeUsingBlock(options),
        new cls.MergeWhenBlock(options),
      ]
      super(options, blocks)
    }
  }

  _squel.merge = (options?: any, blocks?: any) => new cls.Merge(options, blocks)
}
