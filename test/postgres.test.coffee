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


squel = undefined
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()


test['Postgres flavour'] =
  beforeEach: ->
    delete require.cache[require.resolve('../squel')]
    squel = require "../squel"
    squel = squel.useFlavour 'postgres'

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

  'UPDATE builder':
    beforeEach: -> @upd = squel.update()

    '>> table(table).set(field, 1).returning("*")':
      beforeEach: -> @upd.table('table').set('field', 1).returning('*')
      toString: ->
        assert.same @upd.toString(), 'UPDATE table SET field = 1 RETURNING *'

    '>> table(table).set(field, 1).returning("field")':
      beforeEach: -> @upd.table('table').set('field', 1).returning('field')
      toString: ->
        assert.same @upd.toString(), 'UPDATE table SET field = 1 RETURNING field'

  'DELETE builder':
    beforeEach: -> @del = squel.delete()

    '>> from(table).where(field = 1).returning("*")':
      beforeEach: -> @del.from('table').where('field = 1').returning('*')
      toString: ->
        assert.same @del.toString(), 'DELETE FROM table WHERE (field = 1) RETURNING *'

    '>> from(table).where(field = 1).returning("field")':
      beforeEach: -> @del.from('table').where('field = 1').returning('field')
      toString: ->
        assert.same @del.toString(), 'DELETE FROM table WHERE (field = 1) RETURNING field'

  'SELECT builder':
    beforeEach: ->
      @sel = squel.select()
    'select':
      '>> from(table).where(field = 1)':
        beforeEach: ->
          @sel.field('field1').from('table1').where('field1 = 1')
        toString: ->
          assert.same @sel.toString(), 'SELECT field1 FROM table1 WHERE (field1 = 1)'
        toParam: ->
          assert.same @sel.toParam(), {
            "text": 'SELECT field1 FROM table1 WHERE (field1 = 1)'
            "values": []
          }

      '>> from(table).where(field = ?, 2)':
        beforeEach: ->
          @sel.field('field1').from('table1').where('field1 = ?', 2)
        toString: ->
          assert.same @sel.toString(), 'SELECT field1 FROM table1 WHERE (field1 = 2)'
        toParam: ->
          assert.same @sel.toParam(), {
            "text": 'SELECT field1 FROM table1 WHERE (field1 = $1)'
            "values": [2]
          }

    'union queries':
      beforeEach: ->
        @sel = squel.select()
        @sel2 = squel.select()

      '>> query1.union(query2)':
        beforeEach: ->
          @sel.field('field1').from('table1').where('field1 = ?', 3)
          @sel2.field('field1').from('table1').where('field1 < ?', 10)
          @sel.union(@sel2)
        toString: ->
          assert.same @sel.toString(), 'SELECT field1 FROM table1 WHERE (field1 = 3) UNION (SELECT field1 FROM table1 WHERE (field1 < 10))'
        toParam: ->
          assert.same @sel.toParam(), {
            "text": 'SELECT field1 FROM table1 WHERE (field1 = $1) UNION (SELECT field1 FROM table1 WHERE (field1 < $2))'
            "values": [
              3
              10
            ]
          }

      '>> query1.union_all(query2)':
        beforeEach: ->
          @sel.field('field1').from('table1').where('field1 = ?', 3)
          @sel2.field('field1').from('table1').where('field1 < ?', 10)
          @sel.union_all(@sel2)
        toString: ->
          assert.same @sel.toString(), 'SELECT field1 FROM table1 WHERE (field1 = 3) UNION ALL (SELECT field1 FROM table1 WHERE (field1 < 10))'
        toParam: ->
          assert.same @sel.toParam(), {
            "text": 'SELECT field1 FROM table1 WHERE (field1 = $1) UNION ALL (SELECT field1 FROM table1 WHERE (field1 < $2))'
            "values": [
              3
              10
            ]
          }


  'Default query builder options': ->
    assert.same {
      replaceSingleQuotes: false
      singleQuoteReplacement: '\'\''
      autoQuoteTableNames: false
      autoQuoteFieldNames: false
      autoQuoteAliasNames: false
      nameQuoteCharacter: '`'
      tableAliasQuoteCharacter: '`'
      fieldAliasQuoteCharacter: '"'
      valueHandlers: []
      parameterCharacter: '?'
      numberedParameters: true
      numberedParametersPrefix: '$'
      numberedParametersStartAt: 1
      separator: ' '
    }, squel.cls.DefaultQueryBuilderOptions


module?.exports[require('path').basename(__filename)] = test
