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

suite = vows.describe("DELETE query builder")

inst = -> squel.delete()
expr = -> squel.expr()


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
        'then when limit() gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit()) )
        'then when limit([]) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit([])) )
        'then when limit({}) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit({})) )
        'then when limit(function) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit((-> 1))) )
        'then when limit("test") gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit("test")) )
        'then when limit(1) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit(1)) )
        'then when limit(0) gets called': tu.contextAssertObjInstance( inst(), ((obj)-> obj.limit(0)) )
        'then when limit(-1) gets called': tu.contextFuncThrowsError ((obj)-> obj.limit(-1)), "limit/offset must be >=0"


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when where("") is called':
            topic: (obj) -> obj.where("")
            'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test'
            'then when where("field1=2") is called':
                topic: (obj) -> obj.where("field1=2")
                'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test WHERE (field1=2)'
                'then when where("field2=\'3\'") is called':
                    topic: (obj) -> obj.where("field2='3'")
                    'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test WHERE (field1=2) AND (field2=\'3\')'
    'when from("test2") is called':
        topic: -> inst().from("test2")
        'then when where(expr) is called':
            topic: (obj) -> obj.where(expr().and('test=3').and_begin().or('test2=1').or('test2=2').end())
            'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test2 WHERE (test=3 AND (test2=1 OR test2=2))'
    'when from("test3") is called':
        topic: -> inst().from("test3")
        'then when where("test1=1 OR test2=2 AND (test3=3 OR test4=4)") is called':
            topic: (obj) -> obj.where("test1=1 OR test2=2 AND (test3=3 OR test4=4)")
            'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test3 WHERE (test1=1 OR test2=2 AND (test3=3 OR test4=4))'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when order("f1") is called':
            topic: (obj) -> obj.order("f1")
            'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test ORDER BY f1 ASC'
            'then when ORDER("f2", false) is called':
                topic: (obj) -> obj.order("f2", false)
                'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test ORDER BY f1 ASC, f2 DESC'
                'then when ORDER("f3", true) is called':
                    topic: (obj) -> obj.order("f3", true)
                    'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test ORDER BY f1 ASC, f2 DESC, f3 ASC'


suite.addBatch
    'when from("test") is called':
        topic: -> inst().from("test")
        'then when limit (3) is called':
            topic: (obj) -> obj.limit(3)
            'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test LIMIT 3'
            'then when limit(0) is called':
                topic: (obj) -> obj.limit(0)
                'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test'
                'then when limit(5) is called':
                    topic: (obj) -> obj.limit(5)
                    'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test LIMIT 5'
                    'then when order("f3", false) is called':
                        topic: (obj) -> obj.order("f3", false)
                        'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM test ORDER BY f3 DESC LIMIT 5'


suite.addBatch
    'when builder is intialized':
        topic: -> inst()
        'then when from("table1") is called':
            topic: (obj) -> obj.from("table1")
            'then when where("table3.id = 2") is called':
                topic: (obj) -> obj.where("table3.id = 2")
                'then when limit(2) is called':
                    topic: (obj) -> obj.limit(2)
                    'then when order("f",false) is called':
                        topic: (obj) -> obj.order("f", false)
                        'then when toString() is called': tu.contextAssertStringEqual 'DELETE FROM table1 WHERE (table3.id = 2) ORDER BY f DESC LIMIT 2'





suite.export(module)

