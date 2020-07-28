// This file contains additional Squel commands for use with the Postgres DB engine
squel.flavours['postgres'] = function(_squel) {
  let cls = _squel.cls;

  cls.DefaultQueryBuilderOptions.numberedParameters = true;
  cls.DefaultQueryBuilderOptions.numberedParametersStartAt = 1;
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false;
  cls.DefaultQueryBuilderOptions.useAsForTableAliasNames = true;
  cls.DefaultQueryBuilderOptions.nameQuoteCharacter = '"';
  cls.DefaultQueryBuilderOptions.tableAliasQuoteCharacter = '"';

  cls.PostgresOnConflictKeyUpdateBlock = class extends cls.AbstractSetFieldBlock {
    onConflict (conflictFields, fields) {
      this._onConflict = true;
      if (!conflictFields) {
        return;
      }
      if (!_isArray(conflictFields)) {
        conflictFields = [conflictFields];
      }
      this._dupFields = conflictFields.map(this._sanitizeField.bind(this));

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
          ret.values.forEach(value => totalValues.push(value));
        }
      }

      const returned = {
        text: '',
        values: totalValues,
      };

      if (this._onConflict) {
        // note the trailing whitespace after the join
        const conflictFields = this._dupFields ? `(${this._dupFields.join(', ')}) ` : '';
        const action = totalStr.length ? `UPDATE SET ${totalStr}` : `NOTHING`;
        returned.text = `ON CONFLICT ${conflictFields}DO ${action}`;
      }

      return returned;
    }
  }

  // RETURNING
  cls.ReturningBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._fields = [];
    }

    returning (field, alias = null, options = {}) {
      alias = alias ? this._sanitizeFieldAlias(alias) : alias;
      field = this._sanitizeField(field);

      // if field-alias combo already present then don't add
      let existingField = this._fields.filter((f) => {
        return f.name === field && f.alias === alias;
      });
      if (existingField.length) {
        return this;
      }

      this._fields.push({
        name: field,
        alias: alias,
        options: options,
      });
    }

    _toParamString (options = {}) {
      let { queryBuilder, buildParameterized } = options;

      let totalStr = '',
        totalValues = [];

      for (let field of this._fields) {
        totalStr = _pad(totalStr, ", ");

        let { name, alias, options } = field;

        if (typeof name === 'string') {
          totalStr += this._formatFieldName(name, options);
        } else {
          let ret = name._toParamString({
            nested: true,
            buildParameterized: buildParameterized,
          });

          totalStr += ret.text;
          ret.values.forEach(value => totalValues.push(value));
        }

        if (alias) {
          totalStr += ` AS ${this._formatFieldAlias(alias)}`;
        }
      }

      return {
        text: totalStr.length > 0 ? `RETURNING ${totalStr}` : '',
        values: totalValues
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
        ret.values.forEach(value => values.push(value));
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
