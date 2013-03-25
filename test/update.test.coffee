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



test['UPDATE builder'] =
  beforeEach: ->
    @inst = squel.update()

  'instanceof WhereOrderLimit': ->
    assert.instanceOf @inst, squel.WhereOrderLimit

  'default field values': ->
    assert.same [], @inst.tables
    assert.same {}, @inst.fields
    assert.same squel.classes.DefaultQueryBuilderOptions, @inst.options

  'constructor':
    'override options': ->
      @inst = squel.update
        usingValuePlaceholders: true
        dummy: true

      assert.same [], @inst.tables
      assert.same {}, @inst.fields

      expectedOptions = _.extend {}, squel.classes.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true
        dummy: true
      assert.same expectedOptions, @inst.options

      
  '>> table()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeTable')
      test.mocker.spy(@inst, '_sanitizeAlias')

    'args: ()': ->
      assert.throws (=> @inst.table()), 'table name must be a string'
      assert.ok @inst._sanitizeTable.calledWithExactly(undefined)

    'args: (table)':
      beforeEach: ->
        @ret = @inst.table('table')

      'update internal state': ->
        assert.same @ret, @inst
        assert.same @inst.tables, [
          {
          name: 'table'
          alias: null
          }
        ]

        assert.ok @inst._sanitizeTable.calledWithExactly('table')
        assert.ok @inst._sanitizeAlias.notCalled

      '>> args(table2)': ->
        assert.same @inst.table('table2'), @inst
        assert.same @inst.tables, [
          {
          name: 'table'
          alias: null
          }
          {
          name: 'table2'
          alias: null
          }
        ]

    'args: (table, alias)': ->
      @inst.table('table', 'alias')

      assert.same @inst.tables, [
        {
        name: 'table'
        alias: 'alias'
        }
      ]

      assert.ok @inst._sanitizeTable.calledWithExactly('table')
      assert.ok @inst._sanitizeAlias.calledWithExactly('alias')


  '>> set()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeField')
      test.mocker.spy(@inst, '_sanitizeValue')

    'args: ()': ->
      assert.throws (=> @inst.set()), 'field name must be a string'
      assert.ok @inst._sanitizeField.calledWithExactly(undefined)

    'args: (field)': ->
      assert.throws (=> @inst.set('field')), 'field value must be a string, number, boolean or null'
      assert.ok @inst._sanitizeField.calledWithExactly('field')
      assert.ok @inst._sanitizeValue.calledWithExactly(undefined)

    'args: (field, null)':
      beforeEach: ->
        @ret = @inst.set('field', null)

      'update internal state': ->
        assert.same @ret, @inst
        assert.same @inst.fields, { 'field': null }
        assert.ok @inst._sanitizeField.calledWithExactly('field')
        assert.ok @inst._sanitizeValue.calledWithExactly(null)

      '>> args: (field, 1)':
        beforeEach: ->
          @ret = @inst.set('field', 1)

        'update internal state': ->
          assert.same @ret, @inst
          assert.same @inst.fields, { 'field': 1 }
          assert.ok @inst._sanitizeField.calledWithExactly('field')
          assert.ok @inst._sanitizeValue.calledWithExactly(1)


  'build query':
    beforeEach: ->
      test.mocker.spy(@inst, '_whereString')
      test.mocker.spy(@inst, '_orderString')
      test.mocker.spy(@inst, '_limitString')

    'need to call table() first': ->
      assert.throws (=> @inst.toString()), 'table() needs to be called'

    'need to call set() first': ->
      @inst.table('table')
      assert.throws (=> @inst.toString()), 'set() needs to be called'

    '>> table(table, t1).set(field, 1)':
      beforeEach: -> @inst.table('table', 't1').set('field', 1)
      toString: ->
        assert.same @inst.toString(), 'UPDATE table AS `t1` SET field = 1'
        assert.ok @inst._whereString.calledOnce
        assert.ok @inst._orderString.calledOnce
        assert.ok @inst._limitString.calledOnce

      '>> set(field2, 1.2)':
        beforeEach: -> @inst.set('field2', 1.2)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table AS `t1` SET field = 1, field2 = 1.2'

      '>> set(field2, true)':
        beforeEach: -> @inst.set('field2', true)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table AS `t1` SET field = 1, field2 = TRUE'

      '>> set(field2, "str")':
        beforeEach: -> @inst.set('field2', 'str')
        toString: ->
          assert.same @inst.toString(), 'UPDATE table AS `t1` SET field = 1, field2 = \'str\''

        'and when using value placeholders': ->
          @inst.options.usingValuePlaceholders = true
          @inst.set('field2', 'str')
          assert.same @inst.toString(), 'UPDATE table AS `t1` SET field = 1, field2 = str'

      '>> set(field2, null)':
        beforeEach: -> @inst.set('field2', null)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table AS `t1` SET field = 1, field2 = NULL'

        '>> table(table2)':
          beforeEach: -> @inst.table('table2')
          toString: ->
            assert.same @inst.toString(), 'UPDATE table AS `t1`, table2 SET field = 1, field2 = NULL'

          '>> where(a = 1)':
            beforeEach: -> @inst.where('a = 1')
            toString: ->
              assert.same @inst.toString(), 'UPDATE table AS `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1)'

            '>> order(a, true)':
              beforeEach: -> @inst.order('a', true)
              toString: ->
                assert.same @inst.toString(), 'UPDATE table AS `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC'

              '>> limit(2)':
                beforeEach: -> @inst.limit(2)
                toString: ->
                  assert.same @inst.toString(), 'UPDATE table AS `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC LIMIT 2'



module?.exports[require('path').basename(__filename)] = test
