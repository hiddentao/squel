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


squel = require "../squel-basic"
{_, testCreator, assert, expect, should} = require './testbase'
test = testCreator()

test['Version number'] =
  assert.same squel.VERSION, require('../package.json').version


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
    assert.throws (-> squel.registerValueHandler 1, null), "type must be a class constructor or string denoting \'typeof\' result"

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


test['Function values'] = 
  constructor: ->
    f = squel.fval('GETDATE(?)', 12, 23)
    assert.ok (f instanceof squel.cls.FunctionBlock)
    assert.same 'GETDATE(?)', f._str
    assert.same [12, 23], f._values

  'custom value handler':
    beforeEach: ->
      @inst = squel.fval('G(?,?)', 12, 23, 65)
      
      handlerConfig = _.find squel.cls.globalValueHandlers, (hc) -> 
        hc.type is squel.cls.FunctionBlock

      @handler = handlerConfig.handler

    toString: ->
      assert.same @inst.buildStr(), @handler(@inst)
    toParam: ->
      assert.same @inst.buildParam(), @handler(@inst, true)


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


  '_getObjectClassName': ->
    s = 'a string'
    b = new Object()
    c = new Error()
    d = 1

    assert.same @inst._getObjectClassName(0), undefined
    assert.same @inst._getObjectClassName(true), 'Boolean'
    assert.same @inst._getObjectClassName(1.2), 'Number'
    assert.same @inst._getObjectClassName('a string'), 'String'
    assert.same @inst._getObjectClassName(new Object), 'Object'
    assert.same @inst._getObjectClassName(new Error), 'Error'

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
      assert.throws (=> @inst.registerValueHandler 1, null), "type must be a class constructor or string denoting \'typeof\' result"

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


  '_sanitizeCondition':
    beforeEach: ->
      test.mocker.spy @inst, '_getObjectClassName'

    'if Expression':
      'empty expression': ->
        e = squel.expr()
        assert.same e, @inst._sanitizeCondition(e)
      'non-empty expression': ->
        e = squel.expr()
          .and("s.name <> 'Fred'")
          .or_begin()
            .or("s.id = 5")
            .or("s.id = 6")
          .end()
        assert.same e, @inst._sanitizeCondition(e)

    'if string': ->
      s = 'BLA BLA'
      assert.same 'BLA BLA', @inst._sanitizeCondition(s)

    'if neither Expression nor String': ->
      testFn = => @inst._sanitizeCondition(1)
      assert.throws testFn, 'condition must be a string or Expression instance'


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

    'auto quote names':
      beforeEach: ->
        @inst.options.autoQuoteFieldNames = true

      'default quote character': ->
        assert.same '`abc`.`def`', @inst._sanitizeField('abc.def')

      'do not quote *': ->
        assert.same '`abc`.*', @inst._sanitizeField('abc.*')

      'custom quote character': ->
        @inst.options.nameQuoteCharacter = '|'
        assert.same '|abc|.|def|', @inst._sanitizeField('abc.def')

      'ignore periods when quoting': ->
        assert.same '`abc.def`', @inst._sanitizeField('abc.def', ignorePeriodsForFieldNameQuotes: true)

    'QueryBuilder': ->
      s = squel.select().from('scores').field('MAX(score)')
      assert.same '(SELECT MAX(score) FROM scores)', @inst._sanitizeField(s)


  '_sanitizeNestableQuery':
    'is not query builder': ->
      assert.throws (=> @inst._sanitizeNestableQuery(null)), 'must be a nestable query, e.g. SELECT'

    'is not a nestable query builder': ->
      qry = squel.select()
      stub = test.mocker.stub qry, 'isNestable', -> false

      assert.throws (=> @inst._sanitizeNestableQuery(qry)), 'must be a nestable query, e.g. SELECT'

    'is not a nestable query builder': ->
      qry = squel.select()
      stub = test.mocker.stub qry, 'isNestable', -> true

      assert.same qry, @inst._sanitizeNestableQuery(qry)


  '_sanitizeTable':
    'nesting allowed':
      'string': ->
        assert.same 'abc', @inst._sanitizeTable('abc', true)

      'nestable query builder': ->
        select = squel.select()
        stub = test.mocker.stub select, 'isNestable', -> true

        assert.same select, @inst._sanitizeTable(select, true)
        assert.ok stub.calledOnce

      'non-nestable query builder': ->
        invalid = squel.select()
        stub = test.mocker.stub invalid, 'isNestable', -> false

        assert.throws (=> @inst._sanitizeTable(invalid, true)), 'table name must be a string or a nestable query instance'
        assert.ok stub.calledOnce

    'nesting not allowed': ->
      'string': ->
        test.mocker.spy @inst, '_sanitizeName'

        assert.same 'abc', @inst._sanitizeTable('abc')

        assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'table name'

      'nestable query builder': ->
        select = squel.select()
        assert.throws (=> @inst._sanitizeTable(select)), 'table name must be a string'

    'auto quote names':
      beforeEach: ->
        @inst.options.autoQuoteTableNames = true

      'default quote character': ->
        assert.same '`abc`', @inst._sanitizeTable('abc')

      'custom quote character': ->
        @inst.options.nameQuoteCharacter = '|'
        assert.same '|abc|', @inst._sanitizeTable('abc')


  '_sanitizeFieldAlias': ->
    'default': ->
      test.mocker.spy @inst, '_sanitizeName'

      @inst._sanitizeFieldAlias('abc')

      assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'field alias'

    'auto quote alias names is ON':
      beforeEach: ->
        @inst.options.autoQuoteAliasNames = true

      'default quote character': ->
        assert.same '"abc"', @inst._sanitizeFieldAlias('abc')

      'custom quote character': ->
        @inst.options.fieldAliasQuoteCharacter = '~'
        assert.same '~abc~', @inst._sanitizeFieldAlias('abc')

    'auto quote alias names is OFF': ->
      @inst.options.autoQuoteAliasNames = false
      assert.same 'abc', @inst._sanitizeFieldAlias('abc')



  '_sanitizeTableAlias': ->
    'default': ->
      test.mocker.spy @inst, '_sanitizeName'

      @inst._sanitizeTableAlias('abc')

      assert.ok @inst._sanitizeName.calledWithExactly 'abc', 'table alias'

    'auto quote alias names is ON':
      beforeEach: ->
        @inst.options.autoQuoteAliasNames = true

      'default quote character': ->
        assert.same '`abc`', @inst._sanitizeTableAlias('abc')

      'custom quote character': ->
        @inst.options.fieldAliasQuoteCharacter = '~'
        assert.same '~abc~', @inst._sanitizeTableAlias('abc')

    'auto quote alias names is OFF': ->
      @inst.options.autoQuoteAliasNames = false
      assert.same 'abc', @inst._sanitizeTableAlias('abc')



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

    'if QueryBuilder': ->
      s = squel.select()
      assert.same s, @inst._sanitizeValue(s)

    'if FuncVal': ->
      s = squel.fval()
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


  '_formatCustomValue':
    'not a custom value type': ->
      assert.same null, @inst._formatCustomValue(null)
      assert.same 'abc', @inst._formatCustomValue('abc')
      assert.same 12, @inst._formatCustomValue(12)
      assert.same 1.2, @inst._formatCustomValue(1.2)
      assert.same true, @inst._formatCustomValue(true)
      assert.same false, @inst._formatCustomValue(false)

    'custom value type':
      'global': ->
        class MyClass
        myObj = new MyClass

        squel.registerValueHandler MyClass, () -> 3.14
        squel.registerValueHandler 'boolean', (v) -> 'a' + v

        assert.same 3.14, @inst._formatCustomValue(myObj)
        assert.same 'atrue', @inst._formatCustomValue(true)

      'instance': ->
        class MyClass
        myObj = new MyClass

        @inst.registerValueHandler MyClass, () -> 3.14
        @inst.registerValueHandler 'number', (v) -> v + 'a'

        assert.same 3.14, @inst._formatCustomValue(myObj)
        assert.same '5.2a', @inst._formatCustomValue(5.2)

      'instance handler takes precedence over global': ->
        @inst.registerValueHandler Date, (d) -> 'hello'
        squel.registerValueHandler Date, (d) -> 'goodbye'

        assert.same "hello", @inst._formatCustomValue(new Date)

        @inst = new @cls
          valueHandlers: []
        assert.same "goodbye", @inst._formatCustomValue(new Date)

      'whether to format for parameterized output': ->
        @inst.registerValueHandler Date, (d, asParam) ->
          return if asParam then 'foo' else 'bar'

        val = new Date()

        assert.same 'foo', @inst._formatCustomValue(val, true)
        assert.same 'bar', @inst._formatCustomValue(val)
        

  '_formatValueAsParam':
    'QueryBuilder Select - nestable': ->
      s = squel.select().from('table')
      assert.same { "text": 'SELECT * FROM table', "values":[] }, @inst._formatValueAsParam(s)

    'QueryBuilder Update - not nestable': ->
      u = squel.update().table('table').set('f', 'val')
      assert.same u, @inst._formatValueAsParam(u)

    'else calls _formatCustomValue': ->
      spy = test.mocker.stub @inst, '_formatCustomValue', (v, asParam) -> 
        'test' + (if asParam then 'foo' else 'bar')

      assert.same 'testfoo', @inst._formatValueAsParam(null)
      assert.same 'testfoo', @inst._formatValueAsParam('abc')
      assert.same 'testfoo', @inst._formatValueAsParam(12)
      assert.same 'testfoo', @inst._formatValueAsParam(1.2)
      assert.same 'testfoo', @inst._formatValueAsParam(true)
      assert.same 'testfoo', @inst._formatValueAsParam(false)

      assert.same 6, spy.callCount

    'Array - recursively calls itself on each element': ->
      spy = test.mocker.spy @inst, '_formatValueAsParam'

      v = [ squel.select().from('table'), 1.2 ]
      res = @inst._formatValueAsParam(v)

      assert.same [ { "text": 'SELECT * FROM table', "values": [] }, 1.2], res

      assert.same 3, spy.callCount
      assert.ok spy.calledWith v[0]
      assert.ok spy.calledWith v[1]


  '_formatValue':
    'null': ->
      assert.same 'NULL', @inst._formatValue(null)

    'boolean': ->
      assert.same 'TRUE', @inst._formatValue(true)
      assert.same 'FALSE', @inst._formatValue(false)

    'integer': ->
      assert.same 12, @inst._formatValue(12)

    'float': ->
      assert.same 1.2, @inst._formatValue(1.2)

    'string': ->
      escapedValue = undefined
      test.mocker.stub @inst, '_escapeValue', (str) -> escapedValue or str

      assert.same "'test'", @inst._formatValue('test')

      assert.same "'test'", @inst._formatValue('test')
      assert.ok @inst._escapeValue.calledWithExactly('test')
      escapedValue = 'blah'
      assert.same "'blah'", @inst._formatValue('test')

    'string - dont quote': ->
      escapedValue = undefined
      test.mocker.stub @inst, '_escapeValue', (str) -> escapedValue or str

      assert.same "test", @inst._formatValue('test', dontQuote: true )

      assert.ok @inst._escapeValue.notCalled

    'Array - recursively calls itself on each element': ->
      spy = test.mocker.spy @inst, '_formatValue'

      expected = "('test', 123, TRUE, 1.2, NULL)"
      assert.same expected, @inst._formatValue([ 'test', 123, true, 1.2, null ])

      assert.same 6, spy.callCount
      assert.ok spy.calledWith 'test'
      assert.ok spy.calledWith 123
      assert.ok spy.calledWith true
      assert.ok spy.calledWith 1.2
      assert.ok spy.calledWith null

    'QueryBuilder': ->
      s = squel.select().from('table')
      assert.same '(SELECT * FROM table)', @inst._formatValue(s)
      u = squel.update().table('table').set('f', 'val')
      assert.same '(UPDATE table SET f = \'val\')', @inst._formatValue(u)

    'Expression': ->
      s = squel.expr()
          .and("s.name <> 'Fred'")
          .or_begin()
            .or("s.id = 5")
            .or("s.id = 6")
          .end()
      assert.same "(s.name <> 'Fred' OR (s.id = 5 OR s.id = 6))", @inst._formatValue(s)

    'checks to see if it is custom value type first': ->
      test.mocker.stub @inst, '_formatCustomValue', (val, asParam) -> 
        12 + (if asParam then 25 else 65)
      assert.same '(77)', @inst._formatValue(123)



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
          assert.same 'Error: QueryBuilder already has a builder method called: distinct', err.toString()


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
      buildStrSpy = test.mocker.stub squel.cls.StringBlock.prototype, 'buildStr', -> "ret#{++i}"

      @inst.blocks = [
        new squel.cls.StringBlock({}, 'STR1'),
        new squel.cls.StringBlock({}, 'STR2'),
        new squel.cls.StringBlock({}, 'STR3')
      ]

      assert.same 'ret2 ret3 ret4', @inst.toString()

      assert.ok buildStrSpy.calledThrice
      assert.ok buildStrSpy.calledOn(@inst.blocks[0])
      assert.ok buildStrSpy.calledOn(@inst.blocks[1])
      assert.ok buildStrSpy.calledOn(@inst.blocks[2])


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
      buildStrSpy = test.mocker.stub squel.cls.StringBlock.prototype, 'buildStr', -> "ret#{++i}"

      assert.same { text: 'ret2 ret3 ret4', values: [] }, @inst.toParam()

      assert.ok buildStrSpy.calledThrice
      assert.ok buildStrSpy.calledOn(@inst.blocks[0])
      assert.ok buildStrSpy.calledOn(@inst.blocks[1])
      assert.ok buildStrSpy.calledOn(@inst.blocks[2])

    'returns query with unnumbered parameters': ->
      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      test.mocker.stub squel.cls.WhereBlock.prototype, 'buildParam', -> { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}

      assert.same { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}, @inst.toParam()

    'returns query with numbered parameters': ->
      @inst = new @cls
        numberedParameters: true

      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      test.mocker.stub squel.cls.WhereBlock.prototype, 'buildParam', -> { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}

      assert.same { text: 'a = $1 AND b in ($2, $3)', values: [1, 2, 3]}, @inst.toParam()

    'returns query with numbered parameters and custom prefix': ->
      @inst = new @cls
        numberedParameters: true
        numberedParametersPrefix: '&%'

      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      test.mocker.stub squel.cls.WhereBlock.prototype, 'buildParam', -> { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}

      assert.same { text: 'a = &%1 AND b in (&%2, &%3)', values: [1, 2, 3]}, @inst.toParam()


  'cloning':
    'blocks get cloned properly': ->
      blockCloneSpy = test.mocker.spy(squel.cls.StringBlock.prototype, 'clone')

      @inst.blocks = [
        new squel.cls.StringBlock({}, 'TEST')
      ]

      newinst = @inst.clone()
      @inst.blocks[0].str = 'TEST2'

      assert.same 'TEST', newinst.blocks[0].buildStr()

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

  'is nestable': ->
    assert.same false, @inst.isNestable()

  'get block':
    'valid': ->
      block = new squel.cls.FunctionBlock()
      @inst.blocks.push(block)
      assert.same block, @inst.getBlock(squel.cls.FunctionBlock)
    'invalid': ->
      assert.throws (-> @inst.getBlock(squel.cls.FunctionBlock) )





module?.exports[require('path').basename(__filename)] = test
