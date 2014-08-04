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
  
  # LIMIT,  OFFSET x and TOP x
  class cls.MssqlLimitOffsetTopBlock extends cls.Block
    constructor: (options) ->
      super options
      @limits = null
      @offsets = null
    
    # This is setup as one block to return many as they all have to use each others data at different times
    # The build String of EITHER LIMIT OR TOP should execute, never both.
    
    # Set the LIMIT/TOP transformation.
    #
    # Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
    # the limit.
    _limit = (max) ->
      max = @_sanitizeLimitOffset(max)
      @_parent.limits = max
    
    class ParentBlock extends cls.Block
      constructor: (parent) ->
        super parent.options
        @_parent = parent
    
    class LimitBlock extends ParentBlock
      limit: _limit
      buildStr: (queryBuilder) ->
        if @_parent.limits and @_parent.offsets then "FETCH NEXT #{@_parent.limits} ROWS ONLY" else ""
    
    class TopBlock extends ParentBlock
      top: _limit
      buildStr: (queryBuilder) ->
        if @_parent.limits and not @_parent.offsets then "TOP (#{@_parent.limits})" else ""
    
    class OffsetBlock extends ParentBlock
      offset: (start) =>
        start = @_sanitizeLimitOffset(start)
        @_parent.offsets = start
      buildStr: (queryBuilder) ->
        if @_parent.offsets then "OFFSET #{@_parent.offsets} ROWS" else ""
    
    LIMIT: (options) ->
      @constructor options
      new LimitBlock @
    TOP: (options) ->
      @constructor options
      new TopBlock @
    OFFSET: (options) ->
      @constructor options
      new OffsetBlock @
  
  class cls.MssqlUpdateTopBlock extends cls.Block
    constructor: (options) ->
      super options
      @limits = null
    
    _limit = (max) ->
      max = @_sanitizeLimitOffset(max)
      @limits = max
    
    limit: _limit
    top: _limit
    buildStr: (queryBuilder) ->
      if @limits then "TOP (#{@limits})" else ""
  
  class cls.MssqlInsertFieldValueBlock extends cls.InsertFieldValueBlock
    constructor: (options) ->
      super options
      @outputs = []
    
    # add fields to the output clause
    output: (fields) ->
      if 'string' is typeof fields then @outputs.push "INSERTED.#{@_sanitizeField fields}"
      else @outputs.push "INSERTED.#{@_sanitizeField f}" for f in fields
    
    buildStr: (queryBuilder) ->
      if 0 >= @fields.length then throw new Error "set() needs to be called"
  
      "(#{@fields.join(', ')}) #{if @outputs.length isnt 0 then ("OUTPUT #{@outputs.join ', '} ") else ''}VALUES (#{@_buildVals().join('), (')})"
  
    buildParam: (queryBuilder) ->
      if 0 >= @fields.length then throw new Error "set() needs to be called"
  
      # fields
      str = ""
      {vals, params} = @_buildValParams()
      for i in [0...@fields.length]
        str += ", " if "" isnt str
        str += @fields[i]
  
      { text: "(#{str}) #{if @outputs.length isnt 0 then ("OUTPUT #{@outputs.join ', '} ") else ''}VALUES (#{vals.join('), (')})", values: params }
  
  class cls.MssqlUpdateOutputBlock extends cls.Block
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
      limitOffsetTopBlock = new cls.MssqlLimitOffsetTopBlock(options)
      blocks or= [
        new cls.StringBlock(options, 'SELECT'),
        new cls.DistinctBlock(options),
        limitOffsetTopBlock.TOP(options),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(_extend({}, options, { allowNested: true })),
        new cls.JoinBlock(_extend({}, options, { allowNested: true })),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.OrderByBlock(options),
        limitOffsetTopBlock.OFFSET(options),
        limitOffsetTopBlock.LIMIT(options)
      ]
    
      super options, blocks
    
    isNestable: -> true
  
  # Order By in update requires subquery
  
  # UPDATE query builder.
  class cls.Update extends cls.QueryBuilder
    constructor: (options, blocks = null) ->
      blocks or= [
        new cls.StringBlock(options, 'UPDATE'),
        new cls.MssqlUpdateTopBlock(options),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.MssqlUpdateOutputBlock(options),
        new cls.WhereBlock(options)
      ]
    
      super options, blocks
  
  # Order By and Limit/Top in delete requires subquery
  
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
        new cls.MssqlInsertFieldValueBlock(options)
      ]
  
      super options, blocks