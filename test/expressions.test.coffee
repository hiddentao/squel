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



test['Expression builder base class'] =
  beforeEach: ->
    @inst = squel.expr()

  'extends BaseBuilder': ->
    assert.ok (@inst instanceof squel.cls.BaseBuilder)

  'toString() returns empty': ->
    assert.same "", @inst.toString()

  'options':
    'default options': ->
      assert.same squel.cls.DefaultQueryBuilderOptions, @inst.options
    'custom options': ->
      e = squel.expr({
        separator: ',asdf'
      })

      expected = _.extend({}, squel.cls.DefaultQueryBuilderOptions, {
        separator: ',asdf'
      })

      assert.same expected, e.options


  'and()':
    'without an argument throws an error': ->
      assert.throws (=> @inst.and()), 'expression must be a string or builder instance'
    'with an array throws an error': ->
      assert.throws (=> @inst.and([1])), 'expression must be a string or builder instance'
    'with an object throws an error': ->
      assert.throws (=> @inst.and(new Object)), 'expression must be a string or builder instance'
    'with a function throws an error': ->
      assert.throws (=> @inst.and(-> 1)), 'expression must be a string or builder instance'
    'with an Expression returns object instance': ->
      assert.same @inst, @inst.and(squel.expr())
    'with a builder returns object instance': ->
      assert.same @inst, @inst.and(squel.str())
    'with a string returns object instance': ->
      assert.same @inst, @inst.and('bla')


  'or()':
    'without an argument throws an error': ->
      assert.throws (=> @inst.or()), 'expression must be a string or builder instance'
    'with an array throws an error': ->
      assert.throws (=> @inst.or([1])), 'expression must be a string or builder instance'
    'with an object throws an error': ->
      assert.throws (=> @inst.or(new Object)), 'expression must be a string or builder instance'
    'with a function throws an error': ->
      assert.throws (=> @inst.or(-> 1)), 'expression must be a string or builder instance'
    'with an Expression returns object instance': ->
      assert.same @inst, @inst.or(squel.expr())
    'with a builder returns object instance': ->
      assert.same @inst, @inst.and(squel.str())
    'with a string returns object instance': ->
      assert.same @inst, @inst.or('bla')


  'and("test = 3")':
    beforeEach: ->
      @inst.and("test = 3")

    '>> toString()': ->
      assert.same @inst.toString(), 'test = 3'

    '>> toParam()': ->
      assert.same @inst.toParam(), {
        text: 'test = 3',
        values: []
      }

    '>> and("flight = \'4\'")':
      beforeEach: ->
        @inst.and("flight = '4'")

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 AND flight = '4'"

      '>> toParam()': ->
        assert.same @inst.toParam(), {
          text: "test = 3 AND flight = '4'",
          values: []
        }

      '>> or("dummy IN (1,2,3)")':
        beforeEach: ->
          @inst.or("dummy IN (1,2,3)")

        '>> toString()': ->
          assert.same @inst.toString(), "test = 3 AND flight = '4' OR dummy IN (1,2,3)"

        '>> toParam()': ->
          assert.same @inst.toParam(), {
            text: "test = 3 AND flight = '4' OR dummy IN (1,2,3)",
            values: [],
          }


  'and("test = ?", null)':
    beforeEach: ->
      @inst.and("test = ?", null)

    '>> toString()': ->
      assert.same @inst.toString(), 'test = NULL'

    '>> toParam()': ->
      assert.same @inst.toParam(), {
        text: 'test = ?'
        values: [null]
      }

  'and("test = ?", 3)':
    beforeEach: ->
      @inst.and("test = ?", 3)

    '>> toString()': ->
      assert.same @inst.toString(), 'test = 3'

    '>> toParam()': ->
      assert.same @inst.toParam(), {
        text: 'test = ?'
        values: [3]
      }

    '>> and("flight = ?", "4")':
      beforeEach: ->
        @inst.and("flight = ?", '4')

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 AND flight = '4'"

      '>> toParam()': ->
        assert.same @inst.toParam(), {
          text: "test = ? AND flight = ?"
          values: [3, '4']
        }

      '>> or("dummy IN ?", [false, 2, null, "str"])':
        beforeEach: ->
          @inst.or("dummy IN ?", [false,2,null,"str"])

        '>> toString()': ->
          assert.same @inst.toString(), "test = 3 AND flight = '4' OR dummy IN (FALSE, 2, NULL, 'str')"

        '>> toParam()': ->
          assert.same @inst.toParam(), {
            text: "test = ? AND flight = ? OR dummy IN (?, ?, ?, ?)"
            values: [3, '4', false, 2, null, 'str']
          }


  'or("test = 3")':
    beforeEach: ->
      @inst.or("test = 3")

    '>> toString()': ->
      assert.same @inst.toString(), 'test = 3'

    '>> toParam()': ->
      assert.same @inst.toParam(), {
        text: 'test = 3',
        values: [],
      }

    '>> or("flight = \'4\'")':
      beforeEach: ->
        @inst.or("flight = '4'")

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 OR flight = '4'"

      '>> toString()': ->
        assert.same @inst.toParam(), {
          text: "test = 3 OR flight = '4'",
          values: [],
        }

      '>> and("dummy IN (1,2,3)")':
        beforeEach: ->
          @inst.and("dummy IN (1,2,3)")

        '>> toString()': ->
          assert.same @inst.toString(), "test = 3 OR flight = '4' AND dummy IN (1,2,3)"

        '>> toParam()': ->
          assert.same @inst.toParam(), {
            text: "test = 3 OR flight = '4' AND dummy IN (1,2,3)",
            values: [],
          }


  'or("test = ?", 3)':
    beforeEach: ->
      @inst.or("test = ?", 3)

    '>> toString()': ->
      assert.same @inst.toString(), 'test = 3'

    '>> toParam()': ->
      assert.same @inst.toParam(), {
        text: 'test = ?'
        values: [3]
      }

    '>> or("flight = ?", "4")':
      beforeEach: ->
        @inst.or("flight = ?", "4")

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 OR flight = '4'"

      '>> toParam()': ->
        assert.same @inst.toParam(), {
          text: "test = ? OR flight = ?"
          values: [3, '4']
        }

      '>> and("dummy IN ?", [false, 2, null, "str"])':
        beforeEach: ->
          @inst.and("dummy IN ?", [false, 2, null, "str"])

        '>> toString()': ->
          assert.same @inst.toString(), "test = 3 OR flight = '4' AND dummy IN (FALSE, 2, NULL, 'str')"

        '>> toParam()': ->
          assert.same @inst.toParam(), {
            text: "test = ? OR flight = ? AND dummy IN (?, ?, ?, ?)"
            values: [3, '4', false, 2, null, 'str']
          }


  'or("test = ?", 4)':
    beforeEach: -> @inst.or("test = ?", 4)

    '>> and(expr().or("inner = ?", 1))':
      beforeEach: -> @inst.and( squel.expr().or('inner = ?', 1) )

      '>> toString()': ->
        assert.same @inst.toString(), "test = 4 AND (inner = 1)"

      '>> toParam()': ->
        assert.same @inst.toParam(), {
          text: "test = ? AND (inner = ?)"
          values: [4, 1]
        }

    '>> and(expr().or("inner = ?", 1).or(expr().and("another = ?", 34)))':
      beforeEach: ->
          @inst.and( squel.expr().or('inner = ?', 1).or(squel.expr().and("another = ?", 34)) )

      '>> toString()': ->
        assert.same @inst.toString(), "test = 4 AND (inner = 1 OR (another = 34))"

      '>> toParam()': ->
        assert.same @inst.toParam(), {
          text: "test = ? AND (inner = ? OR (another = ?))"
          values: [4, 1, 34]
        }


  'custom parameter character: @@':
    beforeEach: ->
      @inst.options.parameterCharacter = '@@'

    'and("test = @@", 3).and("flight = @@", "4").or("dummy IN @@", [false, 2, null, "str"])':
      beforeEach: ->
        @inst
          .and("test = @@", 3)
          .and("flight = @@", '4')
          .or("dummy IN @@", [false,2,null,"str"])

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 AND flight = '4' OR dummy IN (FALSE, 2, NULL, 'str')"

      '>> toParam()': ->
        assert.same @inst.toParam(), {
          text: "test = @@ AND flight = @@ OR dummy IN (@@, @@, @@, @@)"
          values: [3, '4', false, 2, null, 'str']
        }


  'cloning': ->
    newinst = @inst.or("test = 4").or("inner = 1").or("inner = 2").clone()
    newinst.or('inner = 3')

    assert.same @inst.toString(), 'test = 4 OR inner = 1 OR inner = 2'
    assert.same newinst.toString(), 'test = 4 OR inner = 1 OR inner = 2 OR inner = 3'


  'custom array prototype methods (Issue #210)': ->
    Array.prototype.last = () ->
      this[this.length - 1]

    @inst.or("foo = ?", "bar")

    delete Array.prototype.last


  'any type of builder':
    beforeEach: ->
      @inst.or('b = ?', 5).or(squel.select().from('blah').where('a = ?', 9))
    toString: ->
      assert.same @inst.toString(), "b = 5 OR (SELECT * FROM blah WHERE (a = 9))"
    toParam: ->
      assert.same @inst.toParam(), {
        text: "b = ? OR (SELECT * FROM blah WHERE (a = ?))"
        values: [5, 9]
      }

  '#286 - nesting':
    beforeEach: ->
      @inst = squel.expr().and(squel.expr().and(squel.expr().and('A').and('B')).or(squel.expr().and('C').and('D'))).and('E')
    toString: ->
      assert.same @inst.toString(), "((A AND B) OR (C AND D)) AND E"
    toParam: ->
      assert.same @inst.toParam(), {
        text: "((A AND B) OR (C AND D)) AND E"
        values: []
      }



module?.exports[require('path').basename(__filename)] = test
