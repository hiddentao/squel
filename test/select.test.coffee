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



test['SELECT builder'] =
  beforeEach: ->
    @func = squel.select
    @inst = @func()

  'instanceof QueryBuilder': ->
    assert.instanceOf @inst, squel.cls.QueryBuilder

  'constructor':
    'override options': ->
      @inst = squel.select
        usingValuePlaceholders: true
        dummy: true

      expectedOptions = _.extend {}, squel.cls.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true
        dummy: true

      for block in @inst.blocks
        assert.same expectedOptions, block.options

    'override blocks': ->
      block = new squel.cls.StringBlock('SELECT')
      @inst = @func {}, [block]
      assert.same [block], @inst.blocks

  'build query':
    'need to call from() first': ->
      assert.throws (=> @inst.toString()), 'from() needs to be called'

    '>> from(table).from(table2, alias2)':
      beforeEach: -> @inst.from('table').from('table2', 'alias2')
      toString: ->
        assert.same @inst.toString(), 'SELECT * FROM table, table2 `alias2`'

      '>> field(field1, fa1) >> field(field2)':
        beforeEach: -> @inst.field('field1', 'fa1').field('field2')
        toString: ->
          assert.same @inst.toString(), 'SELECT field1 AS "fa1", field2 FROM table, table2 `alias2`'

        '>> distinct()':
          beforeEach: -> @inst.distinct()
          toString: ->
            assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2`'

          '>> group(field) >> group(field2)':
            beforeEach: -> @inst.group('field').group('field2')
            toString: ->
              assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2'

            '>> where(a = 1)':
              beforeEach: -> @inst.where('a = 1')
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1) GROUP BY field, field2'

              '>> join(other_table)':
                beforeEach: -> @inst.join('other_table')
                toString: ->
                  assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2'

                '>> order(a, true)':
                  beforeEach: -> @inst.order('a', true)
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'

                  '>> limit(2)':
                    beforeEach: -> @inst.limit(2)
                    toString: ->
                      assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2'

                    '>> offset(3)':
                      beforeEach: -> @inst.offset(3)
                      toString: ->
                        assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2 OFFSET 3'

  'cloning': ->
    newinst = @inst.from('students').limit(10).clone()
    newinst.limit(20)

    assert.same 'SELECT * FROM students LIMIT 10', @inst.toString()
    assert.same 'SELECT * FROM students LIMIT 20', newinst.toString()


module?.exports[require('path').basename(__filename)] = test
