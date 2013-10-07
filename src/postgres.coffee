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

squel.flavours['postgres'] = ->
  cls = squel.cls

  # If true then replaces all single quotes. The replacement string used is configurable via the singleQuoteReplacement option
  cls.DefaultQueryBuilderOptions.replaceSingleQuotes = false
  # The single quote string to replace single quotes in queries
  cls.DefaultQueryBuilderOptions.singleQuoteReplacement = '\'\''

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
        new cls.StringBlock(options, 'INSERT'),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.ReturningBlock(options)
      ]
      super options, blocks

  # Escape strings using the options
  cls.BaseBuilder.prototype._escapeValue = (value) ->
    return value unless true is @options.replaceSingleQuotes
    value.replace /\'/g, @options.singleQuoteReplacement

