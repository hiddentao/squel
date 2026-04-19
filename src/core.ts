import pkg from "../package.json" with { type: "json" }
import type {
  BuildStringOptions,
  Flavour,
  FormattingOptions,
  ParamString,
  QueryBuilderOptions,
  Squel,
  ToParamOptions,
  ValueHandler,
  ValueHandlerEntry,
  ValueType,
} from "./types"

function _pad(str: string, pad: string): string {
  return str.length ? str + pad : str
}

function _extend<T extends Record<string, any>>(
  dst: T,
  ...sources: Array<Record<string, any> | undefined | null>
): T {
  if (dst && sources) {
    for (const src of sources) {
      if (src && typeof src === "object") {
        for (const key of Object.getOwnPropertyNames(src)) {
          ;(dst as any)[key] = (src as any)[key]
        }
      }
    }
  }
  return dst
}

function _isPlainObject(obj: unknown): boolean {
  return !!obj && (obj as any).constructor.prototype === Object.prototype
}

function _isArray(obj: unknown): boolean {
  return !!obj && (obj as any).constructor.prototype === Array.prototype
}

function _clone<T>(src: T): T {
  if (!src) return src
  const anySrc = src as any
  if (typeof anySrc.clone === "function") return anySrc.clone()
  if (_isPlainObject(src) || _isArray(src)) {
    const ret = new anySrc.constructor()
    for (const key of Object.getOwnPropertyNames(src)) {
      if (typeof anySrc[key] !== "function") {
        ret[key] = _clone(anySrc[key])
      }
    }
    return ret
  }
  return JSON.parse(JSON.stringify(src))
}

function registerValueHandler(
  handlers: ValueHandlerEntry[],
  type: ValueType,
  handler: ValueHandler,
): void {
  const typeofType = typeof type
  if (typeofType !== "function" && typeofType !== "string") {
    throw new Error("type must be a class constructor or string")
  }
  if (typeof handler !== "function") {
    throw new Error("handler must be a function")
  }
  for (const typeHandler of handlers) {
    if (typeHandler.type === type) {
      typeHandler.handler = handler
      return
    }
  }
  handlers.push({ type, handler })
}

function getValueHandler(
  value: unknown,
  localHandlers: ValueHandlerEntry[],
  globalHandlers: ValueHandlerEntry[],
): ValueHandler | undefined {
  return (
    _getValueHandler(value, localHandlers) ||
    _getValueHandler(value, globalHandlers)
  )
}

function _getValueHandler(
  value: unknown,
  handlers: ValueHandlerEntry[],
): ValueHandler | undefined {
  for (const typeHandler of handlers) {
    if (
      typeof value === typeHandler.type ||
      (typeof typeHandler.type !== "string" &&
        value instanceof (typeHandler.type as new (...args: any[]) => any))
    ) {
      return typeHandler.handler
    }
  }
  return undefined
}

function _buildSquel(flavour: Flavour | null = null): Squel {
  const cls: any = {
    isSquelBuilder(obj: unknown): boolean {
      return !!obj && !!(obj as any)._toParamString
    },
  }

  const _shouldApplyNesting = (obj: unknown): boolean => {
    return !cls.isSquelBuilder(obj) || !(obj as any).options.rawNesting
  }

  cls.DefaultQueryBuilderOptions = {
    autoQuoteTableNames: false,
    autoQuoteFieldNames: false,
    autoQuoteAliasNames: true,
    useAsForTableAliasNames: false,
    nameQuoteCharacter: "`",
    tableAliasQuoteCharacter: "`",
    fieldAliasQuoteCharacter: '"',
    valueHandlers: [],
    parameterCharacter: "?",
    numberedParameters: false,
    numberedParametersPrefix: "$",
    numberedParametersStartAt: 1,
    replaceSingleQuotes: false,
    singleQuoteReplacement: "''",
    separator: " ",
    stringFormatter: null,
    rawNesting: false,
  }

  cls.globalValueHandlers = [] as ValueHandlerEntry[]

  cls.registerValueHandler = (type: ValueType, handler: ValueHandler): void => {
    registerValueHandler(cls.globalValueHandlers, type, handler)
  }

  cls.Cloneable = class {
    clone(): any {
      const newInstance = new (this as any).constructor()
      return _extend(newInstance, _clone(_extend({}, this)))
    }
  }

  cls.BaseBuilder = class extends cls.Cloneable {
    options: Required<QueryBuilderOptions>

    constructor(options?: QueryBuilderOptions) {
      super()
      const defaults = JSON.parse(
        JSON.stringify(cls.DefaultQueryBuilderOptions),
      )
      defaults.stringFormatter = cls.DefaultQueryBuilderOptions.stringFormatter
      this.options = _extend(defaults, options)
    }

    registerValueHandler(type: ValueType, handler: ValueHandler): this {
      registerValueHandler(this.options.valueHandlers, type, handler)
      return this
    }

    _sanitizeExpression(expr: unknown): unknown {
      if (!cls.isSquelBuilder(expr)) {
        if (typeof expr !== "string") {
          throw new Error("expression must be a string or builder instance")
        }
      }
      return expr
    }

    _sanitizeName(value: unknown, type: string): string {
      if (typeof value !== "string") {
        throw new Error(`${type} must be a string`)
      }
      return value
    }

    _sanitizeField(item: unknown): unknown {
      if (!cls.isSquelBuilder(item)) {
        return this._sanitizeName(item, "field name")
      }
      return item
    }

    _sanitizeBaseBuilder(item: unknown): unknown {
      if (cls.isSquelBuilder(item)) return item
      throw new Error("must be a builder instance")
    }

    _sanitizeTable(item: unknown, _allowNested?: boolean): unknown {
      if (typeof item !== "string") {
        try {
          return this._sanitizeBaseBuilder(item)
        } catch (_e) {
          throw new Error("table name must be a string or a builder")
        }
      }
      return this._sanitizeName(item, "table")
    }

    _sanitizeTableAlias(item: unknown): string {
      return this._sanitizeName(item, "table alias")
    }

    _sanitizeFieldAlias(item: unknown): string {
      return this._sanitizeName(item, "field alias")
    }

    _sanitizeLimitOffset(value: unknown): number {
      const num = Number.parseInt(value as any, 10)
      if (num < 0 || Number.isNaN(num)) {
        throw new Error("limit/offset must be >= 0")
      }
      return num
    }

    _sanitizeValue(item: unknown): unknown {
      const itemType = typeof item
      if (item === null) {
        // null allowed
      } else if (
        itemType === "string" ||
        itemType === "number" ||
        itemType === "boolean"
      ) {
        // primitives allowed
      } else if (cls.isSquelBuilder(item)) {
        // builders allowed
      } else {
        const typeIsValid = !!getValueHandler(
          item,
          this.options.valueHandlers,
          cls.globalValueHandlers,
        )
        if (!typeIsValid) {
          throw new Error(
            "field value must be a string, number, boolean, null or one of the registered custom value types",
          )
        }
      }
      return item
    }

    _escapeValue(value: any): any {
      return this.options.replaceSingleQuotes && value
        ? value.replace(/'/g, this.options.singleQuoteReplacement)
        : value
    }

    _formatTableName(item: any): any {
      if (this.options.autoQuoteTableNames) {
        const q = this.options.nameQuoteCharacter
        item = `${q}${item}${q}`
      }
      return item
    }

    _formatFieldAlias(item: any): any {
      if (this.options.autoQuoteAliasNames) {
        const q = this.options.fieldAliasQuoteCharacter
        item = `${q}${item}${q}`
      }
      return item
    }

    _formatTableAlias(item: any): string {
      if (this.options.autoQuoteAliasNames) {
        const q = this.options.tableAliasQuoteCharacter
        item = `${q}${item}${q}`
      }
      return this.options.useAsForTableAliasNames ? `AS ${item}` : item
    }

    _formatFieldName(
      item: any,
      formattingOptions: FormattingOptions = {},
    ): any {
      if (this.options.autoQuoteFieldNames) {
        const q = this.options.nameQuoteCharacter
        if (formattingOptions.ignorePeriodsForFieldNameQuotes) {
          item = `${q}${item}${q}`
        } else {
          item = item
            .split(".")
            .map((v: string) => (v === "*" ? v : `${q}${v}${q}`))
            .join(".")
        }
      }
      return item
    }

    _formatCustomValue(
      value: any,
      asParam: boolean,
      formattingOptions?: FormattingOptions,
    ): { formatted: boolean; value: any; rawNesting?: boolean } {
      const customHandler = getValueHandler(
        value,
        this.options.valueHandlers,
        cls.globalValueHandlers,
      )
      if (customHandler) {
        value = customHandler(value, asParam, formattingOptions)
        if (value && value.rawNesting) {
          return { formatted: true, rawNesting: true, value: value.value }
        }
      }
      return { formatted: !!customHandler, value }
    }

    _formatValueForParamArray(
      value: any,
      formattingOptions: FormattingOptions = {},
    ): any {
      if (_isArray(value)) {
        return value.map((v: any) =>
          this._formatValueForParamArray(v, formattingOptions),
        )
      }
      return this._formatCustomValue(value, true, formattingOptions).value
    }

    _formatValueForQueryString(
      initialValue: any,
      formattingOptions: FormattingOptions = {},
    ): any {
      const {
        rawNesting,
        formatted,
        value: customValue,
      } = this._formatCustomValue(initialValue, false, formattingOptions)

      if (formatted) {
        if (rawNesting) {
          return customValue
        }
        return this._applyNestingFormatting(
          customValue,
          _shouldApplyNesting(initialValue),
        )
      }

      if (_isArray(customValue)) {
        const formattedValues = customValue.map((v: any) =>
          this._formatValueForQueryString(v),
        )
        return this._applyNestingFormatting(
          formattedValues.join(", "),
          _shouldApplyNesting(formattedValues),
        )
      }

      return this._formatBaseValue(customValue, formattingOptions)
    }

    /**
     * Formats a basic value (null, boolean, number, string, or builder) for a query string.
     * @private
     */
    _formatBaseValue(value: any, formattingOptions: FormattingOptions): any {
      const typeofValue = typeof value

      if (value === null) {
        return "NULL"
      }

      if (typeofValue === "boolean") {
        return value ? "TRUE" : "FALSE"
      }

      if (cls.isSquelBuilder(value)) {
        return this._applyNestingFormatting(
          value.toString(),
          _shouldApplyNesting(value),
        )
      }

      if (typeofValue === "number") {
        return value
      }

      if (typeofValue === "string" && this.options.stringFormatter) {
        return this.options.stringFormatter(value)
      }

      if (formattingOptions.dontQuote) {
        return `${value}`
      }

      return `'${this._escapeValue(value)}'`
    }

    _applyNestingFormatting(str: any, nesting = true): any {
      if (
        str &&
        typeof str === "string" &&
        nesting &&
        !this.options.rawNesting
      ) {
        if (!this._alreadyHasBrackets(str)) {
          return `(${str})`
        }
      }
      return str
    }

    /**
     * Checks if a string is already enclosed in brackets, ensuring that the
     * brackets are balanced and not prematurely closed.
     * @private
     */
    _alreadyHasBrackets(str: string): boolean {
      if (str.charAt(0) !== "(" || str.charAt(str.length - 1) !== ")") {
        return false
      }

      let open = 1
      for (let idx = 1; idx < str.length - 1; ++idx) {
        const c = str.charAt(idx)
        if (c === "(") {
          open++
        } else if (c === ")") {
          open--
          if (open < 1) {
            return false
          }
        }
      }

      return true
    }

    _buildString(
      str: string,
      values: any[],
      options: BuildStringOptions = {},
    ): ParamString {
      const { nested } = options
      values = values || []
      str = str || ""
      let formattedStr = ""
      let curValue = -1
      const formattedValues: any[] = []
      const paramChar = this.options.parameterCharacter
      let idx = 0
      while (str.length > idx) {
        if (str.substring(idx, idx + paramChar.length) === paramChar) {
          const value = values[++curValue]
          formattedStr += this._handleParamPlaceholder(
            value,
            formattedValues,
            options,
          )
          idx += paramChar.length
        } else {
          formattedStr += str.charAt(idx)
          idx++
        }
      }
      return {
        text: this._applyNestingFormatting(formattedStr, !!nested),
        values: formattedValues,
      }
    }

    /**
     * Handles the formatting of a value that corresponds to a parameter placeholder ('?').
     * If buildParameterized is true, it collects values for parameterized queries.
     * Otherwise, it formats the value directly for the query string.
     * @param value The value to format.
     * @param formattedValues The array to collect formatted values.
     * @param options The build options.
     * @returns The formatted value.
     */
    _handleParamPlaceholder(
      value: any,
      formattedValues: any[],
      options: BuildStringOptions,
    ): string {
      const { buildParameterized, formattingOptions } = options
      const paramChar = this.options.parameterCharacter

      if (!buildParameterized) {
        return this._formatValueForQueryString(value, formattingOptions)
      }

      if (cls.isSquelBuilder(value)) {
        const ret = value._toParamString({
          buildParameterized,
          nested: true,
        })
        ret.values.forEach((v: any) => formattedValues.push(v))
        return ret.text
      }

      const formattedValue = this._formatValueForParamArray(
        value,
        formattingOptions,
      )
      if (_isArray(formattedValue)) {
        const tmpStr = formattedValue.map(() => paramChar).join(", ")
        formattedValue.forEach((val: any) => formattedValues.push(val))
        return `(${tmpStr})`
      }

      formattedValues.push(formattedValue)

      return paramChar
    }

    _buildManyStrings(
      strings: string[],
      strValues: any[][],
      options: BuildStringOptions = {},
    ): ParamString {
      const parts: string[] = []
      const totalValues: any[] = []
      for (let idx = 0; strings.length > idx; ++idx) {
        const inputString = strings[idx]
        const inputValues = strValues[idx]
        const { text, values } = this._buildString(inputString, inputValues, {
          buildParameterized: options.buildParameterized,
          nested: false,
        })
        parts.push(text)
        values.forEach((v: any) => totalValues.push(v))
      }
      const totalStr = parts.join(this.options.separator)
      return {
        text: totalStr.length
          ? this._applyNestingFormatting(totalStr, !!options.nested)
          : "",
        values: totalValues,
      }
    }

    _toParamString(_options?: ToParamOptions): ParamString {
      throw new Error("Not yet implemented")
    }

    toString(options: ToParamOptions = {}): string {
      return this._toParamString(options).text
    }

    toParam(options: ToParamOptions = {}): ParamString {
      return this._toParamString({ ...options, buildParameterized: true })
    }
  }

  interface ExpressionNode {
    type: "AND" | "OR"
    expr: unknown
    para: unknown[]
  }

  cls.Expression = class extends cls.BaseBuilder {
    _nodes: ExpressionNode[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._nodes = []
    }

    and(expr: unknown, ...params: unknown[]): this {
      expr = this._sanitizeExpression(expr)
      this._nodes.push({ type: "AND", expr, para: params })
      return this
    }

    or(expr: unknown, ...params: unknown[]): this {
      expr = this._sanitizeExpression(expr)
      this._nodes.push({ type: "OR", expr, para: params })
      return this
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr: any = []
      const totalValues: any[] = []
      for (const node of this._nodes) {
        const { type, expr, para } = node
        const { text, values } = cls.isSquelBuilder(expr)
          ? (expr as any)._toParamString({
              buildParameterized: options.buildParameterized,
              nested: true,
            })
          : this._buildString(expr as string, para, {
              buildParameterized: options.buildParameterized,
            })
        if (totalStr.length) totalStr.push(type)
        totalStr.push(text)
        values.forEach((v: any) => totalValues.push(v))
      }
      totalStr = totalStr.join(" ")
      return {
        text: this._applyNestingFormatting(totalStr, !!options.nested),
        values: totalValues,
      }
    }
  }

  interface CaseClause {
    expression: string
    values: unknown[]
    result?: unknown
  }

  cls.Case = class extends cls.BaseBuilder {
    _fieldName: string | null = null
    _cases: CaseClause[]
    _elseValue: unknown = null

    constructor(
      fieldName?: string | QueryBuilderOptions,
      options: QueryBuilderOptions = {},
    ) {
      super(options as QueryBuilderOptions)
      let name: string | null = null
      if (_isPlainObject(fieldName)) {
        options = fieldName as QueryBuilderOptions
      } else if (fieldName) {
        name = this._sanitizeField(fieldName) as string
      }
      this._fieldName = name
      this.options = _extend(
        Object.assign({}, cls.DefaultQueryBuilderOptions),
        options,
      )
      this._cases = []
    }

    when(expression: string, ...values: unknown[]): this {
      this._cases.unshift({ expression, values: values || [] })
      return this
    }

    // disable sonar rule for this function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    then(result: unknown): this {
      if (this._cases.length === 0) {
        throw new Error("when() needs to be called first")
      }
      this._cases[0].result = result
      return this
    }

    else(elseValue: unknown): this {
      this._elseValue = elseValue
      return this
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr = ""
      const totalValues: any[] = []
      for (const { expression, values, result } of this._cases) {
        totalStr = _pad(totalStr, " ")
        const ret = this._buildString(expression, values as any[], {
          buildParameterized: options.buildParameterized,
          nested: true,
        })
        totalStr += `WHEN ${ret.text} THEN ${this._formatValueForQueryString(result)}`
        ret.values.forEach((v: any) => totalValues.push(v))
      }
      if (totalStr.length) {
        totalStr += ` ELSE ${this._formatValueForQueryString(this._elseValue)} END`
        if (this._fieldName) totalStr = `${this._fieldName} ${totalStr}`
        totalStr = `CASE ${totalStr}`
      } else {
        totalStr = this._formatValueForQueryString(this._elseValue)
      }
      return { text: totalStr, values: totalValues }
    }
  }

  cls.Block = class extends cls.BaseBuilder {
    constructor(options?: QueryBuilderOptions) {
      super(options)
    }

    exposedMethods(): Record<string, (...args: any[]) => any> {
      const ret: Record<string, (...args: any[]) => any> = {}
      const collect = (obj: any): void => {
        if (!obj) return
        for (const prop of Object.getOwnPropertyNames(obj)) {
          if (
            prop !== "constructor" &&
            typeof obj[prop] === "function" &&
            prop.charAt(0) !== "_" &&
            !cls.Block.prototype[prop]
          ) {
            ret[prop] = obj[prop]
          }
        }
        collect(Object.getPrototypeOf(obj))
      }
      collect(this)
      return ret
    }
  }

  cls.StringBlock = class extends cls.Block {
    _str: string

    constructor(options: QueryBuilderOptions | undefined, str: string) {
      super(options)
      this._str = str
    }

    _toParamString(_options: ToParamOptions = {}): ParamString {
      return { text: this._str, values: [] }
    }
  }

  cls.FunctionBlock = class extends cls.Block {
    _strings: string[]
    _values: any[][]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._strings = []
      this._values = []
    }

    function(str: string, ...values: any[]): void {
      this._strings.push(str)
      this._values.push(values)
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      return this._buildManyStrings(this._strings, this._values, options)
    }
  }

  cls.registerValueHandler(cls.FunctionBlock, (value: any, asParam = false) => {
    return asParam ? value.toParam() : value.toString()
  })

  interface TableEntry {
    table: unknown
    alias: string | null
  }

  cls.AbstractTableBlock = class extends cls.Block {
    _tables: TableEntry[]

    constructor(options?: QueryBuilderOptions, _prefix?: string) {
      super(options)
      this._tables = []
    }

    _table(table: unknown, alias: string | null = null): void {
      alias = alias ? this._sanitizeTableAlias(alias) : alias
      table = this._sanitizeTable(table)
      if (this.options.singleTable) this._tables = []
      this._tables.push({ table, alias })
    }

    _hasTable(): boolean {
      return this._tables.length > 0
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr = ""
      const totalValues: any[] = []
      if (this._hasTable()) {
        for (const { table, alias } of this._tables) {
          totalStr = _pad(totalStr, ", ")
          let tableStr: string
          if (cls.isSquelBuilder(table)) {
            const { text, values } = (table as any)._toParamString({
              buildParameterized: options.buildParameterized,
              nested: true,
            })
            tableStr = text
            values.forEach((v: any) => totalValues.push(v))
          } else {
            tableStr = this._formatTableName(table)
          }
          if (alias) tableStr += ` ${this._formatTableAlias(alias)}`
          totalStr += tableStr
        }
        if (this.options.prefix) totalStr = `${this.options.prefix} ${totalStr}`
      }
      return { text: totalStr, values: totalValues }
    }
  }

  cls.TargetTableBlock = class extends cls.AbstractTableBlock {
    target(table: unknown): void {
      this._table(table)
    }
  }

  cls.UpdateTableBlock = class extends cls.AbstractTableBlock {
    table(table: unknown, alias: string | null = null): void {
      this._table(table, alias)
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      if (!this._hasTable()) throw new Error("table() needs to be called")
      return super._toParamString(options)
    }
  }

  cls.FromTableBlock = class extends cls.AbstractTableBlock {
    constructor(options?: QueryBuilderOptions) {
      super(_extend({}, options, { prefix: "FROM" }))
    }

    from(table: unknown, alias: string | null = null): void {
      this._table(table, alias)
    }
  }

  cls.IntoTableBlock = class extends cls.AbstractTableBlock {
    constructor(options?: QueryBuilderOptions) {
      super(_extend({}, options, { prefix: "INTO", singleTable: true }))
    }

    into(table: unknown): void {
      this._table(table)
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      if (!this._hasTable()) throw new Error("into() needs to be called")
      return super._toParamString(options)
    }
  }

  interface FieldEntry {
    name: unknown
    alias: string | null
    options: FormattingOptions
  }

  cls.GetFieldBlock = class extends cls.Block {
    _fields: FieldEntry[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._fields = []
    }

    fields(
      _fields: string[] | Record<string, string | null>,
      options: FormattingOptions = {},
    ): void {
      if (_isArray(_fields)) {
        for (const field of _fields as string[]) {
          this.field(field, null, options)
        }
      } else {
        for (const field in _fields as Record<string, string | null>) {
          const alias = (_fields as Record<string, string | null>)[field]
          this.field(field, alias, options)
        }
      }
    }

    field(
      field: unknown,
      alias: string | null = null,
      options: FormattingOptions = {},
    ): unknown {
      alias = alias ? this._sanitizeFieldAlias(alias) : alias
      field = this._sanitizeField(field)
      const existingField = this._fields.filter(
        (f) => f.name === field && f.alias === alias,
      )
      if (existingField.length) return this
      this._fields.push({ name: field, alias, options })
      return undefined
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      const { queryBuilder, buildParameterized } = options as any
      let totalStr = ""
      const totalValues: any[] = []
      for (const field of this._fields) {
        totalStr = _pad(totalStr, ", ")
        const { name, alias, options: fieldOptions } = field
        if (typeof name === "string") {
          totalStr += this._formatFieldName(name, fieldOptions)
        } else {
          const ret = (name as any)._toParamString({
            nested: true,
            buildParameterized,
          })
          totalStr += ret.text
          ret.values.forEach((v: any) => totalValues.push(v))
        }
        if (alias) totalStr += ` AS ${this._formatFieldAlias(alias)}`
      }
      if (!totalStr.length) {
        const fromTableBlock = queryBuilder?.getBlock(cls.FromTableBlock)
        if (fromTableBlock && fromTableBlock._hasTable()) {
          totalStr = "*"
        }
      }
      return { text: totalStr, values: totalValues }
    }
  }

  cls.AbstractSetFieldBlock = class extends cls.Block {
    _fields: unknown[]
    _values: unknown[][]
    _valueOptions: FormattingOptions[][]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._fields = []
      this._values = [[]]
      this._valueOptions = [[]]
    }

    _reset(): void {
      this._fields = []
      this._values = [[]]
      this._valueOptions = [[]]
    }

    _set(
      field: unknown,
      value: unknown,
      valueOptions: FormattingOptions = {},
    ): void {
      if (this._values.length > 1) {
        throw new Error("Cannot set multiple rows of fields this way.")
      }
      if (typeof value !== "undefined") {
        value = this._sanitizeValue(value)
      }
      field = this._sanitizeField(field)
      let index = this._fields.indexOf(field)
      if (index === -1) {
        this._fields.push(field)
        index = this._fields.length - 1
      }
      this._values[0][index] = value
      this._valueOptions[0][index] = valueOptions
    }

    _setFields(
      fields: Record<string, unknown>,
      valueOptions: FormattingOptions = {},
    ): void {
      if (typeof fields !== "object") {
        throw new Error(`Expected an object but got ${typeof fields}`)
      }
      for (const field in fields) {
        this._set(field, fields[field], valueOptions)
      }
    }

    _setFieldsRows(
      fieldsRows: Record<string, unknown>[],
      valueOptions: FormattingOptions = {},
    ): void {
      if (!_isArray(fieldsRows)) {
        throw new Error(
          `Expected an array of objects but got ${typeof fieldsRows}`,
        )
      }
      this._reset()
      for (let i = 0; fieldsRows.length > i; ++i) {
        const fieldRow = fieldsRows[i]
        for (let field in fieldRow) {
          let value = fieldRow[field]
          field = this._sanitizeField(field)
          value = this._sanitizeValue(value)
          let index = this._fields.indexOf(field)
          if (i > 0 && index === -1) {
            throw new Error(
              "All fields in subsequent rows must match the fields in the first row",
            )
          }
          if (index === -1) {
            this._fields.push(field)
            index = this._fields.length - 1
          }
          if (!_isArray(this._values[i])) {
            this._values[i] = []
            this._valueOptions[i] = []
          }
          this._values[i][index] = value
          this._valueOptions[i][index] = valueOptions
        }
      }
    }
  }

  cls.SetFieldBlock = class extends cls.AbstractSetFieldBlock {
    set(field: any, value: any, options?: any): void {
      this._set(field, value, options)
    }

    setFields(fields: any, valueOptions?: any): void {
      this._setFields(fields, valueOptions)
    }

    _toParamString(options: any = {}): any {
      const { buildParameterized } = options
      if (this._fields.length <= 0) throw new Error("set() needs to be called")
      let totalStr = ""
      const totalValues: any[] = []
      for (let i = 0; i < this._fields.length; ++i) {
        totalStr = _pad(totalStr, ", ")
        let field = this._formatFieldName(this._fields[i])
        const value = this._values[0][i]
        if (field.indexOf("=") < 0) {
          field = `${field} = ${this.options.parameterCharacter}`
        }
        const ret = this._buildString(field, [value], {
          buildParameterized,
          formattingOptions: this._valueOptions[0][i],
        })
        totalStr += ret.text
        ret.values.forEach((v: any) => totalValues.push(v))
      }
      return { text: `SET ${totalStr}`, values: totalValues }
    }
  }

  cls.InsertFieldValueBlock = class extends cls.AbstractSetFieldBlock {
    set(field: any, value: any, options: any = {}): void {
      this._set(field, value, options)
    }

    setFields(fields: any, valueOptions?: any): void {
      this._setFields(fields, valueOptions)
    }

    setFieldsRows(fieldsRows: any, valueOptions?: any): void {
      this._setFieldsRows(fieldsRows, valueOptions)
    }

    _toParamString(options: any = {}): any {
      const { buildParameterized } = options
      const fieldString = this._fields
        .map((f: any) => this._formatFieldName(f))
        .join(", ")
      const valueStrings: string[] = []
      const totalValues: any[] = []
      for (let i = 0; i < this._values.length; ++i) {
        valueStrings[i] = ""
        for (let j = 0; j < this._values[i].length; ++j) {
          const ret = this._buildString(
            this.options.parameterCharacter,
            [this._values[i][j]],
            {
              buildParameterized,
              formattingOptions: this._valueOptions[i][j],
            },
          )
          ret.values.forEach((v: any) => totalValues.push(v))
          valueStrings[i] = _pad(valueStrings[i], ", ")
          valueStrings[i] += ret.text
        }
      }
      return {
        text: fieldString.length
          ? `(${fieldString}) VALUES (${valueStrings.join("), (")})`
          : "",
        values: totalValues,
      }
    }
  }

  cls.InsertFieldsFromQueryBlock = class extends cls.Block {
    _fields: unknown[]
    _query: unknown = null

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._fields = []
    }

    fromQuery(fields: string[], selectQuery: unknown): void {
      this._fields = fields.map((v) => this._sanitizeField(v))
      this._query = this._sanitizeBaseBuilder(selectQuery)
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr = ""
      let totalValues: any[] = []
      if (this._fields.length && this._query) {
        const { text, values } = (this._query as any)._toParamString({
          buildParameterized: options.buildParameterized,
          nested: true,
        })
        totalStr = `(${this._fields.join(", ")}) ${this._applyNestingFormatting(text)}`
        totalValues = values
      }
      return { text: totalStr, values: totalValues }
    }
  }

  cls.DistinctBlock = class extends cls.Block {
    _useDistinct = false

    distinct(): void {
      this._useDistinct = true
    }

    _toParamString(): ParamString {
      return { text: this._useDistinct ? "DISTINCT" : "", values: [] }
    }
  }

  cls.GroupByBlock = class extends cls.Block {
    _groups: string[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._groups = []
    }

    group(field: string): void {
      this._groups.push(this._sanitizeField(field) as string)
    }

    _toParamString(_options: ToParamOptions = {}): ParamString {
      return {
        text: this._groups.length ? `GROUP BY ${this._groups.join(", ")}` : "",
        values: [],
      }
    }
  }

  cls.AbstractVerbSingleValueBlock = class extends cls.Block {
    _value: number | null = null

    constructor(options?: QueryBuilderOptions) {
      super(options)
    }

    _setValue(value: number | null): void {
      this._value = value !== null ? this._sanitizeLimitOffset(value) : value
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      const expr =
        this._value !== null
          ? `${this.options.verb} ${this.options.parameterCharacter}`
          : ""
      const values = this._value !== null ? [this._value] : []
      return this._buildString(expr, values, options as BuildStringOptions)
    }
  }

  cls.OffsetBlock = class extends cls.AbstractVerbSingleValueBlock {
    constructor(options?: QueryBuilderOptions) {
      super(_extend({}, options, { verb: "OFFSET" }))
    }

    offset(start: number | null): void {
      this._setValue(start)
    }
  }

  cls.LimitBlock = class extends cls.AbstractVerbSingleValueBlock {
    constructor(options?: QueryBuilderOptions) {
      super(_extend({}, options, { verb: "LIMIT" }))
    }

    limit(limit: number | null): void {
      this._setValue(limit)
    }
  }

  interface ConditionEntry {
    expr: unknown
    values: unknown[]
  }

  cls.AbstractConditionBlock = class extends cls.Block {
    _conditions: ConditionEntry[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._conditions = []
    }

    _condition(condition: unknown, ...values: unknown[]): void {
      condition = this._sanitizeExpression(condition)
      this._conditions.push({ expr: condition, values: values || [] })
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      const parts: string[] = []
      const totalValues: any[] = []
      for (const { expr, values } of this._conditions) {
        const ret: ParamString = cls.isSquelBuilder(expr)
          ? (expr as any)._toParamString({
              buildParameterized: options.buildParameterized,
            })
          : this._buildString(expr as string, values as any[], {
              buildParameterized: options.buildParameterized,
            })
        if (ret.text.length) parts.push(ret.text)
        ret.values.forEach((v: any) => totalValues.push(v))
      }
      const totalStr = parts.join(") AND (")
      return {
        text: totalStr.length ? `${this.options.verb} (${totalStr})` : "",
        values: totalValues,
      }
    }
  }

  cls.WhereBlock = class extends cls.AbstractConditionBlock {
    constructor(options?: QueryBuilderOptions) {
      super(_extend({}, options, { verb: "WHERE" }))
    }

    where(condition: unknown, ...values: unknown[]): void {
      this._condition(condition, ...values)
    }
  }

  cls.HavingBlock = class extends cls.AbstractConditionBlock {
    constructor(options?: QueryBuilderOptions) {
      super(_extend({}, options, { verb: "HAVING" }))
    }

    having(condition: unknown, ...values: unknown[]): void {
      this._condition(condition, ...values)
    }
  }

  interface OrderEntry {
    field: unknown
    dir: string | null
    values: unknown[]
  }

  cls.OrderByBlock = class extends cls.Block {
    _orders: OrderEntry[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._orders = []
    }

    order(
      field: unknown,
      dir: boolean | string | null | undefined,
      ...values: unknown[]
    ): void {
      field = this._sanitizeField(field)
      let direction: string | null
      if (typeof dir === "string") {
        direction = dir
      } else if (dir === undefined) {
        direction = "ASC"
      } else if (dir === null) {
        direction = null
      } else {
        direction = dir ? "ASC" : "DESC"
      }
      this._orders.push({ field, dir: direction, values: values || [] })
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr = ""
      const totalValues: any[] = []
      for (const { field, dir, values } of this._orders) {
        totalStr = _pad(totalStr, ", ")
        const ret = this._buildString(field as string, values as any[], {
          buildParameterized: options.buildParameterized,
        })
        totalStr += ret.text
        if (_isArray(ret.values)) {
          ret.values.forEach((v: any) => totalValues.push(v))
        }
        if (dir !== null) totalStr += ` ${dir}`
      }
      return {
        text: totalStr.length ? `ORDER BY ${totalStr}` : "",
        values: totalValues,
      }
    }
  }

  interface JoinEntry {
    type: string
    table: unknown
    alias: string | null
    condition: unknown
  }

  cls.JoinBlock = class extends cls.Block {
    _joins: JoinEntry[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._joins = []
    }

    join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
      type = "INNER",
    ): void {
      table = this._sanitizeTable(table, true)
      alias = alias ? this._sanitizeTableAlias(alias) : alias
      condition = condition ? this._sanitizeExpression(condition) : condition
      this._joins.push({ type, table, alias, condition })
    }

    left_join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
    ): void {
      this.join(table, alias, condition, "LEFT")
    }

    right_join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
    ): void {
      this.join(table, alias, condition, "RIGHT")
    }

    outer_join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
    ): void {
      this.join(table, alias, condition, "OUTER")
    }

    left_outer_join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
    ): void {
      this.join(table, alias, condition, "LEFT OUTER")
    }

    full_join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
    ): void {
      this.join(table, alias, condition, "FULL")
    }

    cross_join(
      table: unknown,
      alias: string | null = null,
      condition: unknown = null,
    ): void {
      this.join(table, alias, condition, "CROSS")
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr = ""
      const totalValues: any[] = []
      for (const { type, table, alias, condition } of this._joins) {
        totalStr = _pad(totalStr, this.options.separator)
        let tableStr: string
        if (cls.isSquelBuilder(table)) {
          const ret: ParamString = (table as any)._toParamString({
            buildParameterized: options.buildParameterized,
            nested: true,
          })
          ret.values.forEach((v: any) => totalValues.push(v))
          tableStr = ret.text
        } else {
          tableStr = this._formatTableName(table)
        }
        totalStr += `${type} JOIN ${tableStr}`
        if (alias) totalStr += ` ${this._formatTableAlias(alias)}`
        if (condition) {
          totalStr += " ON "
          let ret: ParamString
          if (cls.isSquelBuilder(condition)) {
            ret = (condition as any)._toParamString({
              buildParameterized: options.buildParameterized,
            })
          } else {
            ret = this._buildString(condition as string, [], {
              buildParameterized: options.buildParameterized,
            })
          }
          totalStr += this._applyNestingFormatting(ret.text)
          ret.values.forEach((v: any) => totalValues.push(v))
        }
      }
      return { text: totalStr, values: totalValues }
    }
  }

  cls.UnionBlock = class extends cls.Block {
    _unions: any[]

    constructor(options?: QueryBuilderOptions) {
      super(options)
      this._unions = []
    }

    union(table: unknown, type = "UNION"): void {
      table = this._sanitizeTable(table)
      this._unions.push({ type, table })
    }

    union_all(table: unknown): void {
      this.union(table, "UNION ALL")
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      let totalStr = ""
      const totalValues: any[] = []
      for (const { type, table } of this._unions) {
        totalStr = _pad(totalStr, this.options.separator)
        let tableStr: string
        if (table instanceof cls.BaseBuilder) {
          const ret: ParamString = (table as any)._toParamString({
            buildParameterized: options.buildParameterized,
            nested: true,
          })
          tableStr = ret.text
          ret.values.forEach((v: any) => totalValues.push(v))
        } else {
          totalStr = this._formatTableName(table)
          tableStr = ""
        }
        totalStr += `${type} ${tableStr}`
      }
      return { text: totalStr, values: totalValues }
    }
  }

  cls.QueryBuilder = class extends cls.BaseBuilder {
    blocks: any[];
    [methodName: string]: any

    constructor(options?: QueryBuilderOptions, blocks?: any[]) {
      super(options)
      this.blocks = blocks || []
      for (const block of this.blocks) {
        const exposedMethods = block.exposedMethods()
        for (const methodName in exposedMethods) {
          const methodBody = exposedMethods[methodName]
          if (this[methodName] !== undefined) {
            throw new Error(
              `Builder already has a builder method called: ${methodName}`,
            )
          }
          ;((b, name, body) => {
            this[name] = (...args: any[]) => {
              body.call(b, ...args)
              return this
            }
          })(block, methodName, methodBody)
        }
      }
    }

    registerValueHandler(type: ValueType, handler: ValueHandler): this {
      for (const block of this.blocks) {
        block.registerValueHandler(type, handler)
      }
      super.registerValueHandler(type, handler)
      return this
    }

    updateOptions(options: QueryBuilderOptions): void {
      this.options = _extend(this.options, options)
      for (const block of this.blocks) {
        block.options = _extend(block.options, options)
      }
    }

    _toParamString(options: ToParamOptions = {}): ParamString {
      const opts: any = _extend({}, this.options, options)
      const blockResults = this.blocks.map((b) =>
        b._toParamString({
          buildParameterized: opts.buildParameterized,
          queryBuilder: this,
        }),
      )
      const blockTexts = blockResults.map((b: any) => b.text)
      const blockValues = blockResults.map((b: any) => b.values)
      let totalStr = blockTexts
        .filter((v: string) => v.length > 0)
        .join(opts.separator)
      const totalValues: any[] = []
      blockValues.forEach((block: any) =>
        block.forEach((value: any) => totalValues.push(value)),
      )
      if (!opts.nested) {
        if (opts.numberedParameters) {
          let i =
            opts.numberedParametersStartAt !== undefined
              ? opts.numberedParametersStartAt
              : 1
          const regex = (opts.parameterCharacter as string).replace(
            /[-[\]{}()*+?.,\\^$|#\s]/g,
            "\\$&",
          )
          totalStr = totalStr.replace(new RegExp(regex, "g"), () => {
            return `${opts.numberedParametersPrefix}${i++}`
          })
        }
      }
      return {
        text: this._applyNestingFormatting(totalStr, !!opts.nested),
        values: totalValues,
      }
    }

    clone(): this {
      const blockClones = this.blocks.map((v) => v.clone())
      return new (this as any).constructor(this.options, blockClones)
    }

    getBlock<T>(blockType: new (...args: any[]) => T): T | undefined {
      return this.blocks.filter((b) => b instanceof blockType)[0]
    }
  }

  cls.Select = class extends cls.QueryBuilder {
    constructor(options?: QueryBuilderOptions, blocks: any = null) {
      blocks = blocks || [
        new cls.StringBlock(options, "SELECT"),
        new cls.FunctionBlock(options),
        new cls.DistinctBlock(options),
        new cls.GetFieldBlock(options),
        new cls.FromTableBlock(options),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.GroupByBlock(options),
        new cls.HavingBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
        new cls.OffsetBlock(options),
        new cls.UnionBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Update = class extends cls.QueryBuilder {
    constructor(options?: QueryBuilderOptions, blocks: any = null) {
      blocks = blocks || [
        new cls.StringBlock(options, "UPDATE"),
        new cls.UpdateTableBlock(options),
        new cls.SetFieldBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Delete = class extends cls.QueryBuilder {
    constructor(options?: QueryBuilderOptions, blocks: any = null) {
      blocks = blocks || [
        new cls.StringBlock(options, "DELETE"),
        new cls.TargetTableBlock(options),
        new cls.FromTableBlock(_extend({}, options, { singleTable: true })),
        new cls.JoinBlock(options),
        new cls.WhereBlock(options),
        new cls.OrderByBlock(options),
        new cls.LimitBlock(options),
      ]
      super(options, blocks)
    }
  }

  cls.Insert = class extends cls.QueryBuilder {
    constructor(options?: QueryBuilderOptions, blocks: any = null) {
      blocks = blocks || [
        new cls.StringBlock(options, "INSERT"),
        new cls.IntoTableBlock(options),
        new cls.InsertFieldValueBlock(options),
        new cls.InsertFieldsFromQueryBlock(options),
      ]
      super(options, blocks)
    }
  }

  const _squel: any = {
    VERSION: pkg.version,
    flavour,
    expr: (options?: QueryBuilderOptions) => new cls.Expression(options),
    case: (
      name?: string | QueryBuilderOptions,
      options?: QueryBuilderOptions,
    ) => new cls.Case(name, options),
    select: (options?: QueryBuilderOptions, blocks?: any[]) =>
      new cls.Select(options, blocks),
    update: (options?: QueryBuilderOptions, blocks?: any[]) =>
      new cls.Update(options, blocks),
    insert: (options?: QueryBuilderOptions, blocks?: any[]) =>
      new cls.Insert(options, blocks),
    delete: (options?: QueryBuilderOptions, blocks?: any[]) =>
      new cls.Delete(options, blocks),
    str: (...args: unknown[]) => {
      const inst = new cls.FunctionBlock()
      ;(inst as any).function(...args)
      return inst
    },
    rstr: (...args: unknown[]) => {
      const inst = new cls.FunctionBlock({ rawNesting: true })
      ;(inst as any).function(...args)
      return inst
    },
    registerValueHandler: cls.registerValueHandler,
  }

  _squel.remove = _squel.delete
  _squel.cls = cls

  return _squel as Squel
}

export { _buildSquel, _pad, _extend, _isPlainObject, _isArray, _clone }

const squel: Squel = _buildSquel()

squel.flavours = {}

squel.useFlavour = function useFlavour(
  f: Flavour | string | null = null,
): Squel {
  if (!f) return squel
  if (squel.flavours[f] instanceof Function) {
    const s = _buildSquel(f as Flavour)
    squel.flavours[f].call(null, s)
    s.flavours = squel.flavours
    s.useFlavour = squel.useFlavour
    return s
  }
  throw new Error(`Flavour not available: ${f}`)
}

export default squel
export { squel }
