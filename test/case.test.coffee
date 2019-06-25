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


test['Case expression builder base class'] =
  beforeEach: ->
    @func = squel.case
    @inst = @func()
    @inst.options.injectionGuard = false
    # manual return,
    # otherwise @inst will be treated a promise because it has a then() method
    return

  'extends BaseBuilder': ->
    assert.ok (@inst instanceof squel.cls.BaseBuilder)

  'toString() returns NULL': ->
    assert.same "NULL", @inst.toString()

  'options':
    'default options': ->
      assert.same squel.cls.DefaultQueryBuilderOptions, @inst.options
    'custom options': ->
      e = @func({
        separator: ',asdf'
      })

      expected = _.extend({}, squel.cls.DefaultQueryBuilderOptions, {
        separator: ',asdf'
      })

      assert.same expected, e.options

  'build expression':
    '>> when().then()':
      beforeEach: ->
        @inst.when('?', 'foo').then('bar')
        # manual return,
        # otherwise @inst will be treated a promise because it has a then() method
        return

      toString: ->
        assert.same @inst.toString(), 'CASE WHEN (\'foo\') THEN \'bar\' ELSE NULL END'
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'CASE WHEN (?) THEN \'bar\' ELSE NULL END',
          values: ['foo']
        }

    '>> when().then().else()':
      beforeEach: ->
          @inst.when('?', 'foo').then('bar').else('foobar')
          # manual return,
          # otherwise @inst will be treated a promise because it has a then() method
          return
      toString: ->
        assert.same @inst.toString(), 'CASE WHEN (\'foo\') THEN \'bar\' ELSE \'foobar\' END'
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'CASE WHEN (?) THEN \'bar\' ELSE \'foobar\' END',
          values: ['foo']
        }

  'field case':
    beforeEach: ->
      @inst = @func('name').when('?', 'foo').then('bar')
      @inst.options.injectionGuard = false
      # manual return,
      # otherwise @inst will be treated a promise because it has a then() method
      return
    toString: ->
      assert.same @inst.toString(), 'CASE name WHEN (\'foo\') THEN \'bar\' ELSE NULL END'
    toParam: ->
      assert.same @inst.toParam(), {
        text: 'CASE name WHEN (?) THEN \'bar\' ELSE NULL END',
        values: ['foo']
      }


module?.exports[require('path').basename(__filename)] = test
