declare module 'squel' {
  const squel: squel.Squel;

  namespace squel {
    type StringTo<T> = { [key: string]: T };

    interface Handler {
        (...args: any[]): any;
    }

    type alias = string | undefined | null;

    interface GenericSelect<FlavourSelect extends SqlSelect> {
      distinct(): FlavourSelect;
      field(name: string | any, alias?: alias, options?: any): FlavourSelect;
      fields(fields: Object | any[]): FlavourSelect;
      from(name: string | SqlSelect, alias?: alias): FlavourSelect;
      function(raw: string, ...args: any[]): FlavourSelect;
      join(name: string | SqlSelect, alias?: alias, condition?: string | any): FlavourSelect;
      left_join(name: string | SqlSelect, alias?: alias, condition?: string | any): FlavourSelect;
      right_join(name: string | SqlSelect, alias?: alias, condition?: string | any): FlavourSelect;
      outer_join(name: string | SqlSelect, alias?: alias, condition?: string | any): FlavourSelect;
      cross_join(name: string | SqlSelect, alias?: alias, condition?: string | any): FlavourSelect;
      where(condition: string | Expression, ...args: any[]): FlavourSelect;
      order(field: string, direction?: boolean, ...args: any[]): FlavourSelect;
      group(field: string): FlavourSelect;
      having(condition: string | any, ...args: any[]): FlavourSelect;
      limit(limit: number): FlavourSelect;
      offset(limit: number): FlavourSelect;
      top(num: number): FlavourSelect;
      clone(): FlavourSelect;
      toString(): string;
      toParam(options?: Object, numberedParametersStartAt?: number): { text: string, values: any[] };
      union(select: SqlSelect): FlavourSelect;
    }

    interface InsertSetOptions {
      dontQuote?: boolean;
      autoQuoteFieldNames?: boolean;
    }

    interface GenericInsert<FlavourInsert extends SqlInsert> {
      into(name: string): FlavourInsert;
      set(name: string, value: any, options?: InsertSetOptions): FlavourInsert;
      setFields(fields: Object, options?: { ignorePeriodsForFieldNameQuotes?: boolean }): FlavourInsert;
      setFieldsRows(fields: Object[], options?: { ignorePeriodsForFieldNameQuotes?: boolean }): FlavourInsert;
      fromQuery(columns: string[], selectQry: SqlSelect): FlavourInsert;
      updateOptions(options: Object): FlavourInsert;
      registerValueHandler<T>(type: T|string, handler: Handler): FlavourInsert;
      isNestable(): boolean;
      clone(): FlavourInsert;
      toString(): string;
      toParam(options?: { numberedParameters?: boolean, numberedParametersStartAt?: number }): { text: string, values: any[] };
    }

    interface UpdateSetOptions {
      ignorePeriodsForFieldNameQuotes?: boolean;
      dontQuote?: boolean;
    }

    interface GenericUpdate<FlavourUpdate extends SqlUpdate> {
      table(name: string, alias?: alias): FlavourUpdate;
      set(name: string, value?: any, options?: UpdateSetOptions): FlavourUpdate;
      setFields(fields: Object, options?: { ignorePeriodsForFieldNameQuotes?: boolean }): FlavourUpdate;
      where(condition: string, ...args: any[]): FlavourUpdate;
      order(field: string, direction?: boolean, ...args: any[]): FlavourUpdate;
      limit(limit: number): FlavourUpdate;
      offset(limit: number): FlavourUpdate;
      returning(str: string): FlavourUpdate;
      updateOptions(options: Object): FlavourUpdate;
      registerValueHandler(type: any, handler: Handler): FlavourUpdate;
      isNestable(): boolean;
      clone(): FlavourUpdate;
      toString(): string;
      toParam(options?: { numberedParametersStartAt?: number }): { text: string, values: any[] };
    }

    interface GenericDelete<FlavourDelete extends SqlDelete> {
      get(table: string): FlavourDelete;
      from(table: string, alias?: alias): FlavourDelete;
      join(name: string, alias?: alias, condition?: string): FlavourDelete;
      left_join(name: string, alias?: alias, condition?: string): FlavourDelete;
      right_join(name: string, alias?: alias, condition?: string): FlavourDelete;
      outer_join(name: string, alias?: alias, condition?: string): FlavourDelete;
      where(condition: string, ...args: any[]): FlavourDelete;
      limit(limit: number): FlavourDelete;
      order(field: string, direction?: boolean, ...args: any[]): FlavourDelete;
      offset(limit: number): FlavourDelete;
      updateOptions(options: Object): FlavourDelete;
      registerValueHandler<T>(type: T|string, handler: Handler): FlavourDelete;
      isNestable(): boolean;
      clone(): FlavourDelete;
      toString(): string;
      toParam(options?: { numberedParametersStartAt?: number }): { text: string, values: any[] };
    }

    interface QueryBuilderOptions {
      autoQuoteAliasNames?: boolean;
      autoQuoteFieldNames?: boolean;
      autoQuoteTableNames?: boolean;
      customValueHandlers?: Handler[];
      fieldAliasQuoteCharacter?: string;
      nameQuoteCharacter?: string;
      nestedBuilder?: boolean;
      numberedParameters?: boolean;
      numberedParametersStartAt?: number;
      replaceSingleQuotes?: boolean;
      separator?: string;
      singleQuoteReplacement?: string;
      stringFormatter?: (val: string) => string;
      tableAliasQuoteCharacter?: string;
    }

    interface QueryBuilder {
      select(options?: QueryBuilderOptions, blocks?: Object[]): SqlSelect;
      insert(options?: QueryBuilderOptions, blocks?: Object[]): SqlInsert;
      update(options?: QueryBuilderOptions, blocks?: Object[]): SqlUpdate;
      delete(options?: QueryBuilderOptions, blocks?: Object[]): SqlDelete;
      remove(options?: QueryBuilderOptions, blocks?: Object[]): SqlDelete;
      expr(): Expression;
      registerValueHandler<T>(type: T, handler: Handler): Squel;
    }

    // Flavour: None
    interface SqlSelect extends GenericSelect<SqlSelect> {}
    interface SqlInsert extends GenericInsert<SqlInsert> {}
    interface SqlUpdate extends GenericUpdate<SqlUpdate> {}
    interface SqlDelete extends GenericDelete<SqlDelete> {}

    // Flavour: Postgres
    interface PostgresQueryBuilder extends QueryBuilder {
      insert(options?: QueryBuilderOptions, blocks?: Object[]): PostgresInsert;
      select(options?: QueryBuilderOptions, blocks?: Object[]): PostgresSelect;
      update(options?: QueryBuilderOptions, blocks?: Object[]): PostgresUpdate;
      delete(options?: QueryBuilderOptions, blocks?: Object[]): PostgresDelete;
      remove(options?: QueryBuilderOptions, blocks?: Object[]): PostgresDelete;
    }

    interface PostgresSelect extends GenericSelect<PostgresSelect> {
      distinct(...fields: string[]): PostgresSelect;
      with(alias: string, table: PostgresSelect | PostgresInsert | PostgresUpdate | PostgresDelete): PostgresSelect;
    }

    interface PostgresInsert extends GenericInsert<PostgresInsert> {
      onConflict(index: string | string[], fields?: Object): PostgresInsert;
      with(alias: string, table: PostgresSelect | PostgresInsert | PostgresUpdate | PostgresDelete): PostgresInsert;
      returning(fieldExpr: string | QueryBuilder, alias?: alias): PostgresInsert;
    }

    interface PostgresUpdate extends GenericUpdate<PostgresUpdate> {
      with(alias: string, table: PostgresSelect | PostgresInsert | PostgresUpdate | PostgresDelete): PostgresUpdate;
      from(name: string, alias?: alias): PostgresSelect;
    }

    interface PostgresDelete extends GenericDelete<PostgresDelete> {
      with(alias: string, table: PostgresSelect | PostgresInsert | PostgresUpdate | PostgresDelete): PostgresDelete;
      returning(fieldExpr: string | QueryBuilder, alias?: alias): PostgresDelete;
    }

    // Flavour: mysql
    interface MysqlQueryBuilder extends QueryBuilder {
      insert(options?: QueryBuilderOptions, blocks?: Object[]): MysqlInsert;
      select(options?: QueryBuilderOptions, blocks?: Object[]): MysqlSelect;
      update(options?: QueryBuilderOptions, blocks?: Object[]): MysqlUpdate;
      delete(options?: QueryBuilderOptions, blocks?: Object[]): MysqlDelete;
      remove(options?: QueryBuilderOptions, blocks?: Object[]): MysqlDelete;
      replace(options?: QueryBuilderOptions, blocks?: Object[]): MysqlReplace;
    }

    interface MysqlSelect extends GenericSelect<MysqlSelect> {}

    interface MysqlInsert extends GenericInsert<MysqlInsert> {
      onDupUpdate(name: string, value: any, options?: InsertSetOptions): MysqlInsert;
    }

    interface MysqlUpdate extends GenericUpdate<MysqlUpdate> {}

    interface MysqlDelete extends GenericDelete<MysqlDelete> {}

    interface MysqlReplace {
      into(name: string): MysqlReplace;
      set(): MysqlReplace;
      setFields(): MysqlReplace;
      setFieldRows(): MysqlReplace;
      fromQuery(columns: string[], select: MysqlSelect): MysqlReplace;
    }

    // Flavour: mssql
    interface MssqlQueryBuilder extends QueryBuilder {
      insert(options?: QueryBuilderOptions, blocks?: Object[]): MssqlInsert;
      select(options?: QueryBuilderOptions, blocks?: Object[]): MssqlSelect;
      update(options?: QueryBuilderOptions, blocks?: Object[]): MssqlUpdate;
      delete(options?: QueryBuilderOptions, blocks?: Object[]): MssqlDelete;
      remove(options?: QueryBuilderOptions, blocks?: Object[]): MssqlDelete;
    }

    interface MssqlSelect extends GenericSelect<MssqlSelect> {
      top(numberOfResults: number): MssqlSelect;
    }

    interface MssqlInsert extends GenericInsert<MssqlInsert> {
      output(names: string | string[]): MssqlInsert;
    }

    interface MssqlUpdate extends GenericUpdate<MssqlUpdate> {
      output(name: string, alias?: alias): MssqlUpdate;
      outputs(fields: StringTo<string>): MssqlUpdate;
    }

    interface MssqlDelete extends GenericDelete<MssqlDelete> {
      output(name: string, alias?: alias): MssqlDelete;
      outputs(fields: StringTo<string>): MssqlDelete;
    }

    interface Expression {
      and(expr: string | Expression, ...args: any[]): Expression;
      or(expr: string | Expression, ...args: any[]): Expression;
      clone(): Expression;
      toString(): string;
      toParam(): { text: string, values: any[] };
    }

    export interface Squel extends QueryBuilder {
      useFlavour(s: 'postgres'): PostgresQueryBuilder;
      useFlavour(s: 'mysql'): MysqlQueryBuilder;
      useFlavour(s: 'mssql'): MssqlQueryBuilder;
      VERSION: string;
      flavour: string;
      str(rawSql: string, ...args: any[]): Expression;
      rstr(rawSql: string, ...args: any[]): Expression;
    }
  }

  export = squel;
}
