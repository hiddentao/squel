// This file contains additional Squel commands for use with the Postgres DB engine
squel.flavours['postgres'] = function(_squel) {
  let cls = _squel.cls;

  cls.DefaultQueryBuilderOptions.numberedParameters = true;
  cls.DefaultQueryBuilderOptions.numberedParametersStartAt = 1;
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false;
  cls.DefaultQueryBuilderOptions.useAsForTableAliasNames = true;

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

  // INSERT query builder
  cls.Insert = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
        new cls.ReturningBlock(options),
      ];

      super(options, blocks);
    }
  }

  // UPDATE query builder
  cls.Update = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
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
        new cls.StringBlock(options, 'DELETE'),
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

