squel = undefined

{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()

test['Executor'] =
  beforeEach: ->
    delete require.cache[require.resolve('../dist/squel')]
    squel = require "../dist/squel"

  'should receive query in parameterised form': ->
    squel.setExecutor (paramQuery) ->
      assert typeof paramQuery, 'object'
      assert paramQuery.text, 'SELECT * FROM foo WHERE (bar = ?)'
      assert paramQuery.values[0], '5'
    squel.setFlavour('mysql').select().from('foo').where('bar = ?', 5).execute()

  'should pass through the return value': ->
    squel.useExecutor (paramQuery) ->
      'banana'
    ret = squel.useFlavour('mysql').select().from('foo').where('bar = ?', 5).execute()
    assert ret, 'banana'

module?.exports[require('path').basename(__filename)] = test
