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
squel = (require "../squel")

select = squel.select
expr = squel.expr


suite = vows.describe("SELECT query builder")


# Get class name of given object.
getObjectClassName = (obj) ->
    if obj && obj.constructor && obj.constructor.toString
        arr = obj.constructor.toString().match /function\s*(\w+)/;
        if arr && arr.length is 2
            return arr[1]
    return undefined


funcAssertObjInstance = (obj) ->
    assert.equal getObjectClassName(obj), getObjectClassName(select())

contextAssertObjInstance = (topic) ->
    topic: topic
    'the object instance is returned': funcAssertObjInstance

contextAssertStringEqual = (expectedStr) ->
    ret = { topic: (obj) -> obj.toString() }
    ret["the string matches: #{expectedStr}"] = (str) ->
        assert.strictEqual str, expectedStr
    ret

contextFuncThrowsError = (func, errStr) ->
    ret =
        topic: (obj) ->
            try
                func(obj)
            catch err
                return err
    ret["error gets thrown: #{errStr}"] = (err) ->
        assert.strictEqual err.toString(), "Error: #{errStr}"
    ret



suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when toString() gets called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when from() gets called': contextFuncThrowsError ((obj)-> obj.from()), "table name must be a string"
        'then when from([]) gets called': contextFuncThrowsError ((obj)-> obj.from([])), "table name must be a string"
        'then when from({}) gets called': contextFuncThrowsError ((obj)-> obj.from({})), "table name must be a string"
        'then when from(function) gets called': contextFuncThrowsError ((obj)-> obj.from((-> 1))), "table name must be a string"
        'then when from("test") gets called': contextAssertObjInstance ((obj)-> obj.from("test"))

        'then when from("test", []) gets called': contextFuncThrowsError ((obj)-> obj.from("test",[])), "alias must be a string"
        'then when from("test", {}) gets called': contextFuncThrowsError ((obj)-> obj.from("test",{})), "alias must be a string"
        'then when from("test", function) gets called': contextFuncThrowsError ((obj)-> obj.from("test",(-> 1))), "alias must be a string"
        'then when from("test", "a") gets called': contextAssertObjInstance ((obj)-> obj.from("test","a"))

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when field() gets called': contextFuncThrowsError ((obj)-> obj.field()), "field must be a string"
        'then when field([]) gets called': contextFuncThrowsError ((obj)-> obj.field([])), "field must be a string"
        'then when field({}) gets called': contextFuncThrowsError ((obj)-> obj.field({})), "field must be a string"
        'then when field(function) gets called': contextFuncThrowsError ((obj)-> obj.field((-> 1))), "field must be a string"
        'then when field("test") gets called': contextAssertObjInstance ((obj)-> obj.field("test"))

        'then when field("test", []) gets called': contextFuncThrowsError ((obj)-> obj.field("test",[])), "alias must be a string"
        'then when field("test", {}) gets called': contextFuncThrowsError ((obj)-> obj.field("test",{})), "alias must be a string"
        'then when field("test", function) gets called': contextFuncThrowsError ((obj)-> obj.field("test",(-> 1))), "alias must be a string"
        'then when field("test", "a") gets called': contextAssertObjInstance ((obj)-> obj.field("test","a"))

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when join() gets called': contextFuncThrowsError ((obj)-> obj.join()), "table name must be a string"
        'then when join([]) gets called': contextFuncThrowsError ((obj)-> obj.join([])), "table name must be a string"
        'then when join({}) gets called': contextFuncThrowsError ((obj)-> obj.join({})), "table name must be a string"
        'then when join(function) gets called': contextFuncThrowsError ((obj)-> obj.join((-> 1))), "table name must be a string"
        'then when join("test") gets called': contextAssertObjInstance ((obj)-> obj.join("test"))

        'then when join("test",[]) gets called': contextFuncThrowsError ((obj)-> obj.join("test",[])), "alias must be a string"
        'then when join("test",{}) gets called': contextFuncThrowsError ((obj)-> obj.join("test",{})), "alias must be a string"
        'then when join("test",function) gets called': contextFuncThrowsError ((obj)-> obj.join("test",(-> 1))), "alias must be a string"
        'then when join("test","a") gets called': contextAssertObjInstance ((obj)-> obj.join("test","a"))

        'then when join("test","a",[]) gets called': contextFuncThrowsError ((obj)-> obj.join("test","a",[])), "condition must be a string or Expression instance"
        'then when join("test","a",{}) gets called': contextFuncThrowsError ((obj)-> obj.join("test","a",{})), "condition must be a string or Expression instance"
        'then when join("test","a",function) gets called': contextFuncThrowsError ((obj)-> obj.join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when join("test","a","b") gets called': contextAssertObjInstance ((obj)-> obj.join("test","a","b"))
        'then when join("test","a",expr) gets called': contextAssertObjInstance ((obj)-> obj.join("test","a",expr()))

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when left_join() gets called': contextFuncThrowsError ((obj)-> obj.left_join()), "table name must be a string"
        'then when left_join([]) gets called': contextFuncThrowsError ((obj)-> obj.left_join([])), "table name must be a string"
        'then when left_join({}) gets called': contextFuncThrowsError ((obj)-> obj.left_join({})), "table name must be a string"
        'then when left_join(function) gets called': contextFuncThrowsError ((obj)-> obj.left_join((-> 1))), "table name must be a string"
        'then when left_join("test") gets called': contextAssertObjInstance ((obj)-> obj.left_join("test"))

        'then when left_join("test",[]) gets called': contextFuncThrowsError ((obj)-> obj.left_join("test",[])), "alias must be a string"
        'then when left_join("test",{}) gets called': contextFuncThrowsError ((obj)-> obj.left_join("test",{})), "alias must be a string"
        'then when left_join("test",function) gets called': contextFuncThrowsError ((obj)-> obj.left_join("test",(-> 1))), "alias must be a string"
        'then when left_join("test","a") gets called': contextAssertObjInstance ((obj)-> obj.left_join("test","a"))

        'then when left_join("test","a",[]) gets called': contextFuncThrowsError ((obj)-> obj.left_join("test","a",[])), "condition must be a string or Expression instance"
        'then when left_join("test","a",{}) gets called': contextFuncThrowsError ((obj)-> obj.left_join("test","a",{})), "condition must be a string or Expression instance"
        'then when left_join("test","a",function) gets called': contextFuncThrowsError ((obj)-> obj.left_join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when left_join("test","a","b") gets called': contextAssertObjInstance ((obj)-> obj.left_join("test","a","b"))
        'then when left_join("test","a",expr) gets called': contextAssertObjInstance ((obj)-> obj.left_join("test","a",expr()))

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when right_join() gets called': contextFuncThrowsError ((obj)-> obj.right_join()), "table name must be a string"
        'then when right_join([]) gets called': contextFuncThrowsError ((obj)-> obj.right_join([])), "table name must be a string"
        'then when right_join({}) gets called': contextFuncThrowsError ((obj)-> obj.right_join({})), "table name must be a string"
        'then when right_join(function) gets called': contextFuncThrowsError ((obj)-> obj.right_join((-> 1))), "table name must be a string"
        'then when right_join("test") gets called': contextAssertObjInstance ((obj)-> obj.right_join("test"))

        'then when right_join("test",[]) gets called': contextFuncThrowsError ((obj)-> obj.right_join("test",[])), "alias must be a string"
        'then when right_join("test",{}) gets called': contextFuncThrowsError ((obj)-> obj.right_join("test",{})), "alias must be a string"
        'then when right_join("test",function) gets called': contextFuncThrowsError ((obj)-> obj.right_join("test",(-> 1))), "alias must be a string"
        'then when right_join("test","a") gets called': contextAssertObjInstance ((obj)-> obj.right_join("test","a"))

        'then when right_join("test","a",[]) gets called': contextFuncThrowsError ((obj)-> obj.right_join("test","a",[])), "condition must be a string or Expression instance"
        'then when right_join("test","a",{}) gets called': contextFuncThrowsError ((obj)-> obj.right_join("test","a",{})), "condition must be a string or Expression instance"
        'then when right_join("test","a",function) gets called': contextFuncThrowsError ((obj)-> obj.right_join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when right_join("test","a","b") gets called': contextAssertObjInstance ((obj)-> obj.right_join("test","a","b"))
        'then when right_join("test","a",expr) gets called': contextAssertObjInstance ((obj)-> obj.right_join("test","a",expr()))

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when outer_join() gets called': contextFuncThrowsError ((obj)-> obj.outer_join()), "table name must be a string"
        'then when outer_join([]) gets called': contextFuncThrowsError ((obj)-> obj.outer_join([])), "table name must be a string"
        'then when outer_join({}) gets called': contextFuncThrowsError ((obj)-> obj.outer_join({})), "table name must be a string"
        'then when outer_join(function) gets called': contextFuncThrowsError ((obj)-> obj.outer_join((-> 1))), "table name must be a string"
        'then when outer_join("test") gets called': contextAssertObjInstance ((obj)-> obj.outer_join("test"))

        'then when outer_join("test",[]) gets called': contextFuncThrowsError ((obj)-> obj.outer_join("test",[])), "alias must be a string"
        'then when outer_join("test",{}) gets called': contextFuncThrowsError ((obj)-> obj.outer_join("test",{})), "alias must be a string"
        'then when outer_join("test",function) gets called': contextFuncThrowsError ((obj)-> obj.outer_join("test",(-> 1))), "alias must be a string"
        'then when outer_join("test","a") gets called': contextAssertObjInstance ((obj)-> obj.outer_join("test","a"))

        'then when outer_join("test","a",[]) gets called': contextFuncThrowsError ((obj)-> obj.outer_join("test","a",[])), "condition must be a string or Expression instance"
        'then when outer_join("test","a",{}) gets called': contextFuncThrowsError ((obj)-> obj.outer_join("test","a",{})), "condition must be a string or Expression instance"
        'then when outer_join("test","a",function) gets called': contextFuncThrowsError ((obj)-> obj.outer_join("test","a",(-> 1))), "condition must be a string or Expression instance"
        'then when outer_join("test","a","b") gets called': contextAssertObjInstance ((obj)-> obj.outer_join("test","a","b"))
        'then when outer_join("test","a",expr) gets called': contextAssertObjInstance ((obj)-> obj.outer_join("test","a",expr()))

suite.addBatch
    'when the builder is initialized':
        topic: select()
        'then when where() gets called': contextFuncThrowsError ((obj)-> obj.where()), "condition must be a string or Expression instance"
        'then when where([]) gets called': contextFuncThrowsError ((obj)-> obj.where([])), "condition must be a string or Expression instance"
        'then when where({}) gets called': contextFuncThrowsError ((obj)-> obj.where({})), "condition must be a string or Expression instance"
        'then when where(function) gets called': contextFuncThrowsError ((obj)-> obj.where((-> 1))), "condition must be a string or Expression instance"
        'then when where("test = 3") gets called': contextAssertObjInstance ((obj)-> obj.where("test = 3"))
        'then when where(expr) gets called': contextAssertObjInstance ((obj)-> obj.where(expr()))


suite.addBatch
    'when field("test") is called':
        topic: -> select().field("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when join("test") is called':
        topic: -> select().join("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when left_join("test") is called':
        topic: -> select().left_join("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when right_join("test") is called':
        topic: -> select().right_join("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when outer_join("test") is called':
        topic: -> select().outer_join("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when where("test") is called':
        topic: -> select().where("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextFuncThrowsError ((obj)-> obj.toString()), "from() needs to be called"
    'when from("test") is called':
        topic: -> select().from("test")
        'the object instance is returned': funcAssertObjInstance
        'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when from("test2") is called':
            topic: (obj) -> obj.from("test2")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test, test2'
            'then when from("test3","a") is called':
                topic: (obj) -> obj.from("test3","a")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test, test2, test3 `a`'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when field("field1") is called':
            topic: (obj) -> obj.field("field1")
            'then when toString() is called': contextAssertStringEqual 'SELECT field1 FROM test'
            'then when field("field2","b") is called':
                topic: (obj) -> obj.field("field2","b")
                'then when toString() is called': contextAssertStringEqual 'SELECT field1, field2 AS "b" FROM test'
                'then when field("DATE_FORMAT(a.started, \'%H\')","b2") is called':
                    topic: (obj) -> obj.field("DATE_FORMAT(a.started, '%H')","b2")
                    'then when toString() is called': contextAssertStringEqual 'SELECT field1, field2 AS "b", DATE_FORMAT(a.started, \'%H\') AS "b2" FROM test'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when where("field1=2") is called':
            topic: (obj) -> obj.where("field1=2")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test WHERE (field1=2)'
            'then when where("field2=\'3\'") is called':
                topic: (obj) -> obj.where("field2='3'")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test WHERE (field1=2) AND (field2=\'3\')'
    'when from("test2") is called':
        topic: -> select().from("test2")
        'then when where(expr) is called':
            topic: (obj) -> obj.where(expr().and('test=3').and_begin().or('test2=1').or('test2=2').end())
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test2 WHERE (test=3 AND (test2=1 OR test2=2))'
    'when from("test3") is called':
        topic: -> select().from("test3")
        'then when where("test1=1 OR test2=2 AND (test3=3 OR test4=4)") is called':
            topic: (obj) -> obj.where("test1=1 OR test2=2 AND (test3=3 OR test4=4)")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test3 WHERE (test1=1 OR test2=2 AND (test3=3 OR test4=4))'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when join("table1") is called':
            topic: (obj) -> obj.join("table1")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1'
            'then when join("table2","t2") is called':
                topic: (obj) -> obj.join("table2","t2")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1 INNER JOIN table2 `t2`'
                'then when join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.join("table3", null, "table3.id = test.id")
                    'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1 INNER JOIN table2 `t2` INNER JOIN table3 ON (table3.id = test.id)'
                    'then when join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test INNER JOIN table1 INNER JOIN table2 `t2` INNER JOIN table3 ON (table3.id = test.id) INNER JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when left_join("table1") is called':
            topic: (obj) -> obj.left_join("table1")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1'
            'then when left_join("table2","t2") is called':
                topic: (obj) -> obj.left_join("table2","t2")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1 LEFT JOIN table2 `t2`'
                'then when left_join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.left_join("table3", null, "table3.id = test.id")
                    'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1 LEFT JOIN table2 `t2` LEFT JOIN table3 ON (table3.id = test.id)'
                    'then when left_join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.left_join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test LEFT JOIN table1 LEFT JOIN table2 `t2` LEFT JOIN table3 ON (table3.id = test.id) LEFT JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when right_join("table1") is called':
            topic: (obj) -> obj.right_join("table1")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1'
            'then when right_join("table2","t2") is called':
                topic: (obj) -> obj.right_join("table2","t2")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1 RIGHT JOIN table2 `t2`'
                'then when right_join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.right_join("table3", null, "table3.id = test.id")
                    'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1 RIGHT JOIN table2 `t2` RIGHT JOIN table3 ON (table3.id = test.id)'
                    'then when right_join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.right_join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test RIGHT JOIN table1 RIGHT JOIN table2 `t2` RIGHT JOIN table3 ON (table3.id = test.id) RIGHT JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when outer_join("table1") is called':
            topic: (obj) -> obj.outer_join("table1")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1'
            'then when outer_join("table2","t2") is called':
                topic: (obj) -> obj.outer_join("table2","t2")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1 OUTER JOIN table2 `t2`'
                'then when outer_join("table3", null, "table3.id = test.id") is called':
                    topic: (obj) -> obj.outer_join("table3", null, "table3.id = test.id")
                    'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1 OUTER JOIN table2 `t2` OUTER JOIN table3 ON (table3.id = test.id)'
                    'then when outer_join("table4", "t4", expr) is called':
                        topic: (obj) -> obj.outer_join("table4", "t4", expr().and("t4.id IN (0,test.id)"))
                        'then when toString() is called': contextAssertStringEqual 'SELECT * FROM test OUTER JOIN table1 OUTER JOIN table2 `t2` OUTER JOIN table3 ON (table3.id = test.id) OUTER JOIN table4 `t4` ON (t4.id IN (0,test.id))'


suite.addBatch
    'when builder is intialized':
        topic: -> select()
        'then when from("table1") is called':
            topic: (obj) -> obj.from("table1")
            'then when outer_join("table2","t2", "t2.taste = table4.taste") is called':
                topic: (obj) -> obj.outer_join("table2","t2", expr().or("t2.taste = table4.taste"))
                'then when where("table3.id = 2") is called':
                    topic: (obj) -> obj.where("table3.id = 2")
                    'then when field("table4.taste", "t4") is called':
                        topic: (obj) -> obj.field("table4.taste", "t4")
                        'then when toString() is called': contextAssertStringEqual 'SELECT table4.taste AS "t4" FROM table1 OUTER JOIN table2 `t2` ON (t2.taste = table4.taste) WHERE (table3.id = 2)'





suite.export(module)

