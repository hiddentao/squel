###
Copyright (c) 2012 Ramesh Nair (hiddentao.com)

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


squel = require "../src/squel"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['Custom queries and blocks'] =
  beforeEach: ->
    @originalSelect = squel.select

  afterEach: ->
    squel.select = @originalSelect

  'customize existing query with new block': ->
    # Create a date format block, as a way of telling the db what date format to use when outputting dates.
    # (Note: we are just pretending that we can tell the db this!)
    class DateFormatBlock extends squel.cls.Block
      dateFormat: (formatStr) =>
        @format = formatStr

      buildStr: ->
        "USING DATEFORMAT (#{@format})"

    # Custom SELECT query
    class CustomSelect extends squel.cls.QueryBuilder
      constructor: (options) ->
        blocks = [
          new squel.cls.StringBlock(options, 'SELECT'),
          new squel.cls.DistinctBlock(options),
          new squel.cls.GetFieldBlock(options),
          new squel.cls.FromTableBlock(options),
          new squel.cls.JoinBlock(options),
          new squel.cls.WhereBlock(options),
          new DateFormatBlock(options),
          new squel.cls.GroupByBlock(options),
          new squel.cls.OrderByBlock(options),
          new squel.cls.LimitBlock(options),
          new squel.cls.OffsetBlock(options)
        ]

        super options, blocks

    # Override squel.select()
    squel.select = (options) -> new CustomSelect(options)

    assert.same 'SELECT * FROM students USING DATEFORMAT (yyyy-mm-dd)', squel.select().from('students').dateFormat('yyyy-mm-dd').toString()

  'custom query': ->

    class CommandBlock extends squel.cls.Block
      command: (command) =>
        @_command = command
      compress: =>
        @command('compress')
      buildStr: ->
        if (!@_command or 0 is @_command.length) then throw new Error 'command() must be called'
        @_command.toUpperCase()


    class ParamBlock extends squel.cls.Block
      param: (param) =>
        @param = param
      buildStr: ->
        if @param then @param else ""


    class PragmaQuery extends squel.cls.QueryBuilder
      constructor: (options) ->
        blocks = [
          new squel.cls.StringBlock(options, 'PRAGMA'),
          new CommandBlock(options),
          new ParamBlock(options)
        ]

        super options, blocks

    # squel method
    squel.pragma = (options) -> new PragmaQuery(options)

    assert.same 'PRAGMA COMPRESS test', squel.pragma().compress().param('test').toString()




module?.exports[require('path').basename(__filename)] = test
