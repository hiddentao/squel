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
{testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['SELECT builder'] =
  beforeEach: ->
    @inst = squel.select()

  'instanceof JoinWhereOrderLimit': ->
    assert.instanceOf @inst, squel.JoinWhereOrderLimit

  'default field values': ->
    assert.same [], @inst.froms
    assert.same [], @inst.fields
    assert.same [], @inst.groups
    assert.same null, @inst.offsets
    assert.same false, @inst.useDistinct

  '>> distinct()': ->
    assert.same @inst.distinct(), @inst
    assert.ok @inst.useDistinct

  '>> from()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeTable')
      test.mocker.spy(@inst, '_sanitizeAlias')

    'args: ()': ->
      assert.throws (=> @inst.from()), 'table name must be a string'
      assert.ok @inst._sanitizeTable.calledWithExactly(undefined)

    'args: (table)':
      beforeEach: ->
        @ret = @inst.from('table')

      'update internal state': ->
        assert.same @ret, @inst
        assert.same @inst.froms, [
          {
          name: 'table'
          alias: null
          }
        ]

        assert.ok @inst._sanitizeTable.calledWithExactly('table')
        assert.ok @inst._sanitizeAlias.notCalled

      '>> args(table2)': ->
        assert.same @inst.from('table2'), @inst
        assert.same @inst.froms, [
          {
          name: 'table'
          alias: null
          }
          {
          name: 'table2'
          alias: null
          }
        ]

    'args: (table, alias)': ->
      @inst.from('table', 'alias')

      assert.same @inst.froms, [
        {
        name: 'table'
        alias: 'alias'
        }
      ]

      assert.ok @inst._sanitizeTable.calledWithExactly('table')
      assert.ok @inst._sanitizeAlias.calledWithExactly('alias')


  '>> field()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeField')
      test.mocker.spy(@inst, '_sanitizeAlias')

    'args: ()': ->
      assert.throws (=> @inst.field()), 'field name must be a string'
      assert.ok @inst._sanitizeField.calledWithExactly(undefined)

    'args: (field)':
      beforeEach: ->
        @ret = @inst.field('field')

      'update internal state': ->
        assert.same @ret, @inst
        assert.same @inst.fields, [
          {
            name: 'field'
            alias: null
          }
        ]

        assert.ok @inst._sanitizeField.calledWithExactly('field')
        assert.ok @inst._sanitizeAlias.notCalled

      '>> args(field2)': ->
        assert.same @inst.field('field2'), @inst
        assert.same @inst.fields, [
          {
            name: 'field'
            alias: null
          }
          {
            name: 'field2'
            alias: null
          }
        ]

    'args: (field, alias)': ->
      @inst.field('field', 'alias')

      assert.same @inst.fields, [
        {
        name: 'field'
        alias: 'alias'
        }
      ]

      assert.ok @inst._sanitizeField.calledWithExactly('field')
      assert.ok @inst._sanitizeAlias.calledWithExactly('alias')


  '>> group()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeField')

    'args: ()': ->
      assert.throws (=> @inst.group()), 'field name must be a string'
      assert.ok @inst._sanitizeField.calledWithExactly(undefined)

    'args: (field)':
      beforeEach: ->
        @ret = @inst.group('field')

      'update internal state': ->
        assert.same @ret, @inst
        assert.same @inst.groups, [ 'field' ]

        assert.ok @inst._sanitizeField.calledWithExactly('field')

      '>> args(field2)': ->
        assert.same @inst.group('field2'), @inst
        assert.same @inst.groups, [ 'field', 'field2' ]

        
  '>> offset()':
    beforeEach: ->
      test.mocker.spy(@inst, '_sanitizeLimitOffset')

    'args empty': ->
      assert.throws (=> @inst.offset()), 'limit/offset must be >=0'

      assert.ok @inst._sanitizeLimitOffset.calledWithExactly undefined
      assert.same null, @inst.offsets

    'args (0)':
      beforeEach: ->
        @ret = @inst.offset(0)

      'updates internal state': ->
        assert.same @ret, @inst

        assert.ok @inst._sanitizeLimitOffset.calledWithExactly 0
        assert.same 0, @inst.offsets

      '>> args (2)':
        beforeEach: ->
          @ret = @inst.offset(2)

        'updates internal state': ->
          assert.same @ret, @inst

          assert.ok @inst._sanitizeLimitOffset.calledWithExactly 2
          assert.same 2, @inst.offsets


  'build query':
    beforeEach: ->
      test.mocker.spy(@inst, '_joinString')
      test.mocker.spy(@inst, '_whereString')
      test.mocker.spy(@inst, '_orderString')
      test.mocker.spy(@inst, '_limitString')

    'need to call from() first': ->
      assert.throws (=> @inst.toString()), 'from() needs to be called'

    '>> from(table).from(table2, alias2':
      beforeEach: -> @inst.from('table').from('table2', 'alias2')
      toString: ->
        assert.same @inst.toString(), 'SELECT * FROM table, table2 `alias2`'
        assert.ok @inst._joinString.calledOnce
        assert.ok @inst._whereString.calledOnce
        assert.ok @inst._orderString.calledOnce
        assert.ok @inst._limitString.calledOnce

      '>> field(field1, fa1) >> field(field2)':
        beforeEach: -> @inst.field('field1', 'fa1').field('field2')
        toString: ->
          assert.same @inst.toString(), 'SELECT field1 AS "fa1", field2 FROM table, table2 `alias2`'

        '>> distinct()':
          beforeEach: -> @inst.distinct()
          toString: ->
            assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2`'

          '>> group(field) >> group(field2)':
            beforeEach: -> @inst.group('field').group('field2')
            toString: ->
              assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2'

            '>> where(a = 1)':
              beforeEach: -> @inst.where('a = 1')
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1) GROUP BY field, field2'

              '>> join(other_table)':
                beforeEach: -> @inst.join('other_table')
                toString: ->
                  assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2'

                '>> order(a, true)':
                  beforeEach: -> @inst.order('a', true)
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'

                  '>> limit(2)':
                    beforeEach: -> @inst.limit(2)
                    toString: ->
                      assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2'

                    '>> offset(3)':
                      beforeEach: -> @inst.offset(3)
                      toString: ->
                        assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC LIMIT 2 OFFSET 3'



module?.exports[require('path').basename(__filename)] = test
