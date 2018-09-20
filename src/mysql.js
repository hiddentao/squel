// This file contains additional Squel commands for use with MySQL

const escape = require('sql-escape-string')

squel.flavours['mysql'] = function(_squel) {
  let cls = _squel.cls;

  // add default stringFormatter for MySQL
  cls.DefaultQueryBuilderOptions.stringFormatter = function (value, formattingOptions) {
    if (!value || formattingOptions.dontQuote) {
      return value;
    } else {
      return escape(value, {
        // MySQL use backslash to escape value by default
        backslashSupported: true
      });
    }
  }

  // INSERT IGNORE ...
  cls.MysqlIgnoreBlock = class extends cls.AbstractSetFieldBlock {
    ignore () {
      this._str = 'IGNORE';
    }

    _toParamString () {
      return {
        text: this._str || '',
        values: [],
      };
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
          ret.values.forEach(value => totalValues.push(value));
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
        new cls.MysqlIgnoreBlock(options),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.MysqlOnDuplicateKeyUpdateBlock(options),
      ];

      super(options, blocks);
    }
  }

  // REPLACE query builder.
  cls.Replace = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'REPLACE'),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ];

      super(options, blocks);
    }
  }


  _squel.replace = function(options, blocks){
      return new cls.Replace(options, blocks);
  }

};
