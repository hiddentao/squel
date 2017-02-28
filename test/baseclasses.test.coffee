###
Copyright (c) 2014 Ramesh Nair (hiddentao.com)

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


squel = require "../dist/squel-basic"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()

test['Version number'] =
  assert.same squel.VERSION, require('../package.json').version

test['Default flavour'] =
  assert.isNull squel.flavour


test['Cloneable base class'] =
  '>> clone()': ->

    class Child extends squel.cls.Cloneable
      constructor: ->
        @a = 1
        @b = 2.2
        @c = true
        @d = 'str'
        @e = [1]
        @f = { a: 1 }

    child = new Child()

    copy = child.clone()
    assert.instanceOf copy, Child

    child.a = 2
    child.b = 3.2
    child.c = false
    child.d = 'str2'
    child.e.push(2)
    child.f.b = 1

    assert.same copy.a, 1
    assert.same copy.b, 2.2
    assert.same copy.c, true
    assert.same copy.d, 'str'
    assert.same copy.e, [1]
    assert.same copy.f, { a: 1 }


test['Default query builder options'] =
  'default options': ->
    assert.same {
      autoQuoteTableNames: false
      autoQuoteFieldNames: false
      autoQuoteAliasNames: true
      useAsForTableAliasNames: false
      nameQuoteCharacter: '`'
      tableAliasQuoteCharacter: '`'
      fieldAliasQuoteCharacter: '"'
      valueHandlers: []
      parameterCharacter: '?'
      numberedParameters: false
      numberedParametersPrefix: '$'
      numberedParametersStartAt: 1
      replaceSingleQuotes: false
      singleQuoteReplacement: '\'\''
      separator: ' '
      stringFormatter: null
      rawNesting: false
    }, squel.cls.DefaultQueryBuilderOptions



test['Register global custom value handler'] =
  'beforeEach': ->
    @originalHandlers = [].concat(squel.cls.globalValueHandlers)
    squel.cls.globalValueHandlers = []
  'afterEach': ->
    squel.cls.globalValueHandlers = @originalHandlers
  'default': ->
    handler = -> 'test'
    squel.registerValueHandler(Date, handler)
    squel.registerValueHandler(Object, handler)
    squel.registerValueHandler('boolean', handler)

    assert.same 3, squel.cls.globalValueHandlers.length
    assert.same { type: Date, handler: handler }, squel.cls.globalValueHandlers[0]
    assert.same { type: Object, handler: handler }, squel.cls.globalValueHandlers[1]
    assert.same { type: 'boolean', handler: handler }, squel.cls.globalValueHandlers[2]

  'type should be class constructor': ->
    assert.throws (-> squel.registerValueHandler 1, null), "type must be a class constructor or string"

  'handler should be function': ->
    class MyClass
    assert.throws (-> squel.registerValueHandler MyClass, 1), 'handler must be a function'

  'overrides existing handler': ->
    handler = -> 'test'
    handler2 = -> 'test2'
    squel.registerValueHandler(Date, handler)
    squel.registerValueHandler(Date, handler2)

    assert.same 1, squel.cls.globalValueHandlers.length
    assert.same { type: Date, handler: handler2 }, squel.cls.globalValueHandlers[0]


test['str()'] =
  constructor: ->
    f = squel.str('GETDATE(?)', 12, 23)
    assert.ok (f instanceof squel.cls.FunctionBlock)
    assert.same 'GETDATE(?)', f._strings[0]
    assert.same [12, 23], f._values[0]

  'custom value handler':
    beforeEach: ->
      @inst = squel.str('G(?,?)', 12, 23, 65)

      handlerConfig = _.find squel.cls.globalValueHandlers, (hc) ->
        hc.type is squel.cls.FunctionBlock

      @handler = handlerConfig.handler

    toString: ->
      assert.same @inst.toString(), @handler(@inst)
    toParam: ->
      assert.same @inst.toParam(), @handler(@inst, true)


test['rstr()'] =
  constructor: ->
    f = squel.rstr('GETDATE(?)', 12, 23)
    assert.ok (f instanceof squel.cls.FunctionBlock)
    assert.same 'GETDATE(?)', f._strings[0]
    assert.same [12, 23], f._values[0]

  vsStr: ->
    f1 = squel.str('OUTER(?)', squel.str('INNER(?)', 2))
    assert.same 'OUTER((INNER(2)))', f1.toString()
    f2 = squel.str('OUTER(?)', squel.rstr('INNER(?)', 2))
    assert.same 'OUTER(INNER(2))', f2.toString()

  'custom value handler':
    beforeEach: ->
      @inst = squel.rstr('G(?,?)', 12, 23, 65)

      handlerConfig = _.find squel.cls.globalValueHandlers, (hc) ->
        hc.type is squel.cls.FunctionBlock

      @handler = handlerConfig.handler

    toString: ->
      assert.same @inst.toString(), @handler(@inst)
    toParam: ->
      assert.same @inst.toParam(), @handler(@inst, true)


test['Load an SQL flavour'] =
  beforeEach: ->
    @flavoursBackup = squel.flavours
    squel.flavours = {}

  afterEach: ->
    squel.flavours = @flavoursBackup

  'invalid flavour': ->
    assert.throws (-> squel.useFlavour 'test'), 'Flavour not available: test'

  'flavour reference should be a function': ->
    squel.flavours['test'] = 'blah'
    assert.throws (-> squel.useFlavour 'test'), 'Flavour not available: test'

  'flavour setup function gets executed': ->
    squel.flavours['test'] = test.mocker.spy()
    ret = squel.useFlavour 'test'
    assert.ok squel.flavours['test'].calledOnce
    assert.ok !!ret.select()

  'can switch flavours': ->
    squel.flavours['test'] = test.mocker.spy( (s) ->
      s.cls.dummy = 1
    )
    squel.flavours['test2'] = test.mocker.spy( (s) ->
      s.cls.dummy2 = 2
    )
    ret = squel.useFlavour 'test'
    assert.same ret.cls.dummy, 1

    ret = squel.useFlavour 'test2'
    assert.same ret.cls.dummy, undefined
    assert.same ret.cls.dummy2, 2

    ret = squel.useFlavour()
    assert.same ret.cls.dummy, undefined
    assert.same ret.cls.dummy2, undefined

  'can get current flavour': ->
    flavour = 'test'
    squel.flavours[flavour] = test.mocker.spy()

    ret = squel.useFlavour flavour
    assert.same ret.flavour, flavour

  'can mix flavours - #255': ->
    squel.flavours.flavour1 = (s) -> s
    squel.flavours.flavour2 = (s) -> s
    squel1 = squel.useFlavour 'flavour1'
    squel2 = squel.useFlavour 'flavour2'

    expr1 = squel1.expr().and('1 = 1')
    assert.same squel2.select().from('test', 't').where(expr1).toString(), 'SELECT * FROM test `t` WHERE (1 = 1)'



test['Builder base class'] =
  beforeEach: ->
    @cls = squel.cls.BaseBuilder
    @inst = new @cls

    @originalHandlers = [].concat(squel.cls.globalValueHandlers)

  afterEach: ->
    squel.cls.globalValueHandlers = @originalHandlers

  'instanceof Cloneable': ->
    assert.instanceOf @inst, squel.cls.Cloneable

  'constructor':
    'default options': ->
      assert.same squel.cls.DefaultQueryBuilderOptions, @inst.options

    'overridden options': ->
      @inst = new @cls
        dummy1: 'str'
        dummy2: 12.3
        usingValuePlaceholders: true
        dummy3: true,
        globalValueHandlers: [1]

      expectedOptions = _.extend {}, squel.cls.DefaultQueryBuilderOptions,
        dummy1: 'str'
        dummy2: 12.3
        usingValuePlaceholders: true
        dummy3: true
        globalValueHandlers: [1]

      assert.same expectedOptions, @inst.options


  'registerValueHandler':
    'afterEach': ->
      squel.cls.globalValueHandlers = []

    'default': ->
      handler = -> 'test'
      @inst.registerValueHandler(Date, handler)
      @inst.registerValueHandler(Object, handler)
      @inst.registerValueHandler('number', handler)

      assert.same 3, @inst.options.valueHandlers.length
      assert.same { type: Date, handler: handler }, @inst.options.valueHandlers[0]
      assert.same { type: Object, handler: handler }, @inst.options.valueHandlers[1]
      assert.same { type: 'number', handler: handler }, @inst.options.valueHandlers[2]

    'type should be class constructor': ->
      assert.throws (=> @inst.registerValueHandler 1, null), "type must be a class constructor or string"

    'handler should be function': ->
      class MyClass
      assert.throws (=> @inst.registerValueHandler MyClass, 1), 'handler must be a function'

    'returns instance for chainability': ->
      handler = -> 'test'
      assert.same @inst, @inst.registerValueHandler(Date, handler)

    'overrides existing handler': ->
      handler = -> 'test'
      handler2 = -> 'test2'
      @inst.registerValueHandler(Date, handler)
      @inst.registerValueHandler(Date, handler2)

      assert.same 1, @inst.options.valueHandlers.length
      assert.same { type: Date, handler: handler2 }, @inst.options.valueHandlers[0]

    'does not touch global value handlers list': ->
      oldGlobalHandlers = squel.cls.globalValueHandlers

      handler = -> 'test'
      @inst.registerValueHandler(Date, handler)

      assert.same oldGlobalHandlers, squel.cls.globalValueHandlers


  '_sanitizeExpression':
    'if Expression':
      'empty expression': ->
        e = squel.expr()
        assert.same e, @inst._sanitizeExpression(e)
      'non-empty expression': ->
        e = squel.expr().and("s.name <> 'Fred'")
        assert.same e, @inst._sanitizeExpression(e)

    'if Expression': ->
      s = squel.str('s')
      assert.same s, @inst._sanitizeExpression(s)

    'if string': ->
      s = 'BLA BLA'
      assert.same 'BLA BLA', @inst._sanitizeExpression(s)

    'if neither expression, builder nor String': ->
      testFn = => @inst._sanitizeExpression(1)
      assert.throws testFn, 'expression must be a string or builder instance'


  '_sanitizeName':
    beforeEach: ->
      test.mocker.spy @inst, '_sanitizeName'

    'if string': ->
      assert.same 'bla', @inst._sanitizeName('bla')

    'if boolean': ->
      assert.throws (=> @inst._sanitizeName(true, 'bla')), 'bla must be a string'

    'if integer': ->
      assert.throws (=> @inst._sanitizeName(1)), 'undefined must be a string'

    'if float': ->
      assert.throws (=> @inst._sanitizeName(1.2, 'meh')), 'meh must be a string'

    'if array': ->
      assert.throws (=> @inst._sanitizeName([1], 'yes')), 'yes must be a string'

    'if object': ->
      assert.throws (=> @inst._sanitizeName(new Object, 'yes')), 'yes must be a string'

    'if null': ->
      assert.throws (=> @inst._sanitizeName(null, 'no')), 'no must be a string'

    'if undefined': ->
      assert.throws (=> @inst._sanitizeName(undefined, 'no')), 'no must be a string'


  '_sanitizeField':
    'default': ->
      test.mocker.spy @inst, '_sanitizeName'

      assert.same 'abc', @inst._sanitizeField('abc')

      assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'field name'

    'QueryBuilder': ->
      s = squel.select().from('scores').field('MAX(score)')
      assert.same s, @inst._sanitizeField(s)


  '_sanitizeBaseBuilder':
    'is not base builder': ->
      assert.throws (=> @inst._sanitizeBaseBuilder(null)), 'must be a builder instance'

    'is a query builder': ->
      qry = squel.select()
      assert.same qry, @inst._sanitizeBaseBuilder(qry)


  '_sanitizeTable':
    'default': ->
      test.mocker.spy @inst, '_sanitizeName'

      assert.same 'abc', @inst._sanitizeTable('abc')

      assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'table'

    'not a string': ->
      assert.throws (=> @inst._sanitizeTable(null)), 'table name must be a string or a builder'

    'query builder': ->
      select = squel.select()
      assert.same select, @inst._sanitizeTable(select, true)


  '_sanitizeFieldAlias': ->
    'default': ->
      test.mocker.spy @inst, '_sanitizeName'

      @inst._sanitizeFieldAlias('abc')

      assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'field alias'


  '_sanitizeTableAlias': ->
    'default': ->
      test.mocker.spy @inst, '_sanitizeName'

      @inst._sanitizeTableAlias('abc')

      assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'table alias'

  '_sanitizeLimitOffset':
    'undefined': ->
      assert.throws (=> @inst._sanitizeLimitOffset()), 'limit/offset must be >= 0'

    'null': ->
      assert.throws (=> @inst._sanitizeLimitOffset null), 'limit/offset must be >= 0'

    'float': ->
      assert.same 1, @inst._sanitizeLimitOffset 1.2

    'boolean': ->
      assert.throws (=> @inst._sanitizeLimitOffset false), 'limit/offset must be >= 0'

    'string': ->
      assert.same 2, @inst._sanitizeLimitOffset '2'

    'array': ->
      assert.same 3, @inst._sanitizeLimitOffset [3]

    'object': ->
      assert.throws (=> @inst._sanitizeLimitOffset(new Object)), 'limit/offset must be >= 0'

    'number >= 0': ->
      assert.same 0, @inst._sanitizeLimitOffset 0
      assert.same 1, @inst._sanitizeLimitOffset 1

    'number < 0': ->
      assert.throws (=> @inst._sanitizeLimitOffset(-1)), 'limit/offset must be >= 0'



  '_sanitizeValue':
    beforeEach: ->
      test.mocker.spy @inst, '_sanitizeValue'

    afterEach: ->
      squel.cls.globalValueHandlers = []

    'if string': ->
      assert.same 'bla', @inst._sanitizeValue('bla')

    'if boolean': ->
      assert.same true, @inst._sanitizeValue(true)
      assert.same false, @inst._sanitizeValue(false)

    'if integer': ->
      assert.same -1, @inst._sanitizeValue(-1)
      assert.same 0, @inst._sanitizeValue(0)
      assert.same 1, @inst._sanitizeValue(1)

    'if float': ->
      assert.same -1.2, @inst._sanitizeValue(-1.2)
      assert.same 1.2, @inst._sanitizeValue(1.2)

    'if array': ->
      assert.throws (=> @inst._sanitizeValue([1])), 'field value must be a string, number, boolean, null or one of the registered custom value types'

    'if object': ->
      assert.throws (=> @inst._sanitizeValue(new Object)), 'field value must be a string, number, boolean, null or one of the registered custom value types'

    'if null': ->
      assert.same null, @inst._sanitizeValue(null)

    'if BaseBuilder': ->
      s = squel.select()
      assert.same s, @inst._sanitizeValue(s)

    'if undefined': ->
      assert.throws (=> @inst._sanitizeValue(undefined)), 'field value must be a string, number, boolean, null or one of the registered custom value types'

    'custom handlers':
      'global': ->
        squel.registerValueHandler(Date, _.identity)
        date = new Date
        assert.same date, @inst._sanitizeValue(date)

      'instance': ->
        @inst.registerValueHandler(Date, _.identity)
        date = new Date
        assert.same date, @inst._sanitizeValue(date)


  '_escapeValue': ->
      @inst.options.replaceSingleQuotes = false
      assert.same "te'st", @inst._escapeValue("te'st")

      @inst.options.replaceSingleQuotes = true
      assert.same "te''st", @inst._escapeValue("te'st")

      @inst.options.singleQuoteReplacement = '--'
      assert.same "te--st", @inst._escapeValue("te'st")

  '_formatTableName':
    'default': ->
      assert.same 'abc', @inst._formatTableName('abc')

    'auto quote names':
      beforeEach: ->
        @inst.options.autoQuoteTableNames = true

      'default quote character': ->
        assert.same '`abc`', @inst._formatTableName('abc')

      'custom quote character': ->
        @inst.options.nameQuoteCharacter = '|'
        assert.same '|abc|', @inst._formatTableName('abc')


  '_formatTableAlias':
    'default': ->
      assert.same '`abc`', @inst._formatTableAlias('abc')

    'custom quote character': ->
      @inst.options.tableAliasQuoteCharacter = '~'
      assert.same '~abc~', @inst._formatTableAlias('abc')

    'auto quote alias names is OFF': ->
      @inst.options.autoQuoteAliasNames = false
      assert.same 'abc', @inst._formatTableAlias('abc')

    'AS is turned ON': ->
      @inst.options.autoQuoteAliasNames = false
      @inst.options.useAsForTableAliasNames = true
      assert.same 'AS abc', @inst._formatTableAlias('abc')



  '_formatFieldAlias':
    default: ->
      assert.same '"abc"', @inst._formatFieldAlias('abc')

    'custom quote character': ->
      @inst.options.fieldAliasQuoteCharacter = '~'
      assert.same '~abc~', @inst._formatFieldAlias('abc')

    'auto quote alias names is OFF': ->
      @inst.options.autoQuoteAliasNames = false
      assert.same 'abc', @inst._formatFieldAlias('abc')


  '_formatFieldName':
    default: ->
      assert.same 'abc', @inst._formatFieldName('abc')

    'auto quote names':
      beforeEach: ->
        @inst.options.autoQuoteFieldNames = true

      'default quote character': ->
        assert.same '`abc`.`def`', @inst._formatFieldName('abc.def')

      'do not quote *': ->
        assert.same '`abc`.*', @inst._formatFieldName('abc.*')

      'custom quote character': ->
        @inst.options.nameQuoteCharacter = '|'
        assert.same '|abc|.|def|', @inst._formatFieldName('abc.def')

      'ignore periods when quoting': ->
        assert.same '`abc.def`', @inst._formatFieldName('abc.def', ignorePeriodsForFieldNameQuotes: true)


  '_formatCustomValue':
    'not a custom value type': ->
      assert.same { formatted: false, value: null }, @inst._formatCustomValue(null)
      assert.same { formatted: false, value: 'abc' }, @inst._formatCustomValue('abc')
      assert.same { formatted: false, value: 12 }, @inst._formatCustomValue(12)
      assert.same { formatted: false, value: 1.2 }, @inst._formatCustomValue(1.2)
      assert.same { formatted: false, value: true }, @inst._formatCustomValue(true)
      assert.same { formatted: false, value: false }, @inst._formatCustomValue(false)

    'custom value type':
      'global': ->
        class MyClass
        myObj = new MyClass

        squel.registerValueHandler MyClass, () -> 3.14
        squel.registerValueHandler 'boolean', (v) -> 'a' + v

        assert.same { formatted: true, value: 3.14 }, @inst._formatCustomValue(myObj)
        assert.same { formatted: true, value: 'atrue' }, @inst._formatCustomValue(true)

      'instance': ->
        class MyClass
        myObj = new MyClass

        @inst.registerValueHandler MyClass, () -> 3.14
        @inst.registerValueHandler 'number', (v) -> v + 'a'

        assert.same { formatted: true, value: 3.14}, @inst._formatCustomValue(myObj)
        assert.same { formatted: true, value: '5.2a'}, @inst._formatCustomValue(5.2)

      'instance handler takes precedence over global': ->
        @inst.registerValueHandler Date, (d) -> 'hello'
        squel.registerValueHandler Date, (d) -> 'goodbye'

        assert.same { formatted: true, value: "hello"}, @inst._formatCustomValue(new Date)

        @inst = new @cls
          valueHandlers: []
        assert.same { formatted: true, value: "goodbye"}, @inst._formatCustomValue(new Date)

      'whether to format for parameterized output': ->
        @inst.registerValueHandler Date, (d, asParam) ->
          return if asParam then 'foo' else 'bar'

        val = new Date()

        assert.same { formatted: true, value: 'foo'}, @inst._formatCustomValue(val, true)
        assert.same { formatted: true, value: 'bar'}, @inst._formatCustomValue(val)

      'additional formatting options': ->
        @inst.registerValueHandler Date, (d, asParam, options) ->
          return if options.dontQuote then 'foo' else '"foo"'

        val = new Date()

        assert.same { formatted: true, value: 'foo'}, @inst._formatCustomValue(val, true, { dontQuote: true })
        assert.same { formatted: true, value: '"foo"'}, @inst._formatCustomValue(val, true, { dontQuote: false })

  '_formatValueForParamArray':
    'Query builder': ->
      s = squel.select().from('table')
      assert.same s, @inst._formatValueForParamArray(s)

    'else calls _formatCustomValue': ->
      spy = test.mocker.stub @inst, '_formatCustomValue', (v, asParam) ->
        { formatted: true, value: 'test' + (if asParam then 'foo' else 'bar') }

      assert.same 'testfoo', @inst._formatValueForParamArray(null)
      assert.same 'testfoo', @inst._formatValueForParamArray('abc')
      assert.same 'testfoo', @inst._formatValueForParamArray(12)
      assert.same 'testfoo', @inst._formatValueForParamArray(1.2)

      opts = { dummy: true }
      assert.same 'testfoo', @inst._formatValueForParamArray(true, opts)

      assert.same 'testfoo', @inst._formatValueForParamArray(false)

      assert.same 6, spy.callCount

      assert.same spy.getCall(4).args[2], opts

    'Array - recursively calls itself on each element': ->
      spy = test.mocker.spy @inst, '_formatValueForParamArray'

      v = [ squel.select().from('table'), 1.2 ]

      opts = { dummy: true }
      res = @inst._formatValueForParamArray(v, opts)

      assert.same v, res

      assert.same 3, spy.callCount
      assert.ok spy.calledWith v[0]
      assert.ok spy.calledWith v[1]

      assert.same spy.getCall(1).args[1], opts


  '_formatValueForQueryString':
    'null': ->
      assert.same 'NULL', @inst._formatValueForQueryString(null)

    'boolean': ->
      assert.same 'TRUE', @inst._formatValueForQueryString(true)
      assert.same 'FALSE', @inst._formatValueForQueryString(false)

    'integer': ->
      assert.same 12, @inst._formatValueForQueryString(12)

    'float': ->
      assert.same 1.2, @inst._formatValueForQueryString(1.2)

    'string':
      'have string formatter function': ->
        @inst.options.stringFormatter = (str) -> "N(#{str})"

        assert.same "N(test)", @inst._formatValueForQueryString('test')

      'default': ->
        escapedValue = undefined
        test.mocker.stub @inst, '_escapeValue', (str) -> escapedValue or str

        assert.same "'test'", @inst._formatValueForQueryString('test')

        assert.same "'test'", @inst._formatValueForQueryString('test')
        assert.ok @inst._escapeValue.calledWithExactly('test')
        escapedValue = 'blah'
        assert.same "'blah'", @inst._formatValueForQueryString('test')

      'dont quote': ->
        escapedValue = undefined
        test.mocker.stub @inst, '_escapeValue', (str) -> escapedValue or str

        assert.same "test", @inst._formatValueForQueryString('test', dontQuote: true )

        assert.ok @inst._escapeValue.notCalled

    'Array - recursively calls itself on each element': ->
      spy = test.mocker.spy @inst, '_formatValueForQueryString'

      expected = "('test', 123, TRUE, 1.2, NULL)"
      assert.same expected, @inst._formatValueForQueryString([ 'test', 123, true, 1.2, null ])

      assert.same 6, spy.callCount
      assert.ok spy.calledWith 'test'
      assert.ok spy.calledWith 123
      assert.ok spy.calledWith true
      assert.ok spy.calledWith 1.2
      assert.ok spy.calledWith null

    'BaseBuilder': ->
      spy = test.mocker.stub @inst, '_applyNestingFormatting', (v) => "{{#{v}}}"
      s = squel.select().from('table')
      assert.same '{{SELECT * FROM table}}', @inst._formatValueForQueryString(s)

    'checks to see if it is custom value type first': ->
      test.mocker.stub @inst, '_formatCustomValue', (val, asParam) ->
        { formatted: true, value: 12 + (if asParam then 25 else 65) }
      test.mocker.stub @inst, '_applyNestingFormatting', (v) -> "{#{v}}"
      assert.same '{77}', @inst._formatValueForQueryString(123)


  '_applyNestingFormatting':
    default: ->
      assert.same '(77)', @inst._applyNestingFormatting('77')
      assert.same '((77)', @inst._applyNestingFormatting('(77')
      assert.same '(77))', @inst._applyNestingFormatting('77)')
      assert.same '(77)', @inst._applyNestingFormatting('(77)')
    'no nesting': ->
      assert.same '77', @inst._applyNestingFormatting('77', false)
    'rawNesting turned on': ->
      @inst = new @cls({ rawNesting: true })
      assert.same '77', @inst._applyNestingFormatting('77')


  '_buildString':
    'empty': ->
      assert.same @inst._buildString('', []), {
        text: '',
        values: [],
      }
    'no params':
      'non-parameterized': ->
        assert.same @inst._buildString('abc = 3', []), {
          text: 'abc = 3',
          values: []
        }
      'parameterized': ->
        assert.same @inst._buildString('abc = 3', [], { buildParameterized: true }), {
          text: 'abc = 3',
          values: []
        }
    'non-array':
      'non-parameterized': ->
        assert.same @inst._buildString('a = ? ? ? ?', [2, 'abc', false, null]), {
          text: 'a = 2 \'abc\' FALSE NULL',
          values: []
        }
      'parameterized': ->
        assert.same @inst._buildString('a = ? ? ? ?', [2, 'abc', false, null], { buildParameterized: true }), {
          text: 'a = ? ? ? ?',
          values: [2, 'abc', false, null]
        }
    'array': ->
      'non-parameterized': ->
        assert.same @inst._buildString('a = ?', [[1,2,3]]), {
          text: 'a = (1, 2, 3)',
          values: [],
        }
      'parameterized': ->
        assert.same @inst._buildString('a = ?', [[1,2,3]], { buildParameterized: true }), {
          text: 'a = (?, ?, ?)',
          values: [1, 2, 3]
        }
    'nested builder': ->
      beforeEach:
        @s = squel.select().from('master').where('b = ?', 5)
      'non-parameterized': ->
        assert.same @inst._buildString('a = ?', [@s]), {
          text: 'a = (SELECT * FROM master WHERE (b = ?))',
          values: [5]
        }
      'parameterized': ->
        assert.same @inst._buildString('a = ?', [@s], { buildParameterized: true }), {
          text: 'a = (SELECT * FROM master WHERE (b = ?))',
          values: [5]
        }
    'return nested output':
      'non-parameterized': ->
        assert.same @inst._buildString('a = ?', [3], { nested: true }), {
          text: '(a = 3)',
          values: []
        }
      'parameterized': ->
        assert.same @inst._buildString('a = ?', [3], { buildParameterized: true, nested: true }), {
          text: '(a = ?)',
          values: [3]
        }
    'string formatting options': ->
      options =
        formattingOptions:
          dontQuote: true

      assert.same @inst._buildString('a = ?', ['NOW()'], options), {
        text: 'a = NOW()',
        values: []
      }
    'passes formatting options even when doing parameterized query': ->
      spy = test.mocker.spy @inst, '_formatValueForParamArray'

      options =
        buildParameterized: true
        formattingOptions:
          dontQuote: true

      @inst._buildString('a = ?', [3], options)

      assert.same spy.getCall(0).args[1], options.formattingOptions
    'custom parameter character': ->
      beforeEach: ->
        @inst.options.parameterCharacter = '@@'

      'non-parameterized': ->
        assert.same @inst._buildString('a = @@', [[1,2,3]]), {
          text: 'a = (1, 2, 3)',
          values: [],
        }
      'parameterized': ->
        assert.same @inst._buildString('a = @@', [[1,2,3]]), {
          text: 'a = (@@, @@, @@)',
          values: [1,2,3],
        }

  '_buildManyStrings':
    'empty': ->
      assert.same @inst._buildManyStrings([], []), {
        text: '',
        values: [],
      }
    'simple':
      beforeEach: ->
        @strings = [
          'a = ?',
          'b IN ? AND c = ?'
        ]

        @values = [
          ['elephant'],
          [[1,2,3], 4]
        ]

      'non-parameterized': ->
        assert.same @inst._buildManyStrings(@strings, @values), {
          text: 'a = \'elephant\' b IN (1, 2, 3) AND c = 4',
          values: [],
        }
      'parameterized': ->
        assert.same @inst._buildManyStrings(@strings, @values, { buildParameterized: true }), {
          text: 'a = ? b IN (?, ?, ?) AND c = ?',
          values: ['elephant', 1, 2, 3, 4],
        }

    'return nested': ->
      'non-parameterized': ->
        assert.same @inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]], { nested: true }), {
          text: '(a = 1 b = 2)',
          values: [],
        }
      'parameterized': ->
        assert.same @inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]], { buildParameterized: true, nested: true }), {
          text: '(a = ? b = ?)',
          values: [1, 2],
        }

    'custom separator': ->
      'non-parameterized': ->
        @inst.options.separator = '|'
        assert.same @inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]]), {
          text: '(a = 1|b = 2)',
          values: [],
        }
      'parameterized': ->
        assert.same @inst._buildManyStrings(['a = ?', 'b = ?'], [[1], [2]], { buildParameterized: true}), {
          text: '(a = ?|b = ?)',
          values: [1, 2],
        }

  'toParam': ->
    spy = test.mocker.stub @inst, '_toParamString', ->
      {
        text: 'dummy'
        values: [1]
      }

    options = {test: 2}
    assert.same @inst.toParam(options), {
      text: 'dummy'
      values: [1]
    }

    spy.should.have.been.calledOnce
    assert.same spy.getCall(0).args[0].test, 2
    assert.same spy.getCall(0).args[0].buildParameterized, true

  'toString': ->
    spy = test.mocker.stub @inst, '_toParamString', ->
      {
        text: 'dummy'
        values: [1]
      }

    options = {test: 2}
    assert.same @inst.toString(options), 'dummy'

    spy.should.have.been.calledOnce
    assert.same spy.getCall(0).args[0], options


test['QueryBuilder base class'] =
  beforeEach: ->
    @cls = squel.cls.QueryBuilder
    @inst = new @cls

  'instanceof base builder': ->
    assert.instanceOf @inst, squel.cls.BaseBuilder

  'constructor':
    'default options': ->
      assert.same squel.cls.DefaultQueryBuilderOptions, @inst.options

    'overridden options': ->
      @inst = new @cls
        dummy1: 'str'
        dummy2: 12.3
        usingValuePlaceholders: true
        dummy3: true

      expectedOptions = _.extend {}, squel.cls.DefaultQueryBuilderOptions,
        dummy1: 'str'
        dummy2: 12.3
        usingValuePlaceholders: true
        dummy3: true

      assert.same expectedOptions, @inst.options

    'default blocks - none': ->
      assert.same [], @inst.blocks

    'blocks passed in':
      'exposes block methods': ->
        limitExposedMethodsSpy = test.mocker.spy(squel.cls.LimitBlock.prototype, 'exposedMethods');
        distinctExposedMethodsSpy = test.mocker.spy(squel.cls.DistinctBlock.prototype, 'exposedMethods');
        limitSpy = test.mocker.spy(squel.cls.LimitBlock.prototype, 'limit')
        distinctSpy = test.mocker.spy(squel.cls.DistinctBlock.prototype, 'distinct')

        blocks = [
          new squel.cls.LimitBlock(),
          new squel.cls.DistinctBlock()
        ]

        @inst = new @cls({}, blocks)

        assert.ok limitExposedMethodsSpy.calledOnce
        assert.ok distinctExposedMethodsSpy.calledOnce

        assert.typeOf @inst.distinct, 'function'
        assert.typeOf @inst.limit, 'function'

        assert.same @inst, @inst.limit(2)
        assert.ok limitSpy.calledOnce
        assert.ok limitSpy.calledOn(blocks[0])

        assert.same @inst, @inst.distinct()
        assert.ok distinctSpy.calledOnce
        assert.ok distinctSpy.calledOn(blocks[1])


      'cannot expose the same method twice': ->
        blocks = [
          new squel.cls.DistinctBlock(),
          new squel.cls.DistinctBlock()
        ]

        try
          @inst = new @cls({}, blocks)
          throw new Error 'should not reach here'
        catch err
          assert.same 'Error: Builder already has a builder method called: distinct', err.toString()


  'updateOptions()':
    'updates query builder options': ->
      oldOptions = _.extend({}, @inst.options)

      @inst.updateOptions
        updated: false

      expected = _.extend oldOptions,
        updated: false

      assert.same expected, @inst.options

    'updates building block options': ->
      @inst.blocks = [
        new squel.cls.Block()
      ]
      oldOptions = _.extend({}, @inst.blocks[0].options)

      @inst.updateOptions
        updated: false

      expected = _.extend oldOptions,
        updated: false

      assert.same expected, @inst.blocks[0].options



  'toString()':
    'returns empty if no blocks': ->
      assert.same '', @inst.toString()

    'skips empty block strings': ->
      @inst.blocks = [
        new squel.cls.StringBlock({}, ''),
      ]

      assert.same '', @inst.toString()

    'returns final query string': ->
      i = 1
      toStringSpy = test.mocker.stub squel.cls.StringBlock.prototype, '_toParamString', ->
        {
          text: "ret#{++i}"
          values: []
        }

      @inst.blocks = [
        new squel.cls.StringBlock({}, 'STR1'),
        new squel.cls.StringBlock({}, 'STR2'),
        new squel.cls.StringBlock({}, 'STR3')
      ]

      assert.same 'ret2 ret3 ret4', @inst.toString()

      assert.ok toStringSpy.calledThrice
      assert.ok toStringSpy.calledOn(@inst.blocks[0])
      assert.ok toStringSpy.calledOn(@inst.blocks[1])
      assert.ok toStringSpy.calledOn(@inst.blocks[2])


  'toParam()':
    'returns empty if no blocks': ->
      assert.same { text: '', values: [] }, @inst.toParam()

    'skips empty block strings': ->
      @inst.blocks = [
        new squel.cls.StringBlock({}, ''),
      ]

      assert.same { text: '', values: [] }, @inst.toParam()

    'returns final query string': ->
      @inst.blocks = [
        new squel.cls.StringBlock({}, 'STR1'),
        new squel.cls.StringBlock({}, 'STR2'),
        new squel.cls.StringBlock({}, 'STR3')
      ]

      i = 1
      toStringSpy = test.mocker.stub squel.cls.StringBlock.prototype, '_toParamString', ->
        {
          text: "ret#{++i}"
          values: []
        }

      assert.same { text: 'ret2 ret3 ret4', values: [] }, @inst.toParam()

      assert.ok toStringSpy.calledThrice
      assert.ok toStringSpy.calledOn(@inst.blocks[0])
      assert.ok toStringSpy.calledOn(@inst.blocks[1])
      assert.ok toStringSpy.calledOn(@inst.blocks[2])

    'returns query with unnumbered parameters': ->
      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      @inst.blocks[0]._toParamString = test.mocker.spy -> {
        text: 'a = ? AND b in (?, ?)',
        values: [1, 2, 3]
      }

      assert.same { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}, @inst.toParam()

    'returns query with numbered parameters': ->
      @inst = new @cls
        numberedParameters: true

      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      test.mocker.stub squel.cls.WhereBlock.prototype, '_toParamString', -> {
        text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]
      }

      assert.same @inst.toParam(), { text: 'a = $1 AND b in ($2, $3)', values: [1, 2, 3]}

    'returns query with numbered parameters and custom prefix': ->
      @inst = new @cls
        numberedParameters: true
        numberedParametersPrefix: '&%'

      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      test.mocker.stub squel.cls.WhereBlock.prototype, '_toParamString', -> {
        text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]
      }

      assert.same @inst.toParam(), { text: 'a = &%1 AND b in (&%2, &%3)', values: [1, 2, 3]}


  'cloning':
    'blocks get cloned properly': ->
      blockCloneSpy = test.mocker.spy(squel.cls.StringBlock.prototype, 'clone')

      @inst.blocks = [
        new squel.cls.StringBlock({}, 'TEST')
      ]

      newinst = @inst.clone()
      @inst.blocks[0].str = 'TEST2'

      assert.same 'TEST', newinst.blocks[0].toString()

  'registerValueHandler':
    'beforEach': ->
      @originalHandlers = [].concat(squel.cls.globalValueHandlers)
    'afterEach': ->
      squel.cls.globalValueHandlers = @originalHandlers

    'calls through to base class method': ->
      baseBuilderSpy = test.mocker.spy(squel.cls.BaseBuilder.prototype, 'registerValueHandler')

      handler = -> 'test'
      @inst.registerValueHandler(Date, handler)
      @inst.registerValueHandler('number', handler)

      assert.ok baseBuilderSpy.calledTwice
      assert.ok baseBuilderSpy.calledOn(@inst)

    'returns instance for chainability': ->
      handler = -> 'test'
      assert.same @inst, @inst.registerValueHandler(Date, handler)

    'calls through to blocks': ->
      @inst.blocks = [
        new squel.cls.StringBlock({}, ''),
      ]

      baseBuilderSpy = test.mocker.spy(@inst.blocks[0], 'registerValueHandler')

      handler = -> 'test'
      @inst.registerValueHandler(Date, handler)

      assert.ok baseBuilderSpy.calledOnce
      assert.ok baseBuilderSpy.calledOn(@inst.blocks[0])

  'get block':
    'valid': ->
      block = new squel.cls.FunctionBlock()
      @inst.blocks.push(block)
      assert.same block, @inst.getBlock(squel.cls.FunctionBlock)
    'invalid': ->
      assert.throws (-> @inst.getBlock(squel.cls.FunctionBlock) )





module?.exports[require('path').basename(__filename)] = test
