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


# Extend given object's with other objects' properties, overriding existing ones if necessary
_extend = (dst, sources...) ->
    if sources
        for src in sources
            if src
                for own k,v of src
                    dst[k] = v
    dst


# An SQL expression builder.
#
# SQL expressions are used in WHERE and ON clauses to filter data by various criteria.
#
# This builder works by building up the expression as a hierarchical tree of nodes. The toString() method then
# traverses this tree in order to build the final expression string.
#
# Expressions can be nested. Nested expression contains can themselves contain nested expressions.
# When rendered a nested expression will be fully contained within brackets.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Expression

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
    and_begin: =>
        @_begin 'AND'


    # Begin a nested expression and combine it with the current expression using the union operator (OR).
    or_begin: =>
        @_begin 'OR'



    # End the current compound expression.
    #
    # This will throw an error if begin() hasn't been called yet.
    end: =>
        if not @current.parent
            throw new Error "begin() needs to be called"
        @current = @current.parent
        @


    # Combine the current expression with the given expression using the intersection operator (AND).
    and: (expr) =>
        if not expr or "string" isnt typeof expr
            throw new Error "expr must be a string"
        @current.nodes.push
            type: 'AND'
            expr: expr
        @

    # Combine the current expression with the given expression using the union operator (OR).
    or: (expr) =>
        if not expr or "string" isnt typeof expr
            throw new Error "expr must be a string"
        @current.nodes.push
            type: 'OR'
            expr: expr
        @


    # Get the final fully constructed expression string.
    toString: =>
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


# Default builder options.
DefaultInsertBuilderOptions = DefaultUpdateBuilderOptions =
    # If true then field values will not be rendered inside quotes so as to allow for field value placeholders (for
    # parameterized querying).
    usingValuePlaceholders: false



# Get class name of given object.
getObjectClassName = (obj) ->
    if obj && obj.constructor && obj.constructor.toString
        arr = obj.constructor.toString().match /function\s*(\w+)/;
        if arr && arr.length is 2
            return arr[1]
    return undefined

# Sanitize the given condition.
ExpressionClassName = getObjectClassName(new Expression())
sanitizeCondition = (condition) ->
    t = typeof condition
    if ExpressionClassName isnt getObjectClassName(condition) and "string" isnt t
        throw new Error "condition must be a string or Expression instance"
    # If it's an expression builder instance then convert it to string form.
    if "Expression" is t
        condition = condition.toString()
    condition

# Sanitize the given name.
# The 'type' parameter is used to construct a meaningful error message in case validation fails.
sanitizeName = (value, type) ->
    if "string" isnt typeof value
        throw new Error "#{type} must be a string"
    value

sanitizeField = (item) -> sanitizeName item, "field name"
sanitizeTable = (item) -> sanitizeName item, "table name"
sanitizeAlias = (item) -> sanitizeName item, "alias"

# Sanitize the given limit/offset value.
sanitizeLimitOffset = (value) ->
    value = parseInt(value)
    if 0 > value
        throw new Error "limit/offset must be >=0"
    value

# Santize the given field value
sanitizeValue = (item) ->
    t = typeof item
    if null isnt item and "string" isnt t and "number" isnt t and "boolean" isnt t
        throw new Error "field value must be a string, number, boolean or null"
    item

# Format the given field value for inclusion into the query string
#
# options: see DefaultBuilderOptions
formatValue = (value, options) ->
    if null is value
        value = "NULL"
    else if "boolean" is typeof value
        value = if value then "TRUE" else "FALSE"
    else if "number" isnt typeof value
        if false is options.usingValuePlaceholders
            value = "\"#{value}\""
    value



# Base class for query builders which support WHERE, ORDER and LIMIT clauses.
class WhereOrderLimit
    wheres: null
    orders: null
    limits: null

    constructor: ->
        @wheres = []
        @orders = []


    # Add a WHERE condition.
    #
    # When the final query is constructed all the WHERE conditions are combined using the intersection (AND) operator.
    where: (condition) =>
        condition = sanitizeCondition(condition)
        if "" isnt condition
            @wheres.push condition
        @


    # Add an ORDER BY transformation for the given field in the given order.
    #
    # To specify descending order pass false for the 'asc' parameter.
    order: (field, asc = true) =>
        field = sanitizeField field
        @orders.push
            field: field
            dir: if asc then "ASC" else "DESC"
        @


    # Set the LIMIT transformation.
    #
    # Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
    # the limit.
    limit: (max) =>
        max = sanitizeLimitOffset max
        @limits = max
        @


    # Get string representation of WHERE clause, if any
    whereString: =>
        if 0 < @wheres.length
            " WHERE (" + @wheres.join(") AND (") + ")"
        else
            ""

    # Get string representation of ORDER BY clause, if any
    orderString: =>
        if 0 < @orders.length
            orders = ""
            for o in @orders
                orders += ", " if "" isnt orders
                orders += "#{o.field} #{o.dir}"
            " ORDER BY #{orders}"
        else
            ""

    # Get string representation of LIMIT clause, if any
    limitString: =>
        if @limits
            " LIMIT #{@limits}"
        else
            ""



# A SELECT query builder.
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Select extends WhereOrderLimit
    froms: null
    fields: null
    joins: null
    groups: null
    offsets: null
    useDistinct: false

    constructor: ->
        super
        @froms = []
        @fields = []
        @joins = []
        @groups = []


        # Add a JOIN with the given table.
        #
        # 'type' must be either one of inner, outer, left or right. Default is 'inner'.
        #
        # 'table' is the name of the table to join with.
        #
        # 'alias' is an optional alias for the table name.
        #
        # 'condition' is an optional condition (containing an SQL expression) for the JOIN. If this is an instance of
        # an expression builder then it will only get evaluated during the final query string construction phase in
        # toString().
        @_join = (type, table, alias, condition) =>
            table = sanitizeTable(table)
            alias = sanitizeAlias(alias) if alias
            condition = sanitizeCondition(condition) if condition

            @joins.push
                type: type
                table: table
                alias: alias
                condition: condition
            @


    # Add the DISTINCT keyword to this query.
    distinct: =>
        @useDistinct = true
        @


    # Read data from the given table.
    #
    # An alias may also be specified for the table.
    from: (table, alias = null) =>
        table = sanitizeTable(table)
        alias = sanitizeAlias(alias) if alias

        @froms.push
            name: table
            alias: alias
        @


    # Add the given field to the final result set.
    #
    # The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
    # e.g. DATE_FORMAT(a.started, "%H")
    #
    # An alias may also be specified for this field.
    field: (field, alias = null) =>
        field = sanitizeField(field)
        alias = sanitizeAlias(alias) if alias

        @fields.push
            field: field
            alias: alias
        @


    # Add an INNER JOIN with the given table.
    join: (table, alias = null, condition = null) =>
        @_join 'INNER', table, alias, condition


    # Add a LEFT JOIN with the given table.
    left_join: (table, alias = null, condition = null) =>
        @_join 'LEFT', table, alias, condition


    # Add a RIGHT JOIN with the given table.
    right_join: (table, alias = null, condition = null) =>
        @_join 'RIGHT', table, alias, condition


    # Add an OUTER JOIN with the given table.
    outer_join: (table, alias = null, condition = null) =>
        @_join 'OUTER', table, alias, condition


    # Add a GROUP BY transformation for the given field.
    group: (field) =>
        field = sanitizeField field
        @groups.push field
        @


    # Set the OFFSET transformation.
    #
    # Call this will override the previously set offset for this query. Also note that Passing 0 for 'max' will remove
    # the offset.
    offset: (start) =>
        start = sanitizeLimitOffset start
        @offsets = start
        @


    # Get the final fully constructed query string.
    toString: =>
        # basic checks
        if 0 >= @froms.length
            throw new Error "from() needs to be called"

        ret = "SELECT "

        # distinct
        ret += "DISTINCT " if @useDistinct

        # fields
        fields = ""
        for field in @fields
            fields += ", " if "" isnt fields
            fields += field.field
            fields += " AS \"#{field.alias}\"" if field.alias

        ret += if "" is fields then "*" else fields

        # tables
        tables = ""
        for table in @froms
            tables += ", " if "" isnt tables
            tables += table.name
            tables += " `#{table.alias}`" if table.alias

        ret += " FROM #{tables}"

        # joins
        joins = ""
        for j in @joins
            joins += " #{j.type} JOIN #{j.table}"
            joins += " `#{j.alias}`" if j.alias
            joins += " ON (#{j.condition})" if j.condition

        ret += joins

        # where
        ret += @whereString()

        # group by
        if 0 < @groups.length
            groups = ""
            for f in @groups
                groups += ", " if "" isnt groups
                groups += f
            ret += " GROUP BY #{groups}"

        # order by
        ret += @orderString()

        # limit
        ret += @limitString()

        # offset
        ret += " OFFSET #{@offsets}" if @offsets

        ret



# An UPDATE query builder.
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Update extends WhereOrderLimit
    tables: null
    fields: null
    options: null

    # options: see DefaultBuilderOptions
    constructor: (options) ->
        super
        @tables = []
        @fields = {}
        @options = _extend {}, DefaultUpdateBuilderOptions, options


    # Update the given table.
    #
    # An alias may also be specified for the table.
    table: (table, alias = null) =>
        table = sanitizeTable(table)
        alias = sanitizeAlias(alias) if alias

        @tables.push
            name: table
            alias: alias
        @

    # Update the given field with the given value.
    # This will override any previously set value for the given field.
    set: (field, value) =>
        field = sanitizeField field
        value = sanitizeValue value
        @fields[field] = value
        @


    # Get the final fully constructed query string.
    toString: =>
        # basic checks
        if 0 >= @tables.length then throw new Error "table() needs to be called"
        fieldNames = (field for own field of @fields)
        if 0 >= fieldNames.length then throw new Error "set() needs to be called"

        ret = "UPDATE "

        # tables
        tables = ""
        for table in @tables
            tables += ", " if "" isnt tables
            tables += table.name
            tables += " AS `#{table.alias}`" if table.alias

        ret += tables

        # fields
        fields = ""
        for field in fieldNames
            fields += ", " if "" isnt fields
            fields += "#{field} = #{formatValue(@fields[field], @options)}"
        ret += " SET #{fields}"

        # where
        ret += @whereString()

        # order by
        ret += @orderString()

        # limit
        ret += @limitString()

        ret




# A DELETE query builder.
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Delete extends WhereOrderLimit
    table: null

    # The table to delete from.
    # Calling this will override any previously set value.
    from: (table) =>
        table = sanitizeTable(table)
        @table = table
        @

    # Get the final fully constructed query string.
    toString: =>
        # basic checks
        if not @table then throw new Error "from() needs to be called"

        ret = "DELETE FROM #{@table}"

        # where
        ret += @whereString()

        # order by
        ret += @orderString()

        # limit
        ret += @limitString()

        ret



# An INSERT query builder.
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Insert
    table: null
    fields: null
    options: null

    # options: see DefaultBuilderOptions
    constructor: (options) ->
        @fields = {}
        @options = _extend {}, DefaultInsertBuilderOptions, options


    # The table to insert into.
    # This will override any previously set value.
    into: (table) =>
        table = sanitizeTable(table)
        @table = table
        @

    # Set the given field to the given value.
    # This will override any previously set value for the given field.
    set: (field, value) =>
        field = sanitizeField field
        value = sanitizeValue value
        @fields[field] = value
        @

    # Get the final fully constructed query string.
    toString: =>
        # basic checks
        if not @table then throw new Error "into() needs to be called"
        fieldNames = (name for own name of @fields)
        if 0 >= fieldNames.length then throw new Error "set() needs to be called"

        # fields
        fields = ""
        values = ""
        for field in fieldNames
            fields += ", " if "" isnt fields
            fields += field
            values += ", " if "" isnt values
            values += formatValue(@fields[field], @options)

        "INSERT INTO #{@table} (#{fields}) VALUES (#{values})"



# Export everything as easily usable methods.
_export =
    expr: -> new Expression
    select: -> new Select
    update: (options) -> new Update(options)
    insert: (options) -> new Insert(options)
    delete: -> new Delete
module?.exports = _export
window?.squel = _export
