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
# All the build methods in this object return the object instance for chained method calling purposes.
class kSqlExpression

    # The expression tree.
    tree: null

    # The part of the expression tree we're currently working on.
    current: null

    # Initialise the expression.
    constructor: ->
        @tree =
            type: 'group'
            parent: null
            nodes: []
        @current = @tree


    # Begin a compound expression.
    #
    # A compound expression is an expression which contains an intersection (AND) or
    # union (OR) of one or more sub expressions. When rendered it will be fully contained within brackets.
    begin: =>
        new_tree =
            type: 'group'
            parent: @current
            nodes: []
        @current.nodes.push new_tree
        @current = @current.nodes[@current.nodes.length-1]
        @



    # End the current compound expression.
    #
    # This will throw an error if begin() hasn't been called yet.
    end: =>
        if not @current.parent?
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
            throw new Error "end() needs to called"
        _toString @tree


    # Get a string representation of the given expression tree node.
    _toString = (node) ->
        str = ""
        for child in node.nodes
            switch child.type
                when "AND", "OR"
                    if "" isnt str then str += " " + child.type + " "
                    str += child.expr
                else
                    childStr = _toString(child)
                    if "" isnt childStr
                        str += "(" + childStr + ")"
        str


module?.exports =
    expression: kSqlExpression


#
#
#
## SQL query builder
#module?.exports = new class KSql
#    type = null
#    tables = []
#    fields = []
#    joins = []
#    where = null
#
#    constructor ->
#        @where = new ksqlexpr()
#
#    # Create an INSERT query
#    #
#    # @return this object instance for chaining purposes.
#    @insert = =>
#        @type = "insert"
#        @
#
#    # Create a SELECT query
#    #
#    # @return this object instance for chaining purposes.
#    @select = =>
#        @type = "select"
#        @
#
#    # Create a UPDATE query
#    #
#    # @return this object instance for chaining purposes.
#    @update = =>
#        @type = "update"
#        @
#
#    # Create a DELETE query
#    #
#    # @return this object instance for chaining purposes.
#    @del = =>
#        @type = "delete"
#        @
#
#    # Create a DELETE query
#    #
#    # @return this object instance for chaining purposes.
#    @del = =>
#        @type = "delete"
#        @
#
#    # Specify table to read data from
#    #
#    # @param name name of the table
#    # @param alias alias for the table name. Default is none.
#    #
#    # @return this object instance for chaining purposes.
#    @table = (name, alias = null) =>
#        @tables.push
#            name: name
#            alias: alias
#        @
#
#    # Specify one or more fields to read from the table
#    #
#    # The field parameter does not necessarily have to be a fieldname. It can use database functions too,
#    # e.g. DATE_FORMAT(a.started, "%H")
#    #
#    # @param name name of the table
#    # @param alias alias for the table name. Default is none.
#    #
#    # @return this object instance for chaining purposes.
#    @field = (field, alias = null) =>
#        @fields.push
#            field: field
#            alias: alias
#        @
#
#
#    # Add a JOIN with the given table.
#    #
#    # @param type either one of inner, outer, left or right. Default is 'inner'.
#    # @param table the name of the table to join with
#    # @param the alias for the table name. Default is none.
#    # @param the join condition. Default is none.
#    #
#    # @return this object instance for chaining purposes.
#    @join = (type = 'inner', table, alias = null, condition = null) =>
#        @joins.push
#            type: type
#            table: table
#            alias: alias
#            condition: condition
#        @
#
#
#    # Alias of join() with type set to 'left'
#    #
#    # @return this object instance for chaining purposes.
#    @left_join = (table, alias = null, condition = null) =>
#        join 'left', table, alias, condition
#
#
#    # Alias of join() with type set to 'right'
#    #
#    # @return this object instance for chaining purposes.
#    @right_join = (table, alias = null, condition = null) =>
#        join 'right', table, alias, condition
#
#
#    # Alias of join() with type set to 'outer'
#    #
#    # @return this object instance for chaining purposes.
#    @outer_join = (table, alias = null, condition = null) =>
#        join 'outer', table, alias, condition
#
#
#    # Begin a compound AND expression as part of the WHERE clause
#    #
#    # @return this object instance for chaining purposes.
#    @begin_and_where = (table, alias = null, condition = null) =>
#
#        join 'outer', table, alias, condition
#
#
#    # Get fully constructed SQL query string
#    #
#    # @return the constructed query string.
#    @toString = =>
#
#
#
#
