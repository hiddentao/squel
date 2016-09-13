// This file contains additional Squel commands for use with the Postgres DB engine
squel.flavours['postgres'] = function(_squel) {
  let cls = _squel.cls;

  cls.DefaultQueryBuilderOptions.numberedParameters = true;
  cls.DefaultQueryBuilderOptions.numberedParametersStartAt = 1;
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false;
  cls.DefaultQueryBuilderOptions.useAsForTableAliasNames = true;

  cls.PostgresOnConflictKeyUpdateBlock = class extends cls.AbstractSetFieldBlock {
    onConflict (index, fields) {
      this._dupIndex = this._sanitizeField(index);

      if(fields) {
        Object.keys(fields).forEach((key) => {
          this._set(key, fields[key]);
        });
      }
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
        text: this._dupIndex ? (`ON CONFLICT (${this._dupIndex}) DO ` + (!totalStr.length ? "NOTHING" : `UPDATE SET ${totalStr}`)) : '',
        values: totalValues,
      };
    }
  }

  // RETURNING
  cls.ReturningBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._str = null;
    }

    returning (ret) {
      this._str = this._sanitizeField(ret);
    }

    _toParamString () {
      return {
        text: this._str ? `RETURNING ${this._str}` : '',
        values: [],
      }
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
        values.push(...ret.values);
      }

      return {
        text: parts.length ? `WITH ${parts.join(', ')}` : '',
        values
      };
    }
  }

  // DISTINCT [ON]
  cls.DistinctOnBlock = class extends cls.Block {
    constructor(options) {
      super(options);

      this._distinctFields = [];
    }

    distinct(...fields) {
      this._useDistinct = true;

      // Add all fields to the DISTINCT ON clause.
      fields.forEach((field) => {
        this._distinctFields.push(this._sanitizeField(field));
      });
    }

    _toParamString() {
      let text = '';

      if (this._useDistinct) {
        text = 'DISTINCT';

        if (this._distinctFields.length) {
            text += ` ON (${this._distinctFields.join(', ')})`;
        }
      }

      return {
        text,
        values: []
      };
    }
  }

  // SELECT query builder.
  cls.Select = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, 'SELECT'),
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
        new cls.UnionBlock(options)
      ];

      super(options, blocks);
    }
  }

  // INSERT query builder
  cls.Insert = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.WithBlock(options),
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.PostgresOnConflictKeyUpdateBlock(options),
        new cls.ReturningBlock(options),
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
        new cls.FromTableBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.ReturningBlock(options),
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
        new cls.ReturningBlock(options),
      ];

      super(options, blocks);
    }
  }
}
