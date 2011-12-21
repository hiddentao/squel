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
expr = (require "../squel.min").expr
tu = require "./testutils"

suite = vows.describe("Expression builder")



contextToStringThrowsEndError = ->
    topic: (obj) ->
        try
            obj.toString()
        catch err
            return err
    'an error gets thrown': (err) ->
        assert.strictEqual err.toString(), "Error: end() needs to be called"

contextEndThrowsBeginError = ->
    topic: (obj) ->
        try
            obj.end()
        catch err
            return err
    'an error gets thrown': (err) ->
        assert.strictEqual err.toString(), "Error: begin() needs to be called"



suite.addBatch
    'when the builder is initialized':
        topic: expr()
        'calling toString() gives an empty string': (builder) ->
            assert.isEmpty builder.toString()
        'then when end() gets called': tu.contextFuncThrowsError ((obj)-> obj.end()), "begin() needs to be called"
    'when and_begin() gets called':
        topic: expr().and_begin()
        'the object instance is returned': tu.funcAssertObjInstance(expr())
        'then when toString() gets called': contextToStringThrowsEndError()
    'when and_begin() gets called followed by end()':
        topic: expr().and_begin().end()
        'the object instance is returned': tu.funcAssertObjInstance(expr())
        'calling toString() gives an empty string': (obj) ->
            assert.isEmpty obj.toString()
    'when or_begin() gets called':
        topic: expr().or_begin()
        'the object instance is returned': tu.funcAssertObjInstance(expr())
        'then when toString() is called':  contextToStringThrowsEndError()
    'when or_begin() gets called followed by end()':
        topic: expr().or_begin().end()
        'the object instance is returned': tu.funcAssertObjInstance(expr())
        'calling toString() gives an empty string': (obj) ->
            assert.isEmpty obj.toString()



contextBadArgError = (func, arg) ->
    topic: ->
        try
            switch func
                when 'and' then expr().and(arg)
                when 'or' then expr().or(arg)
                else throw new Error "Unrecognized func: #{func}"
        catch err
            return err
    'an error gets thrown': (err) ->
        assert.strictEqual err.toString(), "Error: expr must be a string"


suite.addBatch
    'when calling and() without an argument': contextBadArgError('and', undefined)
    'when calling and() with an array argument': contextBadArgError('and',  [])
    'when calling and() with an object argument': contextBadArgError('and',  {a:'a'})
    'when calling and() with a function argument': contextBadArgError('and',  () -> return 'a')
    'when calling and() with a string argument': tu.contextAssertObjInstance( expr(), expr().and("test") )



suite.addBatch
    'when calling or() without an argument': contextBadArgError('or', undefined)
    'when calling or() with an array argument': contextBadArgError('or', [])
    'when calling or() with an object argument': contextBadArgError('or', {a:'a'})
    'when calling or() with a function argument': contextBadArgError('or', () -> return 'a')
    'when calling or() with a string argument': tu.contextAssertObjInstance( expr(), expr().or("test") )





suite.addBatch
    'when and("test = 3") is called':
        topic: expr().and("test = 3")
        'then when toString() is called': tu.contextAssertStringEqual("test = 3")
        'then when and("flight = \'4\'") is called':
            topic: (obj) -> obj.and("flight = '4'")
            'the object instance is returned': tu.funcAssertObjInstance(expr())
            'then when toString() is called': tu.contextAssertStringEqual "test = 3 AND flight = '4'"
            'then when or("dummy in (1,2,3)") is called':
                topic: (obj) -> obj.or("dummy in (1,2,3)")
                'the object instance is returned': tu.funcAssertObjInstance(expr())
                'then when toString() is called': tu.contextAssertStringEqual "test = 3 AND flight = '4' OR dummy in (1,2,3)"


suite.addBatch
    'when or("test = 3") is called':
        topic: expr().or("test = 3")
        'then when toString() is called': tu.contextAssertStringEqual "test = 3"
        'then when or("flight = \'4\'") is called':
            topic: (obj) -> obj.or("flight = '4'")
            'the object instance is returned': tu.funcAssertObjInstance(expr())
            'then when toString() is called': tu.contextAssertStringEqual "test = 3 OR flight = '4'"
            'then when and("dummy in (1,2,3)") is called':
                topic: (obj) -> obj.and("dummy in (1,2,3)")
                'the object instance is returned': tu.funcAssertObjInstance(expr())
                'then when toString() is called': tu.contextAssertStringEqual "test = 3 OR flight = '4' AND dummy in (1,2,3)"


suite.addBatch
    'when or("test = 3") is called':
        topic: expr().or("test = 3")
        'then when and_begin() is called':
            topic: (obj) -> obj.and_begin()
            'then when or("inner = 1") is called':
                topic: (obj) -> obj.or("inner = 1")
                'then when or("inner = 2") is called':
                    topic: (obj) -> obj.or("inner = 2")
                    'then when toString() is called': contextToStringThrowsEndError()
                    'then when end() is called':
                        topic: (obj) -> obj.end()
                        'then when toString() is called': tu.contextAssertStringEqual "test = 3 AND (inner = 1 OR inner = 2)"
                        'then when end() gets called': contextEndThrowsBeginError()
                        'then when or_begin() is called':
                            topic: (obj) -> obj.or_begin()
                            'then when toString() is called': contextToStringThrowsEndError()
                            'then when and("inner = 3") is called':
                                topic: (obj) -> obj.and("inner = 3")
                                'then when and("inner = 4") is called':
                                    topic: (obj) -> obj.and("inner = 4")
                                    'then when or_begin() is called':
                                        topic: (obj) -> obj.or_begin()
                                        'then when or("inner = 5") is called':
                                            topic: (obj) -> obj.or("inner = 5")
                                            'then when end() is called':
                                                topic: (obj) -> obj.end()
                                                'then when toString() is called': contextToStringThrowsEndError()
                                                'then when end() is called':
                                                    topic: (obj) -> obj.end()
                                                    'then when toString() is called': tu.contextAssertStringEqual "test = 3 AND (inner = 1 OR inner = 2) OR (inner = 3 AND inner = 4 OR (inner = 5))"



suite.export(module)

