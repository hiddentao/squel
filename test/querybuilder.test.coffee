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



test['Query builder base class'] =
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
      console.log typeof e
      assert.same "", @inst._sanitizeCondition(e)
      assert.ok @inst._getObjectClassName.calledWithExactly(e)

    'if string': ->
      s = 'BLA BLA'
      assert.same 'BLA BLA', @inst._sanitizeCondition(s)
      assert.ok @inst._getObjectClassName.calledWithExactly(s)

    'if neither Expression nor String': ->
      test.mocker.spy @inst, '_sanitizeCondition'

      try
        @inst._sanitizeCondition(1)
      catch err
        assert.same err.toString(), 'Error: condition must be a string or Expression instance'
      finally
        assert.ok @inst._getObjectClassName.calledWithExactly(1)
        assert.ok @inst._sanitizeCondition.threw()

  '_sanitizeName':
    beforeEach: ->
      test.mocker.spy @inst, '_sanitizeName'

    'if string': ->
      assert.same 'bla', @inst._sanitizeName('bla')

    'if boolean': ->
      try
        @inst._sanitizeName(true, 'bla')
      catch err
        assert.same err.toString(), 'Error: bla must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()

    'if integer': ->
      try
        @inst._sanitizeName(1)
      catch err
        assert.same err.toString(), 'Error: undefined must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()

    'if float': ->
      try
        @inst._sanitizeName(1.2, 'meh')
      catch err
        assert.same err.toString(), 'Error: meh must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()

    'if array': ->
      try
        @inst._sanitizeName([1], 'yes')
      catch err
        assert.same err.toString(), 'Error: yes must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()

    'if object': ->
      try
        @inst._sanitizeName(new Object, 'obj1')
      catch err
        assert.same err.toString(), 'Error: obj1 must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()

    'if null': ->
      try
        @inst._sanitizeName(null, 'obj1')
      catch err
        assert.same err.toString(), 'Error: obj1 must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()

    'if undefined': ->
      try
        @inst._sanitizeName(undefined, 'obj1')
      catch err
        assert.same err.toString(), 'Error: obj1 must be a string'
      finally
        assert.ok @inst._sanitizeName.threw()


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
      test.mocker.spy @inst, '_sanitizeLimitOffset'

      try
        @inst._sanitizeLimitOffset -1
      catch err
        assert.same err.toString(), 'Error: limit/offset must be >=0'
      finally
        assert.ok @inst._sanitizeLimitOffset.threw()


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
      try
        @inst._sanitizeValue([1])
      catch err
        assert.same err.toString(), 'Error: field value must be a string, number, boolean or null'
      finally
        assert.ok @inst._sanitizeValue.threw()

    'if object': ->
      try
        @inst._sanitizeValue(new Object, 'obj1')
      catch err
        assert.same err.toString(), 'Error: field value must be a string, number, boolean or null'
      finally
        assert.ok @inst._sanitizeValue.threw()

    'if null': ->
      assert.same null, @inst._sanitizeValue(null)

    'if undefined': ->
      try
        @inst._sanitizeValue(undefined, 'obj1')
      catch err
        assert.same err.toString(), 'Error: field value must be a string, number, boolean or null'
      finally
        assert.ok @inst._sanitizeValue.threw()


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



module?.exports[require('path').basename(__filename)] = test
