###
Copyright (c) Ramesh Nair (hiddentao.com)

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


squel = undefined
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()


test['MySQL flavour'] =
  beforeEach: ->
    delete require.cache[require.resolve('../squel')]
    squel = require "../squel"
    squel.useFlavour 'mysql'

  
  'TargetTableBlock':
    beforeEach: ->
      @cls = squel.cls.TargetTableBlock
      @inst = new @cls()

    'instanceof of AbstractValueBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractValueBlock

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.AbstractValueBlock.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true    

    'target()': ->
      setSpy = test.mocker.stub @inst, '_setValue'
      sanitizeSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', (v) -> return "[#{v}]"

      console.log @inst.target('bla')

      assert.ok sanitizeSpy.calledWithExactly('bla')
      assert.ok setSpy.calledWithExactly('[bla]')


  'MysqlOnDuplicateKeyUpdateBlock':
    beforeEach: ->
      @cls = squel.cls.MysqlOnDuplicateKeyUpdateBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'calls base constructor': ->
      spy = test.mocker.spy(squel.cls.AbstractSetFieldBlock.prototype, 'constructor')

      @inst = new @cls
        dummy: true

      assert.ok spy.calledWithExactly
        dummy:true

    'onDupUpdate()':
      'calls to _set()': ->
        spy = test.mocker.stub @inst, '_set'

        @inst.onDupUpdate 'f', 'v', dummy: true

        assert.ok spy.calledWithExactly('f', 'v', dummy: true)


    'buildStr()':
      'calls formatValue() for each field value': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValue', (v) -> return "[#{v}]"

        @inst.fields = [ 'field1', 'field2', 'field3' ]
        @inst.values = [ [ 'value1', 'value2', 'value3' ] ]
        @inst.fieldOptions = [ [ {dummy: true}, {dummy: false}, {} ] ]

        assert.same 'ON DUPLICATE KEY UPDATE field1 = [value1], field2 = [value2], field3 = [value3]', @inst.buildStr()

        assert.ok formatValueSpy.calledThrice
        assert.ok formatValueSpy.calledWithExactly 'value1', { dummy: true }
        assert.ok formatValueSpy.calledWithExactly 'value2', { dummy: false }
        assert.ok formatValueSpy.calledWithExactly 'value3', {}

    'buildParam()':
      'calls formatValueAsParam() for each field value': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValueAsParam', (v) -> return "[#{v}]"

        @inst.fields = [ 'field1', 'field2', 'field3' ]
        @inst.values = [ [ 'value1', 'value2', 'value3' ] ]

        assert.same { text: 'ON DUPLICATE KEY UPDATE field1 = ?, field2 = ?, field3 = ?', values: ['[value1]', '[value2]', '[value3]'] }, @inst.buildParam()

        assert.ok formatValueSpy.calledThrice
        assert.ok formatValueSpy.calledWithExactly 'value1'
        assert.ok formatValueSpy.calledWithExactly 'value2'
        assert.ok formatValueSpy.calledWithExactly 'value3'

      'Fix for hiddentao/squel#63': ->
        formatValueSpy = test.mocker.stub @cls.prototype, '_formatValueAsParam', (v) -> v

        @inst.fields = [ 'age = age + 1', 'field2', 'field3' ]
        @inst.values = [ [ undefined, 'value2', 'value3' ] ]

        assert.same { text: 'ON DUPLICATE KEY UPDATE age = age + 1, field2 = ?, field3 = ?', values: ['value2', 'value3'] }, @inst.buildParam()


  'DELETE build':
    beforeEach: -> @inst = squel.delete()

    'has same blocks as default': ->
      assert.ok @inst.blocks[0] instanceof squel.cls.StringBlock
      assert.ok @inst.blocks[1] instanceof squel.cls.TargetTableBlock
      assert.ok @inst.blocks[2] instanceof squel.cls.FromTableBlock
      assert.ok @inst.blocks[3] instanceof squel.cls.JoinBlock    
      assert.ok @inst.blocks[4] instanceof squel.cls.WhereBlock    
      assert.ok @inst.blocks[5] instanceof squel.cls.OrderByBlock   
      assert.ok @inst.blocks[6] instanceof squel.cls.LimitBlock 

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

  'INSERT builder':
    beforeEach: -> @inst = squel.insert()

    'has same blocks as default': ->
      assert.ok @inst.blocks[0] instanceof squel.cls.StringBlock
      assert.ok @inst.blocks[1] instanceof squel.cls.IntoTableBlock
      assert.ok @inst.blocks[2] instanceof squel.cls.InsertFieldValueBlock
      assert.ok @inst.blocks[3] instanceof squel.cls.MysqlOnDuplicateKeyUpdateBlock

    '>> into(table).set(field, 1).set(field1, 2).onDupUpdate(field, 5).onDupUpdate(field1, "str")':
      beforeEach: ->
        test.mocker.spy squel.cls.BaseBuilder.prototype, '_sanitizeValue'
        test.mocker.spy squel.cls.BaseBuilder.prototype, '_formatValue'
        @inst
          .into('table')
          .set('field', 1)
          .set('field1', 2)
          .onDupUpdate('field', 5)
          .onDupUpdate('field1', 'str')
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field, field1) VALUES (1, 2) ON DUPLICATE KEY UPDATE field = 5, field1 = \'str\''

        assert.ok @inst._sanitizeValue.calledWithExactly(5)
        assert.ok @inst._sanitizeValue.calledWithExactly('str')
        assert.ok @inst._formatValue.calledWithExactly(5, {})
        assert.ok @inst._formatValue.calledWithExactly('str', {})

      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field, field1) VALUES (?, ?) ON DUPLICATE KEY UPDATE field = ?, field1 = ?'
          values: [1, 2, 5, 'str']
        }

    '>> into(table).set(field2, 3).onDupUpdate(field2, "str", { dontQuote: true })':
      beforeEach: ->
        test.mocker.spy squel.cls.BaseBuilder.prototype, '_sanitizeValue'
        test.mocker.spy squel.cls.BaseBuilder.prototype, '_formatValue'
        @inst
          .into('table')
          .set('field2', 3)
          .onDupUpdate('field2', 'str', { dontQuote: true })
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field2) VALUES (3) ON DUPLICATE KEY UPDATE field2 = str'

        assert.ok @inst._sanitizeValue.calledWithExactly('str')
        assert.ok @inst._formatValue.calledWithExactly('str', { dontQuote: true })
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field2) VALUES (?) ON DUPLICATE KEY UPDATE field2 = ?'
          values: [3, 'str']
        }


module?.exports[require('path').basename(__filename)] = test
