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
{testCreator, assert, expect, should} = require './testbase'
test = testCreator()


test['Cloneable base class'] =
  '>> clone()': ->

    class Child extends squel.Cloneable
      constructor: ->
        @a = 1
        @b = 2.2
        @c = true
        @d = 'str'
        @e = [1]
        @f = { a: 1 }

    child = new Child()

    copy = child.clone()
    assert.instanceOf copy, Child

    child.a = 2
    child.b = 3.2
    child.c = false
    child.d = 'str2'
    child.e.push(2)
    child.f.b = 1

    assert.same copy.a, 1
    assert.same copy.b, 2.2
    assert.same copy.c, true
    assert.same copy.d, 'str'
    assert.same copy.e, [1]
    assert.same copy.f, { a: 1 }



test['QueryBuilder base class'] =
  beforeEach: ->
    @inst = new squel.QueryBuilder()

  'instanceof Cloneable': ->
    assert.instanceOf @inst, squel.Cloneable

  '_getObjectClassName': ->
    s = 'a string'
    b = new Object()
    c = new Error()
    d = 1

    assert.same @inst._getObjectClassName(0), undefined
    assert.same @inst._getObjectClassName(true), 'Boolean'
    assert.same @inst._getObjectClassName(1.2), 'Number'
    assert.same @inst._getObjectClassName('a string'), 'String'
    assert.same @inst._getObjectClassName(new Object), 'Object'
    assert.same @inst._getObjectClassName(new Error), 'Error'

  '_sanitizeCondition':
    beforeEach: ->
      test.mocker.spy @inst, '_getObjectClassName'

    'if Expression': ->
      e = squel.expr()
      assert.same "", @inst._sanitizeCondition(e)
      assert.ok @inst._getObjectClassName.calledWithExactly(e)

    'if string': ->
      s = 'BLA BLA'
      assert.same 'BLA BLA', @inst._sanitizeCondition(s)
      assert.ok @inst._getObjectClassName.calledWithExactly(s)

    'if neither Expression nor String': ->
      testFn = => @inst._sanitizeCondition(1)
      assert.throws testFn, 'condition must be a string or Expression instance'
      assert.ok @inst._getObjectClassName.calledWithExactly(1)


  '_sanitizeName':
    beforeEach: ->
      test.mocker.spy @inst, '_sanitizeName'

    'if string': ->
      assert.same 'bla', @inst._sanitizeName('bla')

    'if boolean': ->
      assert.throws (=> @inst._sanitizeName(true, 'bla')), 'bla must be a string'

    'if integer': ->
      assert.throws (=> @inst._sanitizeName(1)), 'undefined must be a string'

    'if float': ->
      assert.throws (=> @inst._sanitizeName(1.2, 'meh')), 'meh must be a string'

    'if array': ->
      assert.throws (=> @inst._sanitizeName([1], 'yes')), 'yes must be a string'

    'if object': ->
      assert.throws (=> @inst._sanitizeName(new Object, 'yes')), 'yes must be a string'

    'if null': ->
      assert.throws (=> @inst._sanitizeName(null, 'no')), 'no must be a string'

    'if undefined': ->
      assert.throws (=> @inst._sanitizeName(undefined, 'no')), 'no must be a string'


  '_sanitizeField': ->
    test.mocker.spy @inst, '_sanitizeName'

    assert.same 'abc', @inst._sanitizeField('abc')

    assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'field name'


  '_sanitizeTable': ->
    test.mocker.spy @inst, '_sanitizeName'

    assert.same 'abc', @inst._sanitizeTable('abc')

    assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'table name'


  '_sanitizeAlias': ->
    test.mocker.spy @inst, '_sanitizeName'

    assert.same 'abc', @inst._sanitizeAlias('abc')

    assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'alias'


  '_sanitizeLimitOffset':
    'undefined': ->
      assert.throws (=> @inst._sanitizeLimitOffset()), 'limit/offset must be >= 0'

    'null': ->
      assert.throws (=> @inst._sanitizeLimitOffset null), 'limit/offset must be >= 0'

    'float': ->
      assert.same 1, @inst._sanitizeLimitOffset 1.2

    'boolean': ->
      assert.throws (=> @inst._sanitizeLimitOffset false), 'limit/offset must be >= 0'

    'string': ->
      assert.same 2, @inst._sanitizeLimitOffset '2'

    'array': ->
      assert.same 3, @inst._sanitizeLimitOffset [3]

    'object': ->
      assert.throws (=> @inst._sanitizeLimitOffset(new Object)), 'limit/offset must be >= 0'

    'number >= 0': ->
      assert.same 0, @inst._sanitizeLimitOffset 0
      assert.same 1, @inst._sanitizeLimitOffset 1

    'number < 0': ->
      assert.throws (=> @inst._sanitizeLimitOffset(-1)), 'limit/offset must be >=0'

  '_sanitizeValue':
    beforeEach: ->
      test.mocker.spy @inst, '_sanitizeValue'

    'if string': ->
      assert.same 'bla', @inst._sanitizeValue('bla')

    'if boolean': ->
      assert.same true, @inst._sanitizeValue(true)
      assert.same false, @inst._sanitizeValue(false)

    'if integer': ->
      assert.same -1, @inst._sanitizeValue(-1)
      assert.same 0, @inst._sanitizeValue(0)
      assert.same 1, @inst._sanitizeValue(1)

    'if float': ->
      assert.same -1.2, @inst._sanitizeValue(-1.2)
      assert.same 1.2, @inst._sanitizeValue(1.2)

    'if array': ->
      assert.throws (=> @inst._sanitizeValue([1])), 'field value must be a string, number, boolean or null'

    'if object': ->
      assert.throws (=> @inst._sanitizeValue(new Object)), 'field value must be a string, number, boolean or null'

    'if null': ->
      assert.same null, @inst._sanitizeValue(null)

    'if undefined': ->
      assert.throws (=> @inst._sanitizeValue(undefined)), 'field value must be a string, number, boolean or null'


  '_formatValue':
    'null': ->
      assert.same 'NULL', @inst._formatValue(null)

    'boolean': ->
      assert.same 'TRUE', @inst._formatValue(true)
      assert.same 'FALSE', @inst._formatValue(false)

    'integer': ->
      assert.same 12, @inst._formatValue(12)

    'float': ->
      assert.same 1.2, @inst._formatValue(1.2)

    'string': ->
      assert.same "'test'", @inst._formatValue('test')
      assert.same "'test'", @inst._formatValue('test', { usingValuePlaceholders: false })
      assert.same "test", @inst._formatValue('test', { usingValuePlaceholders: true })



test['WhereOrderLimit base class'] =
  beforeEach: ->
    @inst = new squel.WhereOrderLimit()

  'instanceof QueryBuilder': ->
    assert.instanceOf @inst, squel.QueryBuilder

  'default field values': ->
    assert.same [], @inst.wheres
    assert.same [], @inst.orders
    assert.same null, @inst.limits

  '>> where()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeCondition')

    'with empty string': ->
      assert.same @inst, @inst.where("")

      assert.ok @inst._sanitizeCondition.calledWithExactly ""
      assert.same [], @inst.wheres

    'with Expression': ->
      e = squel.expr().or('a = 5')

      assert.same @inst, @inst.where(e)

      assert.ok @inst._sanitizeCondition.calledWithExactly e
      assert.same [e.toString()], @inst.wheres

    'with non-empty string':
      beforeEach: ->
        @ret = @inst.where("a")

      'updates internal state': ->
        assert.same @ret, @inst
        assert.ok @inst._sanitizeCondition.calledWithExactly "a"
        assert.same ['a'], @inst.wheres

      'with non-empty string again':
        beforeEach: ->
          @ret = @inst.where("b")

        'adds to internal state': ->
          assert.ok @inst._sanitizeCondition.calledWithExactly "b"
          assert.same ['a', 'b'], @inst.wheres


  '>> order()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeField')

    'args empty': ->
      assert.throws (=> @inst.order()), 'field name must be a string'

      assert.ok @inst._sanitizeField.calledWithExactly undefined
      assert.same [], @inst.orders

    'args (field)':
      beforeEach: ->
        @ret = @inst.order("field")

      'updates internal state': ->
        assert.same @ret, @inst

        assert.ok @inst._sanitizeField.calledWithExactly 'field'
        assert.same [ { field: 'field', dir: 'ASC' } ], @inst.orders

    'args (field, true)':
      beforeEach: ->
        @ret = @inst.order("field", true)

      'updates internal state': ->
        assert.same @ret, @inst

        assert.ok @inst._sanitizeField.calledWithExactly 'field'
        assert.same [ { field: 'field', dir: 'ASC' } ], @inst.orders

      '>> args (field2, false)':
        beforeEach: ->
          @ret = @inst.order("field2", false)

        'adds to internal state': ->
          assert.same @ret, @inst

          assert.ok @inst._sanitizeField.calledWithExactly 'field2'
          assert.same [ { field: 'field', dir: 'ASC' }, { field: 'field2', dir: 'DESC' } ], @inst.orders


  '>> limit()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeLimitOffset')

    'args empty': ->
      assert.throws (=> @inst.limit()), 'limit/offset must be >=0'

      assert.ok @inst._sanitizeLimitOffset.calledWithExactly undefined
      assert.same null, @inst.limits

    'args (0)':
      beforeEach: ->
        @ret = @inst.limit(0)

      'updates internal state': ->
        assert.same @ret, @inst

        assert.ok @inst._sanitizeLimitOffset.calledWithExactly 0
        assert.same 0, @inst.limits

      '>> args (2)':
        beforeEach: ->
          @ret = @inst.limit(2)

        'updates internal state': ->
          assert.same @ret, @inst

          assert.ok @inst._sanitizeLimitOffset.calledWithExactly 2
          assert.same 2, @inst.limits


  '>> _whereString()':
    'no clauses': ->
      @inst.wheres = []
      assert.same @inst._whereString(), ""

    '1 clause': ->
      @inst.wheres = ['a']
      assert.same @inst._whereString(), " WHERE (a)"

    '>1 clauses': ->
      @inst.wheres = ['a', 'b']
      assert.same @inst._whereString(), " WHERE (a) AND (b)"


  '>> _orderString()':
    'no clauses': ->
      @inst.orders = []
      assert.same @inst._orderString(), ""

    '1 clause': ->
      @inst.orders = [{ field: 'a', dir: 'ASC' }]
      assert.same @inst._orderString(), " ORDER BY a ASC"

    '>1 clauses': ->
      @inst.orders = [{ field: 'a', dir: 'ASC' }, { field: 'b', dir: 'DESC' }]
      assert.same @inst._orderString(), " ORDER BY a ASC, b DESC"


  '>> _limitString()':
    'not set': ->
      @inst.limits = null
      assert.same @inst._limitString(), ""

    'set': ->
      @inst.limits = 2
      assert.same @inst._limitString(), " LIMIT 2"



test['JoinWhereOrderLimit base class'] =
  beforeEach: ->
    @inst = new squel.JoinWhereOrderLimit()

  'instanceof WhereOrderLimit': ->
    assert.instanceOf @inst, squel.JoinWhereOrderLimit

  'default field values': ->
    assert.same [], @inst.joins

  '>> join()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeTable')
      test.mocker.spy(@inst, '_sanitizeAlias')
      test.mocker.spy(@inst, '_sanitizeCondition')

    'args: ()': ->
      assert.throws (=> @inst.join()), 'table name must be a string'
      assert.ok @inst._sanitizeTable.calledWithExactly(undefined)

    'args: (table)':
      beforeEach: ->
        @ret = @inst.join('table')

      'update internal state': ->
        assert.same @ret, @inst
        assert.same @inst.joins, [
          {
            type: 'INNER'
            table: 'table'
            alias: undefined
            condition: undefined
          }
        ]

        assert.ok @inst._sanitizeTable.calledWithExactly('table')
        assert.ok @inst._sanitizeAlias.notCalled
        assert.ok @inst._sanitizeCondition.notCalled

      '>> args(table2)': ->
        assert.same @inst.join('table2'), @inst
        assert.same @inst.joins, [
          {
          type: 'INNER'
          table: 'table'
          alias: undefined
          condition: undefined
          }
          {
          type: 'INNER'
          table: 'table2'
          alias: undefined
          condition: undefined
          }
        ]

    'args: (table, alias)': ->
      @inst.join('table', 'alias')

      assert.same @inst.joins, [
        {
        type: 'INNER'
        table: 'table'
        alias: 'alias'
        condition: undefined
        }
      ]

      assert.ok @inst._sanitizeTable.calledWithExactly('table')
      assert.ok @inst._sanitizeAlias.calledWithExactly('alias')
      assert.ok @inst._sanitizeCondition.notCalled

    'args: (table, alias, condition)': ->
      @inst.join('table', 'alias', 'condition')

      assert.same @inst.joins, [
        {
        type: 'INNER'
        table: 'table'
        alias: 'alias'
        condition: 'condition'
        }
      ]

      assert.ok @inst._sanitizeTable.calledWithExactly('table')
      assert.ok @inst._sanitizeAlias.calledWithExactly('alias')
      assert.ok @inst._sanitizeCondition.calledWithExactly('condition')

    'args: (table, alias, condition, OUTER)': ->
      @inst.join('table', 'alias', 'condition', 'OUTER')

      assert.same @inst.joins, [
        type: 'OUTER'
        table: 'table'
        alias: 'alias'
        condition: 'condition'
      ]

  '>> left_join()':
    beforeEach: -> test.mocker.spy(@inst, 'join')

    'args (table)': ->
      assert.same @inst.left_join('table'), @inst
      assert.ok @inst.join.calledWithExactly('table', null, null, 'LEFT')

    'args (table, alias)': ->
      assert.same @inst.left_join('table', 'alias'), @inst
      assert.ok @inst.join.calledWithExactly('table', 'alias', null, 'LEFT')

    'args (table, alias, condition)': ->
      assert.same @inst.left_join('table', 'alias', 'condition'), @inst
      assert.ok @inst.join.calledWithExactly('table', 'alias', 'condition', 'LEFT')


  '>> right_join()':
    beforeEach: -> test.mocker.spy(@inst, 'join')

    'args (table)': ->
      assert.same @inst.right_join('table'), @inst
      assert.ok @inst.join.calledWithExactly('table', null, null, 'RIGHT')

    'args (table, alias)': ->
      assert.same @inst.right_join('table', 'alias'), @inst
      assert.ok @inst.join.calledWithExactly('table', 'alias', null, 'RIGHT')

    'args (table, alias, condition)': ->
      assert.same @inst.right_join('table', 'alias', 'condition'), @inst
      assert.ok @inst.join.calledWithExactly('table', 'alias', 'condition', 'RIGHT')


  '>> outer_join()':
    beforeEach: -> test.mocker.spy(@inst, 'join')

    'args (table)': ->
      assert.same @inst.outer_join('table'), @inst
      assert.ok @inst.join.calledWithExactly('table', null, null, 'OUTER')

    'args (table, alias)': ->
      assert.same @inst.outer_join('table', 'alias'), @inst
      assert.ok @inst.join.calledWithExactly('table', 'alias', null, 'OUTER')

    'args (table, alias, condition)': ->
      assert.same @inst.outer_join('table', 'alias', 'condition'), @inst
      assert.ok @inst.join.calledWithExactly('table', 'alias', 'condition', 'OUTER')


  '>> _joinString()':
    beforeEach: -> @inst.joins = []

    'no joins': ->
      assert.same @inst._joinString(), ""

    '1 join': ->
      @inst.left_join('table')
      assert.same @inst._joinString(), " LEFT JOIN table"

    '>1 joins': ->
      @inst.left_join('table')
      @inst.right_join('table2', 'a2')
      @inst.join('table3', null, 'c3')
      assert.same @inst._joinString(), " LEFT JOIN table RIGHT JOIN table2 `a2` INNER JOIN table3 ON (c3)"



module?.exports[require('path').basename(__filename)] = test
