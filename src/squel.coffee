###
Copyright (c) 2012 Ramesh Nair (hiddentao.com)

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
###

# Holds classes
cls = {}



# Extend given object's with other objects' properties, overriding existing ones if necessary
_extend = (dst, sources...) ->
    if sources
        for src in sources
            if src
                for own k,v of src
                    dst[k] = v
    dst



# Default query builder options
cls.DefaultQueryBuilderOptions =
# If true then table names will be rendered inside quotes. The quote character used is configurable via the
# nameQuoteCharacter option.
  autoQuoteTableNames: false
  # If true then field names will rendered inside quotes. The quote character used is configurable via the
  # nameQuoteCharacter option.
  autoQuoteFieldNames: false
  # The quote character used for when quoting table and field names
  nameQuoteCharacter: '`'
  # If true then field values will not be rendered inside quotes so as to allow for field value placeholders (for
  # parameterized querying).
  usingValuePlaceholders: false



# Base class for cloneable builders
class cls.Cloneable
  # Clone this builder
  clone: ->
    newInstance = new @constructor;
    # Fast deep copy using JSON conversion, see http://stackoverflow.com/a/5344074
    _extend newInstance, JSON.parse(JSON.stringify(@))



# Base class for all builders
class cls.BaseBuilder extends cls.Cloneable
  # Constructor
  #
  # options is an Object overriding one or more of cls.DefaultQueryBuilderOptions
  #
  constructor: (options) ->
    @options = _extend {}, cls.DefaultQueryBuilderOptions, options


  # Get class name of given object.
  _getObjectClassName: (obj) ->
    if obj && obj.constructor && obj.constructor.toString
      arr = obj.constructor.toString().match /function\s*(\w+)/;
      if arr && arr.length is 2
        return arr[1]
    return undefined

  # Sanitize the given condition.
  _sanitizeCondition: (condition) ->
    t = typeof condition
    c = @_getObjectClassName(condition)

    if 'Expression' isnt c and "string" isnt t
      throw new Error "condition must be a string or Expression instance"
    # If it's an expression builder instance then convert it to string form.
    if 'Expression' is t or 'Expression' is c
      condition = condition.toString()
    condition


  # Sanitize the given name.
  # The 'type' parameter is used to construct a meaningful error message in case validation fails.
  _sanitizeName: (value, type) ->
    if "string" isnt typeof value
      throw new Error "#{type} must be a string"
    value

  _sanitizeField: (item) ->
    sanitized = @_sanitizeName item, "field name"

    if @options.autoQuoteFieldNames
      "#{@options.nameQuoteCharacter}#{sanitized}#{@options.nameQuoteCharacter}"
    else
      sanitized

  _sanitizeTable: (item) ->
    sanitized = @_sanitizeName item, "table name"

    if @options.autoQuoteTableNames
      "#{@options.nameQuoteCharacter}#{sanitized}#{@options.nameQuoteCharacter}"
    else
      sanitized

  _sanitizeAlias: (item) ->
    @_sanitizeName item, "alias"

  # Sanitize the given limit/offset value.
  _sanitizeLimitOffset: (value) ->
    value = parseInt(value)
    if 0 > value or isNaN(value)
      throw new Error "limit/offset must be >=0"
    value

  # Santize the given field value
  _sanitizeValue: (item) ->
    t = typeof item
    if null isnt item and "string" isnt t and "number" isnt t and "boolean" isnt t
      throw new Error "field value must be a string, number, boolean or null"
    item

  # Format the given field value for inclusion into the query string
  _formatValue: (value) ->
    if null is value
      value = "NULL"
    else if "boolean" is typeof value
      value = if value then "TRUE" else "FALSE"
    else if "number" isnt typeof value
      if false is @options.usingValuePlaceholders
        value = "'#{value}'"
    value



# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
# cls.Expressions
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------



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
class cls.Expression

    # The expression tree.
    tree: null

    # The part of the expression tree we're currently working on.
    current: null

    # Initialise the expression.
    constructor: ->
        @tree =
            parent: null
            nodes: []
        @current = @tree

        # Begin a nested expression and combine it with the current expression using the given operator.
        @_begin = (op) =>
            new_tree =
                type: op
                parent: @current
                nodes: []
            @current.nodes.push new_tree
            @current = @current.nodes[@current.nodes.length-1]
            @



    # Begin a nested expression and combine it with the current expression using the intersection operator (AND).
    and_begin: ->
        @_begin 'AND'


    # Begin a nested expression and combine it with the current expression using the union operator (OR).
    or_begin: ->
        @_begin 'OR'



    # End the current compound expression.
    #
    # This will throw an error if begin() hasn't been called yet.
    end: ->
        if not @current.parent
            throw new Error "begin() needs to be called"
        @current = @current.parent
        @


    # Combine the current expression with the given expression using the intersection operator (AND).
    and: (expr) ->
        if not expr or "string" isnt typeof expr
            throw new Error "expr must be a string"
        @current.nodes.push
            type: 'AND'
            expr: expr
        @

    # Combine the current expression with the given expression using the union operator (OR).
    or: (expr) ->
        if not expr or "string" isnt typeof expr
            throw new Error "expr must be a string"
        @current.nodes.push
            type: 'OR'
            expr: expr
        @


    # Get the final fully constructed expression string.
    toString: ->
        if null isnt @current.parent
            throw new Error "end() needs to be called"
        _toString @tree


    # Get a string representation of the given expression tree node.
    _toString = (node) ->
        str = ""
        for child in node.nodes
            if child.expr?
                nodeStr = child.expr
            else
                nodeStr = _toString(child)
                # wrap nested expressions in brackets
                if "" isnt nodeStr
                    nodeStr = "(" + nodeStr + ")"
            if "" isnt nodeStr
                # if this isn't first expression then add the operator
                if "" isnt str then str += " " + child.type + " "
                str += nodeStr
        str





# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
# Building blocks
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------



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
class cls.Block extends cls.BaseBuilder
  # Get input methods to expose within the query builder.
  #
  # By default all methods except the following get returned:
  #   methods prefixed with _
  #   constructor and buildStr()
  #
  # @return Object key -> function pairs
  exposedMethods: ->
    ret = {}

    for attr, value of @
      # only want functions from this class
      if typeof value is "function" and attr.charAt(0) isnt '_' and !cls.Block::[attr]
        ret[attr] = value

    ret

  # Build this block.
  #
  # Subclasses may override this method.
  #
  # @param queryBuilder cls.QueryBuilder a reference to the query builder that owns this block.
  #
  # @return String the string representing this block
  buildStr: (queryBuilder) ->
    ''


# A String which always gets output
class cls.StringBlock extends cls.Block
  constructor: (options, str) ->
    super options
    @str = str

  buildStr: (queryBuilder) ->
    @str



# Table specifier base class
#
# Additional options
#  - singleTable - only allow one table to be specified
class cls.AbstractTableBlock extends cls.Block
  constructor: (options) ->
    super options
    @tables = []

  # Update given table.
  #
  # An alias may also be specified for the table.
  #
  # Concrete subclasses should provide a method which calls this
  _table: (table, alias = null) ->
    table = @_sanitizeTable(table)
    alias = @_sanitizeAlias(alias) if alias

    if @options.singleTable
      @tables = []

    @tables.push
      name: table
      alias: alias

  buildStr: (queryBuilder) ->
    if 0 >= @tables.length then throw new Error "table() needs to be called"

    tables = ""
    for table in @tables
      tables += ", " if "" isnt tables
      tables += table.name
      tables += " AS `#{table.alias}`" if table.alias

    tables


# Update Table
class cls.UpdateTableBlock extends cls.AbstractTableBlock
  table: (table, alias = null) ->
    @_table(table, alias)



# FROM table
class cls.FromTableBlock extends cls.AbstractTableBlock
  from: (table, alias = null) ->
    @_table(table, alias)

  buildStr: (queryBuilder) ->
    if 0 >= @tables.length then throw new Error "from() needs to be called"

    tables = ""
    for table in @tables
      tables += ", " if "" isnt tables
      tables += table.name
      tables += " `#{table.alias}`" if table.alias

    "FROM #{tables}"




# INTO table
class cls.IntoTableBlock extends cls.Block
  constructor: (options) ->
    super options
    @table = null

  # Into given table.
  into: (table) ->
    @table = @_sanitizeTable(table)

  buildStr: (queryBuilder) ->
    if not @table then throw new Error "into() needs to be called"
    "INTO #{@table}"



# (SELECT) Get field
class cls.GetFieldBlock extends cls.Block
  constructor: (options) ->
    super options
    @fields = []

  # Add the given field to the final result set.
  #
  # The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
  # e.g. DATE_FORMAT(a.started, "%H")
  #
  # An alias may also be specified for this field.
  field: (field, alias = null) ->
    field = @_sanitizeField(field)
    alias = @_sanitizeAlias(alias) if alias

    @fields.push
      name: field
      alias: alias

  buildStr: (queryBuilder) ->
    fields = ""
    for field in @fields
      fields += ", " if "" isnt fields
      fields += field.name
      fields += " AS \"#{field.alias}\"" if field.alias

    if "" is fields then "*" else fields



# (UPDATE) SET field=value
class cls.SetFieldBlock extends cls.Block
  constructor: (options) ->
    super options
    @fields = {}

  # Update the given field with the given value.
  # This will override any previously set value for the given field.
  set: (field, value) ->
    field = @_sanitizeField(field)
    value = @_sanitizeValue(value)
    @fields[field] = value
    @

  buildStr: (queryBuilder) ->
    fieldNames = (field for own field of @fields)
    if 0 >= fieldNames.length then throw new Error "set() needs to be called"

    fields = ""
    for field in fieldNames
      fields += ", " if "" isnt fields
      fields += "#{field} = #{@_formatValue(@fields[field])}"

    "SET #{fields}"


# (INSERT INTO) ... field ... value
class cls.InsertFieldValueBlock extends cls.SetFieldBlock
  constructor: (options) ->
    super options
    @fields = {}

  buildStr: (queryBuilder) ->
    fieldNames = (name for own name of @fields)
    if 0 >= fieldNames.length then throw new Error "set() needs to be called"

    # fields
    fields = ""
    values = ""
    for field in fieldNames
      fields += ", " if "" isnt fields
      fields += field
      values += ", " if "" isnt values
      values += @_formatValue(@fields[field])

    "(#{fields}) VALUES (#{values})"




# DISTINCT
class cls.DistinctBlock extends cls.Block
  constructor: (options) ->
    super options
    @useDistinct = false

  # Add the DISTINCT keyword to the query.
  distinct: ->
    @useDistinct = true

  buildStr: (queryBuilder) ->
    if @useDistinct then "DISTINCT" else ""



# GROUP BY
class cls.GroupByBlock extends cls.Block
  constructor: (options) ->
    super options
    @groups = []

  # Add a GROUP BY transformation for the given field.
  group: (field) ->
    field = @_sanitizeField(field)
    @groups.push field

  buildStr: (queryBuilder) ->
    groups = ""

    if 0 < @groups.length
      for f in @groups
        groups += ", " if "" isnt groups
        groups += f
      groups = "GROUP BY #{groups}"

    groups


# OFFSET x
class cls.OffsetBlock extends cls.Block
  constructor: (options) ->
    super options
    @offsets = null

  # Set the OFFSET transformation.
  #
  # Call this will override the previously set offset for this query. Also note that Passing 0 for 'max' will remove
  # the offset.
  offset: (start) ->
    start = @_sanitizeLimitOffset(start)
    @offsets = start

  buildStr: (queryBuilder) ->
    if @offsets then "OFFSET #{@offsets}" else ""


# WHERE
class cls.WhereBlock extends cls.Block
  constructor: (options) ->
    super options
    @wheres = []

  # Add a WHERE condition.
  #
  # When the final query is constructed all the WHERE conditions are combined using the intersection (AND) operator.
  where: (condition) ->
    condition = @_sanitizeCondition(condition)
    if "" isnt condition
      @wheres.push condition

  buildStr: (queryBuilder) ->
    if 0 < @wheres.length then "WHERE (" + @wheres.join(") AND (") + ")" else ""


# ORDER BY
class cls.OrderByBlock extends cls.Block
  constructor: (options) ->
    super options
    @orders = []

  # Add an ORDER BY transformation for the given field in the given order.
  #
  # To specify descending order pass false for the 'asc' parameter.
  order: (field, asc = true) ->
    field = @_sanitizeField(field)
    @orders.push
      field: field
      dir: if asc then true else false

  buildStr: (queryBuilder) ->
    if 0 < @orders.length
      orders = ""
      for o in @orders
        orders += ", " if "" isnt orders
        orders += "#{o.field} #{if o.dir then 'ASC' else 'DESC'}"
      "ORDER BY #{orders}"
    else
      ""


# LIMIT
class cls.LimitBlock extends cls.Block
  constructor: (options) ->
    super options
    @limits = null

  # Set the LIMIT transformation.
  #
  # Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
  # the limit.
  limit: (max) ->
    max = @_sanitizeLimitOffset(max)
    @limits = max


  buildStr: (queryBuilder) ->
    if @limits then "LIMIT #{@limits}" else ""



# JOIN
class cls.JoinBlock extends cls.Block
  constructor: (options) ->
    super options
    @joins = []


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
  join: (table, alias = null, condition = null, type = 'INNER') ->
    table = @_sanitizeTable(table)
    alias = @_sanitizeAlias(alias) if alias
    condition = @_sanitizeCondition(condition) if condition

    @joins.push
      type: type
      table: table
      alias: alias
      condition: condition
    @


  # Add a LEFT JOIN with the given table.
  left_join: (table, alias = null, condition = null) ->
    @join table, alias, condition, 'LEFT'


  # Add a RIGHT JOIN with the given table.
  right_join: (table, alias = null, condition = null) ->
    @join table, alias, condition, 'RIGHT'


  # Add an OUTER JOIN with the given table.
  outer_join: (table, alias = null, condition = null) ->
    @join table, alias, condition, 'OUTER'


  buildStr: (queryBuilder) ->
    joins = ""

    for j in (@joins or [])
      if joins isnt "" then joins += " "
      joins += "#{j.type} JOIN #{j.table}"
      joins += " `#{j.alias}`" if j.alias
      joins += " ON (#{j.condition})" if j.condition

    joins




# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
# Query builders
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------


# Query builder base class
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class cls.QueryBuilder extends cls.BaseBuilder
  # Constructor
  #
  # blocks - array of cls.BaseBuilderBlock instances to build the query with.
  constructor: (options, blocks) ->
    super options

    @blocks = blocks or []

    # Copy exposed methods into myself
    for block in @blocks
      for methodName, methodBody of block.exposedMethods()
        if @[methodName]?
          throw new Error "#{@_getObjectClassName(@)} already has a builder method called: #{methodName}"

        ( (block, name, body) =>
          @[name] = =>
            body.apply(block, arguments)
            @
        )(block, methodName, methodBody)


  # Update query builder options
  #
  # This will update the options for all blocks too. Use this method with caution as it allows you to change the
  # behaviour of your query builder mid-build.
  updateOptions: (options) ->
    @options = _extend({}, @options, options)
    for block in @blocks
      block.options = _extend({}, block.options, options)


  # Get the final fully constructed query string.
  toString: ->
    (block.buildStr(@) for block in @blocks).filter( (v) -> return (0 < v.length)).join(' ')

  # Deep clone
  clone: ->
    new @constructor @options, (block.clone() for block in @blocks)









# SELECT query builder.
class cls.Select extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'SELECT'),
        new cls.DistinctBlock(options),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.OffsetBlock(options)
      ]

      super options, blocks




# UPDATE query builder.
class cls.Update extends cls.QueryBuilder
  constructor: (options, blocks = null) ->
    blocks or= [
      new cls.StringBlock(options, 'UPDATE'),
      new cls.UpdateTableBlock(options),
      new cls.SetFieldBlock(options),
      new cls.WhereBlock(options),
      new cls.OrderByBlock(options),
      new cls.LimitBlock(options)
    ]

    super options, blocks





# DELETE query builder.
class cls.Delete extends cls.QueryBuilder
  constructor: (options, blocks = null) ->
    blocks or= [
      new cls.StringBlock(options, 'DELETE'),
      new cls.FromTableBlock( _extend({}, options, { singleTable: true }) ),
      new cls.JoinBlock(options),
      new cls.WhereBlock(options),
      new cls.OrderByBlock(options),
      new cls.LimitBlock(options),
    ]

    super options, blocks





# An INSERT query builder.
#
class cls.Insert extends cls.QueryBuilder
  constructor: (options, blocks = null) ->
    blocks or= [
      new cls.StringBlock(options, 'INSERT'),
      new cls.IntoTableBlock(options),
      new cls.InsertFieldValueBlock(options)
    ]

    super options, blocks



# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------
# Exported API
# ---------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------

squel =
  expr: -> new cls.Expression
  # Don't have a space-efficient elegant-way of .apply()-ing to constructors, so we specify the args
  select: (options, blocks) -> new cls.Select(options, blocks)
  update: (options, blocks) -> new cls.Update(options, blocks)
  insert: (options, blocks) -> new cls.Insert(options, blocks)
  delete: (options, blocks) -> new cls.Delete(options, blocks)


# aliases
squel.remove = squel.delete

# classes
squel.cls = cls


# AMD
if define?.amd
  define ->
    return squel
# CommonJS
else if module?.exports
  module.exports = squel
# Browser
else
  window?.squel = squel

