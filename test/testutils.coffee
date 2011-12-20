assert = require "assert"

module?.exports =
    # Get class name of given object.
    getObjectClassName: (obj) ->
        if obj && obj.constructor && obj.constructor.toString
            arr = obj.constructor.toString().match /function\s*(\w+)/;
            if arr && arr.length is 2
                return arr[1]
        return undefined

    funcAssertObjInstance: (expected) ->
        (obj) -> assert.equal module?.exports.getObjectClassName(obj), module?.exports.getObjectClassName(expected)

    contextAssertObjInstance: (expected, topic) ->
        topic: topic
        'the object instance is returned': module?.exports.funcAssertObjInstance(expected)

    contextAssertStringEqual: (expectedStr) ->
        ret = { topic: (obj) -> obj.toString() }
        ret["the string matches: #{expectedStr}"] = (str) ->
            assert.strictEqual str, expectedStr
        ret

    contextFuncThrowsError: (func, errStr) ->
        ret =
            topic: (obj) ->
                try
                    func(obj)
                catch err
                    return err
        ret["error gets thrown: #{errStr}"] = (err) ->
            assert.strictEqual err.toString(), "Error: #{errStr}"
        ret
