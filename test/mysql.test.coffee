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
    squel = squel.useFlavour 'mysql'

  
  'TargetTableBlock':
    beforeEach: ->
      @cls = squel.cls.TargetTableBlock
      @inst = new @cls()

    'instanceof of FunctionBlock': ->
      assert.instanceOf @inst, squel.cls.FunctionBlock

    'target()': ->
      setSpy = test.mocker.stub @inst, 'function'
      sanitizeSpy = test.mocker.stub @cls.prototype, '_sanitizeTable', (v) -> return "[#{v}]"

      @inst.target('bla')

      assert.ok sanitizeSpy.calledWithExactly('bla')
      assert.ok setSpy.calledWithExactly('[bla]')


  'MysqlOnDuplicateKeyUpdateBlock':
    beforeEach: ->
      @cls = squel.cls.MysqlOnDuplicateKeyUpdateBlock
      @inst = new @cls()

    'instanceof of AbstractSetFieldBlock': ->
      assert.instanceOf @inst, squel.cls.AbstractSetFieldBlock

    'onDupUpdate()':
      'calls to _set()': ->
        spy = test.mocker.stub @inst, '_set'

        @inst.onDupUpdate 'f', 'v', dummy: true

        assert.ok spy.calledWithExactly('f', 'v', dummy: true)


    '_toParamString()':
      beforeEach: ->
        @inst.onDupUpdate('field1 = field1 + 1')
        @inst.onDupUpdate('field2', 'value2', {dummy: true})
        @inst.onDupUpdate('field3', 'value3')

      'non-parameterized': ->
        assert.same @inst._toParamString(), {
          text: 'ON DUPLICATE KEY UPDATE field1 = field1 + 1, field2 = \'value2\', field3 = \'value3\''
          values: []
        }
      'parameterized': ->
        assert.same @inst._toParamString(buildParameterized: true), {
          text: 'ON DUPLICATE KEY UPDATE field1 = field1 + 1, field2 = ?, field3 = ?'
          values: ['value2', 'value3']
        }


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

    '>> into(table).set(field, 1).set(field1, 2).onDupUpdate(field, 5).onDupUpdate(field1, "str")':
      beforeEach: ->
        @inst
          .into('table')
          .set('field', 1)
          .set('field1', 2)
          .onDupUpdate('field', 5)
          .onDupUpdate('field1', 'str')
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field, field1) VALUES (1, 2) ON DUPLICATE KEY UPDATE field = 5, field1 = \'str\''

      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field, field1) VALUES (?, ?) ON DUPLICATE KEY UPDATE field = ?, field1 = ?'
          values: [1, 2, 5, 'str']
        }

    '>> into(table).set(field2, 3).onDupUpdate(field2, "str", { dontQuote: true })':
      beforeEach: ->
        @inst
          .into('table')
          .set('field2', 3)
          .onDupUpdate('field2', 'str', { dontQuote: true })
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field2) VALUES (3) ON DUPLICATE KEY UPDATE field2 = str'
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field2) VALUES (?) ON DUPLICATE KEY UPDATE field2 = ?'
          values: [3, 'str']
        }


module?.exports[require('path').basename(__filename)] = test
