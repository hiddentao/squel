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
      usingValuePlaceholders: false
      valueHandlers: []
      numberedParameters: true
    }, squel.cls.DefaultQueryBuilderOptions



test['Register global custom value handler'] =
  'afterEach': ->
    squel.cls.globalValueHandlers = []

  'default': ->
    handler = -> 'test'
    squel.registerValueHandler(Date, handler)
    squel.registerValueHandler(Object, handler)

    assert.same 2, squel.cls.globalValueHandlers.length
    assert.same { type: Date, handler: handler }, squel.cls.globalValueHandlers[0]
    assert.same { type: Object, handler: handler }, squel.cls.globalValueHandlers[1]

  'type should be class constructor': ->
    assert.throws (-> squel.registerValueHandler 1, null), 'type must be a class constructor'

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




test['Builder base class'] =
  beforeEach: ->
    @cls = squel.cls.BaseBuilder
    @inst = new @cls

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

      assert.same 2, @inst.options.valueHandlers.length
      assert.same { type: Date, handler: handler }, @inst.options.valueHandlers[0]
      assert.same { type: Object, handler: handler }, @inst.options.valueHandlers[1]

    'type should be class constructor': ->
      assert.throws (=> @inst.registerValueHandler 1, null), 'type must be a class constructor'

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
        assert.same "", @inst._sanitizeCondition(e)
      'non-empty expression': ->
        e = squel.expr()
          .and("s.name <> 'Fred'")
          .or_begin()
            .or("s.id = 5")
            .or("s.id = 6")
          .end()
        assert.same "s.name <> 'Fred' OR (s.id = 5 OR s.id = 6)", @inst._sanitizeCondition(e)

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
        assert.same '`abc`', @inst._sanitizeField('abc')

      'custom quote character': ->
        @inst.options.nameQuoteCharacter = '|'
        assert.same '|abc|', @inst._sanitizeField('abc')


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
      assert.same "'test'", @inst._formatValue('test')

      @inst.options.usingValuePlaceholders = false
      assert.same "'test'", @inst._formatValue('test')

      @inst.options.usingValuePlaceholders = true
      assert.same "test", @inst._formatValue('test')

    'custom handlers':
      'global': ->
        class MyClass
        myObj = new MyClass

        squel.registerValueHandler MyClass, () -> 3.14

        assert.same 3.14, @inst._formatValue(myObj)

      'instance': ->
        class MyClass
        myObj = new MyClass

        @inst.registerValueHandler MyClass, () -> 3.14

        assert.same 3.14, @inst._formatValue(myObj)

      'instance handler takes precedence over global': ->
        @inst.registerValueHandler Date, (d) -> 'hello'
        squel.registerValueHandler Date, (d) -> 'goodbye'

        assert.same "'hello'", @inst._formatValue(new Date)

        @inst = new @cls
          valueHandlers: []
        assert.same "'goodbye'", @inst._formatValue(new Date)



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
      @inst.blocks = [
        new squel.cls.StringBlock({}, 'STR1'),
        new squel.cls.StringBlock({}, 'STR2'),
        new squel.cls.StringBlock({}, 'STR3')
      ]

      i = 1
      buildStrSpy = test.mocker.stub squel.cls.StringBlock.prototype, 'buildStr', -> "ret#{++i}"

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

    'returns query with numbered parameters': ->
      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      buildStrSpy = test.mocker.stub squel.cls.WhereBlock.prototype, 'buildParam', -> { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}

      assert.same { text: 'a = $1 AND b in ($2, $3)', values: [1, 2, 3]}, @inst.toParam()

    'returns query with unnumbered parameters': ->
      @inst = new @cls
        numberedParameters: false

      @inst.blocks = [
        new squel.cls.WhereBlock({}),
      ]

      buildStrSpy = test.mocker.stub squel.cls.WhereBlock.prototype, 'buildParam', -> { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}

      assert.same { text: 'a = ? AND b in (?, ?)', values: [1, 2, 3]}, @inst.toParam()


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
    'afterEach': ->
      squel.cls.globalValueHandlers = []

    'calls through to base class method': ->
      baseBuilderSpy = test.mocker.spy(squel.cls.BaseBuilder.prototype, 'registerValueHandler')

      handler = -> 'test'
      @inst.registerValueHandler(Date, handler)

      assert.ok baseBuilderSpy.calledOnce
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






module?.exports[require('path').basename(__filename)] = test
