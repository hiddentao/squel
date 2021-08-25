// This file contains additional Squel commands for use with MySQL

squel.flavours['mysql'] = function(_squel) {
  let cls = _squel.cls;

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

  // WITH
  cls.WithBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._tables = [];
    }

    with (alias, table) {
      this._tables.push({alias, table});
    }

    _toParamString(options = {}) {
      var parts  = [];
      var values = [];

      for (let {alias, table} of this._tables) {
        let ret = table._toParamString({
          buildParameterized: options.buildParameterized,
          nested: true
        });

        parts.push(`${alias} AS ${ret.text}`);
        ret.values.forEach(value => values.push(value));
      }

      return {
        text: parts.length ? `WITH ${parts.join(', ')}` : '',
        values
      };
    }
  }

  // INSERT query builder.
  cls.Insert = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, 'INSERT'),
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
        new cls.WithBlock(options),
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

  // SELECT query builder.
  cls.Select = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, 'SELECT'),
        new cls.FunctionBlock(options),
        new cls.DistinctBlock(options),
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
      ];

      super(options, blocks);
    }
  }

  // UPDATE query builder
  cls.Update = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, 'UPDATE'),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
      ];

      super(options, blocks);
    }
  }

  // DELETE query builder
  cls.Delete = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
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
