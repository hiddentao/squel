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

inst = (options) -> squel.insert(options)
expr = -> squel.expr()


suite = vows.describe("INSERT query builder")


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when toString() gets called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "into() needs to be called"


suite.addBatch
    'when the builder is initialized':
        topic: inst()
        'then when into() gets called': tu.contextFuncThrowsError ((obj)-> obj.into()), "table name must be a string"
        'then when into([]) gets called': tu.contextFuncThrowsError ((obj)-> obj.into([])), "table name must be a string"
        'then when into({}) gets called': tu.contextFuncThrowsError ((obj)-> obj.into({})), "table name must be a string"
        'then when into(function) gets called': tu.contextFuncThrowsError ((obj)-> obj.into((-> 1))), "table name must be a string"
        'then when into("test") gets called': tu.contextAssertObjInstance(inst(), ((obj)-> obj.into("test")))

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
    'when into("test") is called':
        topic: -> inst().into("test")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "set() needs to be called"
    'when set("test","a") is called':
        topic: -> inst().set("test","a")
        'the object instance is returned': tu.funcAssertObjInstance(inst())
        'then when toString() is called': tu.contextFuncThrowsError ((obj)-> obj.toString()), "into() needs to be called"



suite.addBatch
    'when into("test") is called':
        topic: -> inst().into("test")
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
                                'then when toString() is called': tu.contextAssertStringEqual 'INSERT INTO test (f1, f2, f3, f4, f5, f6) VALUES (1, 1.2, TRUE, FALSE, "blah", NULL)'



suite.addBatch
    'when using value placeholders':
        topic: -> inst(usingValuePlaceholders: true)
        'when into("test") is called':
            topic: (obj) -> obj.into("test")
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
                                    'then when toString() is called': tu.contextAssertStringEqual 'INSERT INTO test (f1, f2, f3, f4, f5, f6) VALUES (1, 1.2, TRUE, FALSE, blah, NULL)'




suite.addBatch
    'when into("test") is called':
        topic: -> inst().into("test")
        'when set("f1",1) is called':
            topic: (obj) -> obj.set("f1",1)
            'then when toString() is called': tu.contextAssertStringEqual 'INSERT INTO test (f1) VALUES (1)'
            'when set("f1",2) is called':
                topic: (obj) -> obj.set("f1",2)
                'then when toString() is called': tu.contextAssertStringEqual 'INSERT INTO test (f1) VALUES (2)'



suite.addBatch
    'when set("f","v") is called':
        topic: -> inst().set("f","v")
        'when into("test") is called':
            topic: (obj) -> obj.into("test")
            'then when toString() is called': tu.contextAssertStringEqual 'INSERT INTO test (f) VALUES ("v")'
            'then when into("test2") is called':
                topic: (obj) -> obj.into("test2")
                'then when toString() is called': tu.contextAssertStringEqual 'INSERT INTO test2 (f) VALUES ("v")'



suite.export(module)

