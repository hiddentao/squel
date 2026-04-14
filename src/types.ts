export type Flavour = "mssql" | "mysql" | "postgres"

export interface ParamString {
  text: string
  values: unknown[]
}

export type ValueHandler<T = unknown> = (
  value: T,
  asParam: boolean,
  formattingOptions?: FormattingOptions,
) => string | ParamString | unknown

export type ValueType = string | (new (...args: unknown[]) => unknown)

export interface ValueHandlerEntry {
  type: ValueType
  handler: ValueHandler
}

export interface FormattingOptions {
  ignorePeriodsForFieldNameQuotes?: boolean
  dontQuote?: boolean
  [key: string]: unknown
}

export interface BuildStringOptions {
  buildParameterized?: boolean
  nested?: boolean
  formattingOptions?: FormattingOptions
}

export interface QueryBuilderOptions {
  autoQuoteTableNames?: boolean
  autoQuoteFieldNames?: boolean
  autoQuoteAliasNames?: boolean
  useAsForTableAliasNames?: boolean
  nameQuoteCharacter?: string
  tableAliasQuoteCharacter?: string
  fieldAliasQuoteCharacter?: string
  valueHandlers?: ValueHandlerEntry[]
  parameterCharacter?: string
  numberedParameters?: boolean
  numberedParametersPrefix?: string
  numberedParametersStartAt?: number
  replaceSingleQuotes?: boolean
  singleQuoteReplacement?: string
  separator?: string
  stringFormatter?: ((value: string) => string) | null
  rawNesting?: boolean
  prefix?: string
  singleTable?: boolean
  verb?: string
  forDelete?: boolean
}

export interface ToParamOptions {
  numberedParametersStartAt?: number
  buildParameterized?: boolean
  nested?: boolean
  [key: string]: unknown
}

export interface Cloneable {
  clone(): this
}

export interface BaseBuilder extends Cloneable {
  options: QueryBuilderOptions
  registerValueHandler(type: ValueType, handler: ValueHandler): this
  toString(options?: ToParamOptions): string
  toParam(options?: ToParamOptions): ParamString
}

export interface Expression extends BaseBuilder {
  and(expr: string | Expression | QueryBuilder, ...params: unknown[]): this
  or(expr: string | Expression | QueryBuilder, ...params: unknown[]): this
}

export interface Case extends BaseBuilder {
  when(expression: string, ...values: unknown[]): this
  then(result: unknown): this
  else(elseValue: unknown): this
}

export interface QueryBuilder extends BaseBuilder {
  blocks: unknown[]
  updateOptions(options: QueryBuilderOptions): void
  getBlock<T>(blockType: new (...args: any[]) => T): T | undefined
  [method: string]: unknown
}

export type Joinable = string | BaseBuilder
export type Conditional = string | BaseBuilder
export type Fieldable = string | BaseBuilder

export interface Select extends QueryBuilder {
  from(table: Joinable, alias?: string): this
  field(field: Fieldable, alias?: string, options?: FormattingOptions): this
  fields(
    fields: string[] | { [field: string]: string | null },
    options?: FormattingOptions,
  ): this
  distinct(...fields: string[]): this
  group(field: string): this
  where(condition: Conditional, ...values: unknown[]): this
  having(condition: Conditional, ...values: unknown[]): this
  order(
    field: string,
    dir?: boolean | string | null,
    ...values: unknown[]
  ): this
  limit(limit: number | null): this
  offset(start: number | null): this
  join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
    type?: string,
  ): this
  left_join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
  ): this
  right_join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
  ): this
  outer_join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
  ): this
  left_outer_join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
  ): this
  full_join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
  ): this
  cross_join(
    table: Joinable,
    alias?: string | null,
    condition?: Conditional | null,
  ): this
  union(table: Joinable, type?: string): this
  union_all(table: Joinable): this
  function(str: string, ...values: unknown[]): this
  with?(alias: string, table: QueryBuilder): this
}

export interface Update extends QueryBuilder {
  table(table: string, alias?: string): this
  set(field: string, value?: unknown, options?: FormattingOptions): this
  setFields(
    fields: { [field: string]: unknown },
    valueOptions?: FormattingOptions,
  ): this
  where(condition: Conditional, ...values: unknown[]): this
  order(
    field: string,
    dir?: boolean | string | null,
    ...values: unknown[]
  ): this
  limit(limit: number | null): this
}

export interface Insert extends QueryBuilder {
  into(table: string): this
  set(field: string, value?: unknown, options?: FormattingOptions): this
  setFields(
    fields: { [field: string]: unknown },
    valueOptions?: FormattingOptions,
  ): this
  setFieldsRows(
    fieldsRows: Array<{ [field: string]: unknown }>,
    valueOptions?: FormattingOptions,
  ): this
  fromQuery(fields: string[], selectQuery: Select): this
  onDupUpdate?(
    field: string,
    value?: unknown,
    options?: FormattingOptions,
  ): this
}

export interface Delete extends QueryBuilder {
  target(table: string): this
  from(table: string, alias?: string): this
  where(condition: Conditional, ...values: unknown[]): this
  order(
    field: string,
    dir?: boolean | string | null,
    ...values: unknown[]
  ): this
  limit(limit: number | null): this
}

export type FlavourRegistration = (squel: Squel) => void

export interface Squel {
  VERSION: string
  flavour: Flavour | null
  flavours: { [name: string]: FlavourRegistration }
  cls: ClsRegistry
  expr(options?: QueryBuilderOptions): Expression
  case(name?: string, options?: QueryBuilderOptions): Case
  case(options?: QueryBuilderOptions): Case
  select(options?: QueryBuilderOptions, blocks?: unknown[]): Select
  update(options?: QueryBuilderOptions, blocks?: unknown[]): Update
  insert(options?: QueryBuilderOptions, blocks?: unknown[]): Insert
  delete(options?: QueryBuilderOptions, blocks?: unknown[]): Delete
  remove(options?: QueryBuilderOptions, blocks?: unknown[]): Delete
  str(...args: unknown[]): BaseBuilder
  rstr(...args: unknown[]): BaseBuilder
  registerValueHandler(type: ValueType, handler: ValueHandler): void
  useFlavour(flavour?: Flavour | string | null): Squel
  replace?(options?: QueryBuilderOptions, blocks?: unknown[]): Insert
}

/**
 * The cls registry exposes squel's internal class hierarchy. Each entry is a
 * constructor for one of the building-block classes. Flavours add their own
 * classes via index access, hence the open index signature.
 */
export interface ClsRegistry {
  isSquelBuilder(obj: unknown): boolean
  DefaultQueryBuilderOptions: Required<QueryBuilderOptions>
  globalValueHandlers: ValueHandlerEntry[]
  registerValueHandler(type: ValueType, handler: ValueHandler): void
  Cloneable: new () => Cloneable
  BaseBuilder: new (options?: QueryBuilderOptions) => BaseBuilder
  Block: new (options?: QueryBuilderOptions) => BaseBuilder
  Expression: new (options?: QueryBuilderOptions) => Expression
  Case: new (
    fieldName?: string | QueryBuilderOptions,
    options?: QueryBuilderOptions,
  ) => Case
  StringBlock: new (
    options: QueryBuilderOptions | undefined,
    str: string,
  ) => BaseBuilder
  FunctionBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  AbstractTableBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  TargetTableBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  UpdateTableBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  FromTableBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  IntoTableBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  GetFieldBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  AbstractSetFieldBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  SetFieldBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  InsertFieldValueBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  InsertFieldsFromQueryBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  DistinctBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  GroupByBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  AbstractVerbSingleValueBlock: new (
    options?: QueryBuilderOptions,
  ) => BaseBuilder
  OffsetBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  LimitBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  AbstractConditionBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  WhereBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  HavingBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  OrderByBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  JoinBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  UnionBlock: new (options?: QueryBuilderOptions) => BaseBuilder
  QueryBuilder: new (
    options?: QueryBuilderOptions,
    blocks?: unknown[],
  ) => QueryBuilder
  Select: new (options?: QueryBuilderOptions, blocks?: unknown[]) => Select
  Update: new (options?: QueryBuilderOptions, blocks?: unknown[]) => Update
  Delete: new (options?: QueryBuilderOptions, blocks?: unknown[]) => Delete
  Insert: new (options?: QueryBuilderOptions, blocks?: unknown[]) => Insert
  /** Flavour-added classes (e.g. PostgresOnConflictKeyUpdateBlock). */
  [key: string]: any
}
