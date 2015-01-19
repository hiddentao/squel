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

squel.flavours['mysql'] = ->
  cls = squel.cls

  # target <table> in DELETE <table> FROM ...
  class cls.TargetTableBlock extends cls.AbstractValueBlock
    target: (table) ->
      @_setValue( @_sanitizeTable table )


  # ON DUPLICATE KEY UPDATE ...
  class cls.MysqlOnDuplicateKeyUpdateBlock extends cls.AbstractSetFieldBlock
    onDupUpdate: (field, value, options) ->
      @_set field, value, options

    buildStr: ->
      str = ""
      for i in [0...@fields.length]
        field = @fields[i]
        str += ", " if "" isnt str
        value = @values[0][i]
        fieldOptions = @fieldOptions[0][i]
        if typeof value is 'undefined'  # e.g. if field is an expression such as: count = count + 1
          str += field
        else
          str += "#{field} = #{@_formatValue(value, fieldOptions)}"

      return if str is "" then "" else "ON DUPLICATE KEY UPDATE #{str}"

    buildParam: (queryBuilder) ->
      str = ""
      vals = []
      for i in [0...@fields.length]
        field = @fields[i]
        str += ", " if "" isnt str
        value = @values[0][i]
        if typeof value is 'undefined'  # e.g. if field is an expression such as: count = count + 1
          str += field
        else
          str += "#{field} = ?"
          vals.push @_formatValueAsParam( value )

      {
        text: if str is "" then "" else "ON DUPLICATE KEY UPDATE #{str}"
        values: vals
      }



  # INSERT query builder.
  class cls.Insert extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'INSERT')
        new cls.IntoTableBlock(options)
        new cls.InsertFieldValueBlock(options)
        new cls.InsertFieldsFromQueryBlock(options)
        new cls.MysqlOnDuplicateKeyUpdateBlock(options)
      ]

      super options, blocks

  class cls.Delete extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'DELETE')
        new cls.TargetTableBlock(options)
        new cls.FromTableBlock( _extend({}, options, { singleTable: true }) )
        new cls.JoinBlock(options)
        new cls.WhereBlock(options)
        new cls.OrderByBlock(options)
        new cls.LimitBlock(options)
      ]

      super options, blocks


