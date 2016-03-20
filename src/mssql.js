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
      this.limits = null;
      this.offsets = null;

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
        this._parent.limits = max;
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

        buildStr (queryBuilder) {
          if (this._parent.limits && this._parent.offsets) {
            return `FETCH NEXT ${this._parent.limits} ROWS ONLY`;
          } else {
            return "";
          }
        }
      };

      this.TopBlock = class extends this.ParentBlock {
        constructor (parent) {
          super(parent);
          this.top = _limit;
        }
        buildStr (queryBuilder) {
          if (this._parent.limits && !this._parent.offsets) {
            return `TOP (${this._parent.limits})`;
          } else {
            return "";
          }
        }
      };

      this.OffsetBlock = class extends this.ParentBlock {
        offset (start) {
          this._parent.offsets = this._sanitizeLimitOffset(start);
        }

        buildStr (queryBuilder) {
          if (this._parent.offsets) {
            return `OFFSET ${this._parent.offsets} ROWS`; 
          } else {
            return "";
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
      this.limits = null;

      this.limit = this.top = (max) => {
        this.limits = this._sanitizeLimitOffset(max);
      };
    }

    buildStr (queryBuilder) {
      return (this.limits) ? `TOP (${this.limits})` : "";
    }
  };


  cls.MssqlInsertFieldValueBlock = class extends cls.InsertFieldValueBlock {
    constructor (options) {
      super(options);
      this.outputs = [];
    }

    // add fields to the output clause
    output (fields) {
      if ('string' === typeof fields) {
        this.outputs.push(`INSERTED.${this._sanitizeField(fields)}`);
      } else {
        fields.forEach((f) => {
          this.outputs.push(`INSERTED.${this._sanitizeField(f)}`);
        });
      }
    }

    buildStr (queryBuilder) {
      if (0 >= this.fields.length) {
        throw new Error("set() needs to be called");
      }

      let innerStr = (this.outputs.length != 0) 
        ? `OUTPUT ${this.outputs.join(', ')} ` 
        : '';

      return `(${this.fields.join(', ')}) ${innerStr}VALUES (${this._buildVals().join('), (')})`;
    }

    buildParam (queryBuilder) {
      if (0 >= this.fields.length) {
        throw new Error("set() needs to be called");
      }

      // fields
      let str = "";
      let {vals, params} = this._buildValParams();

      _forOf(this.fields, (field) => {
        if (str.length) {
          str += ", ";
        }

        str += field;
      });

      let innerStr = (this.outputs.length != 0) 
        ? `OUTPUT ${this.outputs.join(', ')} ` 
        : '';

      return { 
        text: `(${str}) ${innerStr} VALUES (${vals.join('), (')})`, 
        values: params 
      };
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
    outputs (_outputs) {
      for (let output in  _outputs) {
        this.output(output, _outputs[output]);
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


    buildStr (queryBuilder) {
      let outputs = "";

      if (this._outputs.length > 0) {
        _forOf(this._outputs, (output) => {
          if (outputs.length) {
            outputs += ", ";
          }
          outputs += output.name;

          if (output.alias) {
            outputs += ` AS ${output.alias}`;
          }
        });

        outputs = `OUTPUT ${outputs}`;
      }

      return outputs;
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
        new cls.FromTableBlock(_extend({}, options, { allowNested: true })),
        new cls.JoinBlock(_extend({}, options, { allowNested: true })),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.OrderByBlock(options),
        limitOffsetTopBlock.OFFSET(),
        limitOffsetTopBlock.LIMIT(),
        new cls.UnionBlock(_extend({}, options, { allowNested: true })),
      ];

      super(options, blocks);
    }

    isNestable () {
      return true;
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
