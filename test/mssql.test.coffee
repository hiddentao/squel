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


squel = require "../squel"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()


_orginalDefaults = {}

test['MSSQL flavour'] =
  beforeEach: ->
  	_orginalDefaults = _.clone squel.cls.DefaultQueryBuilderOptions
  	squel.useFlavour 'mssql'

  afterEach: -> squel.cls.DefaultQueryBuilderOptions = _orginalDefaults

  'DATE Conversion':
    beforeEach: -> @inst = squel.insert()

    '>> into(table).set(field, new Date(2012-12-12T4:30:00Z))':
      beforeEach: -> @inst.into('table').set('field', new Date("2012-12-12T04:30:00Z"))
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field) VALUES (\'2012-12-12 4:30:0\')'

  'SELECT builder':
    beforeEach: ->
      @sel = squel.select()

    '>> from(table).field(field).top(10)':
      beforeEach: -> @sel.from('table').field('field').top(10)
      toString: ->
        assert.same @sel.toString(), 'SELECT TOP (10) field FROM table'

    '>> from(table).field(field).limit(10)':
      beforeEach: -> @sel.from('table').field('field').limit(10)
      toString: ->
        assert.same @sel.toString(), 'SELECT TOP (10) field FROM table'

    '>> from(table).field(field).limit(10).offset(5)':
      beforeEach: -> @sel.from('table').field('field').limit(10).offset(5)
      toString: ->
        assert.same @sel.toString(), 'SELECT field FROM table OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY'

    '>> from(table).field(field).top(10).offset(5)':
      beforeEach: -> @sel.from('table').field('field').top(10).offset(5)
      toString: ->
        assert.same @sel.toString(), 'SELECT field FROM table OFFSET 5 ROWS FETCH NEXT 10 ROWS ONLY'

    '>> from(table).field(field).offset(5)':
      beforeEach: -> @sel.from('table').field('field').offset(5)
      toString: ->
        assert.same @sel.toString(), 'SELECT field FROM table OFFSET 5 ROWS'

    '>> check variales arent being shared':
      toString: ->
        assert.same squel.select().from('table').field('field').top(10).toString(), 'SELECT TOP (10) field FROM table'
        assert.same squel.select().from('table').field('field').toString(), 'SELECT field FROM table'
  'INSERT builder':
    beforeEach: -> @inst = squel.insert()

    '>> into(table).set(field, 1).output(id)':
      beforeEach: -> @inst.into('table').output('id').set('field', 1)
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field) OUTPUT INSERTED.id VALUES (1)'

  'UPDATE builder':
    beforeEach: -> @upt = squel.update()

    '>> table(table).set(field, 1).top(12)':
      beforeEach: -> @upt.table('table').set('field', 1).top(12)
      toString: ->
        assert.same @upt.toString(), 'UPDATE TOP (12) table SET field = 1'

    '>> table(table).set(field, 1).limit(12)':
      beforeEach: -> @upt.table('table').set('field', 1).limit(12)
      toString: ->
        assert.same @upt.toString(), 'UPDATE TOP (12) table SET field = 1'

    '>> table(table).set(field, 1).output(id)':
      beforeEach: -> @upt.table('table').output('id').set('field', 1)
      toString: ->
        assert.same @upt.toString(), 'UPDATE table SET field = 1 OUTPUT INSERTED.id'

    '>> table(table).set(field, 1).outputs(id AS ident, name AS naming)':
      beforeEach: -> @upt.table('table').outputs(
      	id: 'ident'
      	name: 'naming'
      ).set('field', 1)
      toString: ->
        assert.same @upt.toString(), 'UPDATE table SET field = 1 OUTPUT INSERTED.id AS ident, INSERTED.name AS naming'

  'Default query builder options': ->
    assert.same {
      autoQuoteTableNames: false
      autoQuoteFieldNames: false
      autoQuoteAliasNames: false
      nameQuoteCharacter: '`'
      tableAliasQuoteCharacter: '`'
      fieldAliasQuoteCharacter: '"'
      valueHandlers: []
      numberedParameters: false
      numberedParametersStartAt: 1
      replaceSingleQuotes: true
      singleQuoteReplacement: '\'\''
      separator: ' '
    }, squel.cls.DefaultQueryBuilderOptions

module?.exports[require('path').basename(__filename)] = test
