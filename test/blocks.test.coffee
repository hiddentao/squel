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

    'buildStr()': ->
      assert.same '', @inst.buildStr()

    'exposedMethods()':
      'returns methods': ->
        @inst['method1'] = -> return false
        @inst['method2'] = -> return false

        assert.ok ['method1', 'method2'], (name for name of @inst.exposedMethods())

      'ignores methods prefixed with _': ->
        @inst['_method'] = -> return false

        assert.ok undefined is _.find (name for name of @inst.exposedMethods()), (name) ->
          return name is '_method'

      'ignores buildStr()': ->
        assert.ok undefined is _.find (name for name of @inst.exposedMethods()), (name) ->
          return name is 'buildStr'



  'StringBlock':
    beforeEach: ->
      @cls = squel.cls.StringBlock
      @inst = new @cls

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'buildStr()':
      'returns the string as is': ->
        @inst = new @cls {}, 'TAG'

        assert.same 'TAG', @inst.buildStr()



  'FromTableBlock':
    beforeEach: ->
      @cls = squel.cls.FromTableBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.tables

    'from()':
      'saves inputs': ->
        @inst.from('table1')
        @inst.from('table2', 'alias2')
        @inst.from('table3')

        expectedFroms = [
          {
            name: 'table1',
            alias: null
          },
          {
            name: 'table2',
            alias: 'alias2'
          },
          {
            name: 'table3',
            alias: null
          }
        ]

        assert.same expectedFroms, @inst.tables

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeAlias', -> return '_a'

        @inst.from('table', 'alias')

        assert.ok sanitizeTableSpy.calledWithExactly 'table'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias'

        assert.same [ { name: '_t', alias: '_a' }], @inst.tables


      'handles single-table mode': ->
        @inst.options.singleTable = true

        @inst.from('table1')
        @inst.from('table2')
        @inst.from('table3')

        expectedFroms = [
          {
            name: 'table3',
            alias: null
          }
        ]

        assert.same expectedFroms, @inst.tables


    'buildStr()':
      'requires at least one table to have been provided': ->
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: from() needs to be called', err.toString()

      'returns formatted query phrase': ->
        @inst.from('table1')
        @inst.from('table2', 'alias2')
        @inst.from('table3')

        assert.same 'FROM table1, table2 `alias2`, table3', @inst.buildStr()




  'UpdateTableBlock':
    beforeEach: ->
      @cls = squel.cls.UpdateTableBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.tables

    'table()':
      'saves inputs': ->
        @inst.table('table1')
        @inst.table('table2', 'alias2')
        @inst.table('table3')

        expected = [
          {
          name: 'table1',
          alias: null
          },
          {
          name: 'table2',
          alias: 'alias2'
          },
          {
          name: 'table3',
          alias: null
          }
        ]

        assert.same expected, @inst.tables

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeAlias', -> return '_a'

        @inst.table('table', 'alias')

        assert.ok sanitizeTableSpy.calledWithExactly 'table'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias'

        assert.same [ { name: '_t', alias: '_a' }], @inst.tables

    'buildStr()':
      'requires at least one table to have been provided': ->
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: table() needs to be called', err.toString()

      'returns formatted query phrase': ->
        @inst.table('table1')
        @inst.table('table2', 'alias2')
        @inst.table('table3')

        assert.same 'table1, table2 AS `alias2`, table3', @inst.buildStr()




  'IntoTableBlock':
    beforeEach: ->
      @cls = squel.cls.IntoTableBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same null, @inst.table

    'into()':
      'saves inputs': ->
        @inst.into('table1')
        @inst.into('table2')
        @inst.into('table3')

        assert.same 'table3', @inst.table

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'

        @inst.into('table')

        assert.ok sanitizeTableSpy.calledWithExactly 'table'

        assert.same '_t', @inst.table

    'buildStr()':
      'requires table to have been provided': ->
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: into() needs to be called', err.toString()

      'returns formatted query phrase': ->
        @inst.into('table1')

        assert.same 'INTO table1', @inst.buildStr()




  'GetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.GetFieldBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.fields

    'field()':
      'saves inputs': ->
        @inst.field('field1')
        @inst.field('field2', 'alias2')
        @inst.field('field3')

        expected = [
          {
          name: 'field1',
          alias: null
          },
          {
          name: 'field2',
          alias: 'alias2'
          },
          {
          name: 'field3',
          alias: null
          }
        ]

        assert.same expected, @inst.fields

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeAlias', -> return '_a'

        @inst.field('field1', 'alias1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias1'

        assert.same [ { name: '_f', alias: '_a' } ], @inst.fields

    'buildStr()':
      'returns all fields when none provided': ->
        @inst.fields = []
        assert.same '*', @inst.buildStr()

      'returns formatted query phrase': ->
        @inst.field('field1')
        @inst.field('field2', 'alias2')
        @inst.field('field3')

        assert.same 'field1, field2 AS "alias2", field3', @inst.buildStr()




  'SetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.SetFieldBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.fields

    'set()':
      'saves inputs': ->
        @inst.set('field1', 'value1')
        @inst.set('field2', 'value2')
        @inst.set('field3', 'value3')

        expected =
          'field1': 'value1',
          'field2': 'value2',
          'field3': 'value3'

        assert.same expected, @inst.fields

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> return '_v'

        @inst.set('field1', 'value1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'

        assert.same { '_f': '_v' }, @inst.fields

    'buildStr()':
      'needs at least one field to have been provided': ->
        @inst.fields = []
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: set() needs to be called', err.toString()

      'calls formatValue() for each field value': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValue', (v) -> return "[#{v}]"

        @inst.fields =
          'field1': 'value1',
          'field2': 'value2',
          'field3': 'value3'

        assert.same 'SET field1 = [value1], field2 = [value2], field3 = [value3]', @inst.buildStr()

        assert.ok formatValueSpy.calledThrice
        assert.ok formatValueSpy.calledWithExactly 'value1'
        assert.ok formatValueSpy.calledWithExactly 'value2'
        assert.ok formatValueSpy.calledWithExactly 'value3'





  'InsertFieldValueBlock':
    beforeEach: ->
      @cls = squel.cls.InsertFieldValueBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.fields

    'set()':
      'saves inputs': ->
        @inst.set('field1', 'value1')
        @inst.set('field2', 'value2')
        @inst.set('field3', 'value3')

        expected =
          'field1': 'value1',
          'field2': 'value2',
          'field3': 'value3'

        assert.same expected, @inst.fields

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> return '_v'

        @inst.set('field1', 'value1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'

        assert.same { '_f': '_v' }, @inst.fields

    'buildStr()':
      'needs at least one field to have been provided': ->
        @inst.fields = []
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: set() needs to be called', err.toString()

      'calls formatValue() for each field value': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValue', (v) -> return "[#{v}]"

        @inst.fields =
          'field1': 'value1',
          'field2': 'value2',
          'field3': 'value3'

        assert.same '(field1, field2, field3) VALUES ([value1], [value2], [value3])', @inst.buildStr()

        assert.ok formatValueSpy.calledThrice
        assert.ok formatValueSpy.calledWithExactly 'value1'
        assert.ok formatValueSpy.calledWithExactly 'value2'
        assert.ok formatValueSpy.calledWithExactly 'value3'




  'DistinctBlock':
    beforeEach: ->
      @cls = squel.cls.DistinctBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same false, @inst.useDistinct

    'distinct()':
      'sets the flat': ->
        @inst.distinct()

        assert.same true, @inst.useDistinct

        @inst.distinct()

        assert.same true, @inst.useDistinct

    'buildStr()':
      'output nothing if not set': ->
        @inst.useDistinct = false
        assert.same '', @inst.buildStr()

      'output DISTINCT if set': ->
        @inst.useDistinct = true
        assert.same 'DISTINCT', @inst.buildStr()




  'GroupByBlock':
    beforeEach: ->
      @cls = squel.cls.GroupByBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.groups

    'group()':
      'adds to list': ->
        @inst.group('field1')
        @inst.group('field2')

        assert.same ['field1', 'field2'], @inst.groups

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'

        @inst.group('field1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'

        assert.same ['_f'], @inst.groups


    'buildStr()':
      'output nothing if no fields set': ->
        @inst.groups = []
        assert.same '', @inst.buildStr()

      'output GROUP BY': ->
        @inst.group('field1')
        @inst.group('field2')

        assert.same 'GROUP BY field1, field2', @inst.buildStr()




  'OffsetBlock':
    beforeEach: ->
      @cls = squel.cls.OffsetBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same null, @inst.offsets

    'offset()':
      'set value': ->
        @inst.offset(1)

        assert.same 1, @inst.offsets

        @inst.offset(22)

        assert.same 22, @inst.offsets

      'sanitizes inputs': ->
        sanitizeSpy = test.mocker.stub @cls.prototype, '_sanitizeLimitOffset', -> return 234

        @inst.offset(23)

        assert.ok sanitizeSpy.calledWithExactly 23

        assert.same 234, @inst.offsets

    'buildStr()':
      'output nothing if not set': ->
        @inst.offsets = null
        assert.same '', @inst.buildStr()

      'output OFFSET': ->
        @inst.offset(12)

        assert.same 'OFFSET 12', @inst.buildStr()



  'WhereBlock':
    beforeEach: ->
      @cls = squel.cls.WhereBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.wheres

    'where()':
      'adds to list': ->
        @inst.where('a = 1')
        @inst.where('b = 2 OR c = 3')

        assert.same [
          'a = 1',
          'b = 2 OR c = 3'
        ], @inst.wheres

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

        @inst.where('a = 1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'a = 1'

        assert.same ['_c'], @inst.wheres


    'buildStr()':
      'output nothing if no conditions set': ->
        @inst.wheres = []
        assert.same '', @inst.buildStr()

      'output WHERE ': ->
        @inst.where('a = 1')
        @inst.where('b = 2 OR c = 3')

        assert.same 'WHERE (a = 1) AND (b = 2 OR c = 3)', @inst.buildStr()



  'OrderByBlock':
    beforeEach: ->
      @cls = squel.cls.OrderByBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.orders

    'order()':
      'adds to list': ->
        @inst.order('field1')
        @inst.order('field2', false)
        @inst.order('field3', true)

        expected = [
          {
            field: 'field1',
            dir: true
          },
          {
            field: 'field2',
            dir: false
          },
          {
            field: 'field3',
            dir: true
          }
        ]

        assert.same expected, @inst.orders

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'

        @inst.order('field1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1'

        assert.same [ { field: '_f', dir: true } ], @inst.orders


    'buildStr()':
      'output nothing if nothing set': ->
        @inst.orders = []
        assert.same '', @inst.buildStr()

      'output ORDER BY': ->
        @inst.order('field1')
        @inst.order('field2', false)
        @inst.order('field3', true)

        assert.same 'ORDER BY field1 ASC, field2 DESC, field3 ASC', @inst.buildStr()




  'LimitBlock':
    beforeEach: ->
      @cls = squel.cls.LimitBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same null, @inst.limits

    'limit()':
      'set value': ->
        @inst.limit(1)

        assert.same 1, @inst.limits

        @inst.limit(22)

        assert.same 22, @inst.limits

      'sanitizes inputs': ->
        sanitizeSpy = test.mocker.stub @cls.prototype, '_sanitizeLimitOffset', -> return 234

        @inst.limit(23)

        assert.ok sanitizeSpy.calledWithExactly 23

        assert.same 234, @inst.limits

    'buildStr()':
      'output nothing if not set': ->
        @inst.limits = null
        assert.same '', @inst.buildStr()

      'output nothing if set to 0': ->
        @inst.limit(0)
        assert.same '', @inst.buildStr()

      'output LIMIT': ->
        @inst.limit(12)

        assert.same 'LIMIT 12', @inst.buildStr()



  'JoinBlock':
    beforeEach: ->
      @cls = squel.cls.JoinBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field values': ->
      assert.same [], @inst.joins

    'join()':
      'adds to list': ->
        @inst.join('table1')
        @inst.join('table2', null, 'b = 1', 'LEFT')
        @inst.join('table3', 'alias3', 'c = 1', 'RIGHT')
        @inst.join('table4', 'alias4', 'd = 1', 'OUTER')

        expected = [
          {
            type: 'INNER',
            table: 'table1',
            alias: null,
            condition: null
          },
          {
            type: 'LEFT',
            table: 'table2',
            alias: null,
            condition: 'b = 1'
          },
          {
            type: 'RIGHT',
            table: 'table3',
            alias: 'alias3',
            condition: 'c = 1'
          },
          {
            type: 'OUTER',
            table: 'table4',
            alias: 'alias4',
            condition: 'd = 1'
          }
        ]

        assert.same expected, @inst.joins

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeAlias', -> return '_a'
        sanitizeConditionSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

        @inst.join('table1', 'alias1', 'a = 1')

        assert.ok sanitizeTableSpy.calledWithExactly 'table1'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias1'
        assert.ok sanitizeConditionSpy.calledWithExactly 'a = 1'

        expected = [
          {
          type: 'INNER',
          table: '_t',
          alias: '_a',
          condition: '_c'
          }
        ]

        assert.same expected, @inst.joins


    'left_join()':
      'calls join()': ->
        joinSpy = test.mocker.stub(@inst, 'join')

        @inst.left_join('t', 'a', 'c')

        assert.ok joinSpy.calledOnce
        assert.ok joinSpy.calledWithExactly('t', 'a', 'c', 'LEFT')


    'buildStr()':
      'output nothing if nothing set': ->
        @inst.joins = []
        assert.same '', @inst.buildStr()

      'output JOINs': ->
        @inst.join('table1')
        @inst.join('table2', null, 'b = 1', 'LEFT')
        @inst.join('table3', 'alias3', 'c = 1', 'RIGHT')

        assert.same 'INNER JOIN table1 LEFT JOIN table2 ON (b = 1) RIGHT JOIN table3 `alias3` ON (c = 1)', @inst.buildStr()



module?.exports[require('path').basename(__filename)] = test
