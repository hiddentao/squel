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


{test, assert, expect, should} = require './testbase'
squel = require "../src/squel"



test['QueryBuilder base class'] =
  beforeEach: ->
    @inst = new squel.QueryBuilder()

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

      'args (field2, false)':
        beforeEach: ->
          @ret = @inst.order("field2", false)

        'adds to internal state': ->
          assert.same @ret, @inst

          assert.ok @inst._sanitizeField.calledWithExactly 'field2'
          assert.same [ { field: 'field', dir: 'ASC' }, { field: 'field2', dir: 'DESC' } ], @inst.orders




module?.exports[require('path').basename(__filename)] = test
