// append to string if non-empty
function _pad (str, pad) {
  return (str.length) ? str + pad : str;
}


// Extend given object's with other objects' properties, overriding existing ones if necessary
function _extend (dst, ...sources) {
  if (dst && sources) {
    for (let src of sources) {
      if (typeof src === 'object') {
        Object.getOwnPropertyNames(src).forEach(function (key) {
          dst[key] = src[key];
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

  for (let typeHandler of handlers) {
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
  for (let handlers of handlerLists) {
    for (let typeHandler of handlers) {
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
    // Function for formatting string values prior to insertion into query string
    stringFormatter: null,
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


    _sanitizeField (item) {
      if (!(item instanceof cls.BaseBuilder)) {
        item = this._sanitizeName(item, "field name");
      }

      return item;
    }


    _sanitizeBaseBuilder (item) {
      if (item instanceof cls.BaseBuilder) {
        return item;
      }

      throw new Error("must be a BaseBuilder instance");
    }


    _sanitizeTable (item) {
      if (typeof item !== "string") {
        try {
          item = this._sanitizeBaseBuilder(item);
        } catch (e) {
          throw new Error("table name must be a string or a query builder");
        }
      } else {
        item = this._sanitizeName(item, 'table');
      }

      return item;
    }

    _sanitizeTableAlias (item) {
      return this._sanitizeName(item, "table alias");
    }


    _sanitizeFieldAlias (item) {
      return this._sanitizeName(item, "field alias");
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
      else if (item instanceof cls.BaseBuilder) {
        // Builders allowed
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


    _formatTableName (item) {
      if (this.options.autoQuoteTableNames) {
        const quoteChar = this.options.nameQuoteCharacter;

        item = `${quoteChar}${item}${quoteChar}`;
      }

      return item;
    }


    _formatFieldAlias (item) {
      if (this.options.autoQuoteAliasNames) {
        let quoteChar = this.options.fieldAliasQuoteCharacter;

        item = `${quoteChar}${item}${quoteChar}`;
      }

      return item;
    }


    _formatTableAlias (item) {
      if (this.options.autoQuoteAliasNames) {
        let quoteChar = this.options.tableAliasQuoteCharacter;

        item = `${quoteChar}${item}${quoteChar}`;
      }

      return (this.options.useAsForTableAliasNames) 
        ? `AS ${item}`
        : item;
    }


    _formatFieldName (item, formattingOptions = {}) {
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

        value = this._applyNestingFormatting(value.join(', '));
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
          // if it's a string and we have custom string formatting turned on then use that
          if ('string' === typeofValue && this.options.stringFormatter) {
            return this.options.stringFormatter(value);
          }

          if (formattingOptions.dontQuote) {
            value = `${value}`;
          } else {
            let escapedValue = this._escapeValue(value);

            value = `'${escapedValue}'`;
          }
        }
      }

      return value;
    }


    _applyNestingFormatting(str, nesting = true) {
      if (str && typeof str === 'string' && nesting) {
        // don't want to apply twice
        if ('(' !== str.charAt(0) || ')' !== str.charAt(str.length - 1)) {
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
     * @param {Boolean} [options.formattingOptions] Formatting options for values in query string.
     * @return {Object}
     */
    _buildString (str, values, options = {}) {
      let { nested, buildParameterized, formattingOptions } = options;

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

          if (buildParameterized) {
            if (value instanceof cls.BaseBuilder) {
              let ret = value._toParamString({
                buildParameterized: buildParameterized,
                nested: true,
              });

              formattedStr += ret.text;
              formattedValues.push(...ret.values);
            } else {
              value = this._formatValueForParamArray(value);

              if (_isArray(value)) {
                // Array(6) -> "(??, ??, ??, ??, ??, ??)"
                let tmpStr = value.map(function() {
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
            formattedStr += 
              this._formatValueForQueryString(value, formattingOptions);
          }

          idx += paramChar.length;
        } else {
          formattedStr += str.charAt(idx);

          idx++;
        }
      }

      return {
        text: this._applyNestingFormatting(formattedStr, !!nested),
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
      let totalStr = [],
        totalValues = [];

      for (let idx = 0; strings.length > idx; ++idx) {
        let inputString = strings[idx],
          inputValues = strValues[idx];

        let { text, values } = this._buildString(inputString, inputValues, {
          buildParameterized: options.buildParameterized,
          nested: false,
        });

        totalStr.push(text);
        totalValues.push(...values);
      }

      totalStr = totalStr.join(this.options.separator);

      return {
        text: totalStr.length 
          ? this._applyNestingFormatting(totalStr, !!options.nested) 
          : '',
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
    toString (options = {}) {
      return this._toParamString(options).text;
    }


    /**
     * Get the parameterized expression string.
     * @return {Object}
     */
    toParam (options = {}) {
      return this._toParamString(_extend({}, options, {
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


        let { text, values } = (expr instanceof cls.Expression) 
          ? expr._toParamString({
              buildParameterized: options.buildParameterized,
              nested: true,
            })
          : this._buildString(expr, para, {
              buildParameterized: options.buildParameterized,
            })
        ;

        if (totalStr.length) {
          totalStr.push(type);
        }

        totalStr.push(text);
        totalValues.push(...values);
      }

      totalStr = totalStr.join(' ');

      return {
        text: this._applyNestingFormatting(totalStr, !!options.nested),
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
      let totalStr = '',
        totalValues = [];

      for (let { expression, values, result } of this._cases) {
        totalStr = _pad(totalStr,' ');

        let ret = this._buildString(expression, values, {
          buildParameterized: options.buildParameterized,
          nested: true,
        });

        totalStr += `WHEN ${ret.text} THEN ${this._formatValueForQueryString(result)}`;
        totalValues.push(...ret.values);
      }

      if (totalStr.length) {
        totalStr += ` ELSE ${this._formatValueForQueryString(this._elseValue)} END`;

        if (this._fieldName) {
          totalStr = `${this._fieldName} ${totalStr}`;
        }

        totalStr = `CASE ${totalStr}`;
      } else {
        totalStr = this._formatValueForQueryString(this._elseValue);
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

    _toParamString (options = {}) {
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

    _toParamString (options = {}) {
      return this._buildManyStrings(this._strings, this._values, options);
    }
  }


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
    _toParamString (options = {}) {
      let totalStr = '',
        totalValues = [];

      if (this._hasTable()) {
        // retrieve the parameterised queries
        for (let { table, alias } of this._tables) {
          totalStr = _pad(totalStr, ', ');

          let tableStr;

          if (table instanceof cls.BaseBuilder) {
            let { text, values } = table._toParamString({
              buildParameterized: options.buildParameterized,
              nested: true,
            });

            tableStr = text;
            totalValues.push(...values);            
          } else {
            tableStr = this._formatTableName(table);
          }

          if (alias) {
            tableStr += ` ${this._formatTableAlias(alias)}`;
          }

          totalStr += tableStr;
        }

        if (this.options.prefix) {
          totalStr = `${this.options.prefix} ${totalStr}`;
        }
      }

      return {
        text: totalStr,
        values: totalValues,
      };
    }

  }



  // target table for DELETE queries, DELETE <??> FROM
  cls.TargetTableBlock = class extends cls.AbstractTableBlock {
    target (table) {
      this._table(table);
    }
  }



  // Update Table
  cls.UpdateTableBlock = class extends cls.AbstractTableBlock {
    table (table, alias = null) {
      this._table(table, alias);
    }

    _toParamString (options = {}) {
      if (!this._hasTable()) {
        throw new Error("table() needs to be called");
      }

      return super._toParamString(options);
    }
  }


  // FROM table
  cls.FromTableBlock = class extends cls.AbstractTableBlock {
    constructor (options) {
      super(_extend({}, options, { 
        prefix: 'FROM',
      }));
    }

    from (table, alias = null) {
      this._table(table, alias);
    }
  }


  // INTO table
  cls.IntoTableBlock = class extends cls.AbstractTableBlock {
    constructor (options) {
      super(_extend({}, options, { 
        prefix: 'INTO',
        singleTable: true,
      }));
    }

    into (table) {
      this._table(table);
    }

    _toParamString (options = {}) {
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
          totalValues.push(...ret.values);
        }

        if (alias) {
          totalStr += ` AS ${this._formatFieldAlias(alias)}`;
        }
      }

      if (!totalStr.length) {
        // if select query and a table is set then all fields wanted
        let fromTableBlock = queryBuilder && queryBuilder.getBlock(cls.FromTableBlock);
        if (fromTableBlock && fromTableBlock._hasTable()) {
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
      this._valueOptions = [[]];
    }

    // Update the given field with the given value.
    // This will override any previously set value for the given field.
    _set (field, value, valueOptions = {}) {
      if (this._values.length > 1) {
        throw new Error("Cannot set multiple rows of fields this way.");
      }

      if (typeof value !== 'undefined') {
        value = this._sanitizeValue(value);
      }

      field = this._sanitizeField(field);

      // Explicity overwrite existing fields
      let index = this._fields.indexOf(field);

      // if field not defined before
      if (-1 === index) {
        this._fields.push(field);
        index = this._fields.length - 1;
      }

      this._values[0][index] = value;
      this._valueOptions[0][index] = valueOptions;
    }


    // Insert fields based on the key/value pairs in the given object
    _setFields (fields, valueOptions = {}) {
      if (typeof fields !== 'object') {
        throw new Error("Expected an object but got " + typeof fields);
      }

      for (let field in fields) {
        this._set(field, fields[field], valueOptions);
      }
    }

    // Insert multiple rows for the given fields. Accepts an array of objects.
    // This will override all previously set values for every field.
    _setFieldsRows (fieldsRows, valueOptions = {}) {
      if (!_isArray(fieldsRows)) {
        throw new Error("Expected an array of objects but got " + typeof fieldsRows);
      }

      // Reset the objects stored fields and values
      this._reset();

      // for each row
      for (let i = 0; fieldsRows.length > i; ++i) {
        let fieldRow = fieldsRows[i];

        // for each field
        for (let field in fieldRow) {
          let value = fieldRow[field];

          field = this._sanitizeField(field);
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
            this._valueOptions[i] = [];
          }

          this._values[i][index] = value;
          this._valueOptions[i][index] = valueOptions;
        }
      }
    }
  }


  // (UPDATE) SET field=value
  cls.SetFieldBlock = class extends cls.AbstractSetFieldBlock {
    set (field, value, options) {
      this._set(field, value, options);
    }

    setFields (fields, valueOptions) {
      this._setFields(fields, valueOptions);
    }

    _toParamString (options = {}) {
      let { buildParameterized } = options;

      if (0 >= this._fields.length) {
        throw new Error("set() needs to be called");
      }

      let totalStr = '',
        totalValues = [];

      for (let i = 0; i<this._fields.length; ++i) {
        totalStr = _pad(totalStr, ', ');

        let field = this._formatFieldName(this._fields[i]);
        let value = this._values[0][i];

        // e.g. field can be an expression such as `count = count + 1`
        if (typeof value === 'undefined') {
          totalStr += field;
        }
        else {
          let ret = this._buildString(
            `${field} = ${this.options.parameterCharacter}`, 
            [value],
            {
              buildParameterized: buildParameterized,
              formattingOptions: this._valueOptions[0][i],
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

    setFields (fields, valueOptions) {
      this._setFields(fields, valueOptions);
    }

    setFieldsRows (fieldsRows, valueOptions) {
      this._setFieldsRows(fieldsRows, valueOptions);
    }

    _toParamString (options = {}) {
      let { buildParameterized } = options;
      
      let fieldString = this._fields
        .map((f) => this._formatFieldName(f))
        .join(', ');
      
      let valueStrings = [],
        totalValues = [];

      for (let i = 0; i < this._values.length; ++i) {
        valueStrings[i] = '';

        for (let j = 0; j < this._values[i].length; ++j) {
          let ret = 
            this._buildString(this.options.parameterCharacter, [this._values[i][j]], {
              buildParameterized: buildParameterized,
              formattingOptions: this._valueOptions[i][j],
            });

          totalValues.push(...ret.values);          

          valueStrings[i] = _pad(valueStrings[i], ', ');
          valueStrings[i] += ret.text;
        }
      }

      return { 
        text: fieldString.length 
          ? `(${fieldString}) VALUES (${valueStrings.join('), (')})`
          : '',
        values: totalValues 
      };
    }

  }



  // (INSERT INTO) ... field ... (SELECT ... FROM ...)
  cls.InsertFieldsFromQueryBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._fields = [];
      this._query = null;
    }

    fromQuery (fields, selectQuery) {
      this._fields = fields.map((v) => {
        return this._sanitizeField(v);
      });

      this._query = this._sanitizeBaseBuilder(selectQuery);
    }

    _toParamString (options = {}) {
      let totalStr = '',
        totalValues = [];

      if (this._fields.length && this._query) {
        let { text, values } = this._query._toParamString({
          buildParameterized: options.buildParameterized,
          nested: true,
        });

        totalStr = `(${this._fields.join(', ')}) ${this._applyNestingFormatting(text)}`;
        totalValues = values;
      }

      return {
        text: totalStr,
        values: totalValues,
      };
    }
  }



  // DISTINCT
  cls.DistinctBlock = class extends cls.Block {
    // Add the DISTINCT keyword to the query.
    distinct () {
      this._useDistinct = true;
    }

    _toParamString () {
      return {
        text: this._useDistinct ? "DISTINCT"  : "",
        values: [],
      };
    }
  }



  // GROUP BY
  cls.GroupByBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._groups = [];
    }

    // Add a GROUP BY transformation for the given field.
    group (field) {
      this._groups.push(this._sanitizeField(field));
    }

    _toParamString (options = {}) {
      return {
        text: this._groups.length ? `GROUP BY ${this._groups.join(', ')}`: '',
        values: [],
      };
    }
  }


  // OFFSET x
  cls.OffsetBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._offsets = null;
    }

    /**
    # Set the OFFSET transformation.
    #
    # Call this will override the previously set offset for this query. Also note that Passing 0 for 'max' will remove
    # the offset.
    */
    offset (start) {
      this._offsets = this._sanitizeLimitOffset(start);
    }


    _toParamString () {
      return {
        text: this._offsets ? `OFFSET ${this._offsets}` : '',
        values: [],
      };
    }
  }


  // Abstract condition base class
  cls.AbstractConditionBlock = class extends cls.Block {
    /** 
     * @param {String} options.verb The condition verb.
     */
    constructor (options) {
      super(options);

      this._conditions = [];
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

      this._conditions.push({
        expr: condition,
        values: values,
      });
    }


    _toParamString (options = {}) {
      let totalStr = [],
        totalValues = [];

      for (let { expr, values } of this._conditions) {
        let ret = (expr instanceof cls.Expression) 
          ? expr._toParamString({
              buildParameterized: options.buildParameterized,
            })
          : this._buildString(expr, values, {
              buildParameterized: options.buildParameterized,
            })
        ;

        if (ret.text.length) {
          totalStr.push(ret.text);
        }

        totalValues.push(...ret.values);
      }

      if (totalStr.length) {
        totalStr = totalStr.join(') AND (');
      }

      return {
        text: totalStr.length ? `${this.options.verb} (${totalStr})` : '',
        values: totalValues,
      };
    }
  }


  // WHERE
  cls.WhereBlock = class extends cls.AbstractConditionBlock {
    constructor (options) {
      super(_extend({}, options, {
        verb: 'WHERE'
      }));
    }

    where (condition, ...values) {
      this._condition(condition, ...values);
    }
  }


  // HAVING
  cls.HavingBlock = class extends cls.AbstractConditionBlock {
    constructor(options) {
      super(_extend({}, options, {
        verb: 'HAVING'
      }));
    }

    having (condition, ...values) {
      this._condition(condition, ...values);
    }
  }


  // ORDER BY
  cls.OrderByBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._orders = [];
    }

    /**
    # Add an ORDER BY transformation for the given field in the given order.
    #
    # To specify descending order pass false for the 'asc' parameter.
    */
    order (field, asc, ...values) {
      field = this._sanitizeField(field);

      asc = (asc === undefined) ? true : asc;
      asc = (asc !== null) ? !!asc : asc;

      this._orders.push({
        field: field,
        dir: asc,   
        values: values,
      });
    }

    _toParamString (options = {}) {
      let totalStr = '',
        totalValues = [];

      for (let {field, dir, values} of this._orders) {
        totalStr = _pad(totalStr, ', ');

        let ret = this._buildString(field, values, {
          buildParameterized: options.buildParameterized,
        });

        totalStr += ret.text,
        totalValues.push(...ret.values);

        if (dir !== null) {
          totalStr += ` ${dir ? 'ASC' : 'DESC'}`;
        }
      }

      return {
        text: totalStr.length ? `ORDER BY ${totalStr}` : '',
        values: totalValues,
      };
    }
  }



  // LIMIT
  cls.LimitBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._limit = null;
    }

    /**
    # Set the LIMIT transformation.
    #
    # Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
    # the limit.
    */
    limit (limit) {
      this._limit = this._sanitizeLimitOffset(limit);
    }


    _toParamString () {
      return {
        text: (null !== this._limit) ? `LIMIT ${this._limit}` : '',
        values: [],
      };
    }
  }



  // JOIN
  cls.JoinBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._joins = [];
    }

    /**
    # Add a JOIN with the given table.
    #
    # 'table' is the name of the table to join with.
    #
    # 'alias' is an optional alias for the table name.
    #
    # 'condition' is an optional condition (containing an SQL expression) for the JOIN.
    #
    # 'type' must be either one of INNER, OUTER, LEFT or RIGHT. Default is 'INNER'.
    #
    */
    join (table, alias = null, condition = null, type = 'INNER') {
      table = this._sanitizeTable(table, true);
      alias = alias ? this._sanitizeTableAlias(alias) : alias;
      condition = condition ? this._sanitizeExpression(condition) : condition;

      this._joins.push({
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


    _toParamString (options = {}) {
      let totalStr = "",  
        totalValues = [];

      for (let {type, table, alias, condition} of this._joins) {
        totalStr = _pad(totalStr, this.options.separator);

        let tableStr;

        if (table instanceof cls.BaseBuilder) {
          let ret = table._toParamString({
            buildParameterized: options.buildParameterized,
            nested: true
          });

          totalValues.push(...ret.values);          
          tableStr = ret.text;
        } else {
          tableStr = this._formatTableName(table);
        }

        totalStr += `${type} JOIN ${tableStr}`;

        if (alias) {
          totalStr += ` ${this._formatTableAlias(alias)}`;
        }

        if (condition) {
          totalStr += ' ON ';

          let ret;

          if (condition instanceof cls.Expression) {
            ret = condition._toParamString({
              buildParameterized: options.buildParameterized,
            });
          } else {
            ret = this._buildString(condition, [], {
              buildParameterized: options.buildParameterized,
            });
          }

          totalStr += this._applyNestingFormatting(ret.text);
          totalValues.push(...ret.values);
        }
      }

      return {
        text: totalStr,
        values: totalValues,
      };
    }
  }


  // UNION
  cls.UnionBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this._unions = [];
    }

    /**
    # Add a UNION with the given table/query.
    #
    # 'table' is the name of the table or query to union with.
    #
    # 'type' must be either one of UNION or UNION ALL.... Default is 'UNION'.
    */
    union (table, type = 'UNION') {
      table = this._sanitizeTable(table);

      this._unions.push({
        type: type,
        table: table,
      });
    }

    // Add a UNION ALL with the given table/query.
    union_all (table) {
      this.union(table, 'UNION ALL');
    }


    _toParamString (options = {}) {
      let totalStr = '',
        totalValues = [];

      for (let {type, table} of this._unions) {
        totalStr = _pad(totalStr, this.options.separator);

        let tableStr;

        if (table instanceof cls.BaseBuilder) {
          let ret = table._toParamString({
            buildParameterized: options.buildParameterized,
            nested: true
          });

          tableStr = ret.text;
          totalValues.push(...ret.values);
        } else {
          totalStr = this._formatTableName(table);
        }

        totalStr += `${type} ${tableStr}`;
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



    // Get the final fully constructed query param obj.
    _toParamString (options = {}) {
      options = _extend({}, this.options, options);

      let blockResults = this.blocks.map((b) => b._toParamString({
        buildParameterized: options.buildParameterized,
        queryBuilder: this,
      }));

      let blockTexts = blockResults.map((b) => b.text);
      let blockValues = blockResults.map((b) => b.values);

      let totalStr = blockTexts
        .filter((v) => (0 < v.length))
        .join(options.separator);

      let totalValues = [].concat(...blockValues);

      if (!options.nested) {
        if (options.numberedParameters) {
          let i = (undefined !== options.numberedParametersStartAt) 
            ? options.numberedParametersStartAt 
            : 1;

          // construct regex for searching
          const regex = options.parameterCharacter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

          totalStr = totalStr.replace(
            new RegExp(regex, 'g'), 
            function() {
              return `${options.numberedParametersPrefix}${i++}`;
            }
          );
        }
      }

      return {
        text: this._applyNestingFormatting(totalStr, !!options.nested),
        values: totalValues,
      };
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
    str: function(...args) {
      let inst = new cls.FunctionBlock();
      inst.function(...args);
      return inst;
    },
    registerValueHandler: cls.registerValueHandler,
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


