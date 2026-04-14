import { _pad, squel } from "./core"
import type { Squel } from "./types"

squel.flavours.mysql = (_squel: Squel) => {
  const cls = _squel.cls as any

  cls.MysqlOnDuplicateKeyUpdateBlock = class extends cls.AbstractSetFieldBlock {
    onDupUpdate(field: any, value: any, options?: any): void {
      this._set(field, value, options)
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
      return {
        text: !totalStr.length ? "" : `ON DUPLICATE KEY UPDATE ${totalStr}`,
        values: totalValues,
      }
    }
  }

  cls.Insert = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.StringBlock(options, "INSERT"),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.MysqlOnDuplicateKeyUpdateBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Replace = class extends cls.QueryBuilder {
    constructor(options?: any, blocks: any = null) {
      blocks = blocks || [
        new cls.StringBlock(options, "REPLACE"),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ]
      super(options, blocks)
    }
  }

  _squel.replace = (options?: any, blocks?: any) =>
    new cls.Replace(options, blocks)
}
