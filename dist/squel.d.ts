/* tslint:disable:max-file-line-count */

declare namespace squel {
  type Flavour = "mssql" | "mysql" | "postgres";

  type ValueHandler<T> = (value: T, asParam: boolean) => string | ParamString;

  interface BuilderConstructor<B> {
    new(options?: QueryBuilderOptions): B;
  }

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * Base classes
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */

  interface ToParamOptions {
    /**
     * The index to start numbered parameter placeholders at. Default is `1`.
     */
    numberedParametersStartAt: number;
  }

  /**
   * Base class for cloneable builders
   */
  interface Cloneable {
    /**
     * Clone this object instance.
     */
    clone(): this;
  }

  interface CompleteQueryBuilderOptions {
    /**
     * If `true` then table names will be rendered inside quotes. The quote character used is configurable via the
     * `nameQuoteCharacter` option. `Default: (false)`.
     */
    autoQuoteTableNames: boolean;

    /**
     * If `true` then field names will be rendered inside quotes. The quote character used is configurable via the
     * `nameQuoteCharacter` option. `Default: (false)`.
     */
    autoQuoteFieldNames: boolean;

    /**
     * If `true` then alias names will be rendered inside quotes. The quote character used is configurable via the
     * `tableAliasQuoteCharacter` and `fieldAliasQuoteCharacter` options. `Default: (false)`.
     */
    autoQuoteAliasNames: boolean;

    /**
     * Use `AS` clause when outputting table aliases. `Default: (false)`.
     */
    useAsForTableAliasNames: boolean;

    /**
     * The quote character used when quoting table and field names. <code>Default: (`)</code>.
     */
    nameQuoteCharacter: string;

    /**
     * The quote character used when quoting table alias names. <code>Default: (`)</code>.
     */
    tableAliasQuoteCharacter: string;

    /**
     * The quote character used when quoting field alias names. `Default: (")`.
     */
    fieldAliasQuoteCharacter: string;

    /**
     * Custom value type handlers for this builder. These override the handlers set for the given value types via
     * [[Cls.registerValueHandler]] `Default: ([])`.
     */
    valueHandlers: ValueHandler<any>[];

    /**
     * String used to represent a parameter value. `Default: (?)`.
     */
    parameterCharacter: string;

    /**
     * Whether to use numbered parameters placeholders when building parameterized query strings.
     * `Default: (false, postgres: true)`.
     */
    numberedParameters: boolean;

    /**
     * Numbered parameters prefix character(s). `Default: ($)`.
     */
    numberedParametersPrefix: string;

    /**
     * The index to start numbered parameter placeholders at. `Default: (1)`.
     */
    numberedParametersStartAt: number;

    /**
     * Whether to replace single quotes within strings. The replacement is specified in
     * `singleQuoteReplacement`. `Default: (false)`.
     */
    replaceSingleQuotes: boolean;

    /**
     * What to replace single quotes with if replaceSingleQuotes is enabled. `Default: ('')`.
     */
    singleQuoteReplacement: string;

    /**
     * String used to join individual blocks in a query when it is stringified. `Default: ( )`.
     */
    separator: string;

    /**
     * Function to process string values, prior to insertion into a query string. `Default: (null)`.
     */
    stringFormatter: any | null;

    /**
     * Whether to prevent the addition of brackets () when nesting this query builder's output. `Default: (false)`.
     */
    rawNesting: boolean;
  }

  type QueryBuilderOptions = Partial<CompleteQueryBuilderOptions>;

  interface ParamString {
    text: string;
    values: any[];
  }

  export interface FormattingOptions {
    // TODO
  }

  export interface BuildManyStringOptions {
    /**
     * Whether to build paramterized string. Default is false.
     */
    buildParameterized?: boolean;

    /**
     * Whether this expression is nested within another.
     */
    nested?: boolean;
  }

  export interface BuildStringOptions extends BuildManyStringOptions {
    /**
     * Formatting options for values in query string.
     */
    formattingOptions?: FormattingOptions;
  }

  export interface FormatValueResult<T = any> {
    formatted: boolean;
    value: T;
    rawNesting?: boolean;
  }

  /**
   * Base class for all builders
   */
  interface BaseBuilder extends Cloneable {
    options: CompleteQueryBuilderOptions;

    /**
     * Register a custom value type handler. We may wish to use custom value types (e.g. `Date`) and have Squel
     * automatically take care of formatting them when building the output query string.
     *
     * @param type The class object or `typeof` string representing the value type to handle
     * @param handler The handler method to call when we wish to format this value for output in a query string
     */
    registerValueHandler(type: {new(...args: any[]): any} | string, handler: ValueHandler<any>): this;

    /**
     * Build and return the final query string.
     */
    toString(): string;

    /**
     * Build and return the final parameterized query string along with the list of formatted parameter values.
     *
     * @param options Additional options.
     */
    toParam(options?: ToParamOptions): ParamString;

    /**
     * Sanitize given expression.
     *
     * Note: This ensures that the type is a string or BaseBuilder, else it throws an error
     */
    _sanitizeExpression<T extends string | BaseBuilder>(expr: T): T;

    /**
     * Sanitize the given name.
     *
     * The 'type' parameter is used to construct a meaningful error message in case validation fails.
     */
    _sanitizeName(value: string, type: string): string;

    _sanitizeField<T extends string | BaseBuilder>(item: T): T;

    _sanitizeBaseBuilder<T extends BaseBuilder>(item: T): T;

    _sanitizeTable<T extends string | BaseBuilder>(item: T): T;

    _sanitizeTableAlias(item: string): string;

    _sanitizeFieldAlias(item: string): string;

    /**
     * Sanitize the given limit/offset value.
     */
    _sanitizeLimitOffset(value: number): number;

    /**
     * Santize the given field value
     */
    _sanitizeValue<T>(item: T): T;

    /**
     * Escape a string value, e.g. escape quotes and other characters within it.
     */
    _escapeValue(value: string): string;

    _formatTableName(item: string): string;

    _formatFieldAlias(item: string): string;

    _formatTableAlias(item: string): string;

    _formatFieldName(item: string, formattingOptions?: {ignorePeriodsForFieldNameQuotes?: boolean}): string;

    _formatCustomValue<T = any>(
      value: T,
      asParam: boolean,
      formattingOptions?: FormattingOptions,
    ): FormatValueResult<T>;

    // Note: this type definition does not handle multi-dimensional arrays
    // TODO(demurgos): Handle multidimensional arrays
    _formatValueForParamArray<T = any>(
      value: T[],
      formattingOptions?: FormattingOptions,
    ): FormatValueResult<T>[];

    _formatValueForParamArray<T = any>(
      value: T,
      formattingOptions?: FormattingOptions,
    ): FormatValueResult<T>;

    /**
     * Format the given field value for inclusion into the query string
     */
    _formatValueForQueryString(initialValue: any, formattingOptions?: FormattingOptions): string;

    _applyNestingFormatting(str: string, nesting?: boolean): string;

    /**
     * Build given string and its corresponding parameter values into
     * output.
     *
     * @param str
     * @param values
     * @param options Additional options.
     */
    _buildString(str: string, values: any[], options?: BuildStringOptions): ParamString;

    /**
     * Build all given strings and their corresponding parameter values into
     * output.
     *
     * @param strings
     * @param strValues array of value arrays corresponding to each string.
     * @param options Additional options.
     */
    _buildManyStrings(strings: string[], strValues: any[][], options?: BuildManyStringOptions): ParamString;

    _toParamString(options?: ToParamOptions): ParamString;
  }

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * Expression
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */

  export interface ExpressionNode {
    type: "AND" | "OR";
    expr: string | BaseBuilder;
    para: any[];
  }

  /**
   * An SQL expression builder.
   *
   * SQL expressions are used in WHERE and ON clauses to filter data by various criteria.
   *
   * Expressions can be nested. Nested expression contains can themselves
   * contain nested expressions. When rendered a nested expression will be
   * fully contained within brackets.
   *
   * All the build methods in this object return the object instance for chained method calling purposes.
   */
  interface Expression extends BaseBuilder {
    _nodes: ExpressionNode[];

    /**
     * Add to the current expression using `AND`.
     *
     * @param expr The expression to add
     * @param params The expression parameters supplied as additional arguments Default is `[]`.
     */
    and(expr: string | Expression, ...params: any[]): this;

    /**
     * Add to the current expression using `OR`.
     *
     * @param expr The expression to add
     * @param params The expression parameters supplied as additional arguments Default is `[]`.
     */
    or(expr: string | Expression, ...params: any[]): this;
  }

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * Case
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */

  export interface CaseItem {
    expression: string;
    values: any[];
    result?: any;
  }

  /**
   * An SQL CASE expression builder.
   *
   * SQL cases are used to select proper values based on specific criteria.
   */
  interface Case extends BaseBuilder {
    _cases: CaseItem[];
    _elseValue: any | null;

    /**
     * A `WHEN` clause
     *
     * @param expression The expression for the current case.
     * @param values Additional arguments for parameter substitution. See guide for examples. Default is `null`.
     */
    when(expression: string, ...values: any[]): this;

    /**
     * A THEN clause
     *
     * @param result The result for the current case.
     */
    then(result: any): this;

    /**
     * An `ELSE` clause
     *
     * @param elseValue The else value for the current case.
     */
    else(elseValue: any): this;
  }

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * Building blocks
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */

  /**
   * A building block represents a single build-step within a query building process.
   *
   * Query builders consist of one or more building blocks which get run in a particular order. Building blocks can
   * optionally specify methods to expose through the query builder interface. They can access all the input data for
   * the query builder and manipulate it as necessary, as well as append to the final query string output.
   *
   * If you wish to customize how queries get built or add proprietary query phrases and content then it is
   * recommended that you do so using one or more custom building blocks.
   *
   * Original idea posted in https://github.com/hiddentao/export/issues/10#issuecomment-15016427
   */
  interface Block extends BaseBuilder {
    /**
     * Get input methods to expose within the query builder.
     *
     * By default all methods except the following get returned:
     *   methods prefixed with _
     *   constructor and toString()
     *
     * @return Object key -> function pairs
     */
    exposedMethods(): {[key: string]: (...args: any[]) => any};
  }

  /**
   * A fixed string which always gets output
   */
  interface StringBlock extends Block {
    _str: string;
  }

  interface StringBlockConstructor {
    new(options: QueryBuilderOptions | undefined, str: string): StringBlock;
  }

  /**
   * A function string block
   */
  interface FunctionBlock extends Block {
    _strings: string[];
    _values: any[];

    /**
     * Insert a function value, see [[FunctionBlock]].
     */
    function(str: string, ...value: any[]): void;
  }

  interface FunctionMixin {
    /**
     * Insert a function value, see [[FunctionBlock]].
     */
    function(str: string, ...value: any[]): this;
  }

  export interface Table {
    table: string | BaseBuilder;
    alias: string | null;
  }

  interface TableBlockOptions extends QueryBuilderOptions {
    /**
     * If true then only allow one table spec.
     */
    singleTable?: boolean;
  }

  interface AbstractTableBlock extends Block {
    options: CompleteQueryBuilderOptions & TableBlockOptions;

    _tables: Table[];

    /**
     * Update given table.
     *
     * An alias may also be specified for the table.
     *
     * Concrete subclasses should provide a method which calls this
     */
    _table(table: string | BaseBuilder, alias?: string): void;

    /**
     * get whether a table has been set
     */
    _hasTable(): boolean;
  }

  interface TargetTableBlock extends AbstractTableBlock {
    target(table: string): void;
  }

  interface TargetTableMixin {
    /**
     * The actual target table whose data is to be deleted. Used in conjunction with `from()`.
     *
     * @param table Name of table.
     */
    target(table: string): this;
  }

  interface UpdateTableBlock extends AbstractTableBlock {
    table(name: string, alias?: string): void;
  }

  interface UpdateTableMixin {
    /**
     * A table to update.
     *
     * @param name Name of table.
     * @param alias An alias by which to refer to this table. Default is `null`.
     */
    table(name: string, alias?: string): this;
  }

  interface FromTableBlock extends AbstractTableBlock {
    from(name: string | BaseBuilder, alias?: string): void;
  }

  interface FromTableMixin {
    /**
     * A table to select data from.
     *
     * @param name Name of table or a builder.
     * @param alias An alias by which to refer to this table. Default is null.
     */
    from(name: string | BaseBuilder, alias?: string): this;
  }

  interface IntoTableBlock extends AbstractTableBlock {
    into(name: string): void;
  }

  interface IntoTableMixin {
    /**
     * The table to insert into.
     *
     * @param name Name of table.
     */
    into(name: string): this;
  }

  interface FieldOptions {
    /**
     * When `autoQuoteFieldNames` is turned on this flag instructs it to ignore the period (.) character within field
     * names. Default is `false`.
     */
    ignorePeriodsForFieldNameQuotes?: boolean;
  }

  export interface Field {
    alias: string | null;
    field: string | BaseBuilder;
    options: FieldOptions;
  }

  interface GetFieldBlock extends Block {
    _fields: Field[];

    /**
     * Add the given field to the final result set.
     *
     * The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
     * e.g. DATE_FORMAT(a.started, "%H")
     *
     * An alias may also be specified for this field.
     */
    field(name: string | BaseBuilder, alias?: string, options?: FieldOptions): this;

    /**
     * Add the given fields to the final result set.
     *
     * The parameter is an Object containing field names (or database functions) as the keys and aliases for the
     * fields as the values. If the value for a key is null then no alias is set for that field.
     *
     * Internally this method simply calls the field() method of this block to add each individual field.
     */
    fields(fields: {[field: string]: string} | string[], options?: FieldOptions): this;
  }

  interface GetFieldMixin {
    /**
     * Set a field to select data for.
     *
     * @param name Name of field OR an SQL expression such as `DATE_FORMAT` OR a builder.
     * @param alias An alias by which to refer to this field. Default is `null`.
     * @param options Additional options. Default is `null`.
     */
    field(name: string | BaseBuilder, alias?: string, options?: FieldOptions): this;

    /**
     * Set fields to select data for.
     *
     * @param fields List of field:alias pairs OR Array of field names
     * @param options Additional options. Default is `null`.
     */
    fields(fields: {[field: string]: string} | string[], options?: FieldOptions): this;
  }

  /**
   * Additional options for `update().set()`.
   */
  interface SetOptions {
    /**
     * When `autoQuoteFieldNames` is turned on this flag instructs it to ignore the period (.) character within
     * field names. Default is `false`.
     */
    ignorePeriodsForFieldNameQuotes?: boolean;

    /**
     * If set and the value is a String then it will not be quoted in the output Default is `false`.
     */
    dontQuote?: boolean;
  }

  /**
   * Additional options for `update().setFields()`.
   */
  interface SetFieldsOptions {
    /**
     * When `autoQuoteFieldNames` is turned on this flag instructs it to ignore the period (.) character within
     * field names. Default is `false`.
     */
    ignorePeriodsForFieldNameQuotes?: boolean;
  }

  interface AbstractSetFieldBlock extends Block {
    _fields: (string | BaseBuilder)[];
    _values: any[][];
    _valueOptions: SetOptions[][];

    _reset(): void;

    /**
     * Update the given field with the given value.
     * This will override any previously set value for the given field.
     */
    _set(field: string | BaseBuilder, value: any, options?: SetOptions): void;

    /**
     * Insert fields based on the key/value pairs in the given object
     */
    _setFields(fields: {[field: string]: any}, options?: SetOptions): void;
  }

  interface SetFieldBlock extends AbstractSetFieldBlock {
    set(name: string, value?: any, options?: SetOptions): this;

    setFields(fields: {[field: string]: any}, options?: SetOptions): this;

    /**
     * Insert multiple rows for the given fields. Accepts an array of objects.
     * This will override all previously set values for every field.
     */
    setFieldsRows<T extends {[field: string]: any}>(fieldsRows: T[], options?: SetFieldsOptions): void;
  }

  interface SetFieldMixin {
    /**
     * Set a field to a value.
     *
     * @param name Name of field or an operation.
     * @param value Value to set to field. Default is `undefined`.
     * @param options Additional options. Default is `null`.
     */
    set(name: string, value?: any, options?: SetOptions): this;

    /**
     * Set fields to given values.
     *
     * @param fields Field-value pairs.
     * @param options Additional options. Default is `null`.
     */
    setFields(fields: {[field: string]: any}, options?: SetFieldsOptions): this;
  }

  interface InsertFieldValueBlock extends AbstractSetFieldBlock {
    set(name: string, value: any, options?: SetOptions): void;

    setFields(name: {[field: string]: any}, options?: SetFieldsOptions): void;

    setFieldsRows<T extends {[field: string]: any}>(fields: T[], options?: SetFieldsOptions): void;
  }

  interface InsertFieldValueMixin {
    /**
     * Set a field to a value.
     *
     * @param name Name of field.
     * @param value Value to set to field.
     * @param options Additional options. Default is `null`.
     */
    set(name: string, value: any, options?: SetOptions): this;

    /**
     * Set fields to given values.
     *
     * @param name Field-value pairs.
     * @param options Additional options. Default is `null`.
     */
    setFields(name: {[field: string]: any}, options?: SetFieldsOptions): this;

    /**
     * Set fields to given values in the given rows (a multi-row insert).
     *
     * @param fields An array of objects, where each object is map of field-value pairs for that row
     * @param options Additional options. Default is `null`.
     */
    setFieldsRows<T extends {[field: string]: any}>(fields: T[], options?: SetFieldsOptions): this;
  }

  interface InsertFieldsFromQueryBlock extends Block {
    _query: null | BaseBuilder;

    fromQuery(columns: string[], selectQry: Select): void;
  }

  interface InsertFieldsFromQueryMixin {
    /**
     * Insert results of given `SELECT` query
     *
     * @param columns Names of columns to insert.
     * @param selectQry The query to run.
     */
    fromQuery(columns: string[], selectQry: Select): this;
  }

  interface DistinctBlock extends Block {
    /**
     * Add the DISTINCT keyword to the query.
     */
    distinct(): void;
  }

  interface DistinctMixin {
    /**
     * Insert the DISTINCT keyword.
     */
    distinct(): this;
  }

  interface GroupByBlock extends Block {
    _groups: string[];

    /**
     * Add a GROUP BY transformation for the given field.
     */
    group(field: string): this;
  }

  interface GroupByMixin {
    /**
     * Add an GROUP BY clause.
     *
     * @param field Name of field to group by.
     */
    group(field: string): this;
  }

  interface VerbSingleValueBlockOptions extends QueryBuilderOptions {
    /**
     * The prefix verb string.
     */
    verb?: string;
  }

  interface AbstractVerbSingleValueBlock extends Block {
    options: CompleteQueryBuilderOptions & VerbSingleValueBlockOptions;

    _value: number;

    _setValue(value: number): void;
  }

  interface OffsetBlock extends AbstractVerbSingleValueBlock {
    /**
     * Set the OFFSET transformation.
     *
     * Call this will override the previously set offset for this query. Also note that Passing 0 for 'max' will
     * remove the offset.
     */
    offset(limit: number): void;
  }

  interface OffsetMixin {
    /**
     * Add an OFFSET clause.
     *
     * @param limit Index of record to start fetching from.
     */
    offset(limit: number): this;
  }

  interface LimitBlock extends AbstractVerbSingleValueBlock {
    /**
     * Set the LIMIT transformation.
     *
     * Call this will override the previously set limit for this query. Also note that Passing 0 for 'max' will remove
     * the limit.
     */
    limit(limit: number): void;
  }

  interface LimitMixin {
    /**
     * Add a LIMIT clause.
     *
     * @param limit Number of records to limit the query to.
     */
    limit(limit: number): this;
  }

  interface ConditionBlockOptions extends QueryBuilderOptions {
    /**
     * The condition verb.
     */
    verb?: string;
  }

  interface Condition {
    expr: string | Expression;
    values: any[];
  }

  interface AbstractConditionBlock extends Block {
    options: CompleteQueryBuilderOptions & ConditionBlockOptions;

    _conditions: Condition[];
  }

  interface WhereBlock extends AbstractConditionBlock {
    where(condition: string | Expression, ...args: any[]): void;
  }

  interface WhereMixin {
    /**
     * Add a WHERE condition.
     *
     * @param condition The condition expression.
     * @param args Additional arguments for parameter substitution. See guide for examples. Default is `null`.
     */
    where(condition: string | Expression, ...args: any[]): this;
  }

  interface HavingBlock extends AbstractConditionBlock {
    having(condition: string | Expression, ...args: any[]): void;
  }

  interface HavingMixin {
    /**
     * Add a HAVING condition.
     *
     * @param condition The condition expression.
     * @param args Additional arguments for parameter substitution. See guide for examples. Default
     *             is `null`.
     */
    having(condition: string | Expression, ...args: any[]): this;
  }

  interface OrderByBlock extends Block {
    /**
     * Add an ORDER BY transformation for the given field in the given order.
     *
     * To specify descending order pass false for the 'dir' parameter.
     */
    order(field: string, direction?: boolean | null, ...values: any[]): void;
  }

  interface OrderByMixin {
    /**
     * Add an ORDER BY clause.
     *
     * @param field Name of field to sort by.
     * @param direction Sort direction. `true` = ascending, `false` = descending, `null` = no direction set.
     *                  Default is `true`.
     * @param values List of parameter values specified as additional arguments. Default is `[]`.
     */
    order(field: string, direction?: boolean | null, ...values: any[]): this;
  }

  interface Join {
    type: string;
    table: string | BaseBuilder;
    alias: string | null;
    condition: string | Expression | null;
  }

  interface JoinBlock extends Block {
    _joins: Join[];

    /**
     * Add a JOIN with the given table.
     *
     * 'table' is the name of the table to join with.
     *
     * 'alias' is an optional alias for the table name.
     *
     * 'condition' is an optional condition (containing an SQL expression) for the JOIN.
     *
     * 'type' must be either one of INNER, OUTER, LEFT or RIGHT. Default is 'INNER'.
     */
    join(
      name: string | BaseBuilder,
      alias?: string,
      condition?: string | Expression,
      type?: "INNER" | "OUTER" | "LEFT" | "RIGHT",
    ): this;

    left_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    right_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    outer_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    cross_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;
  }

  interface JoinMixin {
    /**
     * Add an INNER JOIN.
     *
     * @param name The table to join on. Can be a a [[BaseBuilder]] instance.
     * @param alias An alias by which to refer to this table. Default is `null`.
     * @param condition A joining ON condition. Default is `null`.
     */
    join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    /**
     * Add a LEFT JOIN.
     *
     * @param name The table to join on. Can be a a [[cls.BaseBuilder]] instance.
     * @param alias An alias by which to refer to this table. Default is `null`.
     * @param condition A joining ON condition. Default is `null`.
     */
    left_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    /**
     * Add a RIGHT JOIN.
     *
     * @param name The table to join on. Can be a a [[cls.BaseBuilder]] instance.
     * @param alias An alias by which to refer to this table. Default is `null`.
     * @param condition A joining ON condition. Default is `null`.
     */
    right_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    /**
     * Add a OUTER JOIN.
     *
     * @param name The table to join on. Can be a a [[cls.BaseBuilder]] instance.
     * @param alias An alias by which to refer to this table. Default is `null`.
     * @param condition A joining ON condition. Default is `null`.
     */
    outer_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;

    /**
     * Add a CROSS JOIN.
     *
     * @param name The table to join on. Can be a a [[cls.BaseBuilder]] instance.
     * @param alias An alias by which to refer to this table. Default is `null`.
     * @param condition A joining ON condition. Default is `null`.
     */
    cross_join(name: string | BaseBuilder, alias?: string, condition?: string | Expression): this;
  }

  interface Union {
    type: string;
    table: QueryBuilder;
  }

  interface UnionBlock extends Block {
    _unions: Union[];

    /**
     * Add a UNION with the given table/query.
     *
     * 'table' is the name of the table or query to union with.
     *
     * 'type' must be either one of UNION or UNION ALL.... Default is 'UNION'.
     */
    union(table: QueryBuilder, type?: "UNION" | "UNION ALL"): void;

    /**
     * Add a UNION ALL with the given table/query.
     */
    union_all(table: QueryBuilder): void;
  }

  interface UnionMixin {
    /**
     * Combine with another `SELECT` using `UNION`.
     *
     * @param query Another `SELECT` query to combine this query with.
     */
    union(query: QueryBuilder): this;

    /**
     * Combine with another `SELECT` using `UNION ALL`.
     *
     * @param query Another `SELECT` query to combine this query with.
     */
    union_all(query: QueryBuilder): this;
  }

  /* tslint:disable:member-ordering */

  interface Cls {
    /**
     * Get whether obj is a query builder
     *
     * Note: this is a loose test checking for `_toParamString`
     */
    isSquelBuilder(obj: any): obj is BaseBuilder;

    /**
     * Default configuration options for all query builders. These can be overridden in the query builder
     * constructors.
     */
    DefaultQueryBuilderOptions: CompleteQueryBuilderOptions;

    /**
     * Global custom value handlers for all instances of builder
     */
    globalValueHandlers: ValueHandler<any>[];

    /**
     * Register a custom value type handler. We may wish to use custom value types (e.g. `Date`) and have Squel
     * automatically take care of formatting them when building the output query string.
     *
     * @param type The class object or `typeof` string representing the value type to handle
     * @param handler The handler method to call when we wish to format this value for output in a query string
     */
    registerValueHandler(type: {new(...args: any[]): any} | string, handler: ValueHandler<any>): void;

    Cloneable: {new(): Cloneable};
    BaseBuilder: BuilderConstructor<BaseBuilder>;
    Expression: BuilderConstructor<Expression>;
    Case: {new(fieldName: string, options?: QueryBuilderOptions): Case};
    Block: BuilderConstructor<Block>;
    StringBlock: {new(options: QueryBuilderOptions | null, str: string): StringBlock};
    FunctionBlock: BuilderConstructor<FunctionBlock>;
    AbstractTableBlock: {new(options?: TableBlockOptions): AbstractTableBlock};
    TargetTableBlock: {new(options?: TableBlockOptions): TargetTableBlock};
    UpdateTableBlock: {new(options?: TableBlockOptions): UpdateTableBlock};
    FromTableBlock: {new(options?: TableBlockOptions): FromTableBlock};
    IntoTableBlock: {new(options?: TableBlockOptions): IntoTableBlock};
    GetFieldBlock: BuilderConstructor<GetFieldBlock>;
    AbstractSetFieldBlock: BuilderConstructor<AbstractSetFieldBlock>;
    SetFieldBlock: BuilderConstructor<SetFieldBlock>;
    InsertFieldValueBlock: BuilderConstructor<InsertFieldValueBlock>;
    InsertFieldsFromQueryBlock: BuilderConstructor<InsertFieldsFromQueryBlock>;
    DistinctBlock: BuilderConstructor<DistinctBlock>;
    GroupByBlock: BuilderConstructor<GroupByBlock>;
    AbstractVerbSingleValueBlock: {new(options?: VerbSingleValueBlockOptions): AbstractVerbSingleValueBlock};
    OffsetBlock: {new(options?: VerbSingleValueBlockOptions): OffsetBlock};
    LimitBlock: {new(options?: VerbSingleValueBlockOptions): LimitBlock};
    AbstractConditionBlock: {new(options?: ConditionBlockOptions): AbstractConditionBlock};
    WhereBlock: {new(options?: ConditionBlockOptions): WhereBlock};
    HavingBlock: {new(options?: ConditionBlockOptions): HavingBlock};
    OrderByBlock: BuilderConstructor<OrderByBlock>;
    JoinBlock: BuilderConstructor<JoinBlock>;
    UnionBlock: BuilderConstructor<UnionBlock>;

    QueryBuilder: {
      new(options?: QueryBuilderOptions): QueryBuilder;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Select: {
      new(options?: QueryBuilderOptions): Select;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Update: {
      new(options?: QueryBuilderOptions): Update;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Delete: {
      new(options?: QueryBuilderOptions): Delete;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Insert: {
      new(options?: QueryBuilderOptions): Insert;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
  }

  /* tslint:enable:member-ordering */

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * Query builders
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */

  interface QueryBuilder extends BaseBuilder {
    blocks: Block[];

    /**
     * Update query builder configuration options. This will pass on the options to all the registered
     * [[Block]] objects.
     *
     * @param options Options for configuring this query builder.
     */
    updateOptions(options: QueryBuilderOptions): void;

    getBlock<B extends Block = Block>(blockType: {new(...args: any[]): B}): B;
  }

  /**
   * SELECT query builder.
   */
  interface Select extends QueryBuilder,
    FunctionMixin,
    DistinctMixin,
    GetFieldMixin,
    FromTableMixin,
    JoinMixin,
    WhereMixin,
    GroupByMixin,
    HavingMixin,
    OrderByMixin,
    LimitMixin,
    OffsetMixin,
    UnionMixin {
  }

  /**
   * UPDATE query builder.
   */
  interface Update extends QueryBuilder,
    UpdateTableMixin,
    SetFieldMixin,
    WhereMixin,
    OrderByMixin,
    LimitMixin {
  }

  /**
   * DELETE query builder.
   */
  interface Delete extends QueryBuilder,
    TargetTableMixin,
    FromTableMixin,
    JoinMixin,
    WhereMixin,
    OrderByMixin,
    LimitMixin {
  }

  /**
   * An INSERT query builder.
   */
  interface Insert extends QueryBuilder,
    IntoTableMixin,
    InsertFieldValueMixin,
    InsertFieldsFromQueryMixin {
  }

  /* tslint:disable:member-ordering */

  interface Squel<S extends Select = Select,
    U extends Update = Update,
    D extends Delete = Delete,
    I extends Insert = Insert,
    C extends Case = Case> {
    /**
     * The version of Squel.
     */
    readonly VERSION: string;

    /**
     * The current "flavour" of this squel instance.
     */
    readonly flavour: Flavour | null;

    /**
     * Create a SELECT query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     */
    select(options?: QueryBuilderOptions): S;

    /**
     * Create a custom SELECT query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     * @param blocks List of [[Block]] objects which make up the functionality of this builder.
     */
    select(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;

    /**
     * Create an UPDATE query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     */
    update(options?: QueryBuilderOptions): U;

    /**
     * Create a custom UPDATE query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     * @param blocks List of [[Block]] objects which make up the functionality of this builder.
     */
    update(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;

    /**
     * Create a DELETE query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     */
    delete(options?: QueryBuilderOptions): D;

    /**
     * Create a custom DELETE query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     * @param blocks List of [[Block]] objects which make up the functionality of this builder.
     */
    delete(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;

    /**
     * Alias for [[delete]]
     */
    remove(options?: QueryBuilderOptions): D;

    /**
     * Alias for [[delete]]
     */
    remove(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;

    /**
     * Create an INSERT query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     */
    insert(options?: QueryBuilderOptions): I;

    /**
     * Create a custom INSERT query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     * @param blocks List of [[Block]] objects which make up the functionality of this builder.
     */
    insert(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;

    /**
     * Create an INSERT query builder instance.
     *
     * @param name Name of field. Default is `null`.
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     */
    case(name: string, options?: QueryBuilderOptions): C;

    /**
     * Create a custom INSERT query builder instance.
     *
     * @param name Name of field. Default is `null`.
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     * @param blocks List of [[Block]] objects which make up the functionality of this builder.
     */
    case(name: string, options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;

    /**
     * Create an SQL expression query builder instance.
     */
    expr(): Expression;

    /**
     * Construct a [[FunctionBlock]] instance for inclusion within a query as a value.
     *
     * @param str The expression, with parameter placeholders.
     * @param values The parameter values
     */
    str(str: string, ...values: any[]): FunctionBlock;

    /**
     * Same as [[cls.str]] but with the `rawNesting` option turned on.
     *
     * @param str The expression, with parameter placeholders.
     * @param values The parameter values
     */
    rstr(str: string, ...values: any[]): FunctionBlock;

    /**
     * Register a custom value type handler. We may wish to use custom value types (e.g. `Date`) and have Squel
     * automatically take care of formatting them when building the output query string.
     *
     * @param type The class object or `typeof` string representing the value type to handle
     * @param handler The handler method to call when we wish to format this value for output in a query string
     */
    registerValueHandler(type: {new(...args: any[]): any} | string, handler: ValueHandler<any>): void;

    /**
     * Classes and global methods in Squel.
     */
    cls: Cls;

    /**
     * Available flavours
     */
    readonly flavours: {[flavour: string]: (s: Squel) => void};

    /**
     * Get an instance of Squel for the MS-SQL SQL flavour.
     *
     * @param flavour The flavour of SQL to use.
     */
    useFlavour(flavour: "mssql"): MssqlSquel;

    /**
     * Get an instance of Squel for the MySQL SQL flavour.
     *
     * @param flavour The flavour of SQL to use.
     */
    useFlavour(flavour: "mysql"): MysqlSquel;

    /**
     * Get an instance of Squel for the Postgres SQL flavour.
     *
     * @param flavour The flavour of SQL to use.
     */
    useFlavour(flavour: "postgres"): PostgresSquel;
  }

  /* tslint:enable:member-ordering */

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * MS-SQL Flavour
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */
  interface MssqlLimitOffsetTopBlock extends Block {
    _limits: null | number;
    _offsets: null | number;

    ParentBlock: {new(parent: Block): MssqlLimitOffsetTopBlock.ParentBlock};
    LimitBlock: {new(parent: Block): MssqlLimitOffsetTopBlock.LimitBlock};
    TopBlock: {new(parent: Block): MssqlLimitOffsetTopBlock.TopBlock};
    OffsetBlock: {new(parent: Block): MssqlLimitOffsetTopBlock.OffsetBlock};

    LIMIT(): MssqlLimitOffsetTopBlock.LimitBlock;

    TOP(): MssqlLimitOffsetTopBlock.TopBlock;

    OFFSET(): MssqlLimitOffsetTopBlock.OffsetBlock;
  }

  namespace MssqlLimitOffsetTopBlock {

    interface ParentBlock extends Block {
      _parent: Block;
    }

    interface LimitBlock extends ParentBlock {
      limit(max: number): void;
    }

    interface LimitMixin {
      /**
       * Add a LIMIT clause.
       *
       * @param limit Number of records to limit the query to.
       */
      limit(limit: number): this;
    }

    interface TopBlock extends ParentBlock {
      top(max: number): void;
    }

    interface TopMixin {
      /**
       * Insert the `TOP` keyword to limit the number of rows returned.
       *
       * @param num Number of rows or percentage of rows to limit to
       */
      top(num: number): this;
    }

    interface OffsetBlock extends ParentBlock {
      offset(start: number): void;
    }

    interface OffsetMixin {
      /**
       * Add an OFFSET clause.
       *
       * @param limit Index of record to start fetching from.
       */
      offset(limit: number): this;
    }
  }

  interface MssqlUpdateTopBlock extends Block {
    limit(max: number): void;

    top(max: number): void;
  }

  interface MssqlUpdateTopMixin {
    /**
     * Add a LIMIT clause.
     *
     * @param limit Number of records to limit the query to.
     */
    limit(limit: number): this;

    /**
     * Insert the `TOP` keyword to limit the number of rows returned.
     *
     * @param num Number of rows or percentage of rows to limit to
     */
    top(num: number): this;
  }

  interface MssqlInsertFieldValueBlock extends InsertFieldValueBlock {
    _outputs: string[];

    /**
     * add fields to the output clause
     */
    output(fields: string | string[]): void;
  }

  interface MssqlInsertFieldValueMixin extends InsertFieldValueMixin {
    /**
     * Add field to OUTPUT clause.
     *
     * @param name Name of field or array of field names.
     */
    output(name: string | string[]): this;
  }

  interface Output {
    name: string;
    alias: string | null;
  }

  interface MssqlUpdateDeleteOutputBlock extends Block {
    _outputs: Output[];

    /**
     * Add the given field to the final result set.
     *
     * The 'field' parameter does not necessarily have to be a fieldname. It can use database functions too,
     * e.g. DATE_FORMAT(a.started, "%H")
     *
     * An alias may also be specified for this field.
     */
    output(output: string, alias?: string): void;

    /**
     * Add the given fields to the final result set.
     *
     * The parameter is an Object containing field names (or database functions) as the keys and aliases for the
     * fields as the values. If the value for a key is null then no alias is set for that field.
     *
     * Internally this method simply calls the field() method of this block to add each individual field.
     */
    outputs(outputs: {[field: string]: any}): void;
  }

  interface MssqlUpdateDeleteOutputMixin {
    /**
     * Add field to OUTPUT clause.
     *
     * @param name Name of field.
     * @param alias An alias by which to refer to this field. Default is null.
     */
    output(name: string, alias?: string): this;

    /**
     * Add fields to `OUTPUT` clause.
     *
     * @param fields List of field:alias pairs.
     */
    outputs(fields: {[field: string]: any}): this;
  }

  interface MssqlCls extends Cls {
    MssqlLimitOffsetTopBlock: BuilderConstructor<MssqlLimitOffsetTopBlock>;
    MssqlUpdateTopBlock: BuilderConstructor<MssqlUpdateTopBlock>;
    MssqlInsertFieldValueBlock: BuilderConstructor<MssqlInsertFieldValueBlock>;
    MssqlUpdateDeleteOutputBlock: BuilderConstructor<MssqlUpdateDeleteOutputBlock>;

    Select: {
      new(options?: QueryBuilderOptions): MssqlSelect;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Update: {
      new(options?: QueryBuilderOptions): MssqlUpdate;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Delete: {
      new(options?: QueryBuilderOptions): MssqlDelete;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Insert: {
      new(options?: QueryBuilderOptions): MssqlInsert;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
  }

  /**
   * MS-SQL SELECT query builder.
   */
  interface MssqlSelect extends Select,
    MssqlLimitOffsetTopBlock.TopMixin,
    MssqlLimitOffsetTopBlock.LimitMixin,
    MssqlLimitOffsetTopBlock.OffsetMixin {
  }

  /**
   * MS-SQL UPDATE query builder.
   */
  interface MssqlUpdate extends Update,
    MssqlUpdateDeleteOutputMixin {
  }

  /**
   * MS-SQL DELETE query builder.
   */
  interface MssqlDelete extends Delete,
    MssqlUpdateDeleteOutputMixin {
  }

  /**
   * MS-SQL INSERT query builder.
   */
  interface MssqlInsert extends Insert,
    MssqlInsertFieldValueMixin {
  }

  interface MssqlSquel extends Squel<MssqlSelect, MssqlUpdate, MssqlDelete, MssqlInsert> {
    cls: MssqlCls;
    flavour: "mssql";
  }

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * MySQL Flavour
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */

  interface OnDupUpdateOptions {
    /**
     * When `autoQuoteFieldNames` is turned on this flag instructs it to ignore the period (.) character within field
     * names. Default is `false`.
     */
    ignorePeriodsForFieldNameQuotes: boolean;

    /**
     * If set and the value is a String then it will not be quoted in the output Default is `false`.
     */
    dontQuote: boolean;
  }

  interface MysqlOnDuplicateKeyUpdateBlock extends AbstractSetFieldBlock {
    onDupUpdate(name: string, value: any, options?: OnDupUpdateOptions): void;
  }

  interface MysqlOnDuplicateKeyUpdateMixin {
    /**
     * Add an ON DUPLICATE KEY UPDATE clause for given field
     *
     * @param name Name of field.
     * @param value Value to set to field.
     * @param options
     */
    onDupUpdate(name: string, value: any, options?: OnDupUpdateOptions): this;
  }

  interface MysqlCls extends Cls {
    MysqlOnDuplicateKeyUpdateBlock: BuilderConstructor<MysqlOnDuplicateKeyUpdateBlock>;
    Insert: {
      new(options?: QueryBuilderOptions): MysqlInsert;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
  }

  /**
   * MySQL INSERT query builder.
   */
  interface MysqlInsert extends Insert,
    MysqlOnDuplicateKeyUpdateMixin {
  }

  /**
   * MySQL REPLACE query builder.
   */
  interface Replace extends QueryBuilder,
    IntoTableMixin,
    InsertFieldValueBlock,
    InsertFieldsFromQueryMixin {
  }

  interface MysqlSquel extends Squel<Select, Update, Delete, MysqlInsert> {
    cls: MysqlCls;
    flavour: "mysql";

    /**
     * Create a REPLACE query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     */
    replace(options?: QueryBuilderOptions): Replace;

    /**
     * Create a custom REPLACE query builder instance.
     *
     * @param options Options for configuring this query builder. Default is [[DefaultQueryBuilderOptions]].
     * @param blocks List of [[Block]] objects which make up the functionality of this builder.
     */
    replace(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
  }

  /*
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   * Postgres Flavour
   * ---------------------------------------------------------------------------------------------------------
   * ---------------------------------------------------------------------------------------------------------
   */
  interface PostgresOnConflictKeyUpdateBlock extends AbstractSetFieldBlock {
    _onConflict?: boolean;
    _dupFields?: string[];

    onConflict(conflictFields: string | string[], fields?: {[field: string]: any}): void;
  }

  interface PostgresOnConflictKeyUpdateMixin {
    /**
     * Add `ON CONFLICT...DO UPDATE/DO NOTHING` clause.
     *
     * @param field Name of field. Default is `null`.
     * @param fieldsToSet Field-value pairs. Default is `null`.
     */
    onConflict(field?: string, fieldsToSet?: {[field: string]: any}): this;
  }

  interface ReturningBlock extends Block {
    _fields: Field[];

    returning(name: string | BaseBuilder, alias?: string): void;
  }

  interface ReturningMixin {
    /**
     * Add field to RETURNING clause.
     *
     * @param name Name of field OR an SQL output expression.
     * @param alias An alias by which to refer to this field. Default is `null`.
     */
    returning(name: string | BaseBuilder, alias?: string): this;
  }

  interface WithBlock extends Block {
    _tables: QueryBuilder[];

    with(alias: string, table: QueryBuilder): void;
  }

  interface WithMixin {
    /**
     * Combine with another query using a Common Table Expression (CTE), ie a `WITH` clause
     *
     * @param alias The alias that the table expression should use
     * @param table Another query to include as a Common Table Expression
     */
    with(alias: string, table: QueryBuilder): this;
  }

  interface DistinctOnBlock extends Block {
    _useDistinct?: boolean;
    _distinctFields: string[];

    distinct(...fields: string[]): void;
  }

  interface DistinctOnMixin {
    /**
     * Insert the DISTINCT keyword.
     *
     * @param fields One or more field names to use. If passed, this will insert a `DISTINCT ON` clause.
     *               Default is `undefined`.
     */
    distinct(...fields: string[]): this;
  }

  interface PostgresCls extends Cls {
    PostgresOnConflictKeyUpdateBlock: BuilderConstructor<PostgresOnConflictKeyUpdateBlock>;
    ReturningBlock: BuilderConstructor<ReturningBlock>;
    WithBlock: BuilderConstructor<WithBlock>;
    DistinctOnBlock: BuilderConstructor<DistinctOnBlock>;

    Select: {
      new(options?: QueryBuilderOptions): PostgresSelect;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Update: {
      new(options?: QueryBuilderOptions): PostgresUpdate;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Delete: {
      new(options?: QueryBuilderOptions): PostgresDelete;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
    Insert: {
      new(options?: QueryBuilderOptions): PostgresInsert;
      new(options: QueryBuilderOptions | null, blocks: Block[]): QueryBuilder;
    };
  }

  interface PostgresSelect extends Select,
    WithMixin,
    DistinctOnMixin {
    /**
     * Insert the DISTINCT keyword.
     *
     * @param fields One or more field names to use. If passed, this will insert a `DISTINCT ON` clause.
     *               Default is `undefined`.
     */
    distinct(...fields: string[]): this;
  }

  /**
   * Postgres INSERT query builder
   */
  interface PostgresInsert extends Insert,
    PostgresOnConflictKeyUpdateMixin,
    WithMixin,
    ReturningMixin {
  }

  /**
   * Postgres UPDATE query builder
   */
  interface PostgresUpdate extends Update,
    WithMixin,
    ReturningMixin,
    FromTableMixin {
  }

  /**
   * Postgres DELETE query builder
   */
  interface PostgresDelete extends Delete,
    WithMixin,
    ReturningMixin {
  }

  interface PostgresSquel extends Squel<PostgresSelect, PostgresUpdate, PostgresDelete, PostgresInsert> {
    cls: PostgresCls;
    flavour: "postgres";
  }
}

declare const squel: squel.Squel & {flavour: null};

export = squel;
