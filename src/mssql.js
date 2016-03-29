squel.flavours['mssql'] = function(_squel) {
  let cls = _squel.cls;

  cls.DefaultQueryBuilderOptions.replaceSingleQuotes = true;
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false;
  cls.DefaultQueryBuilderOptions.numberedParametersPrefix = '@';


  _squel.registerValueHandler(Date, function(date) {
    return `'${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()}:${date.getUTCSeconds()}'`;
  });


  // LIMIT,  OFFSET x and TOP x
  cls.MssqlLimitOffsetTopBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._limits = null;
      this._offsets = null;

      // This is setup as one block to return many as they all have to use each others data at different times
      // The build String of EITHER LIMIT OR TOP should execute, never both.

      /**
      # Set the LIMIT/TOP transformation.
      #
      # Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
      # the limit.
      */
      let _limit = function(max) {
        max = this._sanitizeLimitOffset(max);
        this._parent._limits = max;
      };

      this.ParentBlock = class extends cls.Block {
        constructor (parent) {
          super(parent.options);
          this._parent = parent;
        }
      };

      this.LimitBlock = class extends this.ParentBlock {
        constructor (parent) {
          super(parent);
          this.limit = _limit;
        }

        _toParamString () {
          let str = "";

          if (this._parent._limits && this._parent._offsets) {
            str = `FETCH NEXT ${this._parent._limits} ROWS ONLY`;
          }

          return {
            text: str,
            values: [],
          };
        }
      };

      this.TopBlock = class extends this.ParentBlock {
        constructor (parent) {
          super(parent);
          this.top = _limit;
        }
        _toParamString () {
          let str = "";

          if (this._parent._limits && !this._parent._offsets) {
            str = `TOP (${this._parent._limits})`;
          }

          return {
            text: str,
            values: [],
          }
        }
      };

      this.OffsetBlock = class extends this.ParentBlock {
        offset (start) {
          this._parent._offsets = this._sanitizeLimitOffset(start);
        }

        _toParamString () {
          let str = "";

          if (this._parent._offsets) {
            str = `OFFSET ${this._parent._offsets} ROWS`; 
          }

          return {
            text: str,
            values: [],
          }
        }
      };
    }

    LIMIT () {
      return new this.LimitBlock(this);
    }

    TOP () {
      return new this.TopBlock(this);
    }

    OFFSET () {
      return new this.OffsetBlock(this);
    }
  };


  cls.MssqlUpdateTopBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._limits = null;

      this.limit = this.top = (max) => {
        this._limits = this._sanitizeLimitOffset(max);
      };
    }

    _toParamString () {
      return {
        text: (this._limits) ? `TOP (${this._limits})` : "",
        values: [],
      };
    }
  };


  cls.MssqlInsertFieldValueBlock = class extends cls.InsertFieldValueBlock {
    constructor (options) {
      super(options);
      this._outputs = [];
    }

    // add fields to the output clause
    output (fields) {
      if ('string' === typeof fields) {
        this._outputs.push(`INSERTED.${this._sanitizeField(fields)}`);
      } else {
        fields.forEach((f) => {
          this._outputs.push(`INSERTED.${this._sanitizeField(f)}`);
        });
      }
    }

    _toParamString (options) {
      if (0 >= this._fields.length) {
        throw new Error("set() needs to be called");
      }

      let ret = super._toParamString(options);

      if (ret.text.length && 0 < this._outputs.length) {
        let innerStr = `OUTPUT ${this._outputs.join(', ')} `;

        let valuesPos = ret.text.indexOf('VALUES');

        ret.text = ret.text.substr(0, valuesPos) + innerStr + ret.text.substr(valuesPos);
      }

      return ret;
    }
  };


  cls.MssqlUpdateDeleteOutputBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._outputs = [];
    }


    /**
    # Add the given fields to the final result set.
    #
    # The parameter is an Object containing field names (or database functions) as the keys and aliases for the fields
    # as the values. If the value for a key is null then no alias is set for that field.
    #
    # Internally this method simply calls the field() method of this block to add each individual field.
    */
    outputs (outputs) {
      for (let output in outputs) {
        this.output(output, outputs[output]);
      }
    }

    /**
    # Add the given field to the final result set.
    #
    # The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
    # e.g. DATE_FORMAT(a.started, "%H")
    #
    # An alias may also be specified for this field.
    */
    output (output, alias = null) {
      output = this._sanitizeField(output);
      alias = alias ? this._sanitizeFieldAlias(alias) : alias;

      this._outputs.push({
        name: this.options.forDelete ? `DELETED.${output}` : `INSERTED.${output}`,
        alias: alias,
      });
    }


    _toParamString (queryBuilder) {
      let totalStr = "";

      if (this._outputs.length) {
        for (let output of this._outputs) {
          totalStr = _pad(totalStr, ", ");

          totalStr += output.name;

          if (output.alias) {
            totalStr += ` AS ${this._formatFieldAlias(output.alias)}`;
          }
        }

        totalStr = `OUTPUT ${totalStr}`;
      }

      return {
        text: totalStr,
        values: [],
      };
    }
  }


  // SELECT query builder.
  cls.Select = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      let limitOffsetTopBlock = new cls.MssqlLimitOffsetTopBlock(options);

      blocks = blocks || [
        new cls.StringBlock(options, 'SELECT'),
        new cls.DistinctBlock(options),
        limitOffsetTopBlock.TOP(),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.OrderByBlock(options),
        limitOffsetTopBlock.OFFSET(),
        limitOffsetTopBlock.LIMIT(),
        new cls.UnionBlock(options),
      ];

      super(options, blocks);
    }
  }



  // Order By in update requires subquery

  // UPDATE query builder.
  cls.Update = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'UPDATE'),
        new cls.MssqlUpdateTopBlock(options),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.MssqlUpdateDeleteOutputBlock(options),
        new cls.WhereBlock(options),
      ];

      super(options, blocks);
    }
  }



  // Order By and Limit/Top in delete requires subquery

  // DELETE query builder.
  cls.Delete = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'DELETE'),
        new cls.FromTableBlock( _extend({}, options, { singleTable: true }) ),
        new cls.JoinBlock(options),
        new cls.MssqlUpdateDeleteOutputBlock(_extend({}, options, { forDelete: true })),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
      ];

      super(options, blocks);
    }
  }


  // An INSERT query builder.
  cls.Insert = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.MssqlInsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ];

      super(options, blocks);
    }
  }




}
