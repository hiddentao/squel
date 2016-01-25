###
Copyright (c) Ramesh Nair (hiddentao.com)

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

# This file contains additional Squel commands for use with the Postgres DB engine
squel.flavours['postgres'] = (_squel) ->
  cls = _squel.cls

  # Numbered parameters on by default
  cls.DefaultQueryBuilderOptions.numberedParameters = true
  cls.DefaultQueryBuilderOptions.numberedParametersStartAt = 1
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false

  # RETURNING
  class cls.ReturningBlock extends cls.Block
    constructor: (options) ->
      super options
      @_str = null

    returning: (ret) ->
      @_str = @_sanitizeField(ret)

    buildStr: ->
      if @_str then "RETURNING #{@_str}" else ""

  # INSERT query builder
  class cls.Insert extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'INSERT')
        new cls.IntoTableBlock(options)
        new cls.InsertFieldValueBlock(options)
        new cls.InsertFieldsFromQueryBlock(options)
        new cls.ReturningBlock(options)
      ]
      super options, blocks

  # UPDATE query builder
  class cls.Update extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'UPDATE')
        new cls.UpdateTableBlock(options)
        new cls.SetFieldBlock(options)
        new cls.FromTableBlock(_extend({}, options, { allowNested: true }))
        new cls.WhereBlock(options)
        new cls.OrderByBlock(options)
        new cls.LimitBlock(options)
        new cls.ReturningBlock(options)
      ]
      super options, blocks

  # DELETE query builder
  class cls.Delete extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'DELETE')
        new cls.FromTableBlock( _extend({}, options, { singleTable: true }) )
        new cls.JoinBlock(options)
        new cls.WhereBlock(options)
        new cls.OrderByBlock(options)
        new cls.LimitBlock(options)
        new cls.ReturningBlock(options)
      ]
      super options, blocks

  # ORDER BY
  class cls.OrderByBlock extends cls.Block
    constructor: (options) ->
      super options
      @orders = []
      @_values = []

    # Add an ORDER BY transformation for the given field in the given order.
    #
    # To specify descending order pass false for the 'asc' parameter.
    order: (field, asc, nullsOrder, values...) ->
      field = @_sanitizeField(field)

      asc = true if asc is undefined
      asc = !!asc if asc isnt null

      nullsOrder = nullsOrder or null

      @_values = values

      @orders.push
        field: field
        dir: asc
        nullsOrder: nullsOrder

    _buildStr: (toParam = false) ->
      if 0 < @orders.length
        pIndex = 0
        orders = ""
        for o in @orders
          orders += ", " if "" isnt orders

          fstr = ""

          if not toParam
            for idx in [0...o.field.length]
              c = o.field.charAt(idx)
              if @options.parameterCharacter is c
                fstr += @_formatValue( @_values[pIndex++] )
              else
                fstr += c
          else
            fstr = o.field

          orders += "#{fstr}"

          if o.nullsOrder isnt null and typeof o.nullsOrder == 'string'
            orders += " NULLS #{o.nullsOrder}"

          if o.dir isnt null
            orders += " #{if o.dir then 'ASC' else 'DESC'}"

        "ORDER BY #{orders}"
      else
        ""
