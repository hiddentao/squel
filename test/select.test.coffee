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



test['SELECT builder'] =
  beforeEach: ->
    @func = squel.select
    @inst = @func()

  'instanceof QueryBuilder': ->
    assert.instanceOf @inst, squel.cls.QueryBuilder

  'constructor':
    'override options': ->
      @inst = squel.select
        usingValuePlaceholders: true
        dummy: true

      expectedOptions = _.extend {}, squel.cls.DefaultQueryBuilderOptions,
        usingValuePlaceholders: true
        dummy: true

      for block in @inst.blocks
        if (block instanceof squel.cls.FromTableBlock) or (block instanceof squel.cls.JoinBlock) or (block instanceof squel.cls.UnionBlock)
          assert.same _.extend({}, expectedOptions, { allowNested: true }), block.options
        else
          assert.same expectedOptions, block.options

    'override blocks': ->
      block = new squel.cls.StringBlock('SELECT')
      @inst = @func {}, [block]
      assert.same [block], @inst.blocks

  'build query':
    'no need to call from() first': ->
      @inst.toString()

    '>> function(1)':
      beforeEach: -> @inst.function('1')
      toString: ->
        assert.same @inst.toString(), 'SELECT 1'
      toParam: ->
        assert.same @inst.toParam(), { text: 'SELECT 1', values: [] }

    '>> function(MAX(?,?), 3, 5)':
      beforeEach: -> @inst.function('MAX(?, ?)', 3, 5)
      toString: ->
        assert.same @inst.toString(), 'SELECT MAX(3, 5)'
      toParam: ->
        assert.same @inst.toParam(), { text: 'SELECT MAX(?, ?)', values: [3, 5] }

    '>> from(table).from(table2, alias2)':
      beforeEach: -> @inst.from('table').from('table2', 'alias2')
      toString: ->
        assert.same @inst.toString(), 'SELECT * FROM table, table2 `alias2`'

      '>> field(squel.select().field("MAX(score)").FROM("scores"), fa1)':
        beforeEach: -> @inst.field(squel.select().field("MAX(score)").from("scores"), 'fa1')
        toString: ->
          assert.same @inst.toString(), 'SELECT (SELECT MAX(score) FROM scores) AS "fa1" FROM table, table2 `alias2`'

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

            '>> where(a = ?, squel.select().field("MAX(score)").from("scores"))':
              beforeEach: ->
                @subQuery = squel.select().field("MAX(score)").from("scores")
                @inst.where('a = ?', @subQuery)
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT MAX(score) FROM scores)) GROUP BY field, field2'
              toParam: ->
                assert.same @inst.toParam(), {
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT MAX(score) FROM scores)) GROUP BY field, field2'
                  values: []
                }

            '>> where(squel.expr().and(a = ?, 1).and_begin().or(b = ?, 2).or(c = ?, 3).end())':
              beforeEach: -> @inst.where(squel.expr().and("a = ?", 1).and_begin().or("b = ?", 2).or("c = ?", 3).end())
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1 AND (b = 2 OR c = 3)) GROUP BY field, field2'
              toParam: ->
                assert.same @inst.toParam(), {
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ? AND (b = ? OR c = ?)) GROUP BY field, field2'
                  values: [1, 2, 3]
                }

            '>> where(squel.expr().and(a = ?, QueryBuilder).and_begin().or(b = ?, 2).or(c = ?, 3).end())':
              beforeEach: ->
                subQuery = squel.select().field('field1').from('table1').where('field2 = ?', 10)
                @inst.where(squel.expr().and("a = ?", subQuery).and_begin().or("b = ?", 2).or("c = ?", 3).end())
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT field1 FROM table1 WHERE (field2 = 10)) AND (b = 2 OR c = 3)) GROUP BY field, field2'
              toParam: ->
                assert.same @inst.toParam(), {
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = (SELECT field1 FROM table1 WHERE (field2 = ?)) AND (b = ? OR c = ?)) GROUP BY field, field2'
                  values: [10, 2, 3]
                }

            '>> having(squel.expr().and(a = ?, QueryBuilder).and_begin().or(b = ?, 2).or(c = ?, 3).end())':
              beforeEach: ->
                subQuery = squel.select().field('field1').from('table1').having('field2 = ?', 10)
                @inst.having(squel.expr().and("a = ?", subQuery).and_begin().or("b = ?", 2).or("c = ?", 3).end())
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2 HAVING (a = (SELECT field1 FROM table1 HAVING (field2 = 10)) AND (b = 2 OR c = 3))'
              toParam: ->
                assert.same @inst.toParam(), {
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` GROUP BY field, field2 HAVING (a = (SELECT field1 FROM table1 HAVING (field2 = ?)) AND (b = ? OR c = ?))'
                  values: [10, 2, 3]
                }

            '>> where(a = ?, null)':
              beforeEach: -> @inst.where('a = ?', null)
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = NULL) GROUP BY field, field2'
              toParam: ->
                assert.same @inst.toParam(), {
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ?) GROUP BY field, field2'
                  values: [null]
                }
                
            '>> where(a = ?, 1)':
              beforeEach: -> @inst.where('a = ?', 1)
              toString: ->
                assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = 1) GROUP BY field, field2'
              toParam: ->
                assert.same @inst.toParam(), {
                  text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` WHERE (a = ?) GROUP BY field, field2'
                  values: [1]
                }

              '>> join(other_table)':
                beforeEach: -> @inst.join('other_table')
                toString: ->
                  assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2'

                '>> order(a)':
                  beforeEach: -> @inst.order('a')
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'

                '>> order(a, null)':
                  beforeEach: -> @inst.order('a', null)
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a'

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

                '>> order(DIST(?,?), true, 2, 3)':
                  beforeEach: -> @inst.order('DIST(?, ?)', true, 2, false)
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY DIST(2, FALSE) ASC'
                  toParam: ->
                    assert.same @inst.toParam(), {
                      text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = ?) GROUP BY field, field2 ORDER BY DIST(?, ?) ASC'
                      values: [1, 2, false]
                    }

                '>> order(a)':
                  beforeEach: -> @inst.order('a')
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY a ASC'

                '>> order(b, null)':
                  beforeEach: -> @inst.order('b', null)
                  toString: ->
                    assert.same @inst.toString(), 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table WHERE (a = 1) GROUP BY field, field2 ORDER BY b'

              '>> join(other_table, condition = expr())':
                beforeEach: ->
                  subQuery = squel.select().field('abc').from('table1').where('adf = ?', 'today1')
                  subQuery2 = squel.select().field('xyz').from('table2').where('adf = ?', 'today2')
                  expr = squel.expr().and('field1 = ?', subQuery)
                  @inst.join('other_table', null, expr)
                  @inst.where('def IN ?', subQuery2)
                toString: ->
                  assert.same @inst.toString(), "SELECT DISTINCT field1 AS \"fa1\", field2 FROM table, table2 `alias2` INNER JOIN other_table ON (field1 = (SELECT abc FROM table1 WHERE (adf = 'today1'))) WHERE (a = 1) AND (def IN (SELECT xyz FROM table2 WHERE (adf = 'today2'))) GROUP BY field, field2"
                toParam: ->
                  assert.same @inst.toParam(), { text: 'SELECT DISTINCT field1 AS "fa1", field2 FROM table, table2 `alias2` INNER JOIN other_table ON (field1 = (SELECT abc FROM table1 WHERE (adf = ?))) WHERE (a = ?) AND (def IN (SELECT xyz FROM table2 WHERE (adf = ?))) GROUP BY field, field2', values: ["today1",1,"today2"] }


    'nested queries':
      'basic': ->
        inner1 = squel.select().from('students')
        inner2 = squel.select().from('scores')

        @inst.from(inner1).from(inner2, 'scores')

        assert.same @inst.toString(), "SELECT * FROM (SELECT * FROM students), (SELECT * FROM scores) `scores`"
      'deep nesting': ->
        inner1 = squel.select().from('students')
        inner2 = squel.select().from(inner1)

        @inst.from(inner2)

        assert.same @inst.toString(), "SELECT * FROM (SELECT * FROM (SELECT * FROM students))"

      'nesting in JOINs': ->
        inner1 = squel.select().from('students')
        inner2 = squel.select().from(inner1)

        @inst.from('schools').join(inner2, 'meh', 'meh.ID = ID')

        assert.same @inst.toString(), "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students)) `meh` ON (meh.ID = ID)"

      'nesting in JOINs with params': ->
        inner1 = squel.select().from('students').where('age = ?', 6)
        inner2 = squel.select().from(inner1)

        @inst.from('schools').where('school_type = ?', 'junior').join(inner2, 'meh', 'meh.ID = ID')

        assert.same @inst.toString(), "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = 6))) `meh` ON (meh.ID = ID) WHERE (school_type = 'junior')"
        assert.same @inst.toParam(), { "text": "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = ?))) `meh` ON (meh.ID = ID) WHERE (school_type = ?)", "values": [6,'junior'] }
        assert.same @inst.toParam({ "numberedParametersStartAt": 1}), { "text": "SELECT * FROM schools INNER JOIN (SELECT * FROM (SELECT * FROM students WHERE (age = $1))) `meh` ON (meh.ID = ID) WHERE (school_type = $2)", "values": [6,'junior'] }

  'cloning':
    'basic': ->
      newinst = @inst.from('students').limit(10).clone()
      newinst.limit(20)

      assert.same 'SELECT * FROM students LIMIT 10', @inst.toString()
      assert.same 'SELECT * FROM students LIMIT 20', newinst.toString()

    'with expressions (ticket #120)': ->
      expr = squel.expr().and('a = 1')
      newinst = @inst.from('table').left_join('table_2', 't', expr)
        .clone()
        .where('c = 1')
      
      expr.and('b = 2')

      assert.same 'SELECT * FROM table LEFT JOIN table_2 `t` ON (a = 1 AND b = 2)', @inst.toString()
      assert.same 'SELECT * FROM table LEFT JOIN table_2 `t` ON (a = 1) WHERE (c = 1)', newinst.toString()

    'with sub-queries (ticket #120)': ->
      newinst = @inst.from(squel.select().from('students')).limit(30)
        .clone()
        .where('c = 1')
        .limit(35)
      
      assert.same 'SELECT * FROM (SELECT * FROM students) LIMIT 30', @inst.toString()
      assert.same 'SELECT * FROM (SELECT * FROM students) WHERE (c = 1) LIMIT 35', newinst.toString()


  'is nestable': ->
    assert.same true, @inst.isNestable()

  'can specify block separator': ->
    assert.same squel.select({separator: '\n'})
      .field('thing')
      .from('table')
      .toString(), """
        SELECT
        thing
        FROM table
      """

  'UNION JOINs':
    'Two Queries NO Params':
      beforeEach: ->
        @qry1 = squel.select().field('name').from('students').where('age > 15')
        @qry2 = squel.select().field('name').from('students').where('age < 6')
        @qry1.union(@qry2)

      toString: ->
        assert.same @qry1.toString(), """
        SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))
        """
      toParam: ->
        assert.same @qry1.toParam(), {
          "text": "SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))"
          "values": [
          ]
        }

    'Two Queries with Params':
      beforeEach: ->
        @qry1 = squel.select().field('name').from('students').where('age > ?', 15)
        @qry2 = squel.select().field('name').from('students').where('age < ?', 6)
        @qry1.union(@qry2)

      toString: ->
        assert.same @qry1.toString(), """
        SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6))
        """
      toParam: ->
        assert.same @qry1.toParam(), {
          "text": "SELECT name FROM students WHERE (age > ?) UNION (SELECT name FROM students WHERE (age < ?))"
          "values": [
            15
            6
          ]
        }

    'Three Queries':
      beforeEach: ->
        @qry1 = squel.select().field('name').from('students').where('age > ?', 15)
        @qry2 = squel.select().field('name').from('students').where('age < 6')
        @qry3 = squel.select().field('name').from('students').where('age = ?', 8)
        @qry1.union(@qry2)
        @qry1.union(@qry3)

      toParam: ->
        assert.same @qry1.toParam(), {
          "text": "SELECT name FROM students WHERE (age > ?) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = ?))"
          "values": [
            15
            8
          ]
        }
      'toParam(2)': ->
        assert.same @qry1.toParam({ "numberedParametersStartAt": 2}), {
          "text": "SELECT name FROM students WHERE (age > $2) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = $3))"
          "values": [
            15
            8
          ]
        }

    'Multi-Parameter Query':
      beforeEach: ->
        @qry1 = squel.select().field('name').from('students').where('age > ?', 15)
        @qry2 = squel.select().field('name').from('students').where('age < ?', 6)
        @qry3 = squel.select().field('name').from('students').where('age = ?', 8)
        @qry4 = squel.select().field('name').from('students').where('age IN [?, ?]', 2, 10)
        @qry1.union(@qry2)
        @qry1.union(@qry3)
        @qry4.union_all(@qry1)

      toString: ->
        assert.same @qry4.toString(), """
        SELECT name FROM students WHERE (age IN [2, 10]) UNION ALL (SELECT name FROM students WHERE (age > 15) UNION (SELECT name FROM students WHERE (age < 6)) UNION (SELECT name FROM students WHERE (age = 8)))
        """
      toParam: ->
        assert.same @qry4.toParam({ "numberedParametersStartAt": 1}), {
          "text": "SELECT name FROM students WHERE (age IN [$1, $2]) UNION ALL (SELECT name FROM students WHERE (age > $3) UNION (SELECT name FROM students WHERE (age < $4)) UNION (SELECT name FROM students WHERE (age = $5)))"
          "values": [
            2
            10
            15
            6
            8
          ]
        }


module?.exports[require('path').basename(__filename)] = test
