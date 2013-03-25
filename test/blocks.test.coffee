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


squel = require "../src/squel"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()



test['Blocks'] =
  'BuildingBlock':
    beforeEach: ->
      @inst = new squel.classes.BuildingBlock()

    'instanceof of BaseBuilder': ->
      assert.instanceOf @inst, squel.classes.BaseBuilder

    'buildStr': ->
      assert.same '', @inst.buildStr()

    'exposedMethods':
      'returns methods': ->
        @inst['method1'] = -> return false
        @inst['method2'] = -> return false

        assert.ok ['method1', 'method2'], (name for name of @inst.exposedMethods())

      'ignores methods prefixed with _': ->
        @inst['_method'] = -> return false

        assert.ok undefined is _.find (name for name of @inst.exposedMethods()), (name) ->
          return name is '_method'

      'ignores buildStr()': ->
        assert.ok undefined is _.find (name for name of @inst.exposedMethods()), (name) ->
          return name is 'buildStr'



  'StringBlock':
    beforeEach: ->
      @inst = new squel.classes.StringBlock()

    'instanceof of BuildingBlock': ->
      assert.instanceOf @inst, squel.classes.BuildingBlock

    'outputs String': ->
      assert.instanceOf @inst, squel.classes.BuildingBlock



module?.exports[require('path').basename(__filename)] = test
