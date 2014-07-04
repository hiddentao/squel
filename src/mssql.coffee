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

# Extend given object's with other objects' properties, overriding existing ones if necessary
_extend = (dst, sources...) ->
  if sources
    for src in sources
      if src
        for own k,v of src
          dst[k] = v
  dst

# This file contains additional Squel commands for use with the MSSQL DB engine

squel.flavours['mssql'] = ->
  cls = squel.cls
  
  cls.DefaultQueryBuilderOptions.replaceSingleQuotes = true
  cls.DefaultQueryBuilderOptions.autoQuoteAliasNames = false
  
  squel.registerValueHandler Date, (date) -> "#{date.getUTCFullYear()}-#{date.getUTCMonth()+1}-#{date.getUTCDate()} #{date.getUTCHours()}:#{date.getUTCMinutes()}:#{date.getUTCSeconds()}"
  
  # TOP
  class cls.TopBlock extends cls.Block
    constructor: (options) ->
      super options
      @topRows = undefined
    
    # Add the TOP keyword to the query with row count.
    top: (rows) -> @topRows = rows
    
    buildStr: (queryBuilder) -> if @topRows? then "TOP #{@topRows}" else ""
  
  class cls.InsertFieldValueBlock extends cls.SetFieldBlock
    constructor: (options) ->
      super options
      @outputs = []
    
    # add fields to the output clause
    output: (fields) ->
      if 'string' is typeof fields then @outputs.push "INSERTED.#{@_sanitizeField fields}"
      else @outputs.push "INSERTED.#{@_sanitizeField f}" for f in fields
    
        
    buildStr: (queryBuilder) ->
      if 0 >= @fields.length then throw new Error "set() needs to be called"
      
      vals = []
      for i in [0...@values.length]
        for j in [0...@values[i].length]
          formattedValue = @_formatValue(@values[i][j])
          if 'string' is typeof vals[i]
            vals[i] += ', ' + formattedValue      
          else 
            vals[i] = '' + formattedValue
      
      "(#{@fields.join(', ')}) #{if @outputs.length isnt 0 then ("OUTPUT #{@outputs.join ', '} ") else ''}VALUES (#{vals.join('), (')})"
  
  class cls.UpdateOutputBlock extends cls.Block
    constructor: (options) ->
      super options
      @_outputs = []
    
    
    # Add the given fields to the final result set.
    #
    # The parameter is an Object containing field names (or database functions) as the keys and aliases for the fields
    # as the values. If the value for a key is null then no alias is set for that field.
    #
    # Internally this method simply calls the field() method of this block to add each individual field.
    outputs: (_outputs) ->
      for output, alias of _outputs
        @output(output, alias)
    
    
    # Add the given field to the final result set.
    #
    # The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
    # e.g. DATE_FORMAT(a.started, "%H")
    #
    # An alias may also be specified for this field.
    output: (output, alias = null) ->
      output = @_sanitizeField(output)
      alias = @_sanitizeFieldAlias(alias) if alias
      
      @_outputs.push
        name: "INSERTED.#{output}"
        alias: alias
    
    buildStr: (queryBuilder) ->
      outputs = ""
      if @_outputs.length > 0
        for output in @_outputs
          outputs += ", " if "" isnt outputs
          outputs += output.name
          outputs += " AS #{output.alias}" if output.alias
        
        outputs = "OUTPUT #{outputs}"
      outputs
  
  
  # SELECT query builder.
  class cls.Select extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'SELECT'),
        new cls.DistinctBlock(options),
        new cls.TopBlock(options),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(_extend({}, options, { allowNested: true })),
        new cls.JoinBlock(_extend({}, options, { allowNested: true })),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.OffsetBlock(options)
      ]
    
      super options, blocks
    
    isNestable: -> true
  # UPDATE query builder.
  class cls.Update extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'UPDATE'),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.UpdateOutputBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options)
      ]
    
      super options, blocks