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
    #
    # This will throw an error if begin() has previously been called without being followed by a call to end()
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




# A SELECT query builder.
#
# Note that the query builder does not check the final query string for correctness.
#
# All the build methods in this object return the object instance for chained method calling purposes.
class Select
    tables = []
    fields = []
    joins = []
    where = null

    constructor ->
        @where = new Expression()

        # Add a JOIN with the given table.
        #
        # 'type' must be either one of inner, outer, left or right. Default is 'inner'.
        #
        # 'table' is the name of the table to join with.
        #
        # 'alias' is an optional alias for the table name.
        #
        # 'condition' is an optional condition (containing an SQL expression) for the JOIN. If this is an instance of
        #
        #
        # Note
        @join = (type = 'inner', table, alias = null, condition = null) =>
            @joins.push
                type: type
                table: table
                alias: alias
                condition: condition
            @


    # Specify table to read data from.
    #
    # An alias may also be specified for the table.
    @table = (name, alias = null) =>
        @tables.push
            name: name
            alias: alias
        @

    # Specify one or more fields to read from the table and return in the final result set.
    #
    # The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
    # e.g. DATE_FORMAT(a.started, "%H")
    #
    # An alias may also be specified for this field.
    @field = (field, alias = null) =>
        @fields.push
            field: field
            alias: alias
        @


    # Alias of join() with type set to 'left'
    #
    # @return this object instance for chaining purposes.
    @left_join = (table, alias = null, condition = null) =>
        join 'left', table, alias, condition


    # Alias of join() with type set to 'right'
    #
    # @return this object instance for chaining purposes.
    @right_join = (table, alias = null, condition = null) =>
        join 'right', table, alias, condition


    # Alias of join() with type set to 'outer'
    #
    # @return this object instance for chaining purposes.
    @outer_join = (table, alias = null, condition = null) =>
        join 'outer', table, alias, condition


    # Begin a compound AND expression as part of the WHERE clause
    #
    # @return this object instance for chaining purposes.
    @begin_and_where = (table, alias = null, condition = null) =>

        join 'outer', table, alias, condition


    # Get fully constructed SQL query string
    #
    # @return the constructed query string.
    @toString = =>







# Export everything as easily usable methods.
module?.exports =
    expr: -> new Expression
    select: -> new Select
    update: -> new Update
    insert: -> new Insert
    delete: -> new Delete
