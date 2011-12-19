###
Copyright (c) 2012 Ramesh Nair (hiddentao)

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

# Tests for the SQL expression builder.

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
    'when from("test") is called': contextAssertObjInstance (-> select().from("test"))

suite.addBatch
    'when from("test") is called':
        topic: -> select().from("test")
        'then when toString() is called': contextAssertStringEqual 'SELECT * FROM `test`'
        'then when from("test2") is called':
            topic: (obj) -> obj.from("test2")
            'then when toString() is called': contextAssertStringEqual 'SELECT * FROM `test`, `test2`'
            'then when from("test3","a") is called':
                topic: (obj) -> obj.from("test3","a")
                'then when toString() is called': contextAssertStringEqual 'SELECT * FROM `test`, `test2`, `test3` `a`'



#contextBadArgError = (func, arg) ->
#    topic: ->
#        try
#            switch func
#                when 'and' then select().and(arg)
#                when 'or' then select().or(arg)
#                else throw new Error "Unrecognized func: #{func}"
#        catch err
#            return err
#    'an error gets thrown': (err) ->
#        assert.strictEqual err.toString(), "Error: expr must be a string"
#
#
#suite.addBatch
#    'when calling and() without an argument': contextBadArgError('and', undefined)
#    'when calling and() with an array argument': contextBadArgError('and',  [])
#    'when calling and() with an object argument': contextBadArgError('and',  {a:'a'})
#    'when calling and() with a function argument': contextBadArgError('and',  () -> return 'a')
#    'when calling and() with a string argument': contextAssertObjInstance select().and("test")
#
#
#
#suite.addBatch
#    'when calling or() without an argument': contextBadArgError('or', undefined)
#    'when calling or() with an array argument': contextBadArgError('or', [])
#    'when calling or() with an object argument': contextBadArgError('or', {a:'a'})
#    'when calling or() with a function argument': contextBadArgError('or', () -> return 'a')
#    'when calling or() with a string argument': contextAssertObjInstance select().or("test")
#
#
#
#
#
#suite.addBatch
#    'when and("test = 3") is called':
#        topic: select().and("test = 3")
#        'then when toString() is called': contextAssertStringEqual("test = 3")
#        'then when and("flight = \'4\'") is called':
#            topic: (obj) -> obj.and("flight = '4'")
#            'the object instance is returned': funcAssertObjInstance
#            'then when toString() is called': contextAssertStringEqual "test = 3 AND flight = '4'"
#            'then when or("dummy in (1,2,3)") is called':
#                topic: (obj) -> obj.or("dummy in (1,2,3)")
#                'the object instance is returned': funcAssertObjInstance
#                'then when toString() is called': contextAssertStringEqual "test = 3 AND flight = '4' OR dummy in (1,2,3)"
#
#
#suite.addBatch
#    'when or("test = 3") is called':
#        topic: select().or("test = 3")
#        'then when toString() is called': contextAssertStringEqual "test = 3"
#        'then when or("flight = \'4\'") is called':
#            topic: (obj) -> obj.or("flight = '4'")
#            'the object instance is returned': funcAssertObjInstance
#            'then when toString() is called': contextAssertStringEqual "test = 3 OR flight = '4'"
#            'then when and("dummy in (1,2,3)") is called':
#                topic: (obj) -> obj.and("dummy in (1,2,3)")
#                'the object instance is returned': funcAssertObjInstance
#                'then when toString() is called': contextAssertStringEqual "test = 3 OR flight = '4' AND dummy in (1,2,3)"
#
#
#suite.addBatch
#    'when or("test = 3") is called':
#        topic: select().or("test = 3")
#        'then when and_begin() is called':
#            topic: (obj) -> obj.and_begin()
#            'then when or("inner = 1") is called':
#                topic: (obj) -> obj.or("inner = 1")
#                'then when or("inner = 2") is called':
#                    topic: (obj) -> obj.or("inner = 2")
#                    'then when toString() is called': contextToStringThrowsEndError()
#                    'then when end() is called':
#                        topic: (obj) -> obj.end()
#                        'then when toString() is called': contextAssertStringEqual "test = 3 AND (inner = 1 OR inner = 2)"
#                        'then when end() gets called': contextEndThrowsBeginError()
#                        'then when or_begin() is called':
#                            topic: (obj) -> obj.or_begin()
#                            'then when toString() is called': contextToStringThrowsEndError()
#                            'then when and("inner = 3") is called':
#                                topic: (obj) -> obj.and("inner = 3")
#                                'then when and("inner = 4") is called':
#                                    topic: (obj) -> obj.and("inner = 4")
#                                    'then when or_begin() is called':
#                                        topic: (obj) -> obj.or_begin()
#                                        'then when or("inner = 5") is called':
#                                            topic: (obj) -> obj.or("inner = 5")
#                                            'then when end() is called':
#                                                topic: (obj) -> obj.end()
#                                                'then when toString() is called': contextToStringThrowsEndError()
#                                                'then when end() is called':
#                                                    topic: (obj) -> obj.end()
#                                                    'then when toString() is called': contextAssertStringEqual "test = 3 AND (inner = 1 OR inner = 2) OR (inner = 3 AND inner = 4 OR (inner = 5))"
#


suite.export(module)

