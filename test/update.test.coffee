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
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['UPDATE builder'] =
  beforeEach: ->
    @func = squel.update
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
    'need to call set() first': ->
      @inst.table('table')
      assert.throws (=> @inst.toString()), 'set() needs to be called'

    '>> table(table, t1).set(field, 1)':
      beforeEach: -> @inst.table('table', 't1').set('field', 1)
      toString: ->
        assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1'

      '>> set(field2, 1.2)':
        beforeEach: -> @inst.set('field2', 1.2)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = 1.2'

      '>> set(field2, true)':
        beforeEach: -> @inst.set('field2', true)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = TRUE'

      '>> set(field2, null)':
        beforeEach: -> @inst.set('field2', null)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = NULL'
        toParam: ->
          assert.same @inst.toParam(), { text: 'UPDATE table `t1` SET field = 1, field2 = ?', values: [null] }

      '>> set(field2, "str")':
        beforeEach: -> @inst.set('field2', 'str')
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = \'str\''
        toParam: ->
          assert.same @inst.toParam(), {
            text: 'UPDATE table `t1` SET field = ?, field2 = ?'
            values: [1, 'str']
          }

      '>> set(field2, "str", { dontQuote: true })':
        beforeEach: -> @inst.set('field2', 'str', dontQuote: true)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = str'
        toParam: ->
          assert.same @inst.toParam(), {
            text: 'UPDATE table `t1` SET field = ?, field2 = ?'
            values: [1, 'str']
          }

      '>> set(field, query builder)':
        beforeEach: ->
          @subQuery = squel.select().field('MAX(score)').from('scores')
          @inst.set( 'field',  @subQuery )
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = (SELECT MAX(score) FROM scores)'
        toParam: ->
          parameterized = @inst.toParam()
          assert.same parameterized.text, 'UPDATE table `t1` SET field = (SELECT MAX(score) FROM scores)'
          assert.same parameterized.values, []

      '>> set(custom value type)':
        beforeEach: ->
          class MyClass
          @inst.registerValueHandler MyClass, (a) -> 'abcd'
          @inst.set( 'field',  new MyClass() )
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = (abcd)'
        toParam: ->
          parameterized = @inst.toParam()
          assert.same parameterized.text, 'UPDATE table `t1` SET field = ?'
          assert.same parameterized.values, ['abcd']

      '>> setFields({field2: \'value2\', field3: true })':
        beforeEach: -> @inst.setFields({field2: 'value2', field3: true })
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = \'value2\', field3 = TRUE'
        toParam: ->
          parameterized = @inst.toParam()
          assert.same parameterized.text, 'UPDATE table `t1` SET field = ?, field2 = ?, field3 = ?'
          assert.same parameterized.values, [1, 'value2', true]

      '>> setFields({field2: \'value2\', field: true })':
        beforeEach: -> @inst.setFields({field2: 'value2', field: true })
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = TRUE, field2 = \'value2\''

      '>> set(field2, null)':
        beforeEach: -> @inst.set('field2', null)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = NULL'

        '>> table(table2)':
          beforeEach: -> @inst.table('table2')
          toString: ->
            assert.same @inst.toString(), 'UPDATE table `t1`, table2 SET field = 1, field2 = NULL'

          '>> where(a = 1)':
            beforeEach: -> @inst.where('a = 1')
            toString: ->
              assert.same @inst.toString(), 'UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1)'

            '>> order(a, true)':
              beforeEach: -> @inst.order('a', true)
              toString: ->
                assert.same @inst.toString(), 'UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC'

              '>> limit(2)':
                beforeEach: -> @inst.limit(2)
                toString: ->
                  assert.same @inst.toString(), 'UPDATE table `t1`, table2 SET field = 1, field2 = NULL WHERE (a = 1) ORDER BY a ASC LIMIT 2'

    '>> table(table, t1).setFields({field1: 1, field2: \'value2\'})':
      beforeEach: -> @inst.table('table', 't1').setFields({field1: 1, field2: 'value2' })
      toString: ->
        assert.same @inst.toString(), 'UPDATE table `t1` SET field1 = 1, field2 = \'value2\''

      '>> set(field1, 1.2)':
        beforeEach: -> @inst.set('field1', 1.2)
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field1 = 1.2, field2 = \'value2\''

      '>> setFields({field3: true, field4: \'value4\'})':
        beforeEach: -> @inst.setFields({field3: true, field4: 'value4'})
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field1 = 1, field2 = \'value2\', field3 = TRUE, field4 = \'value4\''

      '>> setFields({field1: true, field3: \'value3\'})':
        beforeEach: -> @inst.setFields({field1: true, field3: 'value3'})
        toString: ->
          assert.same @inst.toString(), 'UPDATE table `t1` SET field1 = TRUE, field2 = \'value2\', field3 = \'value3\''

    '>> table(table, t1).set("count = count + 1")':
      beforeEach: -> @inst.table('table', 't1').set('count = count + 1')
      toString: ->
        assert.same @inst.toString(), 'UPDATE table `t1` SET count = count + 1'

  'str()':
    beforeEach: -> @inst.table('students').set('field', squel.str('GETDATE(?, ?)', 2014, '"feb"'))
    toString: ->
      assert.same 'UPDATE students SET field = (GETDATE(2014, \'"feb"\'))', @inst.toString()
    toParam: ->  
      assert.same { text: 'UPDATE students SET field = (GETDATE(?, ?))', values: [2014, '"feb"'] }, @inst.toParam()

  'string formatting':
    beforeEach: -> 
      @inst.updateOptions {
        stringFormatter: (str) -> "N'#{str}'"
      }
      @inst.table('students').set('field', 'jack')
    toString: ->
      assert.same 'UPDATE students SET field = N\'jack\'', @inst.toString()
    toParam: ->  
      assert.same { text: 'UPDATE students SET field = ?', values: ["jack"] }, @inst.toParam()

  'fix for hiddentao/squel#63': ->
    newinst = @inst.table('students').set('field = field + 1')
    newinst.set('field2', 2).set('field3', true)
    assert.same { text: 'UPDATE students SET field = field + 1, field2 = ?, field3 = ?', values: [2, true] }, @inst.toParam()

  'dontQuote and replaceSingleQuotes set(field2, "ISNULL(\'str\', str)", { dontQuote: true })':
    beforeEach: ->
      @inst = squel.update replaceSingleQuotes: true
      @inst.table('table', 't1').set('field', 1)
      @inst.set('field2', "ISNULL('str', str)", dontQuote: true)
    toString: ->
      assert.same @inst.toString(), 'UPDATE table `t1` SET field = 1, field2 = ISNULL(\'str\', str)'
    toParam: ->
      assert.same @inst.toParam(), {
        text: 'UPDATE table `t1` SET field = ?, field2 = ?'
        values: [1, "ISNULL('str', str)"]
      }

  'fix for #223 - careful about array looping methods':
    beforeEach: ->
      Array::substr = () -> 1
    afterEach: ->
      delete Array::substr;
    check: ->
      @inst = squel.update()
        .table('users')
        .where('id = ?', 123)
        .set('active', 1)
        .set('regular', 0)
        .set('moderator',1)

      assert.same @inst.toParam(), {
        text: 'UPDATE users SET active = ?, regular = ?, moderator = ? WHERE (id = ?)',
        values: [1, 0, 1, 123],
      }

  'fix for #225 - autoquoting field names': ->
    @inst = squel.update(autoQuoteFieldNames: true)
      .table('users')
      .where('id = ?', 123)
      .set('active', 1)
      .set('regular', 0)
      .set('moderator',1)

      assert.same @inst.toParam(), {
        text: 'UPDATE users SET `active` = ?, `regular` = ?, `moderator` = ? WHERE (id = ?)',
        values: [1, 0, 1, 123],
      }

  'cloning': ->
    newinst = @inst.table('students').set('field', 1).clone()
    newinst.set('field', 2).set('field2', true)

    assert.same 'UPDATE students SET field = 1', @inst.toString()
    assert.same 'UPDATE students SET field = 2, field2 = TRUE', newinst.toString()



module?.exports[require('path').basename(__filename)] = test
