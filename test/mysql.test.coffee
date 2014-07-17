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


squel = require "../squel"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['MySQL flavour'] =
  beforeEach: -> squel.useFlavour 'mysql'

  'INSERT builder':
    beforeEach: -> @inst = squel.insert()

    '>> into(table).set(field, 1).set(field1, 2, { duplicateKeyUpdate: 5 }).set(field2, 3, { duplicateKeyUpdate: "str" })':
      beforeEach: ->
        test.mocker.spy squel.cls.BaseBuilder.prototype, '_sanitizeValue'
        test.mocker.spy squel.cls.BaseBuilder.prototype, '_formatValue'
        @inst
          .into('table')
          .set('field', 1)
          .set('field1', 2, { duplicateKeyUpdate: 5 })
          .set('field2', 3, { duplicateKeyUpdate: 'str' })
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field, field1, field2) VALUES (1, 2, 3) ON DUPLICATE KEY UPDATE field1 = 5, field2 = \'str\''

        assert.ok @inst._sanitizeValue.calledWithExactly(5)
        assert.ok @inst._sanitizeValue.calledWithExactly('str')
        assert.ok @inst._formatValue.calledWithExactly(5)
        assert.ok @inst._formatValue.calledWithExactly('str')
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field, field1, field2) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE field1 = ?, field2 = ?'
          values: [1, 2, 3, 5, 'str']
        }


    '>> into(table).setFields({ field1: 1, field2: str })':
      beforeEach: ->
        @inst
          .into('table')
          .setFields({ field1: 1, field2: 'str' })
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field1, field2) VALUES (1, \'str\')'
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field1, field2) VALUES (?, ?)'
          values: [1, 'str']
        }


    '>> into(table).setFieldsRows([{ field1: 1, field2: str },{ field1: 2, field2: str2 } ])':
      beforeEach: ->
        @inst
          .into('table')
          .setFieldsRows([
            { field1: 1, field2: 'str' },
            { field1: 2, field2: 'str2' },
          ])
      toString: ->
        assert.same @inst.toString(), 'INSERT INTO table (field1, field2) VALUES (1, \'str\'), (2, \'str2\')'
      toParam: ->
        assert.same @inst.toParam(), {
          text: 'INSERT INTO table (field1, field2) VALUES (?, ?), (?, ?)'
          values: [1, 'str', 2, 'str2']
        }


module?.exports[require('path').basename(__filename)] = test
