###
Copyright (c) 2012 Ramesh Nair (hiddentao)

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


# Get class name of given object.
getObjectClassName = (obj) ->
    if obj && obj.constructor && obj.constructor.toString
        arr = obj.constructor.toString().match /function\s*(\w+)/;
        if arr && arr.length is 2
            return arr[1]
    return undefined

# Sanitize the given alias.
sanitizeAlias = (alias) ->
    if alias and "string" isnt typeof alias
        throw new Error "alias must be a string"
    alias

# Sanitize the given condition.
sanitizeCondition = (condition) ->
    t = typeof condition
    if "Expression" isnt getObjectClassName(condition) and "string" isnt t
        throw new Error "condition must be a string or Expression instance"
    # If it's an expression builder instance then convert it to string form.
    if "Expression" is t
        condition = condition.toString()
    condition

# Sanitize the given table definition.
sanitizeTable = (table) ->
    if "string" isnt typeof table
        throw new Error "table name must be a string"
    table

# Sanitize the given field definition.
sanitizeField = (field) ->
    if "string" isnt typeof field
        throw new Error "field must be a string"
    field


# A SELECT query builder.
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Select
    froms: null
    fields: null
    joins: null
    wheres: null

    constructor: ->
        @froms = []
        @fields = []
        @joins = []
        @wheres = []


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


    # Specify table to read data from.
    #
    # An alias may also be specified for the table.
    from: (table, alias = null) =>
        table = sanitizeTable(table)
        alias = sanitizeAlias(alias) if alias

        @froms.push
            name: table
            alias: alias
        @


    # Specify a field to read from the table and return in the final result set.
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


    # Add a WHERE condition to the query.
    #
    # When the final query is constructed all the WHERE conditions are combined using the intersection (AND) operator.
    where: (condition) =>
        condition = sanitizeCondition(condition)
        if "" isnt condition
            @wheres.push condition
        @


    # Get the final fully constructed query string.
    toString: =>
        # from
        if 0 >= @froms.length
            throw new Error "from() needs to be called"
        tables = ""
        for table in @froms
            if tables isnt ""
                tables += ", "
            tables += "`#{table.name}`"
            if table.alias
                tables += " `#{table.alias}`"

        # fields
        fields = ""
        if 0 >= @fields.length
            fields = "*"

        "SELECT #{fields} FROM #{tables}"







# Export everything as easily usable methods.
module?.exports =
    expr: -> new Expression
    select: -> new Select
    update: -> new Update
    insert: -> new Insert
    delete: -> new Delete
