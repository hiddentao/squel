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


vows = require "vows"
assert = require "assert"
squel = require "../squel.min"
tu = require "./testutils"

inst = -> squel.select()
expr = -> squel.expr()

suite = vows.describe("SELECT query builder")

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when toString() gets called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when from() gets called': tu.contextFuncThrowsError ((obj)-> obj.from()), "table name must be a string"
        'then when from([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.from([])), "table name must be a string"
        'then when from({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.from({})), "table name must be a string"
        'then when from(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.from((-> 1))), "table name must be a string"
        'then when from("test") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.from("test")))

        'then when from("test", []) gets called': tu.contextFuncThrowsError ((obj)-> obj.from("test",[])), "alias must be a string"
        'then when from("test", {}) gets called': tu.contextFuncThrowsError ((obj)-> obj.from("test",{})), "alias must be a string"
        'then when from("test", function) gets called': tu.contextFuncThrowsError ((obj)-> obj.from("test",(-> 1))), "alias must be a string"
        'then when from("test", "a") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.from("test","a")))

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when field() gets called': tu.contextFuncThrowsError ((obj)-> obj.field()), "field name must be a string"
        'then when field([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.field([])), "field name must be a string"
        'then when field({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.field({})), "field name must be a string"
        'then when field(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.field((-> 1))), "field name must be a string"
        'then when field("test") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.field("test")))

        'then when field("test", []) gets called': tu.contextFuncThrowsError ((obj)-> obj.field("test",[])), "alias must be a string"
        'then when field("test", {}) gets called': tu.contextFuncThrowsError ((obj)-> obj.field("test",{})), "alias must be a string"
        'then when field("test", function) gets called': tu.contextFuncThrowsError ((obj)-> obj.field("test",(-> 1))), "alias must be a string"
        'then when field("test", "a") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.field("test","a")))

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when join() gets called': tu.contextFuncThrowsError ((obj)-> obj.join()), "table name must be a string"
        'then when join([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.join([])), "table name must be a string"
        'then when join({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.join({})), "table name must be a string"
        'then when join(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.join((-> 1))), "table name must be a string"
        'then when join("test") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.join("test")))

        'then when join("test",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.join("test",[])), "alias must be a string"
        'then when join("test",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.join("test",{})), "alias must be a string"
        'then when join("test",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.join("test",(-> 1))), "alias must be a string"
        'then when join("test","a") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.join("test","a")))

        'then when join("test","a",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.join("test","a",[])), "condition must be a string or Expression instance"
        'then when join("test","a",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.join("test","a",{})), "condition must be a string or Expression instance"
        'then when join("test","a",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when join("test","a","b") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.join("test","a","b")) )
        'then when join("test","a",expr) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.join("test","a",expr())) )

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when left_join() gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join()), "table name must be a string"
        'then when left_join([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join([])), "table name must be a string"
        'then when left_join({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join({})), "table name must be a string"
        'then when left_join(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join((-> 1))), "table name must be a string"
        'then when left_join("test") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.left_join("test")))

        'then when left_join("test",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join("test",[])), "alias must be a string"
        'then when left_join("test",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join("test",{})), "alias must be a string"
        'then when left_join("test",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join("test",(-> 1))), "alias must be a string"
        'then when left_join("test","a") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.left_join("test","a")))

        'then when left_join("test","a",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join("test","a",[])), "condition must be a string or Expression instance"
        'then when left_join("test","a",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join("test","a",{})), "condition must be a string or Expression instance"
        'then when left_join("test","a",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.left_join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when left_join("test","a","b") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.left_join("test","a","b")) )
        'then when left_join("test","a",expr) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.left_join("test","a",expr())) )

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when right_join() gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join()), "table name must be a string"
        'then when right_join([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join([])), "table name must be a string"
        'then when right_join({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join({})), "table name must be a string"
        'then when right_join(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join((-> 1))), "table name must be a string"
        'then when right_join("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.right_join("test")) )

        'then when right_join("test",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join("test",[])), "alias must be a string"
        'then when right_join("test",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join("test",{})), "alias must be a string"
        'then when right_join("test",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join("test",(-> 1))), "alias must be a string"
        'then when right_join("test","a") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.right_join("test","a")) )

        'then when right_join("test","a",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join("test","a",[])), "condition must be a string or Expression instance"
        'then when right_join("test","a",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join("test","a",{})), "condition must be a string or Expression instance"
        'then when right_join("test","a",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.right_join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when right_join("test","a","b") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.right_join("test","a","b")) )
        'then when right_join("test","a",expr) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.right_join("test","a",expr())) )

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when outer_join() gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join()), "table name must be a string"
        'then when outer_join([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join([])), "table name must be a string"
        'then when outer_join({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join({})), "table name must be a string"
        'then when outer_join(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join((-> 1))), "table name must be a string"
        'then when outer_join("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.outer_join("test")) )

        'then when outer_join("test",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join("test",[])), "alias must be a string"
        'then when outer_join("test",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join("test",{})), "alias must be a string"
        'then when outer_join("test",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join("test",(-> 1))), "alias must be a string"
        'then when outer_join("test","a") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.outer_join("test","a")) )

        'then when outer_join("test","a",[]) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join("test","a",[])), "condition must be a string or Expression instance"
        'then when outer_join("test","a",{}) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join("test","a",{})), "condition must be a string or Expression instance"
        'then when outer_join("test","a",function) gets called': tu.contextFuncThrowsError ((obj)-> obj.outer_join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when outer_join("test","a","b") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.outer_join("test","a","b")) )
        'then when outer_join("test","a",expr) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.outer_join("test","a",expr())) )

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when where() gets called': tu.contextFuncThrowsError ((obj)-> obj.where()), "condition must be a string or Expression instance"
        'then when where([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.where([])), "condition must be a string or Expression instance"
        'then when where({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.where({})), "condition must be a string or Expression instance"
        'then when where(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.where((-> 1))), "condition must be a string or Expression instance"
        'then when where("test = 3") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.where("test = 3")) )
        'then when where(expr) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.where(expr())) )


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when order() gets called': tu.contextFuncThrowsError ((obj)-> obj.order()), "field name must be a string"
        'then when order([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.order([])), "field name must be a string"
        'then when order({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.order({})), "field name must be a string"
        'then when order(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.order((-> 1))), "field name must be a string"
        'then when order("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.order("test")) )


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when group() gets called': tu.contextFuncThrowsError ((obj)-> obj.group()), "field name must be a string"
        'then when group([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.group([])), "field name must be a string"
        'then when group({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.group({})), "field name must be a string"
        'then when group(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.group((-> 1))), "field name must be a string"
        'then when group("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.group("test")) )


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when limit() gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit()) )
        'then when limit([]) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit([])) )
        'then when limit({}) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit({})) )
        'then when limit(function) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit((-> 1))) )
        'then when limit("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit("test")) )
        'then when limit(1) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit(1)) )
        'then when limit(0) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit(0)) )
        'then when limit(-1) gets called': tu.contextFuncThrowsError ((obj)-> obj.limit(-1)), "limit/offset must be >=0"


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when offset() gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset()) )
        'then when offset([]) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset([])) )
        'then when offset({}) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset({})) )
        'then when offset(function) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset((-> 1))) )
        'then when offset("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset("test")) )
        'then when offset(1) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset(1)) )
        'then when offset(0) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.offset(0)) )
        'then when offset(-1) gets called': tu.contextFuncThrowsError ((obj)-> obj.offset(-1)), "limit/offset must be >=0"



suite.addBatch
    'when field("test") is called':
        topic: -> inst().field("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when join("test") is called':
        topic: -> inst().join("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when left_join("test") is called':
        topic: -> inst().left_join("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when right_join("test") is called':
        topic: -> inst().right_join("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when outer_join("test") is called':
        topic: -> inst().outer_join("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when where("test") is called':
        topic: -> inst().where("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when from("test") is called':
        topic: -> inst().from("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when from("test2") is called':
            topic: (obj) -> obj.from("test2")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test, test2'
            'then when from("test3","a") is called':
                topic: (obj) -> obj.from("test3","a")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test, test2, test3 `a`'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when field("field1") is called':
            topic: (obj) -> obj.field("field1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT field1 FROM test'
            'then when field("field2","b") is called':
                topic: (obj) -> obj.field("field2","b")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT field1, field2 AS "b" FROM test'
                'then when field("DATE_FORMAT(a.started, \'%H\')","b2") is called':
                    topic: (obj) -> obj.field("DATE_FORMAT(a.started, '%H')","b2")
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT field1, field2 AS "b", DATE_FORMAT(a.started, \'%H\') AS "b2" FROM test'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when where("") is called':
            topic: (obj) -> obj.where("")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test'
            'then when where("field1=2") is called':
                topic: (obj) -> obj.where("field1=2")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test WHERE (field1=2)'
                'then when where("field2=\'3\'") is called':
                    topic: (obj) -> obj.where("field2='3'")
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test WHERE (field1=2) AND (field2=\'3\')'
    'when from("test2") is called':
        topic: -> inst().from("test2")
        'then when where(expr) is called':
            topic: (obj) -> obj.where(expr().and('test=3').and_begin().or('test2=1').or('test2=2').end())
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test2 WHERE (test=3 AND (test2=1 OR test2=2))'
    'when from("test3") is called':
        topic: -> inst().from("test3")
        'then when where("test1=1 OR test2=2 AND (test3=3 OR test4=4)") is called':
            topic: (obj) -> obj.where("test1=1 OR test2=2 AND (test3=3 OR test4=4)")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test3 WHERE (test1=1 OR test2=2 AND (test3=3 OR test4=4))'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when join("table1") is called':
            topic: (obj) -> obj.join("table1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1'
            'then when join("table2","t2") is called':
                topic: (obj) -> obj.join("table2","t2")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1 INNER JOIN table2 `t2`'
                'then when join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.join("table3", null, "table3.id = test.id")
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1 INNER JOIN table2 `t2` INNER JOIN table3 ON (table3.id = test.id)'
                    'then when join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1 INNER JOIN table2 `t2` INNER JOIN table3 ON (table3.id = test.id) INNER JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when left_join("table1") is called':
            topic: (obj) -> obj.left_join("table1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1'
            'then when left_join("table2","t2") is called':
                topic: (obj) -> obj.left_join("table2","t2")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1 LEFT JOIN table2 `t2`'
                'then when left_join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.left_join("table3", null, "table3.id = test.id")
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1 LEFT JOIN table2 `t2` LEFT JOIN table3 ON (table3.id = test.id)'
                    'then when left_join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.left_join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1 LEFT JOIN table2 `t2` LEFT JOIN table3 ON (table3.id = test.id) LEFT JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when right_join("table1") is called':
            topic: (obj) -> obj.right_join("table1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1'
            'then when right_join("table2","t2") is called':
                topic: (obj) -> obj.right_join("table2","t2")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1 RIGHT JOIN table2 `t2`'
                'then when right_join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.right_join("table3", null, "table3.id = test.id")
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1 RIGHT JOIN table2 `t2` RIGHT JOIN table3 ON (table3.id = test.id)'
                    'then when right_join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.right_join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1 RIGHT JOIN table2 `t2` RIGHT JOIN table3 ON (table3.id = test.id) RIGHT JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when outer_join("table1") is called':
            topic: (obj) -> obj.outer_join("table1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1'
            'then when outer_join("table2","t2") is called':
                topic: (obj) -> obj.outer_join("table2","t2")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1 OUTER JOIN table2 `t2`'
                'then when outer_join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.outer_join("table3", null, "table3.id = test.id")
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1 OUTER JOIN table2 `t2` OUTER JOIN table3 ON (table3.id = test.id)'
                    'then when outer_join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.outer_join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1 OUTER JOIN table2 `t2` OUTER JOIN table3 ON (table3.id = test.id) OUTER JOIN table4 `t4` ON (t4.id IN (0,test.id))'



suite.addBatch
    'when from("table1") is called':
        topic: -> inst().from("table1")
        'then when group("f1") is called':
            topic: (obj) -> obj.group("f1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 GROUP BY f1'
            'then when group("f2") is called':
                topic: (obj) -> obj.group("f2")
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 GROUP BY f1, f2'


suite.addBatch
    'when from("table1") is called':
        topic: -> inst().from("table1")
        'then when order("f1") is called':
            topic: (obj) -> obj.order("f1")
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 ORDER BY f1 ASC'
            'then when ORDER("f2", false) is called':
                topic: (obj) -> obj.order("f2", false)
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 ORDER BY f1 ASC, f2 DESC'
                'then when ORDER("f3", true) is called':
                    topic: (obj) -> obj.order("f3", true)
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 ORDER BY f1 ASC, f2 DESC, f3 ASC'
                    'then when group("f2") is called':
                        topic: (obj) -> obj.group("f2")
                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 GROUP BY f2 ORDER BY f1 ASC, f2 DESC, f3 ASC'


suite.addBatch
    'when from("table1") is called':
        topic: -> inst().from("table1")
        'then when limit (3) is called':
            topic: (obj) -> obj.limit(3)
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 LIMIT 3'
            'then when limit(0) is called':
                topic: (obj) -> obj.limit(0)
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1'
                'then when limit(5) is called':
                    topic: (obj) -> obj.limit(5)
                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 LIMIT 5'
                    'then when group("f3") is called':
                        topic: (obj) -> obj.group("f3")
                        'then when order("f3", false) is called':
                            topic: (obj) -> obj.order("f3", false)
                            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 GROUP BY f3 ORDER BY f3 DESC LIMIT 5'


suite.addBatch
    'when from("table1") is called':
        topic: -> inst().from("table1")
        'then when offset(1) is called':
            topic: (obj) -> obj.offset(1)
            'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 OFFSET 1'
            'then when offset(0) is called':
                topic: (obj) -> obj.offset(0)
                'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1'
                'then when offset(2) is called':
                        topic: (obj) -> obj.offset(2)
                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 OFFSET 2'
                        'then when limit(5) is called':
                            topic: (obj) -> obj.limit(5)
                            'then when group("f3") is called':
                                topic: (obj) -> obj.group("f3")
                                'then when order("f3", false) is called':
                                    topic: (obj) -> obj.order("f3", false)
                                    'then when toString() is called': tu.contextAssertStringEqual 'SELECT * FROM table1 GROUP BY f3 ORDER BY f3 DESC LIMIT 5 OFFSET 2'



suite.addBatch
    'when builder is intialized':
        topic: -> inst()
        'then when from("table1") is called':
            topic: (obj) -> obj.from("table1")
            'then when outer_join("table2","t2", "t2.taste = table4.taste") is called':
                topic: (obj) -> obj.outer_join("table2","t2", expr().or("t2.taste = table4.taste"))
                'then when where("table3.id = 2") is called':
                    topic: (obj) -> obj.where("table3.id = 2")
                    'then when field("table4.taste", "t4") is called':
                        topic: (obj) -> obj.field("table4.taste", "t4")
                        'then when limit(2) is called':
                            topic: (obj) -> obj.limit(2)
                            'then when group("f1") is called':
                                topic: (obj) -> obj.group("f1")
                                'then when offset(100) is called':
                                    topic: (obj) -> obj.offset(100)
                                    'then when order("f",false) is called':
                                        topic: (obj) -> obj.order("f", false)
                                        'then when toString() is called': tu.contextAssertStringEqual 'SELECT table4.taste AS "t4" FROM table1 OUTER JOIN table2 `t2` ON (t2.taste = table4.taste) WHERE (table3.id = 2) GROUP BY f1 ORDER BY f DESC LIMIT 2 OFFSET 100'







suite.export(module)

