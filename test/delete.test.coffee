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


{test, assert, expect, should} = require './testbase'
squel = require "../src/squel"



test['DELETE builder'] =
  beforeEach: ->
    @inst = squel.delete()

  'instanceof JoinWhereOrderLimit': ->
    assert.instanceOf @inst, squel.JoinWhereOrderLimit

  'default field values': ->
    assert.same null, @inst.table

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
        assert.same @inst.table, {
          name: 'table'
          alias: undefined
        }

        assert.ok @inst._sanitizeTable.calledWithExactly('table')
        assert.ok @inst._sanitizeAlias.notCalled

      '>> args(table2)': ->
        assert.same @inst.from('table2'), @inst
        assert.same @inst.table, {
          name: 'table2'
          alias: undefined
        }

        assert.ok @inst._sanitizeTable.calledWithExactly('table2')

    'args: (table, alias)': ->
      @inst.from('table', 'alias')

      assert.same @inst.table, {
        name: 'table'
        alias: 'alias'
      }

      assert.ok @inst._sanitizeTable.calledWithExactly('table')
      assert.ok @inst._sanitizeAlias.calledWithExactly('alias')



  'build query':
    beforeEach: ->
      test.mocker.spy(@inst, '_joinString')
      test.mocker.spy(@inst, '_whereString')
      test.mocker.spy(@inst, '_orderString')
      test.mocker.spy(@inst, '_limitString')

    'need to call from() first': ->
      assert.throws (=> @inst.toString()), 'from() needs to be called'

    '>> from(table)':
      beforeEach: -> @inst.from('table')
      toString: ->
        assert.same @inst.toString(), 'DELETE FROM table'
        assert.ok @inst._joinString.calledOnce
        assert.ok @inst._whereString.calledOnce
        assert.ok @inst._orderString.calledOnce
        assert.ok @inst._limitString.calledOnce

      '>> table(table2, t2)':
        beforeEach: -> @inst.from('table2', 't2')
        toString: ->
          assert.same @inst.toString(), 'DELETE FROM table2 `t2`'

        '>> where(a = 1)':
          beforeEach: -> @inst.where('a = 1')
          toString: ->
            assert.same @inst.toString(), 'DELETE FROM table2 `t2` WHERE (a = 1)'

          '>> join(other_table)':
            beforeEach: -> @inst.join('other_table', 'o', 'o.id = t2.id')
            toString: ->
              assert.same @inst.toString(), 'DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1)'

            '>> order(a, true)':
              beforeEach: -> @inst.order('a', true)
              toString: ->
                assert.same @inst.toString(), 'DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1) ORDER BY a ASC'

              '>> limit(2)':
                beforeEach: -> @inst.limit(2)
                toString: ->
                  assert.same @inst.toString(), 'DELETE FROM table2 `t2` INNER JOIN other_table `o` ON (o.id = t2.id) WHERE (a = 1) ORDER BY a ASC LIMIT 2'



module?.exports[require('path').basename(__filename)] = test
