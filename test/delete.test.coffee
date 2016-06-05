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



test['DELETE builder'] =
  beforeEach: ->
    @func = squel.delete
    @inst = @func()

  'instanceof QueryBuilder': ->
    assert.instanceOf @inst, squel.cls.QueryBuilder

  'constructor':
    'override options': ->
      @inst = squel.update
        usingValuePlaceholders: true
        dummy: true

      expectedOptions = _.extend {}, squel.cls.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true
        dummy: true

      for block in @inst.blocks
        if (block instanceof squel.cls.WhereBlock)
          assert.same _.extend({}, expectedOptions, { verb: 'WHERE'}), block.options
        else
          assert.same expectedOptions, block.options

    'override blocks': ->
      block = new squel.cls.StringBlock('SELECT')
      @inst = @func {}, [block]
      assert.same [block], @inst.blocks

  'build query':
    'no need to call from()': ->
      @inst.toString()

    '>> from(table)':
      beforeEach: -> @inst.from('table')
      toString: ->
        assert.same @inst.toString(), 'DELETE FROM table'

      '>> table(table2, t2)':
        beforeEach: -> @inst.from('table2', 't2')
        toString: ->
          assert.same @inst.toString(), 'DELETE FROM table2 `t2`'

        '>> where(a = 1)':
          beforeEach: -> @inst.where('a = 1')
          toString: ->
            assert.same @inst.toString(), 'DELETE FROM table2 `t2` WHERE (a = 1)'

          '>> join(other_table)':
            beforeEach: -> @inst.join('other_table', 'o', 'o.id = t2.id')
            toString: ->
              assert.same @inst.toString(), 'DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1)'

            '>> order(a, true)':
              beforeEach: -> @inst.order('a', true)
              toString: ->
                assert.same @inst.toString(), 'DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1) ORDER BY a ASC'

              '>> limit(2)':
                beforeEach: -> @inst.limit(2)
                toString: ->
                  assert.same @inst.toString(), 'DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1) ORDER BY a ASC LIMIT 2'


    '>> target(table1).from(table1).left_join(table2, null, "table1.a = table2.b")':
      beforeEach: ->
        @inst.target('table1').from('table1').left_join('table2', null, 'table1.a = table2.b').where('c = ?', 3)
      toString: ->
        assert.same @inst.toString(),
          'DELETE table1 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = 3)'
      toParam: ->
        assert.same @inst.toParam(), 
          {
            text: 'DELETE table1 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = ?)',
            values: [3]
          }

      '>> target(table2)':
        beforeEach: ->
          @inst.target('table2')
        toString: ->
          assert.same @inst.toString(),
            'DELETE table1, table2 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = 3)'
        toParam: ->
          assert.same @inst.toParam(), 
            {
              text: 'DELETE table1, table2 FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = ?)',
              values: [3]
            }

    '>> from(table1).left_join(table2, null, "table1.a = table2.b")':
      beforeEach: ->
        @inst.from('table1').left_join('table2', null, 'table1.a = table2.b').where('c = ?', 3)
      toString: ->
        assert.same @inst.toString(),
          'DELETE FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = 3)'
      toParam: ->
        assert.same @inst.toParam(), 
          {
            text: 'DELETE FROM table1 LEFT JOIN table2 ON (table1.a = table2.b) WHERE (c = ?)',
            values: [3]
          }

  'cloning': ->
    newinst = @inst.from('students').limit(10).clone()
    newinst.limit(20)

    assert.same 'DELETE FROM students LIMIT 10', @inst.toString()
    assert.same 'DELETE FROM students LIMIT 20', newinst.toString()



module?.exports[require('path').basename(__filename)] = test
