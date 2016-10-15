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



test['INSERT builder'] =
  beforeEach: ->
    @func = squel.insert
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
        assert.same _.pick(block.options, _.keys(expectedOptions)), expectedOptions


    'override blocks': ->
      block = new squel.cls.StringBlock('SELECT')
      @inst = @func {}, [block]
      assert.same [block], @inst.blocks


  'build query':
    'need to call into() first': ->
      assert.throws (=> @inst.toString()), 'into() needs to be called'

    'when set() not called': ->
      assert.same 'INSERT INTO table', @inst.into('table').toString()

    '>> into(table).set(field, null)':
      beforeEach: -> @inst.into('table').set('field', null)
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field) VALUES (NULL)'
      toParam: ->
        assert.same @inst.toParam(), { text: 'INSERT INTO table (field) VALUES (?)', values: [null] }

    '>> into(table)':
      beforeEach: -> @inst.into('table')

      '>> set(field, 1)':
        beforeEach: -> @inst.set('field', 1)
        toString: ->
          assert.same @inst.toString(), 'INSERT INTO table (field) VALUES (1)'

        '>> set(field2, 1.2)':
          beforeEach: -> @inst.set('field2', 1.2)
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, 1.2)'

        '>> set(field2, "str")':
          beforeEach: -> @inst.set('field2', 'str')
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, \'str\')'
          toParam: ->
            assert.same @inst.toParam(), {
              text: 'INSERT INTO table (field, field2) VALUES (?, ?)'
              values: [ 1, 'str' ]
            }

        '>> set(field2, "str", { dontQuote: true } )':
          beforeEach: -> @inst.set('field2', 'str', dontQuote: true)
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, str)'
          toParam: ->
            assert.same @inst.toParam(), {
              text: 'INSERT INTO table (field, field2) VALUES (?, ?)'
              values: [ 1, 'str' ]
            }

        '>> set(field2, true)':
          beforeEach: -> @inst.set('field2', true)
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, TRUE)'

        '>> set(field2, null)':
          beforeEach: -> @inst.set('field2', null)
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, NULL)'

        '>> set(field, query builder)':
          beforeEach: ->
            @subQuery = squel.select().field('MAX(score)').from('scores')
            @inst.set( 'field',  @subQuery )
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field) VALUES ((SELECT MAX(score) FROM scores))'
          toParam: ->
            parameterized = @inst.toParam()
            assert.same parameterized.text, 'INSERT INTO table (field) VALUES ((SELECT MAX(score) FROM scores))'
            assert.same parameterized.values, []

        '>> setFields({field2: \'value2\', field3: true })':
          beforeEach: -> @inst.setFields({field2: 'value2', field3: true })
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2, field3) VALUES (1, \'value2\', TRUE)'
          toParam: ->
            parameterized = @inst.toParam()
            assert.same parameterized.text, 'INSERT INTO table (field, field2, field3) VALUES (?, ?, ?)'
            assert.same parameterized.values, [1,'value2',true]

        '>> setFields({field2: \'value2\', field: true })':
          beforeEach: -> @inst.setFields({field2: 'value2', field: true })
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (TRUE, \'value2\')'
          toParam: ->
            parameterized = @inst.toParam()
            assert.same parameterized.text, 'INSERT INTO table (field, field2) VALUES (?, ?)'
            assert.same parameterized.values, [true, 'value2']

        '>> setFields(custom value type)':
          beforeEach: ->
            class MyClass
            @inst.registerValueHandler MyClass, -> 'abcd'
            @inst.setFields({ field: new MyClass() })
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field) VALUES ((abcd))'
          toParam: ->
            parameterized = @inst.toParam()
            assert.same parameterized.text, 'INSERT INTO table (field) VALUES (?)'
            assert.same parameterized.values, ['abcd']

        '>> setFieldsRows([{field: \'value2\', field2: true },{field: \'value3\', field2: 13 }]])':
          beforeEach: -> @inst.setFieldsRows([{field: 'value2', field2: true },{field: 'value3', field2: 13 }])
          toString: ->
            assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (\'value2\', TRUE), (\'value3\', 13)'
          toParam: ->
            parameterized = @inst.toParam()
            assert.same parameterized.text, 'INSERT INTO table (field, field2) VALUES (?, ?), (?, ?)'
            assert.same parameterized.values, ['value2',true, 'value3',13]

      'Function values':
        beforeEach: -> @inst.set('field', squel.str('GETDATE(?, ?)', 2014, 'feb'))
        toString: ->
          assert.same 'INSERT INTO table (field) VALUES ((GETDATE(2014, \'feb\')))', @inst.toString()
        toParam: ->  
          assert.same { text: 'INSERT INTO table (field) VALUES ((GETDATE(?, ?)))', values: [2014, 'feb'] }, @inst.toParam()

      '>> fromQuery([field1, field2], select query)':
        beforeEach: -> @inst.fromQuery(
            ['field1', 'field2'],
            squel.select().from('students').where('a = ?', 2)
          )
        toString: ->
          assert.same @inst.toString(), 'INSERT INTO table (field1, field2) (SELECT * FROM students WHERE (a = 2))'
        toParam: ->
          parameterized = @inst.toParam()
          assert.same parameterized.text, 'INSERT INTO table (field1, field2) (SELECT * FROM students WHERE (a = ?))'
          assert.same parameterized.values, [ 2 ]

      '>> setFieldsRows([{field1: 13, field2: \'value2\'},{field1: true, field3: \'value4\'}])': ->
        assert.throws (=> @inst.setFieldsRows([{field1: 13, field2: 'value2'},{field1: true, field3: 'value4'}]).toString()), 'All fields in subsequent rows must match the fields in the first row'


  'dontQuote and replaceSingleQuotes set(field2, "ISNULL(\'str\', str)", { dontQuote: true })':
    beforeEach: ->
      @inst = squel.insert replaceSingleQuotes: true
      @inst.into('table').set('field', 1)
      @inst.set('field2', "ISNULL('str', str)", dontQuote: true)
    toString: ->
      assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, ISNULL(\'str\', str))'
    toParam: ->
      assert.same @inst.toParam(), {
        text: 'INSERT INTO table (field, field2) VALUES (?, ?)'
        values: [1, "ISNULL('str', str)"]
      }

  'fix for #225 - autoquoting field names': ->
    @inst = squel.insert(autoQuoteFieldNames: true)
      .into('users')
      .set('active', 1)
      .set('regular', 0)
      .set('moderator',1)

      assert.same @inst.toParam(), {
        text: 'INSERT INTO users (`active`, `regular`, `moderator`) VALUES (?, ?, ?)',
        values: [1, 0, 1],
      }

  'cloning': ->
    newinst = @inst.into('students').set('field', 1).clone()
    newinst.set('field', 2).set('field2', true)

    assert.same 'INSERT INTO students (field) VALUES (1)', @inst.toString()
    assert.same 'INSERT INTO students (field, field2) VALUES (2, TRUE)', newinst.toString()



module?.exports[require('path').basename(__filename)] = test
