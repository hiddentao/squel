// This file contains additional Squel commands for use with MySQL

squel.flavours['mysql'] = function(_squel) {
  let cls = _squel.cls;

  // target <table> in DELETE <table> FROM ...
  cls.TargetTableBlock = class extends cls.FunctionBlock {
    target (table) {
      this['function'](this._sanitizeTable(table));
    }
  }


  // ON DUPLICATE KEY UPDATE ...
  cls.MysqlOnDuplicateKeyUpdateBlock = class extends cls.AbstractSetFieldBlock {
    onDupUpdate (field, value, options) {
      this._set(field, value, options);
    }

    _toParamString (options = {}) {
      let totalStr = "",
        totalValues = [];

      for (let i = 0; i < this._fields.length; ++i) {
        totalStr = _pad(totalStr, ', ');

        let field = this._fields[i];

        let value = this._values[0][i];

        let valueOptions = this._valueOptions[0][i];

        // e.g. if field is an expression such as: count = count + 1
        if (typeof value === 'undefined') {
          totalStr += field;
        } else {
          let ret = this._buildString(
            `${field} = ${this.options.parameterCharacter}`,
            [value],
            {
              buildParameterized: options.buildParameterized,
              formattingOptions: valueOptions,
            }
          );

          totalStr += ret.text;
          totalValues.push(...ret.values);
        }
      }

      return {
        text: !totalStr.length ? "" : `ON DUPLICATE KEY UPDATE ${totalStr}`,
        values: totalValues,
      };
    }
  }


  // INSERT query builder.
  cls.Insert = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.MysqlOnDuplicateKeyUpdateBlock(options),
      ];

      super(options, blocks);
    }
  }

  cls.Delete = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'DELETE'),
        new cls.TargetTableBlock(options),
        new cls.FromTableBlock(_extend({}, options, { 
          singleTable: true 
        })),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
      ];

      super(options, blocks);
    }
  }
};

