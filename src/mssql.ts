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
    _outputs: string[]

    constructor(options: any) {
      super(options)
      this._outputs = []
    }

    output(fields: any): void {
      if (typeof fields === "string") {
        this._outputs.push(`INSERTED.${this._sanitizeField(fields)}`)
      } else {
        fields.forEach((f: any) => {
          this._outputs.push(`INSERTED.${this._sanitizeField(f)}`)
        })
      }
    }

    _toParamString(options?: any): any {
      const ret = super._toParamString(options)
      if (ret.text.length && this._outputs.length > 0) {
        const innerStr = `OUTPUT ${this._outputs.join(", ")} `
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

  cls.Select = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      const limitOffsetTopBlock = new cls.MssqlLimitOffsetTopBlock(options)
      blocks = blocks || [
        new cls.StringBlock(options, "SELECT"),
        new cls.DistinctBlock(options),
        limitOffsetTopBlock.TOP(),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.JoinBlock(options),
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
        new cls.StringBlock(options, "INSERT"),
        new cls.IntoTableBlock(options),
        new cls.MssqlInsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ]
      super(options, blocks)
    }
  }
}
