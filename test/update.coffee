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

inst = (options) -> squel.update(options)
expr = -> squel.expr()


suite = vows.describe("UPDATE query builder")


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when toString() gets called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "table() needs to be called"


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when table() gets called': tu.contextFuncThrowsError ((obj)-> obj.table()), "table name must be a string"
        'then when table([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.table([])), "table name must be a string"
        'then when table({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.table({})), "table name must be a string"
        'then when table(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.table((-> 1))), "table name must be a string"
        'then when table("test") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.table("test")))

        'then when table("test", []) gets called': tu.contextFuncThrowsError ((obj)-> obj.table("test",[])), "alias must be a string"
        'then when table("test", {}) gets called': tu.contextFuncThrowsError ((obj)-> obj.table("test",{})), "alias must be a string"
        'then when table("test", function) gets called': tu.contextFuncThrowsError ((obj)-> obj.table("test",(-> 1))), "alias must be a string"
        'then when table("test", "a") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.table("test","a")))

suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when set() gets called': tu.contextFuncThrowsError ((obj)-> obj.set()), "field name must be a string"
        'then when set([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.set([])), "field name must be a string"
        'then when set({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.set({})), "field name must be a string"
        'then when set(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.set((-> 1))), "field name must be a string"
        'then when set("test") gets called': tu.contextFuncThrowsError ((obj)-> obj.set("test")), "field value must be a string, number, boolean or null"
        'then when set("test", []) gets called': tu.contextFuncThrowsError ((obj)-> obj.set("test",[])), "field value must be a string, number, boolean or null"
        'then when set("test", {}) gets called': tu.contextFuncThrowsError ((obj)-> obj.set("test",{})), "field value must be a string, number, boolean or null"
        'then when set("test", function) gets called': tu.contextFuncThrowsError ((obj)-> obj.set("test",(-> 1))), "field value must be a string, number, boolean or null"
        'then when set("test", "a") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.set("test","a")))


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
    'when table("test") is called':
        topic: -> inst().table("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "set() needs to be called"
    'when set("test","a") is called':
        topic: -> inst().set("test","a")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "table() needs to be called"



suite.addBatch
    'when table("test") is called':
        topic: -> inst().table("test")
        'when set("f1",1) is called':
            topic: (obj) -> obj.set("f1",1)
            'when set("f2",1.2) is called':
                topic: (obj) -> obj.set("f2",1.2)
                'when set("f3",true) is called':
                    topic: (obj) -> obj.set("f3",true)
                    'when set("f4",false) is called':
                        topic: (obj) -> obj.set("f4",false)
                        'when set("f5","blah") is called':
                            topic: (obj) -> obj.set("f5","blah")
                            'then when set("f6",null) is called':
                                topic: (obj) -> obj.set("f6",null)
                                'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f1 = 1, f2 = 1.2, f3 = TRUE, f4 = FALSE, f5 = "blah", f6 = NULL'


suite.addBatch
    'when using value placeholders':
        topic: -> inst(usingValuePlaceholders: true)
        'when table("test") is called':
            topic: (obj) -> obj.table("test")
            'when set("f1",1) is called':
                topic: (obj) -> obj.set("f1",1)
                'when set("f2",1.2) is called':
                    topic: (obj) -> obj.set("f2",1.2)
                    'when set("f3",true) is called':
                        topic: (obj) -> obj.set("f3",true)
                        'when set("f4",false) is called':
                            topic: (obj) -> obj.set("f4",false)
                            'when set("f5","blah") is called':
                                topic: (obj) -> obj.set("f5","blah")
                                'then when set("f6",null) is called':
                                    topic: (obj) -> obj.set("f6",null)
                                    'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f1 = 1, f2 = 1.2, f3 = TRUE, f4 = FALSE, f5 = blah, f6 = NULL'



suite.addBatch
    'when table("test") is called':
        topic: -> inst().table("test")
        'when set("f1",1) is called':
            topic: (obj) -> obj.set("f1",1)
            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f1 = 1'
            'when set("f1",2) is called':
                topic: (obj) -> obj.set("f1",2)
                'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f1 = 2'


suite.addBatch
    'when set("f","v") is called':
        topic: -> inst().set("f","v")
        'when table("test") is called':
            topic: (obj) -> obj.table("test")
            'then when table("test2") is called':
                topic: (obj) -> obj.table("test2")
                'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test, test2 SET f = "v"'
                'then when table("test3","a") is called':
                    topic: (obj) -> obj.table("test3","a")
                    'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test, test2, test3 AS `a` SET f = "v"'



suite.addBatch
    'when table("test").set("f",1) is called':
        topic: -> inst().table("test").set("f",1)
        'then when where("") is called':
            topic: (obj) -> obj.where("")
            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1'
            'then when where("field1=2") is called':
                topic: (obj) -> obj.where("field1=2")
                'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 WHERE (field1=2)'
                'then when where("field2=\'3\'") is called':
                    topic: (obj) -> obj.where("field2='3'")
                    'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 WHERE (field1=2) AND (field2=\'3\')'
    'when table("test2").set("f",1) is called':
        topic: -> inst().table("test2").set("f",1)
        'then when where(expr) is called':
            topic: (obj) -> obj.where(expr().and('test=3').and_begin().or('test2=1').or('test2=2').end())
            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test2 SET f = 1 WHERE (test=3 AND (test2=1 OR test2=2))'
    'when table("test3").set("f",1) is called':
        topic: -> inst().table("test3").set("f",1)
        'then when where("test1=1 OR test2=2 AND (test3=3 OR test4=4)") is called':
            topic: (obj) -> obj.where("test1=1 OR test2=2 AND (test3=3 OR test4=4)")
            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test3 SET f = 1 WHERE (test1=1 OR test2=2 AND (test3=3 OR test4=4))'


suite.addBatch
    'when table("test").set("f", 1) is called':
        topic: -> inst().table("test").set("f",1)
        'then when order("f1") is called':
            topic: (obj) -> obj.order("f1")
            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 ORDER BY f1 ASC'
            'then when ORDER("f2", false) is called':
                topic: (obj) -> obj.order("f2", false)
                'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 ORDER BY f1 ASC, f2 DESC'
                'then when ORDER("f3", true) is called':
                    topic: (obj) -> obj.order("f3", true)
                    'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 ORDER BY f1 ASC, f2 DESC, f3 ASC'


suite.addBatch
    'when table("test").set("f", 1) is called':
        topic: -> inst().table("test").set("f",1)
        'then when limit (3) is called':
            topic: (obj) -> obj.limit(3)
            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 LIMIT 3'
            'then when limit(0) is called':
                topic: (obj) -> obj.limit(0)
                'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1'
                'then when limit(5) is called':
                    topic: (obj) -> obj.limit(5)
                    'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 LIMIT 5'
                    'then when order("f3", false) is called':
                        topic: (obj) -> obj.order("f3", false)
                        'then when toString() is called': tu.contextAssertStringEqual 'UPDATE test SET f = 1 ORDER BY f3 DESC LIMIT 5'


suite.addBatch
    'when builder is intialized':
        topic: -> inst()
        'then when table("table1","bb") is called':
            topic: (obj) -> obj.table("table1","bb")
            'then when where("table3.id = 2") is called':
                topic: (obj) -> obj.where("table3.id = 2")
                'then when set("table4.taste", false) is called':
                    topic: (obj) -> obj.set("table4.taste", false)
                    'then when limit(2) is called':
                        topic: (obj) -> obj.limit(2)
                        'then when order("f",false) is called':
                            topic: (obj) -> obj.order("f", false)
                            'then when toString() is called': tu.contextAssertStringEqual 'UPDATE table1 AS `bb` SET table4.taste = FALSE WHERE (table3.id = 2) ORDER BY f DESC LIMIT 2'





suite.export(module)

