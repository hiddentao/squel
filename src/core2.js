// append to string if non-empty
function _pad (str, pad) {
  return (str.length) ? str + pad : str;
}




// Extend given object's with other objects' properties, overriding existing ones if necessary
function _extend (dst, ...sources) {
  if (sources) {
    for (let src of sources) {
      if (typeof src === 'object') {
        Object.getOwnPropertyNames(src).forEach(function (key) {
          if (typeof src[key] !== 'function') {
            dst[key] = src[key];
          }
        });
      }
    }
  }

  return dst;
};




// get whether object is a plain object
function _isPlainObject(obj) {
  return (obj && obj.constructor.prototype === Object.prototype);
};


// get whether object is an array
function _isArray(obj) {
  return (obj && obj.constructor.prototype === Array.prototype);
};


// get class name of given object
function _getObjectClassName (obj) {
  if (obj && obj.constructor && obj.constructor.toString) {
    let arr = obj.constructor.toString().match(/function\s*(\w+)/);
    
    if (arr && 2 === arr.length) {
      return arr[1]
    }
  }
}


// clone given item
function _clone(src) {
  if (!src) {
    return src;
  }

  if (typeof src.clone === 'function') {
    return src.clone();
  } else if (_isPlainObject(src) || _isArray(src)) {
    let ret = new (src.constructor);

    Object.getOwnPropertyNames(src).forEach(function(key) {
      if (typeof src[key] !== 'function') {
        ret[key] = _clone(src[key]);
      }
    });

    return ret;
  } else {
    return JSON.parse(JSON.stringify(src));
  }
};


/**
 * Register a value type handler
 *
 * Note: this will override any existing handler registered for this value type.
 */
function registerValueHandler (handlers, type, handler) {
  let typeofType = typeof type;

  if (typeofType !== 'function' && typeofType !== 'string') {
    throw new Error("type must be a class constructor or string");
  }

  if (typeof handler !== 'function') {
    throw new Error("handler must be a function");
  }

  for (let idx in handlers) {
    let typeHandler = handlers[idx];

    if (typeHandler.type === type) {
      typeHandler.handler = handler;

      return;
    }
  }

  handlers.push({
    type: type,
    handler: handler,
  });
};




/**
 * Get value type handler for given type
 */
function getValueHandler (value, ...handlerLists) {
  for (let listIdx in handlerLists) {
    let handlers = handlerLists[listIdx];

    for (let handlerIdx in handlers) {
      let typeHandler = handlers[handlerIdx];

      // if type is a string then use `typeof` or else use `instanceof`
      if (typeof value === typeHandler.type || 
          (typeof typeHandler.type !== 'string' && value instanceof typeHandler.type) ) {
        return typeHandler.handler;
      }
    }
  }
};


/**
 * Build base squel classes and methods
 */
function _buildSquel(flavour = null) {
  let cls = {
    _getObjectClassName: _getObjectClassName,
  };

  // default query builder options
  cls.DefaultQueryBuilderOptions = {
    // If true then table names will be rendered inside quotes. The quote character used is configurable via the nameQuoteCharacter option.
    autoQuoteTableNames: false,
    // If true then field names will rendered inside quotes. The quote character used is configurable via the nameQuoteCharacter option.
    autoQuoteFieldNames: false,
    // If true then alias names will rendered inside quotes. The quote character used is configurable via the `tableAliasQuoteCharacter` and `fieldAliasQuoteCharacter` options.
    autoQuoteAliasNames: true,
    // If true then table alias names will rendered after AS keyword.
    useAsForTableAliasNames: false,
    // The quote character used for when quoting table and field names
    nameQuoteCharacter: '`',
    // The quote character used for when quoting table alias names
    tableAliasQuoteCharacter: '`',
    // The quote character used for when quoting table alias names
    fieldAliasQuoteCharacter: '"',
    // Custom value handlers where key is the value type and the value is the handler function
    valueHandlers: [],
    // Character used to represent a parameter value
    parameterCharacter: '?',
    // Numbered parameters returned from toParam() as $1, $2, etc.
    numberedParameters: false,
    // Numbered parameters prefix character(s)
    numberedParametersPrefix: '$',
    // Numbered parameters start at this number.
    numberedParametersStartAt: 1,
    // If true then replaces all single quotes within strings. The replacement string used is configurable via the `singleQuoteReplacement` option.
    replaceSingleQuotes: false,
    // The string to replace single quotes with in query strings
    singleQuoteReplacement: '\'\'',
    // String used to join individual blocks in a query when it's stringified
    separator: ' ',
  };

  // Global custom value handlers for all instances of builder
  cls.globalValueHandlers = [];


  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # Custom value types
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
   */


  // Register a new value handler
  cls.registerValueHandler = function(type, handler) {
    registerValueHandler(cls.globalValueHandlers, type, handler);
  };


  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # Base classes
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  */

  // Base class for cloneable builders
  cls.Cloneable = class {
    /**
     * Clone this builder
     */
    clone () {
      let newInstance = new this.constructor;

      return _extend(newInstance, _clone(_extend({}, this)));
    }
  }



  // Base class for all builders
  cls.BaseBuilder = class extends cls.Cloneable {
    /**
     * Constructor.
     * this.param  {Object} options Overriding one or more of `cls.DefaultQueryBuilderOptions`.
     */
    constructor (options) {
      super();

      let defaults = JSON.parse(JSON.stringify(cls.DefaultQueryBuilderOptions));

      this.options = _extend({}, defaults, options);
    }

    /**
     * Register a custom value handler for this builder instance.
     *
     * Note: this will override any globally registered handler for this value type.
     */
    registerValueHandler (type, handler) {
      registerValueHandler(this.options.valueHandlers, type, handler);

      return this;
    }


    /**
     * Sanitize given expression.
     */
    _sanitizeExpression (expr) {
      // If it's not an Expression builder instance
      if (!(expr instanceof cls.Expression)) {
        // It must then be a string
        if (typeof expr !== "string") {
          throw new Error("expression must be a string or Expression instance");
        }
      }

      return expr;
    }




    /**
     * Sanitize the given name.
     *
     * The 'type' parameter is used to construct a meaningful error message in case validation fails.
     */
    _sanitizeName (value, type) {
      if (typeof value !== "string") {
        throw new Error(`${type} must be a string`);
      }

      return value;
    }


    _sanitizeField (item, formattingOptions = {}) {
      if (!(item instanceof cls.BaseBuilder)) {
        item = this._sanitizeName(item, "field name");
      }

      return item;
    }


    _sanitizeQueryBuilder (item) {
      if (item instanceof cls.QueryBuilder) {
        return item;
      }

      throw new Error("query builder must be a QueryBuilder instance");
    }


    _sanitizeTable (item) {
      if (typeof item !== "string") {
        try {
          item = this._sanitizeQueryBuilder(item);
        } catch (e) {
          throw new Error("table name must be a string or a query builder");
        }
      } else {
        item = this._sanitizeName(item, 'table');

        if (this.options.autoQuoteTableNames) {
          const quoteChar = this.options.nameQuoteCharacter;

          item = `${quoteChar}${item}${quoteChar}`;
        }
      }

      return item;
    }

    _sanitizeTableAlias (item) {
      let sanitized = this._sanitizeName(item, "table alias");
      
      if (this.options.autoQuoteAliasNames) {
        let quoteChar = this.options.tableAliasQuoteCharacter;

        sanitized = `${quoteChar}${sanitized}${quoteChar}`;
      }

      return (this.options.useAsForTableAliasNames) 
        ? `AS ${sanitized}`
        : sanitized;
    }


    _sanitizeFieldAlias (item) {
      let sanitized = this._sanitizeName(item, "field alias");
      
      if (this.options.autoQuoteAliasNames) {
        let quoteChar = this.options.fieldAliasQuoteCharacter;

        return `${quoteChar}${sanitized}${quoteChar}`;
      } else {
        return sanitized;
      }
    }


    // Sanitize the given limit/offset value.
    _sanitizeLimitOffset (value) {
      value = parseInt(value);

      if (0 > value || isNaN(value)) {
        throw new Error("limit/offset must be >= 0");
      }

      return value;
    }



    // Santize the given field value
    _sanitizeValue (item) {
      let itemType = typeof item;

      if (null === item) {
        // null is allowed
      }
      else if ("string" === itemType || "number" === itemType || "boolean" === itemType) {
        // primitives are allowed
      }
      else if (item instanceof cls.QueryBuilder && item.isNestable()) {
        // QueryBuilder instances allowed
      }
      else if (item instanceof cls.FunctionBlock) {
        // FunctionBlock instances allowed
      }
      else {
        let typeIsValid = 
          !!getValueHandler(item, this.options.valueHandlers, cls.globalValueHandlers);

        if (!typeIsValid) {
          throw new Error("field value must be a string, number, boolean, null or one of the registered custom value types");
        }
      }

      return item;
    }


    // Escape a string value, e.g. escape quotes and other characters within it.
    _escapeValue (value) {
      return (!this.options.replaceSingleQuotes) ? value : (
        value.replace(/\'/g, this.options.singleQuoteReplacement)
      );
    }


    _formatFieldName (item) {
      if (this.options.autoQuoteFieldNames) {
        let quoteChar = this.options.nameQuoteCharacter;

        if (formattingOptions.ignorePeriodsForFieldNameQuotes) {
          // a.b.c -> `a.b.c`
          item = `${quoteChar}${item}${quoteChar}`;
        } else {
          // a.b.c -> `a`.`b`.`c`
          item = item
            .split('.')
            .map(function(v) {
              // treat '*' as special case (#79)
              return ('*' === v ? v : `${quoteChar}${v}${quoteChar}`);
            })
            .join('.')
        }
      }

      return item;
    }



    // Format the given custom value
    _formatCustomValue (value, asParam = false) {
      // user defined custom handlers takes precedence
      let customHandler = 
        getValueHandler(value, this.options.valueHandlers, cls.globalValueHandlers);

      // use the custom handler if available
      if (customHandler) {
        value = customHandler(value, asParam);
      }

      return value;
    }



    /** 
     * Format given value for inclusion into parameter values array.
     */
    _formatValueForParamArray (value) {
      if (_isArray(value)) {
        return value.map((v) => {
          return this._formatValueForParamArray(v);
        });
      } else {
        return this._formatCustomValue(value, true);
      }
    }



    /**
     * Format the given field value for inclusion into the query string
     */
    _formatValueForQueryString (value, formattingOptions = {}) {
      let customFormattedValue = this._formatCustomValue(value);
      
      // if formatting took place then return it directly
      if (customFormattedValue !== value) {
        return this._applyNestingFormatting(customFormattedValue);
      }

      // if it's an array then format each element separately
      if (_isArray(value)) {
        value = value.map((v) => {
          return this._formatValueForQueryString(v);
        });

        value = `(${value.join(', ')})`;
      }
      else {
        let typeofValue = typeof value;

        if (null === value) {
          value = "NULL";
        }
        else if (typeofValue === "boolean") {
          value = value ? "TRUE" : "FALSE";
        }
        else if (value instanceof cls.BaseBuilder) {
          value = this._applyNestingFormatting(value.toString());
        }
        else if (typeofValue !== "number") {
          if (formattingOptions.dontQuote) {
            value = `${value}`;
          } 
          else {
            let escapedValue = this._escapeValue(value);

            value = `'${escapedValue}'`;
          }
        }
      }

      return value;
    }


    _applyNestingFormatting(str, nesting = true) {
      if (nesting) {
        // don't want to apply twice
        if ('(' !== str.charAt(0) && ')' !== str.charAt(str.length - 1)) {
          return `(${str})`;
        }
      }

      return str;
    }


    /** 
     * Build given string and its corresponding parameter values into 
     * output.
     * 
     * @param {String} str
     * @param {Array}  values
     * @param {Object} [options] Additional options.
     * @param {Boolean} [options.buildParameterized] Whether to build paramterized string. Default is false.
     * @param {Boolean} [options.nested] Whether this expression is nested within another.
     * @return {Object}
     */
    _buildString(str, values, options = {}) {
      values = values || [];
      str = str || '';

      let formattedStr = '',
        curValue = -1,
        formattedValues = [];

      const paramChar = this.options.parameterCharacter;

      let idx = 0;

      while (str.length > idx) {
        // param char?
        if (str.substr(idx, paramChar.length) === paramChar) {
          let value = values[++curValue];

          if (options.buildParameterized) {
            if (value instanceof cls.BaseBuilder) {
              let ret = value.toParam({
                nested: true,
              });

              formattedStr += ret.text;
              formattedValues.push(...ret.value);
            } else {
              value = this._formatValueForParamArray(value);

              if (_isArray(value)) {
                // Array(6) -> "(??, ??, ??, ??, ??, ??)"
                let tmpStr = values.map(function() {
                  return paramChar;
                }).join(', ');

                formattedStr += `(${tmpStr})`;

                formattedValues.push(...value);
              } else {
                formattedStr += paramChar;

                formattedValues.push(value);              
              }
            }
          } else {
            formattedStr += this._formatValueForQueryString(value);
          }

          idx += paramChar.length;
        } else {
          formattedStr += str.charAt(idx);

          idx++;
        }
      }

      return {
        text: this._applyNestingFormatting(formattedStr, options.nested),
        values: formattedValues,
      };
    }



    /** 
     * Build all given strings and their corresponding parameter values into 
     * output.
     * 
     * @param {Array} strings
     * @param {Array}  strValues array of value arrays corresponding to each string.
     * @param {Object} [options] Additional options.
     * @param {Boolean} [options.buildParameterized] Whether to build paramterized string. Default is false.
     * @param {Boolean} [options.nested] Whether this expression is nested within another.
     * @return {Object}
     */
    _buildManyStrings(strings, strValues, options = {}) {
      let totalStr = '',
        totalValues = [];

      for (let idx in strings) {
        let str = strings[idx],
          strValues = strValues[idx];

        let { text, values } = this._buildString(str, strValues, {
          buildParameterized: options.buildParameterized,
          nested: false,
        });

        totalStr.push(text);
        totalValues.push(...values);
      }

      totalStr = totalStr.join(this.options.separator);

      return {
        text: this._applyNestingFormatting(totalStr, options.nested),
        values: totalValues,
      };
    }



    /**
     * Get parameterized representation of this instance.
     * 
     * @param {Object} [options] Options.
     * @param {Boolean} [options.buildParameterized] Whether to build paramterized string. Default is false.
     * @param {Boolean} [options.nested] Whether this expression is nested within another.
     * @return {Object}
     */
    _toParamString (options) {
      throw new Error('Not yet implemented');
    }


    /**
     * Get the expression string.
     * @return {String}
     */
    toString (options) {
      return this._toParamString(options).text;
    }


    /**
     * Get the parameterized expression string.
     * @return {Object}
     */
    toParam (options) {
      return this._toParamString(_extend(options, {
        buildParameterized: true,
      }));
    }
  }




  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # cls.Expressions
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  */

  /**
   * An SQL expression builder.
   *
   * SQL expressions are used in WHERE and ON clauses to filter data by various criteria.
   *
   * Expressions can be nested. Nested expression contains can themselves 
   * contain nested expressions. When rendered a nested expression will be 
   * fully contained within brackets.
   * 
   * All the build methods in this object return the object instance for chained method calling purposes.
   */
  cls.Expression = class extends cls.BaseBuilder {
    // Initialise the expression.
    constructor (options) {
      super(options);

      this._nodes = [];
    }


    // Combine the current expression with the given expression using the intersection operator (AND).
    and (expr, ...params) {
      expr = this._sanitizeExpression(expr);

      this._nodes.push({
        type: 'AND',
        expr: expr,
        para: params,
      });

      return this;
    }



    // Combine the current expression with the given expression using the union operator (OR).
    or (expr, ...params) {
      expr = this._sanitizeExpression(expr);

      this._nodes.push({
        type: 'OR',
        expr: expr,
        para: params,
      });

      return this;
    }



    _toParamString (options = {}) {
      let totalStr = [],
        totalValues = [];

      for (let node of this._nodes) {
        let { type, expr,  para } = node;

        let ret = (expr instanceof cls.Expression) 
          ? expr._toParamString({
              buildParameterized: options.buildParameterized,
              nested: true,
            })
          : this._buildString(expr, para, {
              buildParameterized: options.buildParameterized,
            })
        ;

        let { text, values } = ret;

        if (totalStr.length) {
          totalStr.push(type);
        }

        totalStr.push(text);
        totalValues.push(...values);
      }

      totalStr = totalStr.join(' ');

      return {
        text: totalStr,
        values: totalValues,
      };
    }

  }


 
  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # cls.Case
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  */


  /**
   * An SQL CASE expression builder.
   *
   * SQL cases are used to select proper values based on specific criteria.
   */
  cls.Case = class extends cls.BaseBuilder {
    constructor (fieldName, options = {}) {
      super(options);

      if (_isPlainObject(fieldName)) {
        options = fieldName;

        fieldName = null;
      }

      if (fieldName) {
        this._fieldName = this._sanitizeField( fieldName );
      }

      this.options = _extend({}, cls.DefaultQueryBuilderOptions, options);

      this._cases = [];
      this._elseValue = null;      
    }

    when (expression, ...values) {
      this._cases.unshift({
        expression: expression,
        values: values,
      });

      return this;
    }

    then (result) {
      if (this._cases.length == 0) {
        throw new Error("when() needs to be called first");
      }

      this._cases[0].result = result;
      
      return this;
    }

    else (elseValue) {
      this._elseValue = elseValue;

      return this;
    }


    _toParamString (options = {}) {
      let totalStr = [],
        totalValues = [];

      if (this._cases.length == 0) {
        totalStr = '' + this._formatValueForQueryString(this._elseValue);
      } else {
        let cases = this._cases.map((part) => {
          let { expression, values, result } = part;

          let condition = new cls.AbstractConditionBlock("WHEN");

          condition._condition.apply(condition, [expression].concat(values));

          let str = '';

          if (!options.buildParameterized) {
            str = condition.toString();
          }
          else {
            let ret = condition.toParam();
            str = ret.text;
            totalValues.push(...ret.values);
          }

          return `${str} THEN ${this._formatValueForQueryString(result)}`;
        });

        let str = `${cases.join(" ")} ELSE ${this._formatValueForQueryString(this._elseValue)} END`;

        if (this._fieldName) {
          str = `${this._fieldName} ${str}`;
        }

        totalStr = `CASE ${str}`;
      }

      return {
        text: totalStr,
        values: totalValues,
      };        
    }
  }


  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # Building blocks
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  */

  /*
  # A building block represents a single build-step within a query building process.
  #
  # Query builders consist of one or more building blocks which get run in a particular order. Building blocks can
  # optionally specify methods to expose through the query builder interface. They can access all the input data for
  # the query builder and manipulate it as necessary, as well as append to the final query string output.
  #
  # If you wish to customize how queries get built or add proprietary query phrases and content then it is recommended
  # that you do so using one or more custom building blocks.
  #
  # Original idea posted in https://github.com/hiddentao/export/issues/10#issuecomment-15016427
  */
  cls.Block = class extends cls.BaseBuilder {
    constructor (options) {
      super(options);
    }


    /**
    # Get input methods to expose within the query builder.
    #
    # By default all methods except the following get returned:
    #   methods prefixed with _
    #   constructor and toString()
    #
    # @return Object key -> function pairs
    */
    exposedMethods () {
      let ret = {};

      let obj = this;

      while (obj) {
        Object.getOwnPropertyNames(obj).forEach(function(prop) {
          if ('constructor' !== prop
                && typeof obj[prop] === "function" 
                && prop.charAt(0) !== '_' 
                && !cls.Block.prototype[prop])
          {
            ret[prop] = obj[prop];
          }
        });

        obj = Object.getPrototypeOf(obj);
      };
      
      return ret;
    }
  }



  // A fixed string which always gets output
  cls.StringBlock = class extends cls.Block {
    constructor (options, str) {
      super(options);

      this._str = str;
    }

    _toParamString (options) {
      return {
        text: this._str,
        values: [],
      };
    }
  }



  // A function string block
  cls.FunctionBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._strings = [];
      this._values = [];
    } 

    function (str, ...values) {
      this._strings.push(str);
      this._values.push(values);
    }

    _toParamString (options) {
      return this._buildManyStrings(this._strings, this._values, options);
    }
  }

  // Construct a FunctionValueBlock object for use as a value
  cls.fval = function(...args) {
    let inst = new cls.FunctionBlock();
    inst.function(...args);
    return inst;
  };


  // value handler for FunctionValueBlock objects
  cls.registerValueHandler(cls.FunctionBlock, function(value, asParam = false) {
    return asParam ? value.toParam() : value.toString();
  });


  /*
  # Table specifier base class
  */
  cls.AbstractTableBlock = class extends cls.Block {
    /**
     * @param {Boolean} [options.singleTable] If true then only allow one table spec.
     * @param {String} [options.prefix] String prefix for output.
     */
    constructor (options, prefix) {
      super(options);

      this._tables = [];
    }

    /**
    # Update given table.
    #
    # An alias may also be specified for the table.
    #
    # Concrete subclasses should provide a method which calls this
    */
    _table (table, alias = null) {
      alias = alias ? this._sanitizeTableAlias(alias) : alias;
      table = this._sanitizeTable(table);

      if (this.options.singleTable) {
        this._tables = [];
      }

      this._tables.push({
        table: table,
        alias: alias,       
      });
    }

    // get whether a table has been set
    _hasTable () {
      return 0 < this._tables.length;
    }

    /**
     * @override
     */
    _toParamString (options) {
      let totalStr = [],
        totalValues = [];

      if (this._hasTable()) {
        if (this.options.prefix) {
          totalStr += `${this.options.prefix} `;
        }

        // retrieve the parameterised queries
        for (let blk of this._tables) {
          let { table, alias } = blk;

          if (table instanceof BaseBuilder) {
            let { text, values } = table.toParam({
              nested: true,
            });

            if (alias) {
              text = `${text} ${alias}`;
            }

            totalStr.push(text);
            totalValues.push(...values);            
          } else {
            totalStr.push('' + table);            
          }
        }
      }

      return {
        text: totalStr.join(', '),
        values: totalValues,
      };
    }

  }



  // Update Table
  cls.UpdateTableBlock = class extends cls.AbstractTableBlock {
    table (table, alias = null) {
      this._table(table, alias);
    }

    _toParamString (options) {
      if (!this._hasTable()) {
        throw new Error("table() needs to be called");
      }

      return super._toParamString(options);
    }
  }


  // FROM table
  cls.FromTableBlock = class extends cls.AbstractTableBlock {
    constructor (options) {
      super(_extend(options, { 
        prefix: 'FROM',
      }));
    }

    from (table, alias = null) {
      this._table(table, alias);
    }

    _toParamString (options) {
      if (!this._hasTable()) {
        throw new Error("from() needs to be called");
      }

      return super._toParamString(options);
    }

  }


  // INTO table
  cls.IntoTableBlock = class extends cls.AbstractTableBlock {
    constructor (options) {
      super(_extend(options, { 
        prefix: 'INTO',
        singleTable: true,
      }));
    }

    into (table) {
      this._table(table);
    }

    _toParamString (options) {
      if (!this._hasTable()) {
        throw new Error("into() needs to be called");
      }

      return super._toParamString(options);
    }
  }


  // (SELECT) Get field
  cls.GetFieldBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._fields = [];
    }

    /**
    # Add the given fields to the final result set.
    #
    # The parameter is an Object containing field names (or database functions) as the keys and aliases for the fields
    # as the values. If the value for a key is null then no alias is set for that field.
    #
    # Internally this method simply calls the field() method of this block to add each individual field.
    #
    # options.ignorePeriodsForFieldNameQuotes - whether to ignore period (.) when automatically quoting the field name
    */
    fields (_fields, options = {}) {
      if (_isArray(_fields)) {
        for (let field of _fields) {
          this.field(field, null, options);
        }
      }
      else {
        for (let field in _fields) {
          let alias = _fields[field];

          this.field(field, alias, options);
        }
      }
    }

    /**
    # Add the given field to the final result set.
    #
    # The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
    # e.g. DATE_FORMAT(a.started, "%H")
    #
    # An alias may also be specified for this field.
    #
    # options.ignorePeriodsForFieldNameQuotes - whether to ignore period (.) when automatically quoting the field name
    */
    field (field, alias = null, options = {}) {
      alias = alias ? this._sanitizeFieldAlias(alias) : alias;
      field = this._sanitizeField(field);

      // if field-alias combo already present then don't add
      if (this._fields[field] && this._fields[field].alias === alias)
      {
        return this;
      }

      this._fields.push({
        name: field,
        alias: alias,
        options: options,
      });
    }


    _toParamString (options) {
      let { queryBuilder, buildParameterized } = options;

      let totalStr = '',
        totalValues = [];

      if (queryBuilder.getBlock(cls.FromTableBlock)._hasTable()) {
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
            totalValues.push(...ret.values);
          }

          if (alias) {
            totalValues += ` AS ${alias}`;
          }
        }

        if (!totalStr.length) {
          totalStr = "*";
        }
      }

      return {
        text: totalStr,
        values: totalValues,
      }
    }
  }



  // Base class for setting fields to values (used for INSERT and UPDATE queries)
  cls.AbstractSetFieldBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._reset();
    }

    _reset () {
      this._fields = [];
      this._values = [[]];
      this._fieldOptions = [[]];
    }

    // Update the given field with the given value.
    // This will override any previously set value for the given field.
    _set (field, value, options = {}) {
      if (this._values.length > 1) {
        throw new Error("Cannot set multiple rows of fields this way.");
      }

      if (typeof value == 'undefined') {
        value = this._sanitizeValue(value);
      }

      field = this._sanitizeField(field, options);

      // Explicity overwrite existing fields
      let index = this._fields.indexOf(field);

      // if field not defined before
      if (-1 === index) {
        this._fields.push(field);
        index = this._fields.length - 1;
      }

      this._values[0][index] = value;
      this._fieldOptions[0][index] = options;
    }


    // Insert fields based on the key/value pairs in the given object
    _setFields (fields, options = {}) {
      if (typeof fields !== 'object') {
        throw new Error("Expected an object but got " + typeof fields);
      }

      for (let field in fields) {
        this._set(field, fields[field], options);
      }
    }

    // Insert multiple rows for the given fields. Accepts an array of objects.
    // This will override all previously set values for every field.
    _setFieldsRows (fieldsRows, options = {}) {
      if (!_isArray(fieldsRows)) {
        throw new Error("Expected an array of objects but got " + typeof fieldsRows);
      }

      // Reset the objects stored fields and values
      this._reset();

      // for each row
      for (let i in fieldsRows) {
        let fieldRow = fieldsRows[i];

        // for each field
        for (let field in fieldRow) {
          let value = fieldRow[field];

          field = this._sanitizeField(field, options);
          value = this._sanitizeValue(value);

          let index = this._fields.indexOf(field);

          if (0 < i && -1 === index) {
            throw new Error('All fields in subsequent rows must match the fields in the first row');
          }

          // Add field only if it hasn't been added before
          if (-1 === index) {
            this._fields.push(field);
            index = this._fields.length - 1;            
          }

          // The first value added needs to add the array
          if (!_isArray(this._values[i])) {
            this._values[i] = [];
            this._fieldOptions[i] = [];
          }

          this._values[i][index] = value;
          this._fieldOptions[i][index] = options;
        }
      }
    }
  }


  // (UPDATE) SET field=value
  cls.SetFieldBlock = class extends cls.AbstractSetFieldBlock {
    set (field, value, options) {
      this._set(field, value, options);
    }

    setFields (fields, options) {
      this._setFields(fields, options);
    }

    _toParamString (options) {
      let { buildParameterized } = options;

      if (0 >= this._fields.length) {
        throw new Error("set() needs to be called");
      }

      let totalValues = '',
        totalValues = [];

      for (let i in this._fields) {
        totalStr = _pad(totalStr, ', ');

        let field = this._fields[i];
        let value = this.values[0][i];

        // e.g. field can be an expression such as `count = count + 1`
        if (typeof value === 'undefined') {
          totalStr += field;
        }
        else {
          let ret = this._buildString(
            `${field} = ${this.options.parameterCharacter}`, 
            value,
            {
              buildParameterized: buildParameterized,
            }
          );

          totalStr += ret.text;
          totalValues.push(...ret.values);
        }
      }

      return { 
        text: `SET ${totalStr}`, 
        values: totalValues 
      };
    }

  }


  // (INSERT INTO) ... field ... value
  cls.InsertFieldValueBlock = class extends cls.AbstractSetFieldBlock {
    set (field, value, options = {}) {
      this._set(field, value, options);
    }

    setFields (fields, options) {
      this._setFields(fields, options);
    }

    setFieldsRows (fieldsRows, options) {
      this._setFieldsRows(fieldsRows, options);
    }

    _toParamString (options) {
      let { buildParameterized } = options;
      
      let fieldString = this._fields.join(', '),
        valueStrings = [],
        totalValues = [];

      for (let i in this.values) {
        valueStrings[i] = '';

        for (let j in this.values[i]) {
          let ret = 
            this._buildString(this.options.parameterCharacter, this.values[i][j], {
              buildParameterized: buildParameterized,
            });

          totalValues.push(...ret.values);          

          valueStrings[i] = _pad(valueStrings[i], ', ');
          valueStrings[i] += str;
        }
      }

      return { 
        text: `(${fieldString}) VALUES (${valueStrings.join('), (')})`, 
        values: totalValues 
      };
    }

  }



  // (INSERT INTO) ... field ... (SELECT ... FROM ...)
  cls.InsertFieldsFromQueryBlock = class extends cls.Block {
    constructor (options) {
      super(options)
      this._fields = [];
      this._query = null;
    }

    fromQuery (fields, selectQuery) {
      this._fields = fields.map((v) => {
        return this._sanitizeField(v);
      });

      this._query = this._sanitizeQueryBuilder(selectQuery);
    }

    toString (queryBuilder) {
      if (0 >= this._fields.length) {
        return '';
      }

      return `(${this._fields.join(', ')}) (${this._query.toString()})`;
    }

    toParam (queryBuilder) {
      if (0 >= this._fields.length) {
       return { text: '', values: [] };
      }

      this._query.updateOptions( { "nestedBuilder": true } );
      let qryParam = this._query.toParam();

      return {
        text: `(${this._fields.join(', ')}) (${qryParam.text})`,
        values: qryParam.values,
      };
    }
  }



  // DISTINCT
  cls.DistinctBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.useDistinct = false;
    }

    // Add the DISTINCT keyword to the query.
    distinct () {
      this.useDistinct = true;
    }

    toString (queryBuilder) {
      return this.useDistinct ? "DISTINCT"  : "";
    }
  }



  // GROUP BY
  cls.GroupByBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.groups = [];
    }

    // Add a GROUP BY transformation for the given field.
    group (field) {
      field = this._sanitizeField(field);
      this.groups.push(field);
    }

    toString (queryBuilder) {
      if (0 < this.groups.length) {
        let groups = this.groups.join(', ');

        return `GROUP BY ${groups}`;
      } else {
        return "";
      }
    }
  }


  // OFFSET x
  cls.OffsetBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.offsets = null;
    }

    /**
    # Set the OFFSET transformation.
    #
    # Call this will override the previously set offset for this query. Also note that Passing 0 for 'max' will remove
    # the offset.
    */
    offset (start) {
      start = this._sanitizeLimitOffset(start);
      this.offsets = start;
    }

    toString (queryBuilder) {
      return this.offsets ? `OFFSET ${this.offsets}` : '';
    }
  }


  // Abstract condition base class
  cls.AbstractConditionBlock = class extends cls.Block {
    constructor (verb, options) {
      super(options);
      this.conditionVerb = verb;
      this.conditions = [];
    }

    /**
    # Add a condition.
    #
    # When the final query is constructed all the conditions are combined using the intersection (AND) operator.
    #
    # Concrete subclasses should provide a method which calls this
    */
    _condition (condition, ...values) {
      condition = this._sanitizeExpression(condition);

      let finalCondition = "";
      let finalValues = [];

      // if it's an Expression instance then convert to text and values
      if (condition instanceof cls.Expression) {
        let t = condition.toParam();
        finalCondition = t.text;
        finalValues = t.values;
      }
      else {
        for (let idx in condition) {
          let c = condition.charAt(idx);

          if (this.options.parameterCharacter === c && 0 < values.length) {
            let nextValue = values.shift();
            // # where b in (?, ? ?)
            if (_isArray(nextValue)) {
              let inValues = [];

              for (let item of nextValue) {
                inValues.push(this._sanitizeValue(item));
              }

              finalValues = finalValues.concat(inValues);

              let paramChars = inValues.map(() => this.options.parameterCharacter);

              finalCondition += `(${paramChars.join(', ')})`;
            }
            else {
              finalCondition += this.options.parameterCharacter;
              finalValues.push(this._sanitizeValue(nextValue));
            }
          }
          else {
            finalCondition += c;
          }
        }
      }

      if (finalCondition.length) {
        this.conditions.push({
          text: finalCondition,
          values: finalValues,        
        });
      }
    }


    toString (queryBuilder) {
      if (0 >= this.conditions.length) {
        return "";
      }

      let condStr = "";

      for (let cond of this.conditions) {
        if (condStr.length) {
          condStr += ") AND (";
        }

        if (0 < cond.values.length) {
          // replace placeholders with actual parameter values
          let pIndex = 0;

          let (c of cond.text) {
            if (this.options.parameterCharacter === c) {
              condStr += this._formatValueForQueryString( cond.values[pIndex++] );
            }
            else {
              condStr += c;
            }
          }
        }
        else {
          condStr += cond.text;
        }
      }

      return `${this.conditionVerb} (${condStr})`;
    }


    toParam (queryBuilder) {
      let ret = {
        text: "",
        values: [],
      }

      if (0 >= this.conditions.length) {
        return ret;
      }

      let condStr = "";

      for (let cond of this.conditions) {
        if (condStr.length) {
          condStr += ") AND (";
        }

        let str = cond.text.split(this.options.parameterCharacter);
        let i = 0;

        for (let v of cond.values) {
          if (undefined !== str[i]) {
            condStr += str[i];
          }
            
          let p = this._formatValueForParamArray(v);
          if (!!p && !!p.text) {
            condStr += `(${p.text})`;

            for (let qv of p.values) {
              ret.values.push( qv );
            }
          }
          else {
            condStr += this.options.parameterCharacter;

            ret.values.push( p );
          }
          i = i+1;
        }

        if (undefined !== str[i]) {
          condStr += str[i];
        }
      }

      ret.text = `${this.conditionVerb} (${condStr})`;

      return ret;
    }
  }


  // WHERE
  cls.WhereBlock = class extends cls.AbstractConditionBlock {
    constructor (options) {
      super('WHERE', options);
    }

    where (condition, ...values) {
      this._condition(condition, ...values);
    }
  }


  // HAVING
  cls.HavingBlock = class extends cls.AbstractConditionBlock {
    constructor(options) {
      super('HAVING', options);
    }

    having (condition, ...values) {
      this._condition(condition, ...values);
    }
  }


  // ORDER BY
  cls.OrderByBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.orders = [];
      this._values = [];
    }

    /**
    # Add an ORDER BY transformation for the given field in the given order.
    #
    # To specify descending order pass false for the 'asc' parameter.
    */
    order (field, asc, ...values) {
      field = this._sanitizeField(field);

      if (asc === undefined) {
        asc = true;
      }

      if (asc !== null) {
        asc = !!asc;
      }

      this._values = values;

      this.orders.push({
        field: field,
        dir: asc,   
      });
    }

    _toParamString (toParam = false) {
      if (0 < this.orders.length) {
        let pIndex = 0;
        let orders = "";

        for (let o of this.order) {
          if (orders.length) {
            orders += ", ";
          }

          let fstr = "";

          if (!toParam) {
            for (let c of o.field) {
              if (this.options.parameterCharacter === c) {
                fstr += this._formatValueForQueryString( this._values[pIndex++] );
              }
              else {
                fstr += c;
              }
            }
          }
          else {
            fstr = o.field;
          }

          orders += fstr;

          if (o.dir !== null) {
            orders += ` ${o.dir ? 'ASC' : 'DESC'}`;
          }
        }

        return `ORDER BY ${orders}`;
      }
      else {
        return "";
      }
    }

    toString (queryBuilder) {
      return this._toString();
    }

    toParam (queryBuilder) {
      return {
        text: this._toString(true),
        values: this._values.map((v) => {
          return this._formatValueForParamArray(v);
        }),
      };
    }
  }


  // LIMIT
  cls.LimitBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.limits = null;
    }

    /**
    # Set the LIMIT transformation.
    #
    # Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
    # the limit.
    */
    limit (max) {
      max = this._sanitizeLimitOffset(max);
      this.limits = max;
    }

    toString (queryBuilder) {
      return (this.limits || this.limits == 0) ? `LIMIT ${this.limits}` : "";
    }
  }



  // JOIN
  cls.JoinBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.joins = [];
    }

    /**
    # Add a JOIN with the given table.
    #
    # 'table' is the name of the table to join with.
    #
    # 'alias' is an optional alias for the table name.
    #
    # 'condition' is an optional condition (containing an SQL expression) for the JOIN. If this is an instance of
    # an expression builder then it gets evaluated straight away.
    #
    # 'type' must be either one of INNER, OUTER, LEFT or RIGHT. Default is 'INNER'.
    #
    */
    join (table, alias = null, condition = null, type = 'INNER') {
      table = this._sanitizeTable(table, true);
      alias = alias ? this._sanitizeTableAlias(alias) : alias;
      condition = condition ? this._sanitizeExpression(condition) : condition;

      this.joins.push({
        type: type,
        table: table,
        alias: alias,
        condition: condition,
      });
    }

    left_join (table, alias = null, condition = null) {
      this.join(table, alias, condition, 'LEFT');
    }

    right_join (table, alias = null, condition = null) {
      this.join(table, alias, condition, 'RIGHT');
    }

    outer_join (table, alias = null, condition = null) {
      this.join(table, alias, condition, 'OUTER');
    }

    left_outer_join (table, alias = null, condition = null) {
      this.join(table, alias, condition, 'LEFT OUTER');
    }

    full_join (table, alias = null, condition = null) {
      this.join(table, alias, condition, 'FULL');
    }

    cross_join (table, alias = null, condition = null) {
      this.join(table, alias, condition, 'CROSS');
    }

    toString (queryBuilder) {
      let joins = "";

      for (let j of (this.joins || []) {
        if (joins.length) {
          joins += " ";
        }

        joins += `${j.type} JOIN `;
        if ("string" === typeof j.table) {
          joins += j.table;
        }
        else {
          joins += `(${j.table})`;
        }
        if (j.alias) {
          joins += ` ${j.alias}`;
        }
        if (j.condition) {
          joins += ` ON (${j.condition})` 
        }
      }

      return joins;
    }

    toParam (queryBuilder) {
      let ret = {
        text: "",
        values: [],
      };

      let params = [];
      let joinStr = "";

      if (0 >= this.joins.length) {
        return ret;
      }

      // retrieve the parameterised queries
      for (let blk of this.joins) {
        let p;
        if ("string" === typeof blk.table) {
          p = { "text": `${blk.table}`, "values": [] };
        }
        else if (blk.table instanceof cls.QueryBuilder) {
          // building a nested query
          blk.table.updateOptions( { "nestedBuilder": true } );
          p = blk.table.toParam();
        }
        else {
          // building a nested query
          blk.updateOptions( { "nestedBuilder": true } );
          p = blk.toParam(queryBuilder);
        }

        if (blk.condition instanceof cls.Expression) {
          let cp = blk.condition.toParam();
          p.condition = cp.text;
          p.values = p.values.concat(cp.values);
        }
        else {
          p.condition = blk.condition;
        }

        p.join = blk;
        params.push( p );
      }

      // join the queries and their parameters
      // this is the last building block processed so always add UNION if there are any UNION blocks
      for (let p of params) {
        if (joinStr.length) {
          joinStr += " ";
        }

        joinStr += `${p.join.type} JOIN `;

        if ("string" === typeof p.join.table) {
          joinStr += p.text;
        }
        else {
          joinStr += `(${p.text})`;
        }
        if (p.join.alias) {
          joinStr += ` ${p.join.alias}`;
        }
        if (p.condition) {
          joinStr += ` ON (${p.condition})`;
        } 

        for (let v of p.values) {
          ret.values.push( this._formatCustomValue(v) );
        }
      }

      ret.text += joinStr;

      return ret;
    }
  }


  // UNION
  cls.UnionBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.unions = [];
    }

    /**
    # Add a UNION with the given table/query.
    #
    # 'table' is the name of the table or query to union with.
    #
    #
    # 'type' must be either one of UNION or UNION ALL.... Default is 'UNION'.
    #
    */
    union (table, type = 'UNION') {
      table = this._sanitizeTable(table, true);

      this.unions.push({
        type: type,
        table: table,
      });
    }

    // Add a UNION ALL with the given table/query.
    union_all (table) {
      this.union(table, 'UNION ALL');
    }

    toString (queryBuilder) {
      let unionStr = "";

      for (let j of (this.unions || [])) {
        if (unionStr.length) {
          unionStr += " ";
        }
        unionStr += `${j.type} `;
        if ("string" === typeof j.table) {
          unionStr += j.table;
        }
        else {
          unionStr += `(${j.table})`;
        }
      }

      return unionStr;
    }

    toParam (queryBuilder) {
      let ret = {
        text: "",
        values: [],
      };

      let params = [];
      let unionStr = "";

      if (0 >= this.unions.length) {
        return ret;
      }

      // retrieve the parameterised queries
      for (let blk of (this.unions || [])) {
        let p;
        if ("string" === typeof blk.table) {
          p = { "text": blk.table, "values": [] };
        }
        else if (blk.table instanceof cls.QueryBuilder) {
          // building a nested query
          blk.table.updateOptions( { "nestedBuilder": true } );
          p = blk.table.toParam();
        }
        else {
          // building a nested query
          blk.updateOptions( { "nestedBuilder": true } );
          p = blk.toParam(queryBuilder);
        }
        p.type = blk.type;
        params.push( p );
      }

      // join the queries and their parameters
      // this is the last building block processed so always add UNION if there are any UNION blocks
      for (let p of params) {
        if (unionStr.length) {
          unionStr += " ";
        }

        unionStr += `${p.type} (${p.text})`;

        for (let v of p.values) {
          ret.values.push( this._formatCustomValue(v) );
        }
      }

      ret.text += unionStr;

      return ret;
    }
  }


  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # Query builders
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  */

  /**
  # Query builder base class
  #
  # Note that the query builder does not check the final query string for correctness.
  #
  # All the build methods in this object return the object instance for chained method calling purposes.
  */
  cls.QueryBuilder = class extends cls.BaseBuilder {
    /**
    # Constructor
    #
    # blocks - array of cls.BaseBuilderBlock instances to build the query with.
    */
    constructor (options, blocks) {
      super(options);

      this.blocks = blocks || [];

      // Copy exposed methods into myself
      for (let block of this.blocks) {
        let exposedMethods = block.exposedMethods();

        for (let methodName in exposedMethods) {
          let methodBody = exposedMethods[methodName];

          if (undefined !== this[methodName]) {
            throw new Error(`Builder already has a builder method called: ${methodName}`);
          }

          ((block, name, body) => {
            this[name] = (...args) => {
              body.call(block, ...args);

              return this;
            };
          })(block, methodName, methodBody);
        }
      }
    }


    /**
    # Register a custom value handler for this query builder and all its contained blocks.
    #
    # Note: This will override any globally registered handler for this value type.
    */
    registerValueHandler (type, handler) {
      for (let block of this.blocks) {
        block.registerValueHandler(type, handler);
      }
      
      super.registerValueHandler(type, handler);

      return this;
    }

    /**
    # Update query builder options
    #
    # This will update the options for all blocks too. Use this method with caution as it allows you to change the
    # behaviour of your query builder mid-build.
    */
    updateOptions (options) {
      this.options = _extend({}, this.options, options);

      for (let block of this.blocks) {
        block.options = _extend({}, block.options, options);
      }
    }


    // Get the final fully constructed query string.
    toString () {
      let blockStr = this.blocks.map((blk) => {
        return blk.toString(this);
      });

      return blockStr
        .filter((v) => (0 < v.length))
        .join(this.options.separator);
    }

    // Get the final fully constructed query param obj.
    toParam (options = {}) {
      let old = this.options;
      if (!!options) {
        this.options = _extend({}, this.options, options);
      }
      let result = { text: '', values: [] };
      let blocks = this.blocks.map((v) => v.toParam(this));
      let blockTexts = (blocks.map((v) => v.text));
      let blockValues = (blocks.map((v) => v.values));
      result.text = blockTexts
        .filter((v) => {
          return (0 < v.length);
        })
        .join(this.options.separator);

      result.values = [].concat(...blockValues);

      if (!this.options.nestedBuilder) {
        if (this.options.numberedParameters) 
        {
          let i = (undefined !== this.options.numberedParametersStartAt) 
            ? this.options.numberedParametersStartAt 
            : 1;
          let regex = new RegExp("\\" + this.options.parameterCharacter, 'g')
          result.text = result.text.replace(
            regex, () => `${this.options.numberedParametersPrefix}${i++}`
          );
        }
      }
      this.options = old;
      return result;
    }

    // Deep clone
    clone () {
      let blockClones = this.blocks.map((v) => {
        return v.clone();
      });

      return new this.constructor(this.options, blockClones);
    }

    // Get a specific block
    getBlock (blockType) {
      let filtered = this.blocks.filter(b => b instanceof blockType);

      return filtered[0];
    }
  }


  // SELECT query builder.
  cls.Select = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'SELECT'),
        new cls.FunctionBlock(options),
        new cls.DistinctBlock(options),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(_extend({}, options, { allowNested: true })),
        new cls.JoinBlock(_extend({}, options, { allowNested: true })),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.HavingBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.OffsetBlock(options),
        new cls.UnionBlock(_extend({}, options, { allowNested: true })),
      ];

      super(options, blocks);
    } 
  }



  // UPDATE query builder.
  cls.Update = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
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





  // DELETE query builder.
  cls.Delete = class extends cls.QueryBuilder {
    constructor (options, blocks = null) {
      blocks = blocks || [
        new cls.StringBlock(options, 'DELETE'),
        new cls.FromTableBlock(options),
        new cls.JoinBlock(options),
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
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ];

      super(options, blocks);
    }
  }


  let _squel = {
    VERSION: '<<VERSION_STRING>>',
    flavour: flavour,
    expr: function(options) {
      return new cls.Expression(options);
    },
    case: function(name, options) {
      return new cls.Case(name, options);
    },
    select: function(options, blocks) {
      return new cls.Select(options, blocks);
    },
    update: function(options, blocks) {
      return new cls.Update(options, blocks);
    },
    insert: function(options, blocks) {
      return new cls.Insert(options, blocks);
    },
    delete: function(options, blocks) {
      return new cls.Delete(options, blocks);
    },
    registerValueHandler: cls.registerValueHandler,
    fval: cls.fval,
  };

  // aliases
  _squel.remove = _squel.delete;

  // classes
  _squel.cls = cls;


  return _squel;
}


/**
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
# Exported instance (and for use by flavour definitions further down).
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
*/

let squel = _buildSquel();


/**
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
# Squel SQL flavours
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
*/

// Available flavours
squel.flavours = {};

// Setup Squel for a particular SQL flavour
squel.useFlavour = function(flavour = null) {
  if (!flavour) {
    return squel;
  }

  if (squel.flavours[flavour] instanceof Function) {
    let s = _buildSquel(flavour);

    squel.flavours[flavour].call(null, s);

    // add in flavour methods
    s.flavours = squel.flavours;
    s.useFlavour = squel.useFlavour;

    return s;
  }
  else {
    throw new Error(`Flavour not available: ${flavour}`);
  }
}


