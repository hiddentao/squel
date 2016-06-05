###
Copyright (c) 2014 Ramesh Nair (hiddentao.com)

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


squel = require "../dist/squel-basic"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['Custom queries'] =
  'custom query': ->
    class CommandBlock extends squel.cls.Block
      command: (command, arg) ->
        @_command = command
        @_arg = arg
      compress: (level) ->
        @command('compress', level)
      _toParamString: (options) ->
        totalStr = @_command.toUpperCase()
        totalValues = []

        if not options.buildParameterized
          totalStr += " #{@_arg}"
        else
          totalStr += " ?"
          totalValues.push(@_arg)

        {
          text: totalStr,
          values: totalValues,
        }


    class PragmaQuery extends squel.cls.QueryBuilder
      constructor: (options) ->
        blocks = [
          new squel.cls.StringBlock(options, 'PRAGMA'),
          new CommandBlock(options),
        ]

        super options, blocks

    # squel method
    squel.pragma = (options) -> new PragmaQuery(options)

    qry = squel.pragma().compress(9)

    assert.same qry.toString(), 'PRAGMA COMPRESS 9'
    assert.same qry.toParam() , {
      text: 'PRAGMA COMPRESS ?',
      values: [9],
    }



module?.exports[require('path').basename(__filename)] = test
