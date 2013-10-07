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


squel = require "../squel"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['Postgres flavour'] =
  beforeEach: -> squel.useFlavour 'postgres'

  'INSERT builder':
    beforeEach: -> @inst = squel.insert()

    '>> into(table).set(field, 1).returning("*")':
      beforeEach: -> @inst.into('table').set('field', 1).returning('*')
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field) VALUES (1) RETURNING *'

    '>> into(table).set(field, 1).returning("id")':
      beforeEach: -> @inst.into('table').set('field', 1).returning('id')
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field) VALUES (1) RETURNING id'

  'Default query builder options': ->
    assert.same {
      replaceSingleQuotes: false,
      singleQuoteReplacement: "''",
      autoQuoteTableNames: false
      autoQuoteFieldNames: false
      autoQuoteAliasNames: true
      nameQuoteCharacter: '`'
      tableAliasQuoteCharacter: '`'
      fieldAliasQuoteCharacter: '"'
      usingValuePlaceholders: false
      valueHandlers: []
    }, squel.cls.DefaultQueryBuilderOptions

  'Builder base class':
    beforeEach: ->
      @inst = new squel.cls.BaseBuilder()

    '_formatValue':
      'string': ->
        assert.same "'test'", @inst._formatValue('test')

        @inst.options.usingValuePlaceholders = false
        assert.same "'test'", @inst._formatValue('test')

        @inst.options.usingValuePlaceholders = true
        assert.same "test", @inst._formatValue('test')

        @inst.options.usingValuePlaceholders = false
        @inst.options.replaceSingleQuotes = true
        assert.same "'te''st'", @inst._formatValue("te'st")

        @inst.options.singleQuoteReplacement = '--'
        assert.same "'te--st'", @inst._formatValue("te'st")

        @inst.options.replaceSingleQuotes = false
        assert.same "'te'st'", @inst._formatValue("te'st")

module?.exports[require('path').basename(__filename)] = test
