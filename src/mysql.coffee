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
  class cls.InsertFieldValueBlock extends cls.SetFieldBlock
    constructor: (options) ->
      super options
      @fields = {}
      @_duplicateKeyUpdates = {}

    # Update the given field with the given value.
    # options.duplicateKeyUpdate - whether to include the ON DUPLICATE KEY UPDATE clause for this field. The value for
    # the option is the value used to update the key with
    set: (field, value, options) ->
      field = @_sanitizeField(field)
      value = @_sanitizeValue(value)
      @fields[field] = value
      @_duplicateKeyUpdates[field] = @_sanitizeValue(options.duplicateKeyUpdate) if options?.duplicateKeyUpdate isnt undefined
      @

    buildStr: ->
      fieldNames = (name for own name of @fields)
      if 0 >= fieldNames.length then throw new Error "set() needs to be called"

      # fields
      fields = ""
      values = ""
      for field in fieldNames
        fields += ", " if "" isnt fields
        fields += field
        values += ", " if "" isnt values
        values += @_formatValue(@fields[field])

      str = "(#{fields}) VALUES (#{values})"

      # ON DUPLICATE KEY UPDATE
      fields = ""
      for field, value of @_duplicateKeyUpdates
        fields += ", " if "" isnt fields
        fields += "#{field} = #{@_formatValue(value)}"

      if fields isnt ""
        str = "#{str} ON DUPLICATE KEY UPDATE #{fields}"

      str



