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



test['INSERT builder'] =
  beforeEach: ->
    @inst = squel.insert()

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
        assert.same expectedOptions, block.options


  'build query':
    'need to call into() first': ->
      assert.throws (=> @inst.toString()), 'into() needs to be called'

    'need to call set() first': ->
      @inst.into('table')
      assert.throws (=> @inst.toString()), 'set() needs to be called'

    '>> into(table).set(field, 1)':
      beforeEach: -> @inst.into('table').set('field', 1)
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

        'and when using value placeholders': ->
          @inst.updateOptions
            usingValuePlaceholders: true
          @inst.set('field2', 'str')
          assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, str)'

      '>> set(field2, true)':
        beforeEach: -> @inst.set('field2', true)
        toString: ->
          assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, TRUE)'

      '>> set(field2, null)':
        beforeEach: -> @inst.set('field2', null)
        toString: ->
          assert.same @inst.toString(), 'INSERT INTO table (field, field2) VALUES (1, NULL)'



module?.exports[require('path').basename(__filename)] = test
