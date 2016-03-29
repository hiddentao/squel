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



test['Blocks'] =
  'Block base class':
    beforeEach: ->
      @inst = new squel.cls.Block()

    'instanceof of BaseBuilder': ->
      assert.instanceOf @inst, squel.cls.BaseBuilder

    'options': ->
      expectedOptions = _.extend {}, squel.cls.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true
        dummy: true

      @inst = new squel.cls.Block
        usingValuePlaceholders: true
        dummy: true

      assert.same expectedOptions, @inst.options

    '_toParamString()': ->
      assert.throws (=> @inst.toString()), 'Not yet implemented'

    'exposedMethods()':
      'returns methods': ->
        @inst['method1'] = -> return false
        @inst['method2'] = -> return false

        assert.ok ['method1', 'method2'], (name for name of @inst.exposedMethods())

      'ignores methods prefixed with _': ->
        @inst['_method'] = -> return false

        assert.ok undefined is _.find (name for name of @inst.exposedMethods()), (name) ->
          return name is '_method'

      'ignores toString()': ->
        assert.ok undefined is _.find (name for name of @inst.exposedMethods()), (name) ->
          return name is 'toString'

    'cloning copies the options over': ->
      @inst.options.dummy = true;

      newinst = @inst.clone()

      @inst.options.dummy = false;

      assert.same true, newinst.options.dummy



  'StringBlock':
    beforeEach: ->
      @cls = squel.cls.StringBlock
      @inst = new @cls

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    '_toParamString()':
      'non-parameterized': ->
        @inst = new @cls {}, 'TAG'

        assert.same @inst._toParamString(), { 
          text: 'TAG'
          values: [] 
        }
      'parameterized': ->
        @inst = new @cls {}, 'TAG'

        assert.same @inst._toParamString(buildParameterized: true), { 
          text: 'TAG'
          values: [] 
        }



  'FunctionBlock':
    beforeEach: ->
      @cls = squel.cls.FunctionBlock
      @inst = new @cls

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'initial member values': ->
      assert.same [], @inst._values
      assert.same [], @inst._strings

    '_toParamString()':
      'when not set': ->
        assert.same @inst._toParamString(), { 
          text: ''
          values: [] 
        } 
      'non-parameterized': ->
        @inst.function('bla')
        @inst.function('bla2')

        assert.same @inst._toParamString(), {
          text: 'bla bla2', 
          values: []
        }
      'parameterized': ->
        @inst.function('bla ?', 2)
        @inst.function('bla2 ?', 3)

        assert.same @inst._toParamString(buildParameterized: true), {
          text: 'bla ? bla2 ?', 
          values: [2, 3]
        }


  'AbstractTableBlock':
    beforeEach: ->
      @cls = squel.cls.AbstractTableBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'initial field values': ->
      assert.same [], @inst._tables

    'has table':
      'no': ->
        assert.same false, @inst._hasTable()
      'yes': ->
        @inst._table('blah')
        assert.same true, @inst._hasTable()

    '_table()':
      'saves inputs': ->
        @inst._table('table1')
        @inst._table('table2', 'alias2')
        @inst._table('table3')

        expectedFroms = [
          {
          table: 'table1',
          alias: null
          },
          {
          table: 'table2',
          alias: 'alias2'
          },
          {
          table: 'table3',
          alias: null
          }
        ]

        assert.same expectedFroms, @inst._tables

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeTableAlias', -> return '_a'

        @inst._table('table', 'alias')

        assert.ok sanitizeTableSpy.calledWith 'table'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias'

        assert.same [ { table: '_t', alias: '_a' }], @inst._tables


      'handles single-table mode': ->
        @inst.options.singleTable = true

        @inst._table('table1')
        @inst._table('table2')
        @inst._table('table3')

        expected = [
          {
          table: 'table3',
          alias: null
          }
        ]

        assert.same expected, @inst._tables

      'builder as table': ->
        sanitizeTableSpy = test.mocker.spy @cls.prototype, '_sanitizeTable'

        innerTable1 = squel.select()
        innerTable2 = squel.select()

        @inst._table(innerTable1)
        @inst._table(innerTable2, 'Inner2')

        assert.ok sanitizeTableSpy.calledWithExactly innerTable1
        assert.ok sanitizeTableSpy.calledWithExactly innerTable2

        expected = [
          {
          alias: null
          table: innerTable1
          }
          {
          alias: 'Inner2'
          table: innerTable2
          }
        ]

        assert.same expected, @inst._tables

    '_toParamString()':
      beforeEach: ->
        @innerTable1 = squel.select().from('inner1').where('a = ?', 3)

      'no table': ->
        assert.same @inst._toParamString(), {
          text: ''
          values: []
        }

      'prefix': ->
        @inst.options.prefix = 'TEST'

        @inst._table('table2', 'alias2')

        assert.same @inst._toParamString(), {
          text: 'TEST table2 `alias2`',
          values: []
        }


      'non-parameterized': ->
        @inst._table(@innerTable1)
        @inst._table('table2', 'alias2')
        @inst._table('table3')

        assert.same @inst._toParamString(), {
          text: '(SELECT * FROM inner1 WHERE (a = 3)), table2 `alias2`, table3'
          values: []
        }
      'parameterized': ->
        @inst._table(@innerTable1)
        @inst._table('table2', 'alias2')
        @inst._table('table3')

        assert.same @inst._toParamString(buildParameterized: true), {
          text: '(SELECT * FROM inner1 WHERE (a = ?)), table2 `alias2`, table3'
          values: [3]
        }



  'FromTableBlock':
    beforeEach: ->
      @cls = squel.cls.FromTableBlock
      @inst = new @cls()

    'check prefix': ->
      assert.same @inst.options.prefix, 'FROM'

    'instanceof of AbstractTableBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractTableBlock

    'from()':
      'calls base class handler': ->
        baseMethodSpy = test.mocker.stub squel.cls.AbstractTableBlock.prototype, '_table'

        @inst.from('table1')
        @inst.from('table2', 'alias2')

        assert.same 2, baseMethodSpy.callCount
        assert.ok baseMethodSpy.calledWithExactly('table1', null)
        assert.ok baseMethodSpy.calledWithExactly('table2', 'alias2')



  'UpdateTableBlock':
    beforeEach: ->
      @cls = squel.cls.UpdateTableBlock
      @inst = new @cls()

    'instanceof of AbstractTableBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractTableBlock

    'check prefix': ->
      assert.same @inst.options.prefix, undefined

    'table()':
      'calls base class handler': ->
        baseMethodSpy = test.mocker.stub squel.cls.AbstractTableBlock.prototype, '_table'

        @inst.table('table1')
        @inst.table('table2', 'alias2')

        assert.same 2, baseMethodSpy.callCount
        assert.ok baseMethodSpy.calledWithExactly('table1', null)
        assert.ok baseMethodSpy.calledWithExactly('table2', 'alias2')





  'IntoTableBlock':
    beforeEach: ->
      @cls = squel.cls.IntoTableBlock
      @inst = new @cls()

    'instanceof of AbstractTableBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractTableBlock

    'check prefix': ->
      assert.same @inst.options.prefix, 'INTO'      

    'single table': ->
      assert.ok @inst.options.singleTable

    'into()':
      'calls base class handler': ->
        baseMethodSpy = test.mocker.stub squel.cls.AbstractTableBlock.prototype, '_table'

        @inst.into('table1')
        @inst.into('table2')

        assert.same 2, baseMethodSpy.callCount
        assert.ok baseMethodSpy.calledWith('table1')
        assert.ok baseMethodSpy.calledWith('table2')

    '_toParamString()':
      'requires table to have been provided': ->
        try
          @inst._toParamString()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: into() needs to be called', err.toString()




  'GetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.GetFieldBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'fields() - object':
      'saves inputs': ->
        fieldSpy = test.mocker.spy(@inst, 'field')

        @inst.fields({
          'field1': null
          'field2': 'alias2'
          'field3': null
        }, { dummy: true})

        expected = [
          {
            name: 'field1',
            alias: null,
            options: {
              dummy: true
            }
          },
          {
            name: 'field2',
            alias: 'alias2'
            options: {
              dummy: true
            }
          },
          {
            name: 'field3',
            alias: null
            options: {
              dummy: true
            }
          }
        ]

        assert.ok fieldSpy.calledThrice
        assert.ok fieldSpy.calledWithExactly('field1', null, dummy: true)
        assert.ok fieldSpy.calledWithExactly('field2', 'alias2', dummy: true)
        assert.ok fieldSpy.calledWithExactly('field3', null, dummy: true)

        assert.same expected, @inst._fields

    'fields() - array':
      'saves inputs': ->
        fieldSpy = test.mocker.spy(@inst, 'field')

        @inst.fields([ 'field1', 'field2', 'field3' ], { dummy: true})

        expected = [
          {
            name: 'field1',
            alias: null
            options: {
              dummy: true
            }
          },
          {
            name: 'field2',
            alias: null
            options: {
              dummy: true
            }
          },
          {
            name: 'field3',
            alias: null
            options: {
              dummy: true
            }
          }
        ]

        assert.ok fieldSpy.calledThrice
        assert.ok fieldSpy.calledWithExactly('field1', null, dummy: true)
        assert.ok fieldSpy.calledWithExactly('field2', null, dummy: true)
        assert.ok fieldSpy.calledWithExactly('field3', null, dummy: true)

        assert.same expected, @inst._fields

    'field()':
      'saves inputs': ->
        @inst.field('field1')
        @inst.field('field2', 'alias2')
        @inst.field('field3')

        expected = [
          {
          name: 'field1',
          alias: null,
          options: {},
          },
          {
          name: 'field2',
          alias: 'alias2'
          options: {},
          },
          {
          name: 'field3',
          alias: null
          options: {},
          }
        ]

        assert.same expected, @inst._fields

    'field() - discard duplicates':
      'saves inputs': ->
        @inst.field('field1')
        @inst.field('field2', 'alias2')
        @inst.field('field2', 'alias2')
        @inst.field('field1', 'alias1')

        expected = [
          {
          name: 'field1',
          alias: null
          options: {},
          },
          {
          name: 'field2',
          alias: 'alias2'
          options: {},
          },
          {
          name: 'field1',
          alias: 'alias1'
          options: {},
          }
        ]

        assert.same expected, @inst._fields

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeFieldAlias', -> return '_a'

        @inst.field('field1', 'alias1', { dummy: true})

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias1'

        assert.same @inst._fields, [ { 
          name: '_f', 
          alias: '_a' 
          options:
            dummy: true
        } ]

    '_toParamString()':
      beforeEach: ->
        @queryBuilder = squel.select()
        @fromTableBlock = @queryBuilder.getBlock(squel.cls.FromTableBlock)

      'returns all fields when none provided and table is set': ->
        @fromTableBlock._hasTable = -> true

        assert.same @inst._toParamString(queryBuilder: @queryBuilder), {
          text: '*', 
          values: []
        }

      'but returns nothing if no table set': ->
        @fromTableBlock._hasTable = -> false

        assert.same @inst._toParamString(queryBuilder: @queryBuilder), {
          text: ''
          values: []
        }

      'returns formatted query phrase': ->
        beforeEach: ->
          @fromTableBlock._hasTable = -> true
          @inst.field(squel.str('GETDATE(?)', 3), 'alias1')
          @inst.field('field2', 'alias2', { dummy: true })
          @inst.field('field3')
        'non-parameterized': ->
          assert.same @inst._toParamString(queryBuilder: @queryBuilder), {
            text: '(GETDATE(3)) AS "alias1", field2 AS "alias2", field3'
            values: []
          }
        'parameterized': ->
          assert.same @inst._toParamString(queryBuilder: @queryBuilder, buildParameterized: true), {
            text: '(GETDATE(?)) AS "alias1", field2 AS "alias2", field3'
            values: [3]
          }



  'AbstractSetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.AbstractSetFieldBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    '_set()':
      'saves inputs': ->
        @inst._set('field1', 'value1', dummy: 1)
        @inst._set('field2', 'value2', dummy: 2)
        @inst._set('field3', 'value3', dummy: 3)
        @inst._set('field4')

        expectedFields = [ 'field1', 'field2', 'field3', 'field4' ]
        expectedValues = [ [ 'value1', 'value2', 'value3', undefined ] ]
        expectedFieldOptions = [ [ {dummy: 1}, {dummy: 2}, {dummy: 3}, {} ] ]

        assert.same expectedFields, @inst._fields
        assert.same expectedValues, @inst._values
        assert.same expectedFieldOptions, @inst._valueOptions

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> '_v'

        @inst._set('field1', 'value1', dummy: true)

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'

        assert.same [ '_f' ], @inst._fields
        assert.same [ [ '_v' ] ], @inst._values


    '_setFields()':
      'saves inputs': ->
        @inst._setFields
          'field1': 'value1'
          'field2': 'value2'
          'field3': 'value3'

        expectedFields = [ 'field1', 'field2', 'field3' ]
        expectedValues = [ [ 'value1', 'value2', 'value3'] ]
        expectedFieldOptions = [ [ {}, {}, {} ] ]

        assert.same expectedFields, @inst._fields
        assert.same expectedValues, @inst._values
        assert.same expectedFieldOptions, @inst._valueOptions

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> '_v'

        @inst._setFields({'field1': 'value1'}, {dummy: true})

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'

        assert.same [ '_f' ], @inst._fields
        assert.same [ [ '_v' ] ], @inst._values

    '_setFieldsRows()':
      'saves inputs': ->
        @inst._setFieldsRows [
          {
            'field1': 'value1'
            'field2': 'value2'
            'field3': 'value3'
          }
          {
            'field1': 'value21'
            'field2': 'value22'
            'field3': 'value23'
          }
        ]

        expectedFields = [ 'field1', 'field2', 'field3' ]
        expectedValues = [ [ 'value1', 'value2', 'value3' ], [ 'value21', 'value22', 'value23' ] ]
        expectedFieldOptions = [ [ {}, {}, {} ], [ {}, {}, {} ] ]

        assert.same expectedFields, @inst._fields
        assert.same expectedValues, @inst._values
        assert.same expectedFieldOptions, @inst._valueOptions

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> return '_v'

        @inst._setFieldsRows [
          {
            'field1': 'value1'
          },
          {
            'field1': 'value21'
          }
        ], { dummy: true }

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value21'

        assert.same [ '_f' ], @inst._fields
        assert.same [ [ '_v' ], [ '_v' ] ], @inst._values

    '_toParamString()': ->
      assert.throws ( => @inst._toParamString()), 'Not yet implemented'




  'SetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.SetFieldBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'set()':
      'calls to _set()': ->
        spy = test.mocker.stub @inst, '_set'

        @inst.set 'f', 'v', dummy: true

        assert.ok spy.calledWithExactly('f', 'v', dummy: true)

    'setFields()':
      'calls to _setFields()': ->
        spy = test.mocker.stub @inst, '_setFields'

        @inst.setFields 'f', dummy: true

        assert.ok spy.calledWithExactly('f', dummy: true)


    '_toParamString()':
      'needs at least one field to have been provided': ->
        try
          @inst.toString()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: set() needs to be called', err.toString()

      'fields set':
        beforeEach: ->
          @inst.set('field0 = field0 + 1')
          @inst.set('field1', 'value1', { dummy: true })
          @inst.set('field2', 'value2')
          @inst.set('field3', squel.str('GETDATE(?)', 4))
        'non-parameterized': ->
          assert.same @inst._toParamString(), {
            text: 'SET field0 = field0 + 1, field1 = \'value1\', field2 = \'value2\', field3 = (GETDATE(4))',
            values: [],
          }
        'parameterized': ->
          assert.same @inst._toParamString(buildParameterized: true), {
            text: 'SET field0 = field0 + 1, field1 = ?, field2 = ?, field3 = (GETDATE(?))',
            values: ['value1', 'value2', 4],
          }



  'InsertFieldValueBlock':
    beforeEach: ->
      @cls = squel.cls.InsertFieldValueBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'set()':
      'calls to _set()': ->
        spy = test.mocker.stub @inst, '_set'

        @inst.set 'f', 'v', dummy: true

        assert.ok spy.calledWithExactly('f', 'v', dummy: true)

    'setFields()':
      'calls to _setFields()': ->
        spy = test.mocker.stub @inst, '_setFields'

        @inst.setFields 'f', dummy: true

        assert.ok spy.calledWithExactly('f', dummy: true)

    'setFieldsRows()':
      'calls to _setFieldsRows()': ->
        spy = test.mocker.stub @inst, '_setFieldsRows'

        @inst.setFieldsRows 'f', dummy: true

        assert.ok spy.calledWithExactly('f', dummy: true)

    '_toParamString()':
      'needs at least one field to have been provided': ->
        assert.same '', @inst.toString()

      'got fields':
        beforeEach: ->
          @inst.setFieldsRows([
            { field1: 9, field2: 'value2', field3: squel.str('GETDATE(?)', 5) }
            { field1: 8, field2: true, field3: null }
          ])
        'non-parameterized': ->
          assert.same @inst._toParamString(), {
            text: '(field1, field2, field3) VALUES (9, \'value2\', (GETDATE(5))), (8, TRUE, NULL)'
            values: [],
          }
        'parameterized': ->
          assert.same @inst._toParamString(buildParameterized: true), {
            text: '(field1, field2, field3) VALUES (?, ?, (GETDATE(?))), (?, ?, ?)'
            values: [9, 'value2', 5, 8, true, null],
          }


  'InsertFieldsFromQueryBlock':
    beforeEach: ->
      @cls = squel.cls.InsertFieldsFromQueryBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'fromQuery()':
      'sanitizes field names': ->
        spy = test.mocker.stub @inst, '_sanitizeField', -> 1

        qry = squel.select()

        @inst.fromQuery(['test', 'one', 'two'], qry)

        assert.ok spy.calledThrice
        assert.ok spy.calledWithExactly 'test'
        assert.ok spy.calledWithExactly 'one'
        assert.ok spy.calledWithExactly 'two'

      'sanitizes query': ->
        spy = test.mocker.stub @inst, '_sanitizeQueryBuilder', -> 1

        qry = 123

        @inst.fromQuery(['test', 'one', 'two'], qry)

        assert.ok spy.calledOnce
        assert.ok spy.calledWithExactly qry

      'overwrites existing values': ->
        @inst._fields = 1
        @inst._query = 2

        qry = squel.select()
        @inst.fromQuery(['test', 'one', 'two'], qry)

        assert.same qry, @inst._query
        assert.same ['test', 'one', 'two'], @inst._fields

    '_toParamString()':
      'needs fromQuery() to have been called': ->
        assert.same @inst._toParamString(), {
          text: ''
          values: []
        }

      'default':
        beforeEach: ->
          @qry = squel.select().from('mega').where('a = ?', 5)
          @inst.fromQuery ['test', 'one', 'two'], @qry          
        'non-parameterized': ->
          assert.same @inst._toParamString(), {
            text: "(test, one, two) ((SELECT * FROM mega WHERE (a = 5)))"
            values: []
          }
        'parameterized': ->
          assert.same @inst._toParamString(buildParameterized: true), {
            text: "(test, one, two) ((SELECT * FROM mega WHERE (a = ?)))"
            values: [5]
          }



  'DistinctBlock':
    beforeEach: ->
      @cls = squel.cls.DistinctBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    '_toParamString()':
      'output nothing if not set': ->
        assert.same @inst._toParamString(), {
          text: ''
          values: []
        }
      'output DISTINCT if set': ->
        @inst.distinct()
        assert.same @inst._toParamString(), {
          text: 'DISTINCT'
          values: []
        }




  'GroupByBlock':
    beforeEach: ->
      @cls = squel.cls.GroupByBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'group()':
      'adds to list': ->
        @inst.group('field1')
        @inst.group('field2')

        assert.same ['field1', 'field2'], @inst._groups

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'

        @inst.group('field1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'

        assert.same ['_f'], @inst._groups

    'toString()':
      'output nothing if no fields set': ->
        @inst._groups = []
        assert.same '', @inst.toString()

      'output GROUP BY': ->
        @inst.group('field1')
        @inst.group('field2')

        assert.same 'GROUP BY field1, field2', @inst.toString()




  'OffsetBlock':
    beforeEach: ->
      @cls = squel.cls.OffsetBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'offset()':
      'set value': ->
        @inst.offset(1)

        assert.same 1, @inst._offsets

        @inst.offset(22)

        assert.same 22, @inst._offsets

      'sanitizes inputs': ->
        sanitizeSpy = test.mocker.stub @cls.prototype, '_sanitizeLimitOffset', -> return 234

        @inst.offset(23)

        assert.ok sanitizeSpy.calledWithExactly 23

        assert.same 234, @inst._offsets

    'toString()':
      'output nothing if not set': ->
        @inst._offsets = null
        assert.same '', @inst.toString()

      'output OFFSET': ->
        @inst.offset(12)

        assert.same 'OFFSET 12', @inst.toString()



  'AbstractConditionBlock':
    beforeEach: ->
      @cls = squel.cls.AbstractConditionBlock
      @inst = new @cls {
        verb: 'ACB'
      }

      class squel.cls.MockConditionBlock extends squel.cls.AbstractConditionBlock
        constructor: (options) ->
          super _.extend({}, options, {verb: 'MOCKVERB'})

        mockCondition: (condition, values...) ->
          @_condition condition, values...

      class squel.cls.MockSelectWithCondition extends squel.cls.Select
        constructor: (options, blocks = null) ->
          blocks = [
            new squel.cls.StringBlock(options, 'SELECT'),
            new squel.cls.GetFieldBlock(options),
            new squel.cls.FromTableBlock(options),
            new squel.cls.MockConditionBlock(options)
          ]

          super options, blocks

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    '_condition()':
      'adds to list': ->
        @inst._condition('a = 1')
        @inst._condition('b = 2 OR c = 3')

        assert.same [
          {
            expr: 'a = 1'
            values: []
          }
          {
            expr: 'b = 2 OR c = 3'
            values: []
          }
        ], @inst._conditions

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeExpression', -> return '_c'

        @inst._condition('a = 1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'a = 1'

        assert.same [{
          expr: '_c'
          values: []
        }], @inst._conditions

    '_toParamString()':
      'output nothing if no conditions set': ->
        assert.same @inst._toParamString(), {
          text: ''
          values: []
        }

      'output QueryBuilder ':
        beforeEach: ->
          subquery = new squel.cls.MockSelectWithCondition()
          subquery.field('col1').from('table1').mockCondition('field1 = ?', 10)
          @inst._condition('a in ?', subquery)
          @inst._condition('b = ? OR c = ?', 2, 3)
          @inst._condition('d in ?', [4, 5, 6])
        'non-parameterized': ->
          assert.same @inst._toParamString(), {
            text: 'ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))'
            values: []
          }
        'parameterized': ->
          assert.same @inst._toParamString(buildParameterized: true), {
            text: 'ACB (a in (SELECT col1 FROM table1 MOCKVERB (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))'
            values: [10, 2, 3, 4, 5, 6]
          }

      'Fix for hiddentao/squel#64':
        beforeEach: ->
          @inst._condition('a = ?', 1)
          @inst._condition('b = ? OR c = ?', 2, 3)
          @inst._condition('d in ?', [4, 5, 6])
          @inst._toParamString()
          @inst._toParamString()
        'non-parameterized': ->
          assert.same @inst._toParamString(), {
            text: 'ACB (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))'
            values: []
          }
        'parameterized': ->
          assert.same @inst._toParamString(buildParameterized: true), {
            text: 'ACB (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))'
            values: [1, 2, 3, 4, 5, 6]
          }




  # 'WhereBlock':
  #   beforeEach: ->
  #     @cls = squel.cls.WhereBlock
  #     @inst = new @cls()

  #   'instanceof of AbstractConditionBlock': ->
  #     assert.instanceOf @inst, squel.cls.AbstractConditionBlock

  #   'sets verb to WHERE': ->
  #     @inst = new @cls

  #     assert.same 'WHERE', @inst.conditionVerb

  #   'initial field values': ->
  #     assert.same [], @inst.conditions

  #   'where()':
  #     'adds to list': ->
  #       @inst.where('a = 1')
  #       @inst.where('b = 2 OR c = 3')

  #       assert.same [
  #         {
  #           text: 'a = 1'
  #           values: []
  #         }
  #         {
  #           text: 'b = 2 OR c = 3'
  #           values: []
  #         }
  #       ], @inst.conditions

  #     'sanitizes inputs': ->
  #       sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

  #       @inst.where('a = 1')

  #       assert.ok sanitizeFieldSpy.calledWithExactly 'a = 1'

  #       assert.same [{
  #         text: '_c'
  #         values: []
  #       }], @inst.conditions

  #     'handles variadic arguments': ->
  #       sanitizeStub = test.mocker.stub @cls.prototype, '_sanitizeValue', _.identity

  #       substitutes = ['hello', [1, 2, 3]]
  #       @inst.where.apply @inst, ['a = ? and b in ?'].concat(substitutes)

  #       expectedValues = _.flatten substitutes
  #       for expectedValue, index in expectedValues
  #         assert.ok sanitizeStub.getCall(index).calledWithExactly expectedValue

  #       assert.same [
  #         {
  #           text: 'a = ? and b in (?, ?, ?)'
  #           values: ['hello', 1, 2, 3]
  #         }
  #       ], @inst.conditions

  #   'toString()':
  #     'output QueryBuilder ': ->
  #       subquery = new squel.cls.Select()
  #       subquery.field('col1').from('table1').where('field1 = ?', 10)
  #       @inst.where('a in ?', subquery)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       assert.same 'WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.toString()

  #     'output nothing if no conditions set': ->
  #       @inst.conditions = []
  #       assert.same '', @inst.toString()

  #     'output condition': ->
  #       @inst.where('a = ?', 1)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       assert.same 'WHERE (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.toString()

  #     'Fix for hiddentao/squel#64': ->
  #       @inst.where('a = ?', 1)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       # second time it should still work
  #       @inst.toString()
  #       @inst.toString()
  #       assert.same 'WHERE (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.toString()

  #     'formats values ': ->
  #       formatValueStub = test.mocker.stub @cls.prototype, '_formatValue', (a) -> '[' + a + ']'

  #       @inst.where('a = ?', 1)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       assert.same 'WHERE (a = [1]) AND (b = [2] OR c = [3]) AND (d in ([4], [5], [6]))', @inst.toString()

  #   'toParam()':
  #     'output QueryBuilder ': ->
  #       subquery = new squel.cls.Select()
  #       subquery.field('col1').from('table1').where('field1 = ?', 10)
  #       @inst.where('a in ?', subquery)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       assert.same { text: 'WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))', values: [10, 2, 3, 4, 5, 6] }, @inst.toParam()

  #     'output QueryBuilder expr': ->
  #       subquery = new squel.cls.Select()
  #       subquery.field('col1').from('table1').where('field1 = ?', 10)
  #       expr = squel.expr().and('a in ?',subquery)
  #         .and_begin().or('b = ?', 2).or('c = ?', 3).end().and_begin()
  #         .and('d in ?', [4, 5, 6]).end()
  #       @inst.where(expr)

  #       #assert.same { text: '', values: [10, 2, 3, 4, 5, 6] }, @inst.toParam()
  #       assert.same { text: 'WHERE (a in (SELECT col1 FROM table1 WHERE (field1 = ?)) AND (b = ? OR c = ?) AND (d in (?, ?, ?)))', values: [10, 2, 3, 4, 5, 6] }, @inst.toParam()

  #     'output nothing if no conditions set': ->
  #       @inst.conditions = []
  #       assert.same { text: '', values: [] }, @inst.toParam()

  #     'output condition': ->
  #       @inst.where('a = ?', 1)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       assert.same { text: 'WHERE (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))', values: [1, 2, 3, 4, 5, 6] }, @inst.toParam()

  #     'formats value types as params': ->
  #       formatValueSpy = test.mocker.spy @cls.prototype, '_formatValue'
  #       test.mocker.stub @cls.prototype, '_formatValueAsParam', (a) -> '[' + a + ']'

  #       @inst.where('a = ?', 1)
  #       @inst.where('b = ? OR c = ?', 2, 3)
  #       @inst.where('d in ?', [4, 5, 6])

  #       assert.same {
  #         text: 'WHERE (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))',
  #         values: ['[1]', '[2]', '[3]', '[4]', '[5]', '[6]']
  #       }, @inst.toParam()

  #       assert.ok formatValueSpy.notCalled


  # 'HavingBlock':
  #   beforeEach: ->
  #     @cls = squel.cls.HavingBlock
  #     @inst = new @cls()

  #   'instanceof of AbstractConditionBlock': ->
  #     assert.instanceOf @inst, squel.cls.AbstractConditionBlock

  #   'sets verb to HAVING': ->
  #     @inst = new @cls

  #     assert.same 'HAVING', @inst.conditionVerb

  #   'initial field values': ->
  #     assert.same [], @inst.conditions

  #   'where()':
  #     'adds to list': ->
  #       @inst.having('a = 1')
  #       @inst.having('b = 2 OR c = 3')

  #       assert.same [
  #         {
  #           text: 'a = 1'
  #           values: []
  #         }
  #         {
  #           text: 'b = 2 OR c = 3'
  #           values: []
  #         }
  #       ], @inst.conditions

  #     'sanitizes inputs': ->
  #       sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

  #       @inst.having('a = 1')

  #       assert.ok sanitizeFieldSpy.calledWithExactly 'a = 1'

  #       assert.same [{
  #         text: '_c'
  #         values: []
  #       }], @inst.conditions

  #     'handles variadic arguments': ->
  #       sanitizeStub = test.mocker.stub @cls.prototype, '_sanitizeValue', _.identity

  #       substitutes = ['hello', [1, 2, 3]]
  #       @inst.having.apply @inst, ['a = ? and b in ?'].concat(substitutes)

  #       expectedValues = _.flatten substitutes
  #       for expectedValue, index in expectedValues
  #         assert.ok sanitizeStub.getCall(index).calledWithExactly expectedValue

  #       assert.same [
  #         {
  #           text: 'a = ? and b in (?, ?, ?)'
  #           values: ['hello', 1, 2, 3]
  #         }
  #       ], @inst.conditions

  #   'toString()':
  #     'output QueryBuilder ': ->
  #       subquery = new squel.cls.Select()
  #       subquery.field('col1').from('table1').where('field1 = ?', 10)
  #       @inst.having('a in ?', subquery)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       assert.same 'HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = 10))) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.toString()

  #     'output nothing if no conditions set': ->
  #       @inst.conditions = []
  #       assert.same '', @inst.toString()

  #     'output condition': ->
  #       @inst.having('a = ?', 1)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       assert.same 'HAVING (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.toString()

  #     'Fix for hiddentao/squel#64': ->
  #       @inst.having('a = ?', 1)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       # second time it should still work
  #       @inst.toString()
  #       @inst.toString()
  #       assert.same 'HAVING (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.toString()

  #     'formats values ': ->
  #       formatValueStub = test.mocker.stub @cls.prototype, '_formatValue', (a) -> '[' + a + ']'

  #       @inst.having('a = ?', 1)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       assert.same 'HAVING (a = [1]) AND (b = [2] OR c = [3]) AND (d in ([4], [5], [6]))', @inst.toString()

  #   'toParam()':
  #     'output QueryBuilder ': ->
  #       subquery = new squel.cls.Select()
  #       subquery.field('col1').from('table1').where('field1 = ?', 10)
  #       @inst.having('a in ?', subquery)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       assert.same { text: 'HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = ?))) AND (b = ? OR c = ?) AND (d in (?, ?, ?))', values: [10, 2, 3, 4, 5, 6] }, @inst.toParam()

  #     'output QueryBuilder expr': ->
  #       subquery = new squel.cls.Select()
  #       subquery.field('col1').from('table1').where('field1 = ?', 10)
  #       expr = squel.expr().and('a in ?',subquery)
  #         .and_begin().or('b = ?', 2).or('c = ?', 3).end().and_begin()
  #         .and('d in ?', [4, 5, 6]).end()
  #       @inst.having(expr)

  #       #assert.same { text: '', values: [10, 2, 3, 4, 5, 6] }, @inst.toParam()
  #       assert.same { text: 'HAVING (a in (SELECT col1 FROM table1 WHERE (field1 = ?)) AND (b = ? OR c = ?) AND (d in (?, ?, ?)))', values: [10, 2, 3, 4, 5, 6] }, @inst.toParam()

  #     'output nothing if no conditions set': ->
  #       @inst.conditions = []
  #       assert.same { text: '', values: [] }, @inst.toParam()

  #     'output condition': ->
  #       @inst.having('a = ?', 1)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       assert.same { text: 'HAVING (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))', values: [1, 2, 3, 4, 5, 6] }, @inst.toParam()

  #     'formats value types as params': ->
  #       formatValueSpy = test.mocker.spy @cls.prototype, '_formatValue'
  #       test.mocker.stub @cls.prototype, '_formatValueAsParam', (a) -> '[' + a + ']'

  #       @inst.having('a = ?', 1)
  #       @inst.having('b = ? OR c = ?', 2, 3)
  #       @inst.having('d in ?', [4, 5, 6])

  #       assert.same {
  #         text: 'HAVING (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))',
  #         values: ['[1]', '[2]', '[3]', '[4]', '[5]', '[6]']
  #       }, @inst.toParam()

  #       assert.ok formatValueSpy.notCalled



  # 'OrderByBlock':
  #   beforeEach: ->
  #     @cls = squel.cls.OrderByBlock
  #     @inst = new @cls()

  #   'instanceof of Block': ->
  #     assert.instanceOf @inst, squel.cls.Block

  #   'initial field values': ->
  #     assert.same [], @inst.orders
  #     assert.same [], @inst._values

  #   'order()':
  #     'adds to list': ->
  #       @inst.order('field1')
  #       @inst.order('field2', false)
  #       @inst.order('field3', true)

  #       expected = [
  #         {
  #           field: 'field1',
  #           dir: true
  #         },
  #         {
  #           field: 'field2',
  #           dir: false
  #         },
  #         {
  #           field: 'field3',
  #           dir: true
  #         }
  #       ]

  #       assert.same expected, @inst.orders

  #     'sanitizes inputs': ->
  #       sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'

  #       @inst.order('field1')

  #       assert.ok sanitizeFieldSpy.calledWithExactly 'field1'

  #       assert.same [ { field: '_f', dir: true } ], @inst.orders

  #     'saves additional values': ->
  #       @inst.order('field1', false, 1.2, 4)

  #       assert.same [ { field: 'field1', dir: false } ], @inst.orders
  #       assert.same [1.2, 4], @inst._values


  #   'toString()':
  #     'output nothing if nothing set': ->
  #       @inst.orders = []
  #       assert.same '', @inst.toString()

  #     'output ORDER BY': ->
  #       @inst.order('field1')
  #       @inst.order('field2', false)
  #       @inst.order('field3', true)

  #       assert.same 'ORDER BY field1 ASC, field2 DESC, field3 ASC', @inst.toString()

  #   'toParam()':
  #     'empty': ->
  #       @inst.orders = []
  #       assert.same { text: '', values: [] }, @inst.toParam()

  #     'default': ->
  #       @inst.order('field1')
  #       @inst.order('field2', false)
  #       @inst.order('field3', true)

  #       assert.same { text: 'ORDER BY field1 ASC, field2 DESC, field3 ASC', values: [] }, @inst.toParam()

  #     'with values': ->
  #       @inst.order('field3', true, 1.2, 5)

  #       assert.same { text: 'ORDER BY field3 ASC', values: [1.2, 5] }, @inst.toParam()


  # 'LimitBlock':
  #   beforeEach: ->
  #     @cls = squel.cls.LimitBlock
  #     @inst = new @cls()

  #   'instanceof of Block': ->
  #     assert.instanceOf @inst, squel.cls.Block

  #   'initial field values': ->
  #     assert.same null, @inst.limits

  #   'limit()':
  #     'set value': ->
  #       @inst.limit(1)

  #       assert.same 1, @inst.limits

  #       @inst.limit(22)

  #       assert.same 22, @inst.limits

  #     'sanitizes inputs': ->
  #       sanitizeSpy = test.mocker.stub @cls.prototype, '_sanitizeLimitOffset', -> return 234

  #       @inst.limit(23)

  #       assert.ok sanitizeSpy.calledWithExactly 23

  #       assert.same 234, @inst.limits

  #   'toString()':
  #     'output nothing if not set': ->
  #       @inst.limits = null
  #       assert.same '', @inst.toString()

  #     'output LIMIT if set to 0': ->
  #       @inst.limit(0)
  #       assert.same 'LIMIT 0', @inst.toString()

  #     'output LIMIT': ->
  #       @inst.limit(12)

  #       assert.same 'LIMIT 12', @inst.toString()



  # 'JoinBlock':
  #   beforeEach: ->
  #     @cls = squel.cls.JoinBlock
  #     @inst = new @cls()

  #   'instanceof of Block': ->
  #     assert.instanceOf @inst, squel.cls.Block

  #   'initial field values': ->
  #     assert.same [], @inst.joins

  #   'join()':
  #     'adds to list': ->
  #       @inst.join('table1')
  #       @inst.join('table2', null, 'b = 1', 'LEFT')
  #       @inst.join('table3', 'alias3', 'c = 1', 'RIGHT')
  #       @inst.join('table4', 'alias4', 'd = 1', 'OUTER')
  #       @inst.join('table5', 'alias5', null, 'CROSS')

  #       expected = [
  #         {
  #           type: 'INNER',
  #           table: 'table1',
  #           alias: null,
  #           condition: null
  #         },
  #         {
  #           type: 'LEFT',
  #           table: 'table2',
  #           alias: null,
  #           condition: 'b = 1'
  #         },
  #         {
  #           type: 'RIGHT',
  #           table: 'table3',
  #           alias: '`alias3`',
  #           condition: 'c = 1'
  #         },
  #         {
  #           type: 'OUTER',
  #           table: 'table4',
  #           alias: '`alias4`',
  #           condition: 'd = 1'
  #         },
  #         {
  #           type: 'CROSS',
  #           table: 'table5',
  #           alias: '`alias5`',
  #           condition: null
  #         }
  #       ]

  #       assert.same expected, @inst.joins

  #     'sanitizes inputs': ->
  #       sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
  #       sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeTableAlias', -> return '_a'
  #       sanitizeConditionSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

  #       @inst.join('table1', 'alias1', 'a = 1')

  #       assert.ok sanitizeTableSpy.calledWithExactly 'table1', true
  #       assert.ok sanitizeAliasSpy.calledWithExactly 'alias1'
  #       assert.ok sanitizeConditionSpy.calledWithExactly 'a = 1'

  #       expected = [
  #         {
  #         type: 'INNER',
  #         table: '_t',
  #         alias: '_a',
  #         condition: '_c'
  #         }
  #       ]

  #       assert.same expected, @inst.joins

  #     'nested queries': ->
  #       inner1 = squel.select()
  #       inner2 = squel.select()
  #       inner3 = squel.select()
  #       inner4 = squel.select()
  #       inner5 = squel.select()
  #       inner6 = squel.select()
  #       @inst.join(inner1)
  #       @inst.join(inner2, null, 'b = 1', 'LEFT')
  #       @inst.join(inner3, 'alias3', 'c = 1', 'RIGHT')
  #       @inst.join(inner4, 'alias4', 'd = 1', 'OUTER')
  #       @inst.join(inner5, 'alias5', 'e = 1', 'FULL')
  #       @inst.join(inner6, 'alias6', null, 'CROSS')

  #       expected = [
  #         {
  #         type: 'INNER',
  #         table: inner1,
  #         alias: null,
  #         condition: null
  #         },
  #         {
  #         type: 'LEFT',
  #         table: inner2,
  #         alias: null,
  #         condition: 'b = 1'
  #         },
  #         {
  #         type: 'RIGHT',
  #         table: inner3,
  #         alias: '`alias3`',
  #         condition: 'c = 1'
  #         },
  #         {
  #         type: 'OUTER',
  #         table: inner4,
  #         alias: '`alias4`',
  #         condition: 'd = 1'
  #         },
  #         {
  #           type: 'FULL',
  #           table: inner5,
  #           alias: '`alias5`',
  #           condition: 'e = 1'
  #         },
  #         {
  #           type: 'CROSS',
  #           table: inner6,
  #           alias: '`alias6`',
  #           condition: null
  #         }
  #       ]

  #       assert.same expected, @inst.joins

  #   'left_join()':
  #     'calls join()': ->
  #       joinSpy = test.mocker.stub(@inst, 'join')

  #       @inst.left_join('t', 'a', 'c')

  #       assert.ok joinSpy.calledOnce
  #       assert.ok joinSpy.calledWithExactly('t', 'a', 'c', 'LEFT')


  #   'toString()':
  #     'output nothing if nothing set': ->
  #       @inst.joins = []
  #       assert.same '', @inst.toString()

  #     'output JOINs': ->
  #       @inst.join('table1')
  #       @inst.join('table2', null, 'b = 1', 'LEFT')
  #       @inst.join('table3', 'alias3', 'c = 1', 'RIGHT')
  #       @inst.join('table4', 'alias4', 'd = 1', 'FULL')
  #       @inst.join('table5', 'alias5', null, 'CROSS')

  #       assert.same 'INNER JOIN table1 LEFT JOIN table2 ON (b = 1) RIGHT JOIN table3 `alias3` ON (c = 1) FULL JOIN table4 `alias4` ON (d = 1) CROSS JOIN table5 `alias5`', @inst.toString()

  #     'output JOINs with nested query': ->
  #       inner1 = squel.select().from('1')
  #       inner2 = squel.select().from('2')
  #       inner3 = squel.select().from('3')
  #       inner4 = squel.select().from('4')
  #       inner5 = squel.select().from('5')

  #       @inst.join(inner1)
  #       @inst.join(inner2, null, 'b = 1', 'LEFT')
  #       @inst.join(inner3, 'alias3', 'c = 1', 'RIGHT')
  #       @inst.join(inner4, 'alias4', 'e = 1', 'FULL')
  #       @inst.join(inner5, 'alias5', null, 'CROSS')

  #       assert.same 'INNER JOIN (SELECT * FROM 1) LEFT JOIN (SELECT * FROM 2) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1) FULL JOIN (SELECT * FROM 4) `alias4` ON (e = 1) CROSS JOIN (SELECT * FROM 5) `alias5`', @inst.toString()

  #     'QueryBuilder in ON condition expr()': ->
  #       inner1 = squel.select().from('1')
  #       inner2 = squel.select().from('2')
  #       expr = squel.expr()
  #         .and('field1 = ?',inner2)

  #       @inst.join(inner1, null, expr)
  #       assert.same 'INNER JOIN (SELECT * FROM 1) ON (field1 = (SELECT * FROM 2))', @inst.toString()

  #   'toParam()':
  #     'QueryBuilder in ON condition expr()': ->
  #       inner1 = squel.select().from('1')
  #       inner2 = squel.select().from('2')
  #       expr = squel.expr()
  #         .and('field1 = ?',inner2)

  #       @inst.join(inner1, null, expr)
  #       assert.same { text: 'INNER JOIN (SELECT * FROM 1) ON (field1 = (SELECT * FROM 2))', values: [] }, @inst.toParam()



module?.exports[require('path').basename(__filename)] = test
