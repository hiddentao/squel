// for-of (temporary fix for #219 until v5 is released)
function _forOf (arr, cb) {
  if (arr && arr.length) {
    for (let i=0; i<arr.length; ++i) {
      cb(arr[i]);
    }
  }
};
function _forOfStr (str, cb) {
  if (str && str.length) {
    for (let i=0; i<str.length; ++i) {
      cb(str.charAt(i));
    }
  }
};


// Extend given object's with other objects' properties, overriding existing ones if necessary
function _extend (dst, ...sources) {
  if (sources) {
    _forOf(sources, function(src) {
      if (typeof src === 'object') {
        Object.getOwnPropertyNames(src).forEach(function (key) {
          if (typeof src[key] !== 'function') {
            dst[key] = src[key];
          }
        });
      }
    });
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
     * Sanitize the given condition. 
     */
    _sanitizeCondition (condition) {
      // If it's not an Expression builder instance
      if (!(condition instanceof cls.Expression)) {
        // It must then be a string
        if (typeof condition !== "string") {
          throw new Error("condition must be a string or Expression instance");
        }
      }

      return condition;
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
      if (item instanceof cls.QueryBuilder) {
        item = `(${item})`;
      } else {
        item = this._sanitizeName(item, "field name");

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
      }

      return item;
    }


    _sanitizeNestableQuery (item) {
      if (item instanceof cls.QueryBuilder && item.isNestable()) {
        return item;
      }

      throw new Error("must be a nestable query, e.g. SELECT");
    }


    _sanitizeTable (item, allowNested = false) {
      if (allowNested) {
        if (typeof item !== "string") {
          try {
            item = this._sanitizeNestableQuery(item);
          } catch (e) {
            throw new Error("table name must be a string or a nestable query instance");
          }
        }
      } else {
        item = this._sanitizeName(item, 'table name');
      }

      if (this.options.autoQuoteTableNames) {
        let quoteChar = this.options.nameQuoteCharacter;

        return `${quoteChar}${item}${quoteChar}`;
      } else {
        return item;
      }
    }

    _sanitizeTableAlias (item) {
      let sanitized = this._sanitizeName(item, "table alias");
      
      if (this.options.autoQuoteAliasNames) {
        let quoteChar = this.options.tableAliasQuoteCharacter;

        sanitized = `${quoteChar}${sanitized}${quoteChar}`;
      }

      if (this.options.useAsForTableAliasNames) {
        return `AS ${sanitized}`;
      } else {
        return sanitized;
      }
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



    // Format the given field value for inclusion into query parameter array
    _formatValueAsParam (value) {
      if (_isArray(value)) {
        return value.map((v) => {
          return this._formatValueAsParam(v)
        });
      } else {
        if (value instanceof cls.QueryBuilder && value.isNestable()) {
          value.updateOptions({ 
            "nestedBuilder": true 
          });

          return value.toParam();
        }
        else if (value instanceof cls.Expression) {
          return value.toParam();
        }
        else {
          return this._formatCustomValue(value, true);
        }
      }
    }



    // Format the given field value for inclusion into the query string
    _formatValue (value, formattingOptions = {}) {
      let customFormattedValue = this._formatCustomValue(value);
      
      // if formatting took place then return it directly
      if (customFormattedValue !== value) {
        return `(${customFormattedValue})`;
      }

      // if it's an array then format each element separately
      if (_isArray(value)) {
        value = value.map((v) => {
          return this._formatValue(v);
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
        else if (value instanceof cls.QueryBuilder) {
          value = `(${value})`;
        }
        else if (value instanceof cls.Expression) {
          value = `(${value})`;
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
  }



  /*
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  # cls.Expressions
  # ---------------------------------------------------------------------------------------------------------
  # ---------------------------------------------------------------------------------------------------------
  */

  /*
  # An SQL expression builder.
  #
  # SQL expressions are used in WHERE and ON clauses to filter data by various criteria.
  #
  # This builder works by building up the expression as a hierarchical tree of nodes. The toString() method then
  # traverses this tree in order to build the final expression string.
  #
  # cls.Expressions can be nested. Nested expression contains can themselves contain nested expressions.
  # When rendered a nested expression will be fully contained within brackets.
  #
  # All the build methods in this object return the object instance for chained method calling purposes.
   */
  cls.Expression = class extends cls.BaseBuilder {
    // Initialise the expression.
    constructor (options) {
      super()
        
      let defaults = JSON.parse(JSON.stringify(cls.DefaultQueryBuilderOptions));

      this.options = _extend({}, defaults, options);

      this.tree = {
        nodes: []
      };

      this.stack = [];
    }


    // Begin a nested expression and combine it with the current expression using the given operator.
    _begin (op) {
      let newNode = {
        type: op,
        nodes: [],
      };

      let current = this._current();

      this.stack.push( current.nodes.length );

      current.nodes.push(newNode);

      return this;
    }

    // Getting current node from tree
    _current () {
      let current = this.tree;

      _forOf(this.stack, function(num) {
        current = current.nodes[num];
      });

      return current;
    }


    // Begin a nested expression and combine it with the current expression using the intersection operator (AND).
    and_begin () {
      return this._begin('AND');
    }


    // Begin a nested expression and combine it with the current expression using the union operator (OR).
    or_begin () {
      return this._begin('OR');
    }


    /**
     * End the current compound expression. 
     *
     * This will throw an error if begin() hasn't been called yet.
     */
    end () {
      if (!this.stack.length) {
        throw new Error("begin() needs to be called");
      }

      this.stack.pop();

      return this;
    }



    // Combine the current expression with the given expression using the intersection operator (AND).
    and (expr, param) {
      if (!expr || typeof expr !== "string") {
        throw new Error("expr must be a string");
      } else {
        this._current().nodes.push({
          type: 'AND',
          expr: expr,
          para: param,
        });
      }

      return this;
    }



    // Combine the current expression with the given expression using the union operator (OR).
    or (expr, param) {
      if (!expr || typeof expr !== "string") {
        throw new Error("expr must be a string");
      } else {
        this._current().nodes.push({
          type: 'OR',
          expr: expr,
          para: param,
        });
      }

      return this;
    }


    // Get the final fully constructed expression string.
    toString () {
      if (this.stack.length) {
        throw new Error("end() needs to be called");
      }

      return this._toString(this.tree);
    }


    // Get the final fully constructed expression string.
    toParam () {
      if (this.stack.length) {
        throw new Error("end() needs to be called");
      }

      return this._toString(this.tree, true);
    }



    // Get a string representation of the given expression tree node.
    _toString (node, paramMode = false) {
      let str = "";
      let params = [];

      _forOf(node.nodes, (child) => {
        let nodeStr;
        
        if (undefined !== child.expr) {
          nodeStr = child.expr;

          // have param
          if (undefined !== child.para) {
            if (!paramMode) {
              nodeStr = nodeStr.replace(
                this.options.parameterCharacter, this._formatValue(child.para)
              );
            }
            else {
              let cv = this._formatValueAsParam(child.para);

              if (cv && cv.text) {
                params = params.concat(cv.values);

                nodeStr = nodeStr.replace(
                  this.options.parameterCharacter, `(${cv.text})`
                );
              }
              else {
                params = params.concat(cv);
              }

              // IN ? -> IN (?, ?, ..., ?)
              if (_isArray(child.para)) {
                let arr = Array.apply(null, new Array(child.para.length));

                let inStr = arr.map(() => {
                  return this.options.parameterCharacter;
                });

                nodeStr = nodeStr.replace(
                  this.options.parameterCharacter, `(${inStr.join(', ')})`
                );
              }
            }
          }
        }
        else {
          nodeStr = this._toString(child, paramMode);

          if (paramMode) {
            params = params.concat(nodeStr.values);

            nodeStr = nodeStr.text;
          }

          // wrap nested expressions in brackets
          if (nodeStr.length) {
            nodeStr = `(${nodeStr})`;
          }
        }

        if (nodeStr.length) {
          // if this isn't first expression then add the operator
          if (str.length) {
            str += " " + child.type + " ";
          }

          str += nodeStr;
        }
      }); // for-each child

      if (paramMode)
        return {
          text: str,
          values: params,
        };
      else {
        return str;
      }
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
      super();

      if (_isPlainObject(fieldName)) {
        options = fieldName;

        fieldName = null;
      }

      if (fieldName) {
        this.fieldName = this._sanitizeField( fieldName );
      }

      this.options = _extend({}, cls.DefaultQueryBuilderOptions, options);

      this.cases = [];
      this.elseValue = null;      
    }

    when (expression, ...values) {
      this.cases.unshift({
        expression: expression,
        values: values,
      });

      return this;
    }

    then (result) {
      if (this.cases.length == 0) {
        throw new Error("when() needs to be called first");
      }

      this.cases[0].result = result;
      
      return this;
    }

    else (elseValue) {
      this.elseValue = elseValue;

      return this;
    }

    // Get the final fully constructed expression string.
    toString () {
      return this._toString(this.cases, this.elseValue);
    }

    // Get the final fully constructed expression string.
    toParam () {
      return this._toString(this.cases, this.elseValue, true);
    }

    // Get a string representation of the given expression tree node.
    _toString (cases, elseValue, paramMode = false) {
      if (cases.length == 0) {
        return this._formatValue(elseValue);
      }

      let values = [];

      cases = cases.map((part) => {
        let condition = new cls.AbstractConditionBlock("WHEN");

        condition._condition.apply(condition, [part.expression].concat(part.values));

        let str = '';

        if (!paramMode) {
          str = condition.buildStr();
        }
        else {
          condition = condition.buildParam();
          str = condition.text;
          values = values.concat(condition.values);
        }

        return `${str} THEN ${this._formatValue(part.result)}`;
      });

      let str = cases.join(" ") + ' ELSE ' + this._formatValue(elseValue) + ' END';

      if (this.fieldName) {
        str = this.fieldName + " " + str;
      }

      str = "CASE " + str;

      if (paramMode) {
        return {
          text: str,
          values: values,
        };        
      }
      else {
        return str;
      }
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
      super(options)
    }

    /**
    # Get input methods to expose within the query builder.
    #
    # By default all methods except the following get returned:
    #   methods prefixed with _
    #   constructor and buildStr()
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

    /**
     # Build this block.
     #
     # Subclasses may override this method.
     #
     # @param queryBuilder cls.QueryBuilder a reference to the query builder that owns this block.
     #
     # @return String the string representing this block
     */
    buildStr (queryBuilder) {
      return '';
    }


    buildParam (queryBuilder) {
      return { text: this.buildStr(queryBuilder), values: [] };
    }
  }



  // A String which always gets output
  cls.StringBlock = class extends cls.Block {
    constructor (options, str) {
      super(options);

      this.str = str;
    }

    buildStr (queryBuilder) {
      return this.str;
    }
  }



  // An arbitrary value or db function with parameters
  cls.AbstractValueBlock = class extends cls.Block {
    // Constructor
    constructor (options) {
      super(options);

      this._str = '';
      this._values = [];
    }

    _setValue (str, ...values) {
      this._str = str;
      this._values = values;
    }

    buildStr (queryBuilder) {
      let str = this._str;
      let finalStr = '';
      let values = [].concat(this._values);

      _forOfStr(str, (c) => {
        if (this.options.parameterCharacter === c && 0 < values.length) {
          c = values.shift();
        }

        finalStr += c;
      });

      return finalStr;
    }

    buildParam (queryBuilder) {
      return { text: this._str, values: this._values };
    }
  }



  // A function string block
  cls.FunctionBlock = class extends cls.AbstractValueBlock {
    function (str, ...values) {
      this._setValue.apply(this, [str].concat(values));
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
    return asParam ? value.buildParam() : value.buildStr();
  });


  /*
  # Table specifier base class
  #
  # Additional options
  #  - singleTable - only allow one table to be specified  (default: false)
  #  - allowNested - allow nested query to be specified as a table    (default: false)
  */
  cls.AbstractTableBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this.tables = [];
    }

    /**
    # Update given table.
    #
    # An alias may also be specified for the table.
    #
    # Concrete subclasses should provide a method which calls this
    */
    _table (table, alias = null) {
      if (alias) {
        alias = this._sanitizeTableAlias(alias);
      }

      table = this._sanitizeTable(table, !!this.options.allowNested);

      if (this.options.singleTable) {
        this.tables = [];
      }

      this.tables.push({
        table: table,
        alias: alias,       
      });
    }

    // get whether a table has been set
    _hasTable () {
      return 0 < this.tables.length;
    }


    buildStr (queryBuilder) {
      if (!this._hasTable()) {
        return "";
      }

      let tables = "";

      _forOf(this.tables, (table) => {
        if (tables.length) {
          tables += ", ";  
        }

        if ("string" === typeof table.table) {
          tables += table.table;
        }
        else {
          // building a nested query
          tables += `(${table.table})`;
        }

        if (table.alias) {
          // add the table alias
          tables += ` ${table.alias}`;
        }
      });

      return tables;
    }

    
    _buildParam (queryBuilder, prefix = null) {
      let ret = {
        text: "",
        values: [],
      };

      let params = [];
      let paramStr = ""

      if (!this._hasTable()) {
        return ret;
      }

      // retrieve the parameterised queries
      _forOf(this.tables, (blk) => {
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
          p = blk.buildParam(queryBuilder);
        }
        
        p.table = blk;

        params.push( p );
      });

      // join the queries and their parameters
      // this is the last building block processed so always add UNION if there are any UNION blocks
      _forOf(params, (p) => {
        if (paramStr.length) {
          paramStr += ", ";
        }
        else {
          if (!!prefix && prefix.length) {
            paramStr += `${prefix} ${paramStr}`;
          }
        }

        if ("string" === typeof p.table.table) {
          paramStr += `${p.text}`;
        }
        else {
          paramStr += `(${p.text})`;
        }

        // add the table alias, the AS keyword is optional
        if (!!p.table.alias) {
          paramStr += ` ${p.table.alias}`
        }

        _forOf(p.values, (v) => {
          ret.values.push( this._formatCustomValue(v) );
        });
      });

      ret.text += paramStr;

      return ret;
    }

    buildParam (queryBuilder) {
      return this._buildParam(queryBuilder);
    }
  }



  // Update Table
  cls.UpdateTableBlock = class extends cls.AbstractTableBlock {
    table (table, alias = null) {
      this._table(table, alias);
    }
  }

  // FROM table
  cls.FromTableBlock = class extends cls.AbstractTableBlock {
    from (table, alias = null) {
      this._table(table, alias);
    }

    buildStr (queryBuilder) {
      let tables = super.buildStr(queryBuilder);

      return tables.length ? `FROM ${tables}` : "";
    }

    buildParam (queryBuilder) {
      return this._buildParam(queryBuilder, "FROM");
    }
  }


  // INTO table
  cls.IntoTableBlock = class extends cls.Block {
    constructor (options) {
      super(options);

      this.table = null;
    }

    // Into given table.
    into (table) {
      // do not allow nested table to be the target
      this.table = this._sanitizeTable(table, false);
    }

    buildStr (queryBuilder) {
      if (!this.table) {
        throw new Error("into() needs to be called");
      }

      return `INTO ${this.table}`;
    }
  }


  // (SELECT) Get field
  cls.GetFieldBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this._fieldAliases = {};
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
        _forOf(_fields, (field) => {
          this.field(field, null, options);
        });
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
      if (alias) {
        alias = this._sanitizeFieldAlias(alias);
      }

      // if field-alias already present then don't add
      if (this._fieldAliases.hasOwnProperty(field) 
            && this._fieldAliases[field] === alias) 
      {
        return this;
      }

      let fieldRec = {
        alias : alias
      };

      if (field instanceof cls.Case) {
        fieldRec.func = field;
      }
      else {
        fieldRec.name = this._sanitizeField(field, options);
      }

      if (options.aggregation) {
        fieldRec.aggregation = options.aggregation;
      }

      this._fieldAliases[field] = alias;
      this._fields.push(fieldRec);
    }

    buildStr (queryBuilder) {
      return this._build(queryBuilder);
    }

    buildParam (queryBuilder) {
      return this._build(queryBuilder, true);
    }

    _build (queryBuilder, paramMode = false) {
      if (!queryBuilder.getBlock(cls.FromTableBlock)._hasTable()) {
        if (paramMode) {
          return {
            text : "", 
            values : [],
          };          
        }
        else { 
          return "";
        }
      }

      let fields = "";
      let values = [];

      _forOf(this._fields, (field) => {
        if (fields.length) {
         fields += ", ";
        }
        if (field.aggregation) {
          fields += field.aggregation + "(";
        }
        if (field.func) {
          if (paramMode) {
            let caseExpr = field.func.toParam();
            fields += caseExpr.text;
            values = values.concat(caseExpr.values);
          }
          else {
            fields += field.func.toString();
          }
        }
        else {
          fields += field.name;
        }
        if (field.aggregation) {
          fields += ")";
        }

        if (field.alias) {
          fields += ` AS ${field.alias}`;
        }
      });

      if (!fields.length) {
        fields = "*";
      }

      if (paramMode) {
        return {text : fields, values : values};
      }
      else {
        return fields;
      }
    }
  }



  // Base class for setting fields to values (used for INSERT and UPDATE queries)
  cls.AbstractSetFieldBlock = class extends cls.Block {
    constructor (options) {
      super(options);
      this.fieldOptions = [];
      this.fields = [];
      this.values = [];
    }

    // Update the given field with the given value.
    // This will override any previously set value for the given field.
    _set (field, value, options = {}) {
      if (this.values.length > 1) {
        throw new Error("Cannot call set or setFields on multiple rows of fields.");
      }

      if (undefined !== value) {
        value = this._sanitizeValue(value);
      }

      // Explicity overwrite existing fields
      let index = this.fields.indexOf(this._sanitizeField(field, options));

      if (index !== -1) {
        this.values[0][index] = value;
        this.fieldOptions[0][index] = options;
      }
      else {
        this.fields.push(this._sanitizeField(field, options));
        index = this.fields.length - 1;

        // The first value added needs to create the array of values for the row
        if (_isArray(this.values[0])) {
          this.values[0][index] = value;
          this.fieldOptions[0][index] = options;
        }
        else {
          this.values.push([value]);
          this.fieldOptions.push([options]);
        }
      }
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
      this.fields = [];
      this.values = [];

      for (let i in fieldsRows) {
        let fieldRow = fieldsRows[i];

        for (let field in fieldRow) {
          let value = fieldRow[field];

          let index = this.fields.indexOf(this._sanitizeField(field, options));

          if (0 < i && -1 === index) {
            throw new Error('All fields in subsequent rows must match the fields in the first row');
          }

          // Add field only if it hasn't been added before
          if (-1 === index) {
            this.fields.push(this._sanitizeField(field, options));
            index = this.fields.length - 1;            
          }

          value = this._sanitizeValue(value);

          // The first value added needs to add the array
          if (_isArray(this.values[i])) {
            this.values[i][index] = value;
            this.fieldOptions[i][index] = options;
          }
          else {
            this.values[i] = [value];
            this.fieldOptions[i] = [options];
          }
        }
      }
    }

    buildStr () {
      throw new Error('Not yet implemented');
    }

    buildParam () {
      throw new Error('Not yet implemented');
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

    buildStr (queryBuilder) {
      if (0 >= this.fields.length) {
        throw new Error("set() needs to be called");
      }

      let str = "";

      for (let i in this.fields) {
        if (str.length) {
          str += ", ";
        }

        let field = this.fields[i];

        let value = this.values[0][i];

        let fieldOptions = this.fieldOptions[0][i];

        // e.g. if field is an expression such as: count = count + 1
        if (typeof value === 'undefined') {
          str += field;
        }
        else {
          str += `${field} = ${this._formatValue(value, fieldOptions)}`;
        }
      }

      return `SET ${str}`;
    }

    buildParam (queryBuilder) {
      if (0 >= this.fields.length) {
        throw new Error("set() needs to be called");
      }

      let str = "";
      let vals = [];

      for (let i in this.fields) {
        if (str.length) {
          str += ", ";
        }

        let field = this.fields[i];

        let value = this.values[0][i];

        // e.g. if field is an expression such as: count = count + 1
        if (typeof value === 'undefined') {
          str += field;
        }
        else {
          let p = this._formatValueAsParam( value );

          if (!!p && !!p.text) {
            str += `${field} = (${p.text})`;

            _forOf(p.values, (v) => {
              vals.push(v);
            });
          }
          else {
            str += `${field} = ${this.options.parameterCharacter}`;

            vals.push(p);
          }
        }
      }

      return { text: `SET ${str}`, values: vals };
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

    _buildVals () {
      let vals = [];

      for (let i in this.values) {
        for (let j in this.values[i]) {
          let formattedValue = this._formatValue(this.values[i][j], this.fieldOptions[i][j]);

          if ('string' === typeof vals[i]) {
            vals[i] += ', ' + formattedValue;
          }
          else {
            vals[i] = '' + formattedValue;
          }
        }
      }

      return vals;
    }

    _buildValParams () {
      let vals = [];
      let params = [];

      for (let i in this.values) {
        for (let j in this.values[i]) {
          let p = this._formatValueAsParam( this.values[i][j] );
          let str;

          if (!!p && !!p.text) {
            str = p.text;

            _forOf(p.values, (v) => {
              params.push(v);
            });
          }
          else {
            str = this.options.parameterCharacter;
            params.push(p);
          }

          if ('string' === typeof vals[i]) {
            vals[i] += `, ${str}`;
          }
          else {
            vals[i] = str;
          }
        }
      }

      return {
        vals: vals,
        params: params,
      };
    }


    buildStr (queryBuilder) {
      if (0 >= this.fields.length) {
        return '';
      }

      return `(${this.fields.join(', ')}) VALUES (${this._buildVals().join('), (')})`;
    }

    buildParam (queryBuilder) {
      if (0 >= this.fields.length) {
       return { text: '', values: [] };
      }

      // fields
      let str = "";
      let {vals, params} = this._buildValParams();
      for (let i in this.fields) {
        if (str.length) {
          str += ', ';
        }
        str += this.fields[i];
      }

      return { text: `(${str}) VALUES (${vals.join('), (')})`, values: params };
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

      this._query = this._sanitizeNestableQuery(selectQuery);
    }

    buildStr (queryBuilder) {
      if (0 >= this._fields.length) {
        return '';
      }

      return `(${this._fields.join(', ')}) (${this._query.toString()})`;
    }

    buildParam (queryBuilder) {
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

    buildStr (queryBuilder) {
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

    buildStr (queryBuilder) {
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

    buildStr (queryBuilder) {
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
      condition = this._sanitizeCondition(condition);

      let finalCondition = "";
      let finalValues = [];

      // if it's an Expression instance then convert to text and values
      if (condition instanceof cls.Expression) {
        let t = condition.toParam();
        finalCondition = t.text;
        finalValues = t.values;
      }
      else {
        _forOfStr(condition, (c) => {
          if (this.options.parameterCharacter === c && 0 < values.length) {
            let nextValue = values.shift();
            // # where b in (?, ? ?)
            if (_isArray(nextValue)) {
              let inValues = [];
              _forOf(nextValue, (item) => {
                inValues.push(this._sanitizeValue(item));
              });
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
        });
      }

      if (finalCondition.length) {
        this.conditions.push({
          text: finalCondition,
          values: finalValues,        
        });
      }
    }


    buildStr (queryBuilder) {
      if (0 >= this.conditions.length) {
        return "";
      }

      let condStr = "";

      _forOf(this.conditions, (cond) => {
        if (condStr.length) {
          condStr += ") AND (";
        }

        if (0 < cond.values.length) {
          // replace placeholders with actual parameter values
          let pIndex = 0;
          _forOfStr(cond.text, (c) => {
            if (this.options.parameterCharacter === c) {
              condStr += this._formatValue( cond.values[pIndex++] );
            }
            else {
              condStr += c;
            }
          });
        }
        else {
          condStr += cond.text;
        }
      });

      return `${this.conditionVerb} (${condStr})`;
    }


    buildParam (queryBuilder) {
      let ret = {
        text: "",
        values: [],
      }

      if (0 >= this.conditions.length) {
        return ret;
      }

      let condStr = "";

      _forOf(this.conditions, (cond) => {
        if (condStr.length) {
          condStr += ") AND (";
        }

        let str = cond.text.split(this.options.parameterCharacter);
        let i = 0
        _forOf(cond.values, (v) => {
          if (undefined !== str[i]) {
            condStr += str[i];
          }
            
          let p = this._formatValueAsParam(v);
          if (!!p && !!p.text) {
            condStr += `(${p.text})`;
            _forOf(p.values, (qv) => {
              ret.values.push( qv );
            });
          }
          else {
            condStr += this.options.parameterCharacter;
            ret.values.push( p );
          }
          i = i+1;
        });

        if (undefined !== str[i]) {
          condStr += str[i];
        }
      });

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

    _buildStr (toParam = false) {
      if (0 < this.orders.length) {
        let pIndex = 0;
        let orders = "";
        _forOf(this.orders, (o) => {
          if (orders.length) {
            orders += ", ";
          }

          let fstr = "";

          if (!toParam) {
            _forOf(o.field, (c) => {
              if (this.options.parameterCharacter === c) {
                fstr += this._formatValue( this._values[pIndex++] );
              }
              else {
                fstr += c;
              }
            });
          }
          else {
            fstr = o.field;
          }

          orders += fstr;

          if (o.dir !== null) {
            orders += ` ${o.dir ? 'ASC' : 'DESC'}`;
          }
        });

        return `ORDER BY ${orders}`;
      }
      else {
        return "";
      }
    }

    buildStr (queryBuilder) {
      return this._buildStr();
    }

    buildParam (queryBuilder) {
      return {
        text: this._buildStr(true),
        values: this._values.map((v) => {
          return this._formatValueAsParam(v);
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

    buildStr (queryBuilder) {
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
      condition = condition ? this._sanitizeCondition(condition) : condition;

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

    buildStr (queryBuilder) {
      let joins = "";

      _forOf(this.joins || [], (j) => {
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
      });

      return joins;
    }

    buildParam (queryBuilder) {
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
      _forOf(this.joins, (blk) => {
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
          p = blk.buildParam(queryBuilder);
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
      });

      // join the queries and their parameters
      // this is the last building block processed so always add UNION if there are any UNION blocks
      _forOf(params, (p) => {
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

        _forOf(p.values, (v) => {
          ret.values.push( this._formatCustomValue(v) );
        });
      });

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

    buildStr (queryBuilder) {
      let unionStr = "";

      _forOf(this.unions || [], (j) => {
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
      });

      return unionStr;
    }

    buildParam (queryBuilder) {
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
      _forOf(this.unions || [], (blk) => {
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
          p = blk.buildParam(queryBuilder);
        }
        p.type = blk.type;
        params.push( p );
      });

      // join the queries and their parameters
      // this is the last building block processed so always add UNION if there are any UNION blocks
      _forOf(params, (p) => {
        if (unionStr.length) {
          unionStr += " ";
        }
        unionStr += `${p.type} (${p.text})`;
        _forOf(p.values, (v) => {
          ret.values.push( this._formatCustomValue(v) );
        });
      });

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
      _forOf(this.blocks, (block) => {
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
      });
    }


    /**
    # Register a custom value handler for this query builder and all its contained blocks.
    #
    # Note: This will override any globally registered handler for this value type.
    */
    registerValueHandler (type, handler) {
      _forOf(this.blocks, (block) => {
        block.registerValueHandler(type, handler);
      });
      
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

      _forOf(this.blocks, (block) => {
        block.options = _extend({}, block.options, options);
      });
    }


    // Get the final fully constructed query string.
    toString () {
      let blockStr = this.blocks.map((blk) => {
        return blk.buildStr(this);
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
      let blocks = this.blocks.map((v) => v.buildParam(this));
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

    // Get whether queries built with this builder can be nested within other queries
    isNestable () {
      return false;
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

    isNestable () {
      return true
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
        new cls.FromTableBlock( _extend({}, options, { singleTable: true }) ),
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


