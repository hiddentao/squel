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

  # (INSERT INTO) ... field ... value
  class cls.MysqlInsertFieldValueBlock extends cls.InsertFieldValueBlock
    constructor: (options) ->
      super options
      @_duplicateKeyUpdates = {}

    # options.duplicateKeyUpdate - whether to include the ON DUPLICATE KEY UPDATE clause for this field. The value for the option is the value used to update the key with
    set: (field, value, options = {}) ->
      super field, value, _without(options, 'duplicateKeyUpdate')
      @_duplicateKeyUpdates[field] = @_sanitizeValue(options.duplicateKeyUpdate) if options?.duplicateKeyUpdate isnt undefined
      @

    # options.duplicateKeyUpdate - whether to include the ON DUPLICATE KEY UPDATE clause for this field. The value for the option is the value used to update the key with
    setFields: (fields, options = {}) ->
      super fields, _without(options, 'duplicateKeyUpdate')

      for field,value of options.duplicateKeyUpdate
        @_duplicateKeyUpdates[field] = @_sanitizeValue(value)

      @


    # options.duplicateKeyUpdate - whether to include the ON DUPLICATE KEY UPDATE clause for this field. The value for the option is the value used to update the key with
    setFieldsRows: (fieldsRows, options = {}) ->
      super fieldsRows, _without(options, 'duplicateKeyUpdate')

      for field,value of options.duplicateKeyUpdate
        @_duplicateKeyUpdates[field] = @_sanitizeValue(value)

      @


    buildStr: ->
      str = super()
      "#{str}#{@_buildDuplicateKeyUpdateStr()}"


    buildParam: (queryBuilder) ->
      qry = super queryBuilder
      dups = @_buildDuplicateKeyUpdateParam()
      qry.text = "#{qry.text}#{dups.text}"
      qry.values.push.apply(qry.values, dups.values)
      qry

    # Build str: ON DUPLICATE KEY UPDATE      
    _buildDuplicateKeyUpdateStr: ->
      fields = ""
      for field, value of @_duplicateKeyUpdates
        fields += ", " if "" isnt fields
        fields += "#{field} = #{@_formatValue(value)}"

      return if fields isnt "" then " ON DUPLICATE KEY UPDATE #{fields}" else ""

    # Build params str: ON DUPLICATE KEY UPDATE      
    _buildDuplicateKeyUpdateParam: ->
      ret = 
        text: ""
        values: []

      fields = ""
      for field, value of @_duplicateKeyUpdates
        fields += ", " if "" isnt fields
        fields += "#{field} = ?"
        ret.values.push @_formatValueAsParam(value)

      if fields isnt ""
        ret.text = " ON DUPLICATE KEY UPDATE #{fields}"

      ret


  # An INSERT query builder.
  class cls.Insert extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.MysqlInsertFieldValueBlock(options)
      ]

      super options, blocks        
