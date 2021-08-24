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


squel = undefined
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()


test['MySQL flavour'] =
  beforeEach: ->
    delete require.cache[require.resolve('../dist/squel')]
    squel = require "../dist/squel"
    squel = squel.useFlavour 'mysql'


  'MysqlOnDuplicateKeyUpdateBlock':
    beforeEach: ->
      @cls = squel.cls.MysqlOnDuplicateKeyUpdateBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'onDupUpdate()':
      'calls to _set()': ->
        spy = test.mocker.stub @inst, '_set'

        @inst.onDupUpdate 'f', 'v', dummy: true

        assert.ok spy.calledWithExactly('f', 'v', dummy: true)


    '_toParamString()':
      beforeEach: ->
        @inst.onDupUpdate('field1 = field1 + 1')
        @inst.onDupUpdate('field2', 'value2', {dummy: true})
        @inst.onDupUpdate('field3', 'value3')

      'non-parameterized': ->
        assert.same @inst._toParamString(), {
          text: 'ON DUPLICATE KEY UPDATE field1 = field1 + 1, field2 = \'value2\', field3 = \'value3\''
          values: []
        }
      'parameterized': ->
        assert.same @inst._toParamString(buildParameterized: true), {
          text: 'ON DUPLICATE KEY UPDATE field1 = field1 + 1, field2 = ?, field3 = ?'
          values: ['value2', 'value3']
        }


  'INSERT builder':
    beforeEach: -> @inst = squel.insert()

    '>> into(table).set(field, 1).set(field1, 2).onDupUpdate(field, 5).onDupUpdate(field1, "str")':
      beforeEach: ->
        @inst
          .into('table')
          .set('field', 1)
          .set('field1', 2)
          .onDupUpdate('field', 5)
          .onDupUpdate('field1', 'str')
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field, field1) VALUES (1, 2) ON DUPLICATE KEY UPDATE field = 5, field1 = \'str\''

      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field, field1) VALUES (?, ?) ON DUPLICATE KEY UPDATE field = ?, field1 = ?'
          values: [1, 2, 5, 'str']
        }

    '>> into(table).set(field2, 3).onDupUpdate(field2, "str", { dontQuote: true })':
      beforeEach: ->
        @inst
          .into('table')
          .set('field2', 3)
          .onDupUpdate('field2', 'str', { dontQuote: true })
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field2) VALUES (3) ON DUPLICATE KEY UPDATE field2 = str'
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field2) VALUES (?) ON DUPLICATE KEY UPDATE field2 = ?'
          values: [3, 'str']
        }

    '>> into(table).set(field, 1).with(alias, table)':
      beforeEach: -> @inst.into('table').set('field', 1).with('alias', squel.select().from('table').where('field = ?', 2))
      toString: ->
        assert.same @inst.toString(), 'WITH alias AS (SELECT * FROM table WHERE (field = 2)) INSERT INTO table (field) VALUES (1)'
      toParam: ->
        assert.same @inst.toParam(), {
          "text": 'WITH alias AS (SELECT * FROM table WHERE (field = ?)) INSERT INTO table (field) VALUES (?)',
          "values": [2, 1]
        }


  'REPLACE builder':
    beforeEach: -> @inst = squel.replace()

    '>> into(table).set(field, 1).set(field1, 2)':
      beforeEach: ->
        @inst
          .into('table')
          .set('field', 1)
          .set('field1', 2)
      toString: ->
        assert.same @inst.toString(), 'REPLACE INTO table (field, field1) VALUES (1, 2)'

      toParam: ->
        assert.same @inst.toParam(), {
          text: 'REPLACE INTO table (field, field1) VALUES (?, ?)'
          values: [1, 2]
        }

    '>> into(table).set(field, 1).with(alias, table)':
      beforeEach: -> @inst.into('table').set('field', 1).with('alias', squel.select().from('table').where('field = ?', 2))
      toString: ->
        assert.same @inst.toString(), 'WITH alias AS (SELECT * FROM table WHERE (field = 2)) REPLACE INTO table (field) VALUES (1)'
      toParam: ->
        assert.same @inst.toParam(), {
          "text": 'WITH alias AS (SELECT * FROM table WHERE (field = ?)) REPLACE INTO table (field) VALUES (?)',
          "values": [2, 1]
        }


  'UPDATE builder':
    beforeEach: -> @upd = squel.update()

    '>> table(table).set(field, 1).with(alias, table)':
      beforeEach: -> @upd.table('table').set('field', 1).with('alias', squel.select().from('table').where('field = ?', 2))
      toString: ->
        assert.same @upd.toString(), 'WITH alias AS (SELECT * FROM table WHERE (field = 2)) UPDATE table SET field = 1'
      toParam: ->
        assert.same @upd.toParam(), {
          "text": 'WITH alias AS (SELECT * FROM table WHERE (field = ?)) UPDATE table SET field = ?',
          "values": [2, 1]
        }


  'DELETE builder':
    beforeEach: -> @del = squel.delete()

    '>> from(table).where(field = 1).with(alias, table)':
      beforeEach: -> @del.from('table').where('field = ?', 1).with('alias', squel.select().from('table').where('field = ?', 2))
      toString: ->
        assert.same @del.toString(), 'WITH alias AS (SELECT * FROM table WHERE (field = 2)) DELETE FROM table WHERE (field = 1)'
      toParam: ->
        assert.same @del.toParam(), {
          "text": 'WITH alias AS (SELECT * FROM table WHERE (field = ?)) DELETE FROM table WHERE (field = ?)',
          "values": [2, 1]
        }

  'SELECT builder':
    beforeEach: ->
      @sel = squel.select()

    'cte queries':
      beforeEach: ->
        @sel = squel.select()
        @sel2 = squel.select()
        @sel3 = squel.select()

      '>> query1.with(alias, query2)':
        beforeEach: ->
          @sel.from('table1').where('field1 = ?', 1)
          @sel2.from('table2').where('field2 = ?', 2)
          @sel.with('someAlias', @sel2)
        toString: ->
          assert.same @sel.toString(), 'WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = 2)) SELECT * FROM table1 WHERE (field1 = 1)'
        toParam: ->
          assert.same @sel.toParam(), {
            "text": 'WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = ?)) SELECT * FROM table1 WHERE (field1 = ?)'
            "values": [2, 1]
          }

      '>> query1.with(alias1, query2).with(alias2, query2)':
        beforeEach: ->
          @sel.from('table1').where('field1 = ?', 1)
          @sel2.from('table2').where('field2 = ?', 2)
          @sel3.from('table3').where('field3 = ?', 3)
          @sel.with('someAlias', @sel2).with('anotherAlias', @sel3)
        toString: ->
          assert.same @sel.toString(), 'WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = 2)), anotherAlias AS (SELECT * FROM table3 WHERE (field3 = 3)) SELECT * FROM table1 WHERE (field1 = 1)'
        toParam: ->
          assert.same @sel.toParam(), {
            "text": 'WITH someAlias AS (SELECT * FROM table2 WHERE (field2 = ?)), anotherAlias AS (SELECT * FROM table3 WHERE (field3 = ?)) SELECT * FROM table1 WHERE (field1 = ?)'
            "values": [2, 3, 1]
          }

module?.exports[require('path').basename(__filename)] = test
