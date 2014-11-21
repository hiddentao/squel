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


squel = require "../squel-basic"
{testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['Expression builder base class'] =
  beforeEach: ->
    @inst = squel.expr()

  'extends BaseBuilder': ->
    assert.ok (@inst instanceof squel.cls.BaseBuilder)

  'toString() returns empty': ->
    assert.same "", @inst.toString()

  'end() throws error': ->
    assert.throws (=> @inst.end()), 'begin() needs to be called'

  'when and_begin() gets called':
    beforeEach: ->
      @ret = @inst.and_begin()

    'the object instance is returned': ->
      assert.same @ret, @inst

    '>> toString() throws error': ->
      assert.throws (=> @inst.toString()), 'end() needs to be called'

    '>> toParam() throws error': ->
      assert.throws (=> @inst.toParam()), 'end() needs to be called'

    'followed by end()':
      beforeEach: ->
        @ret = @inst.end()

      'the object instance is returned': ->
        assert.same @ret, @inst

      '>> toString() returns empty': ->
        assert.same "", @inst.toString()

      '>> toParam() returns empty': ->
        exp =
          text: ''
          values: []
        assert.same exp, @inst.toParam()


  'when or_begin() gets called':
    beforeEach: ->
      @ret = @inst.or_begin()

    'the object instance is returned': ->
      assert.same @ret, @inst

    '>> toString() throws error': ->
      assert.throws (=> @inst.toString()), 'end() needs to be called'

    '>> toParam() throws error': ->
      assert.throws (=> @inst.toParam()), 'end() needs to be called'

    'followed by end()':
      beforeEach: ->
        @ret = @inst.end()

      'the object instance is returned': ->
        assert.same @ret, @inst

      '>> toString() returns empty': ->
        assert.same "", @inst.toString()

      '>> toParam() returns empty': ->
        exp =
          text: ''
          values: []
        assert.same exp, @inst.toParam()


  'and()':
    'without an argument throws an error': ->
      assert.throws (=> @inst.and()), 'expr must be a string'
    'with an array throws an error': ->
      assert.throws (=> @inst.and([1])), 'expr must be a string'
    'with an object throws an error': ->
      assert.throws (=> @inst.and(new Object)), 'expr must be a string'
    'with a function throws an error': ->
      assert.throws (=> @inst.and(-> 1)), 'expr must be a string'
    'with a string returns object instance': ->
      assert.same @inst, @inst.and('bla')


  'or()':
    'without an argument throws an error': ->
      assert.throws (=> @inst.or()), 'expr must be a string'
    'with an array throws an error': ->
      assert.throws (=> @inst.or([1])), 'expr must be a string'
    'with an object throws an error': ->
      assert.throws (=> @inst.or(new Object)), 'expr must be a string'
    'with a function throws an error': ->
      assert.throws (=> @inst.or(-> 1)), 'expr must be a string'
    'with a string returns object instance': ->
      assert.same @inst, @inst.or('bla')


  'and("test = 3")':
    beforeEach: ->
      @inst.and("test = 3")

    '>> toString()': ->
      assert.same @inst.toString(), 'test = 3'

    '>> and("flight = \'4\'")':
      beforeEach: ->
        @inst.and("flight = '4'")

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 AND flight = '4'"

      '>> or("dummy IN (1,2,3)")':
        beforeEach: ->
          @inst.or("dummy IN (1,2,3)")

        '>> toString()': ->
          assert.same @inst.toString(), "test = 3 AND flight = '4' OR dummy IN (1,2,3)"


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

    '>> or("flight = \'4\'")':
      beforeEach: ->
        @inst.or("flight = '4'")

      '>> toString()': ->
        assert.same @inst.toString(), "test = 3 OR flight = '4'"

      '>> and("dummy IN (1,2,3)")':
        beforeEach: ->
          @inst.and("dummy IN (1,2,3)")

        '>> toString()': ->
          assert.same @inst.toString(), "test = 3 OR flight = '4' AND dummy IN (1,2,3)"



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

    '>> and_begin()':
      beforeEach: -> @inst.and_begin()

      '>> or("inner = ?", 1)':
        beforeEach: -> @inst.or("inner = ?", 1)

        '>> or("inner = ?", 2)':
          beforeEach: -> @inst.or("inner = ?", 2)

          '>> toString() throws error': ->
            assert.throws (=> @inst.toString()), 'end() needs to be called'

          '>> end()':
            beforeEach: -> @inst.end()

            '>> toString()': ->
              assert.same @inst.toString(), "test = 4 AND (inner = 1 OR inner = 2)"

            '>> toParam()': ->
              assert.same @inst.toParam(), {
                text: "test = ? AND (inner = ? OR inner = ?)"
                values: [4, 1, 2]
              }

            '>> end() throws error': ->
              assert.throws (=> @inst.end()), 'begin() needs to be called'

            '>> or_begin()':
              beforeEach: -> @inst.or_begin()

              '>> toString() throws error': ->
                assert.throws (=> @inst.toString()), 'end() needs to be called'

              '>> and("inner = 3")':
                beforeEach: -> @inst.and("inner = 3")

                '>> and("inner = ?", 4)':
                  beforeEach: -> @inst.and("inner = ?", 4)

                  '>> or_begin()':
                    beforeEach: -> @inst.or_begin()

                    '>> or("inner = 5")':
                      beforeEach: -> @inst.or("inner = 5")

                      '>> end()':
                        beforeEach: -> @inst.end()

                        '>> toString() throws error': ->
                          assert.throws (=> @inst.toString()), 'end() needs to be called'

                        '>> end()':
                          beforeEach: -> @inst.end()

                          '>> toString()': ->
                            assert.same @inst.toString(), "test = 4 AND (inner = 1 OR inner = 2) OR (inner = 3 AND inner = 4 OR (inner = 5))"

                          '>> toParam()': ->
                            assert.same @inst.toParam(), {
                              text: "test = ? AND (inner = ? OR inner = ?) OR (inner = 3 AND inner = ? OR (inner = 5))"
                              values: [4, 1, 2, 4]
                            }

  'cloning': ->
    newinst = @inst.or("test = 4").and_begin().or("inner = 1").or("inner = 2").clone()
    newinst.or('inner = 3')

    assert.same 'test = 4 AND (inner = 1 OR inner = 2)', @inst.end().toString()
    assert.same 'test = 4 AND (inner = 1 OR inner = 2 OR inner = 3)', newinst.end().toString()

  'issue 104': ->
    newinst = @inst.clone()
    newinst.and("test1 = ?", 1).and("test2 = ?", 2);
    @inst.and_expr(newinst)

    assert.same '(test1 = 1 AND test2 = 2)', @inst.toString()



module?.exports[require('path').basename(__filename)] = test
