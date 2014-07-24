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


  'AbstractTableBlock':
    beforeEach: ->
      @cls = squel.cls.AbstractTableBlock
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
          alias: '`alias2`'
          },
          {
          table: 'table3',
          alias: null
          }
        ]

        assert.same expectedFroms, @inst.tables

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeTableAlias', -> return '_a'

        @inst._table('table', 'alias')

        assert.ok sanitizeTableSpy.calledWith 'table'
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias'

        assert.same [ { table: '_t', alias: '_a' }], @inst.tables


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

        assert.same expected, @inst.tables


      'if not allowing nested queries': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        innerTable = squel.select()

        @inst.options.allowNested = false
        @inst._table(innerTable)
        assert.ok sanitizeTableSpy.calledWithExactly innerTable, false

      'if allowing nested queries': ->
        sanitizeTableSpy = test.mocker.spy @cls.prototype, '_sanitizeTable'

        innerTable1 = squel.select()
        innerTable2 = squel.select()

        @inst.options.allowNested = true
        @inst._table(innerTable1)
        @inst._table(innerTable2, 'Inner2')

        assert.ok sanitizeTableSpy.calledWithExactly innerTable1, true
        assert.ok sanitizeTableSpy.calledWithExactly innerTable2, true

        expected = [
          {
          alias: null
          table: innerTable1
          }
          {
          alias: '`Inner2`'
          table: innerTable2
          }
        ]

        assert.same expected, @inst.tables

    'buildStr()':
      'requires at least one table to have been provided': ->
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: _table() needs to be called', err.toString()

      'returns formatted query phrase': ->
        @inst._table('table1')
        @inst._table('table2', 'alias2')
        @inst._table('table3')

        assert.same 'table1, table2 `alias2`, table3', @inst.buildStr()

      'handles nested query': ->
        innerTable1 = squel.select().from('inner1')
        innerTable2 = squel.select().from('inner2')

        @inst.options.allowNested = true
        @inst._table(innerTable1)
        @inst._table(innerTable2, 'inner2')

        assert.same '(SELECT * FROM inner1), (SELECT * FROM inner2) `inner2`', @inst.buildStr()




  'FromTableBlock':
    beforeEach: ->
      @cls = squel.cls.FromTableBlock
      @inst = new @cls()

    'instanceof of AbstractTableBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractTableBlock

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.AbstractTableBlock.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'from()':
      'calls base class handler': ->
        baseMethodSpy = test.mocker.stub squel.cls.AbstractTableBlock.prototype, '_table'

        @inst.from('table1')
        @inst.from('table2', 'alias2')

        assert.same 2, baseMethodSpy.callCount
        assert.ok baseMethodSpy.calledWithExactly('table1', null)
        assert.ok baseMethodSpy.calledWithExactly('table2', 'alias2')

    'buildStr()':
      'requires at least one table to have been provided': ->
        try
          @inst.buildStr()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: from() needs to be called', err.toString()

      'calls base class handler': ->
        baseMethodSpy = test.mocker.stub squel.cls.AbstractTableBlock.prototype, 'buildStr', -> 'blah'

        @inst.from('table')

        assert.same 'FROM blah', @inst.buildStr()



  'UpdateTableBlock':
    beforeEach: ->
      @cls = squel.cls.UpdateTableBlock
      @inst = new @cls()

    'instanceof of AbstractTableBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractTableBlock

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.AbstractTableBlock.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

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

        assert.ok sanitizeTableSpy.calledWithExactly 'table', false

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
      assert.same [], @inst._fields

    'fields()':
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
            alias: null
          },
          {
            name: 'field2',
            alias: '"alias2"'
          },
          {
            name: 'field3',
            alias: null
          }
        ]

        assert.ok fieldSpy.calledThrice
        assert.ok fieldSpy.calledWithExactly('field1', null, dummy: true)
        assert.ok fieldSpy.calledWithExactly('field2', 'alias2', dummy: true)
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
          alias: null
          },
          {
          name: 'field2',
          alias: '"alias2"'
          },
          {
          name: 'field3',
          alias: null
          }
        ]

        assert.same expected, @inst._fields

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeFieldAlias', -> return '_a'

        @inst.field('field1', 'alias1', { dummy: true})

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1', { dummy: true }
        assert.ok sanitizeAliasSpy.calledWithExactly 'alias1'

        assert.same [ { name: '_f', alias: '_a' } ], @inst._fields

    'buildStr()':
      'returns all fields when none provided': ->
        @inst._fields = []
        assert.same '*', @inst.buildStr()

      'returns formatted query phrase': ->
        @inst.field('field1')
        @inst.field('field2', 'alias2')
        @inst.field('field3')

        assert.same 'field1, field2 AS "alias2", field3', @inst.buildStr()



  'AbstractSetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.AbstractSetFieldBlock
      @inst = new @cls()

    'instanceof of Block': ->
      assert.instanceOf @inst, squel.cls.Block

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.Block.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial fields': ->
      assert.same [], @inst.fields

    'initial field options': ->
      assert.same [], @inst.fieldOptions

    'initial values': ->
      assert.same [], @inst.values

    '_set()':
      'saves inputs': ->
        @inst._set('field1', 'value1', dummy: 1)
        @inst._set('field2', 'value2', dummy: 2)
        @inst._set('field3', 'value3', dummy: 3)
        @inst._set('field4')

        expectedFields = [ 'field1', 'field2', 'field3', 'field4' ]
        expectedValues = [ [ 'value1', 'value2', 'value3', undefined ] ]
        expectedFieldOptions = [ [ {dummy: 1}, {dummy: 2}, {dummy: 3}, {} ] ]

        assert.same expectedFields, @inst.fields
        assert.same expectedValues, @inst.values
        assert.same expectedFieldOptions, @inst.fieldOptions

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> return '_v'

        @inst._set('field1', 'value1', dummy: true)

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1', dummy: true
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'

        assert.same [ '_f' ], @inst.fields
        assert.same [ [ '_v' ] ], @inst.values


    '_setFields()':
      'saves inputs': ->
        @inst._setFields
          'field1': 'value1'
          'field2': 'value2'
          'field3': 'value3'

        expectedFields = [ 'field1', 'field2', 'field3' ]
        expectedValues = [ [ 'value1', 'value2', 'value3'] ]
        expectedFieldOptions = [ [ {}, {}, {} ] ]

        assert.same expectedFields, @inst.fields
        assert.same expectedValues, @inst.values
        assert.same expectedFieldOptions, @inst.fieldOptions

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeField', -> return '_f'
        sanitizeValueSpy = test.mocker.stub @cls.prototype, '_sanitizeValue', -> return '_v'

        @inst._setFields({'field1': 'value1'}, {dummy: true})

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1', dummy: true
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'

        assert.same [ '_f' ], @inst.fields
        assert.same [ [ '_v' ] ], @inst.values

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

        assert.same expectedFields, @inst.fields
        assert.same expectedValues, @inst.values
        assert.same expectedFieldOptions, @inst.fieldOptions

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

        assert.ok sanitizeFieldSpy.calledWithExactly 'field1', { dummy: true }
        assert.ok sanitizeValueSpy.calledWithExactly 'value1'
        assert.ok sanitizeValueSpy.calledWithExactly 'value21'

        assert.same [ '_f' ], @inst.fields
        assert.same [ [ '_v' ], [ '_v' ] ], @inst.values
    
    'buildStr()': ->
      assert.throws ( => @inst.buildStr()), 'Not yet implemented'

    'buildParam()': ->
      assert.throws ( => @inst.buildParam()), 'Not yet implemented'




  'SetFieldBlock':
    beforeEach: ->
      @cls = squel.cls.SetFieldBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.AbstractSetFieldBlock.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'initial field options': ->
      assert.same [], @inst.fieldOptions

    'initial fields': ->
      assert.same [], @inst.fields

    'initial values': ->
      assert.same [], @inst.values

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

        @inst.fields = [ 'field1', 'field2', 'field3' ]
        @inst.values = [ [ 'value1', 'value2', 'value3' ] ]
        @inst.fieldOptions = [ [ {dummy: true}, {dummy: false}, {} ] ]

        assert.same 'SET field1 = [value1], field2 = [value2], field3 = [value3]', @inst.buildStr()

        assert.ok formatValueSpy.calledThrice
        assert.ok formatValueSpy.calledWithExactly 'value1', { dummy: true }
        assert.ok formatValueSpy.calledWithExactly 'value2', { dummy: false }
        assert.ok formatValueSpy.calledWithExactly 'value3', {}

    'buildParam()':
      'needs at least one field to have been provided': ->
        @inst.fields = []
        try
          @inst.buildParam()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: set() needs to be called', err.toString()

      'calls formatValueAsParam() for each field value': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValueAsParam', (v) -> return "[#{v}]"

        @inst.fields = [ 'field1', 'field2', 'field3' ]
        @inst.values = [ [ 'value1', 'value2', 'value3' ] ]

        assert.same { text: 'SET field1 = ?, field2 = ?, field3 = ?', values: ['[value1]', '[value2]', '[value3]'] }, @inst.buildParam()

        assert.ok formatValueSpy.calledThrice
        assert.ok formatValueSpy.calledWithExactly 'value1'
        assert.ok formatValueSpy.calledWithExactly 'value2'
        assert.ok formatValueSpy.calledWithExactly 'value3'

      'Fix for hiddentao/squel#63': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValueAsParam', (v) -> v

        @inst.fields = [ 'age = age + 1', 'field2', 'field3' ]
        @inst.values = [ [ undefined, 'value2', 'value3' ] ]

        assert.same { text: 'SET age = age + 1, field2 = ?, field3 = ?', values: ['value2', 'value3'] }, @inst.buildParam()




  'InsertFieldValueBlock':
    beforeEach: ->
      @cls = squel.cls.InsertFieldValueBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.AbstractSetFieldBlock.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

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

        @inst.fields = [ 'field1', 'field2', 'field3' ]
        @inst.values = [ [ 'value1', 'value2', 'value3' ], [ 'value21', 'value22', 'value23' ] ]
        @inst.fieldOptions = [ [ {}, {}, {} ], [ {}, {}, { dummy: 23 } ] ]

        assert.same '(field1, field2, field3) VALUES ([value1], [value2], [value3]), ([value21], [value22], [value23])', @inst.buildStr()

        assert.same formatValueSpy.callCount, 6
        assert.ok formatValueSpy.calledWithExactly 'value1', {}
        assert.ok formatValueSpy.calledWithExactly 'value2', {}
        assert.ok formatValueSpy.calledWithExactly 'value3', {}
        assert.ok formatValueSpy.calledWithExactly 'value21', {}
        assert.ok formatValueSpy.calledWithExactly 'value22', {}
        assert.ok formatValueSpy.calledWithExactly 'value23', { dummy: 23 }

    'buildParam()':
      'needs at least one field to have been provided': ->
        @inst.fields = []
        try
          @inst.buildParam()
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: set() needs to be called', err.toString()

      'calls formatValueAsParam() for each field value': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValueAsParam', (v) -> return "[#{v}]"

        @inst.fields = [ 'field1', 'field2', 'field3' ]
        @inst.values = [ [ 'value1', 'value2', 'value3' ], [ 'value21', 'value22', 'value23' ] ]

        assert.same { 
          text: '(field1, field2, field3) VALUES (?, ?, ?), (?, ?, ?)', 
          values: [ '[value1]', '[value2]', '[value3]', '[value21]', '[value22]', '[value23]' ] 
        }, @inst.buildParam()

        assert.same formatValueSpy.callCount, 6
        assert.ok formatValueSpy.calledWithExactly 'value1'
        assert.ok formatValueSpy.calledWithExactly 'value2'
        assert.ok formatValueSpy.calledWithExactly 'value3'
        assert.ok formatValueSpy.calledWithExactly 'value21'
        assert.ok formatValueSpy.calledWithExactly 'value22'
        assert.ok formatValueSpy.calledWithExactly 'value23'



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
        dummy: true

    'initial field values': ->
      assert.same [], @inst.wheres

    'where()':
      'adds to list': ->
        @inst.where('a = 1')
        @inst.where('b = 2 OR c = 3')

        assert.same [
          {
            text: 'a = 1'
            values: []
          }
          {
            text: 'b = 2 OR c = 3'
            values: []            
          }
        ], @inst.wheres

      'sanitizes inputs': ->
        sanitizeFieldSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

        @inst.where('a = 1')

        assert.ok sanitizeFieldSpy.calledWithExactly 'a = 1'

        assert.same [{
          text: '_c'
          values: []
        }], @inst.wheres

      'handles variadic arguments': ->
        sanitizeStub = test.mocker.stub @cls.prototype, '_sanitizeValue', _.identity

        substitutes = ['hello', [1, 2, 3]]
        @inst.where.apply @inst, ['a = ? and b in ?'].concat(substitutes)

        expectedValues = _.flatten substitutes
        for expectedValue, index in expectedValues
          assert.ok sanitizeStub.getCall(index).calledWithExactly expectedValue

        assert.same [
          {
            text: 'a = ? and b in (?, ?, ?)'
            values: ['hello', 1, 2, 3]
          }
        ], @inst.wheres

    'buildStr()':
      'output nothing if no conditions set': ->
        @inst.wheres = []
        assert.same '', @inst.buildStr()

      'output WHERE ': ->
        @inst.where('a = ?', 1)
        @inst.where('b = ? OR c = ?', 2, 3)
        @inst.where('d in ?', [4, 5, 6])

        assert.same 'WHERE (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.buildStr()

      'Fix for hiddentao/squel#64': ->
        @inst.where('a = ?', 1)
        @inst.where('b = ? OR c = ?', 2, 3)
        @inst.where('d in ?', [4, 5, 6])
        
        # second time it should still work
        @inst.buildStr()
        @inst.buildStr()
        assert.same 'WHERE (a = 1) AND (b = 2 OR c = 3) AND (d in (4, 5, 6))', @inst.buildStr()

      'formats values ': ->
        formatValueStub = test.mocker.stub @cls.prototype, '_formatValue', (a) -> '[' + a + ']'

        @inst.where('a = ?', 1)
        @inst.where('b = ? OR c = ?', 2, 3)
        @inst.where('d in ?', [4, 5, 6])

        assert.same 'WHERE (a = [1]) AND (b = [2] OR c = [3]) AND (d in ([4], [5], [6]))', @inst.buildStr()

    'buildParam()':
      'output nothing if no conditions set': ->
        @inst.wheres = []
        assert.same { text: '', values: [] }, @inst.buildParam()

      'output WHERE ': ->
        @inst.where('a = ?', 1)
        @inst.where('b = ? OR c = ?', 2, 3)
        @inst.where('d in ?', [4, 5, 6])

        assert.same { text: 'WHERE (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))', values: [1, 2, 3, 4, 5, 6] }, @inst.buildParam()

      'formats value types as params': ->
        formatValueSpy = test.mocker.spy @cls.prototype, '_formatValue'
        test.mocker.stub @cls.prototype, '_formatValueAsParam', (a) -> '[' + a + ']'

        @inst.where('a = ?', 1)
        @inst.where('b = ? OR c = ?', 2, 3)
        @inst.where('d in ?', [4, 5, 6])

        assert.same { 
          text: 'WHERE (a = ?) AND (b = ? OR c = ?) AND (d in (?, ?, ?))', 
          values: ['[1]', '[2]', '[3]', '[4]', '[5]', '[6]'] 
        }, @inst.buildParam()

        assert.ok formatValueSpy.notCalled


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
            alias: '`alias3`',
            condition: 'c = 1'
          },
          {
            type: 'OUTER',
            table: 'table4',
            alias: '`alias4`',
            condition: 'd = 1'
          }
        ]

        assert.same expected, @inst.joins

      'sanitizes inputs': ->
        sanitizeTableSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', -> return '_t'
        sanitizeAliasSpy = test.mocker.stub @cls.prototype, '_sanitizeTableAlias', -> return '_a'
        sanitizeConditionSpy = test.mocker.stub @cls.prototype, '_sanitizeCondition', -> return '_c'

        @inst.join('table1', 'alias1', 'a = 1')

        assert.ok sanitizeTableSpy.calledWithExactly 'table1', true
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

      'nested queries': ->
        inner1 = squel.select()
        inner2 = squel.select()
        inner3 = squel.select()
        inner4 = squel.select()
        @inst.join(inner1)
        @inst.join(inner2, null, 'b = 1', 'LEFT')
        @inst.join(inner3, 'alias3', 'c = 1', 'RIGHT')
        @inst.join(inner4, 'alias4', 'd = 1', 'OUTER')

        expected = [
          {
          type: 'INNER',
          table: inner1,
          alias: null,
          condition: null
          },
          {
          type: 'LEFT',
          table: inner2,
          alias: null,
          condition: 'b = 1'
          },
          {
          type: 'RIGHT',
          table: inner3,
          alias: '`alias3`',
          condition: 'c = 1'
          },
          {
          type: 'OUTER',
          table: inner4,
          alias: '`alias4`',
          condition: 'd = 1'
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

      'output JOINs with nested query': ->
        inner1 = squel.select().from('1')
        inner2 = squel.select().from('2')
        inner3 = squel.select().from('3')

        @inst.join(inner1)
        @inst.join(inner2, null, 'b = 1', 'LEFT')
        @inst.join(inner3, 'alias3', 'c = 1', 'RIGHT')

        assert.same 'INNER JOIN (SELECT * FROM 1) LEFT JOIN (SELECT * FROM 2) ON (b = 1) RIGHT JOIN (SELECT * FROM 3) `alias3` ON (c = 1)', @inst.buildStr()



module?.exports[require('path').basename(__filename)] = test
