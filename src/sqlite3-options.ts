import { SqlDatabase, ValueTransformer } from 'sqlite3orm';
declare class Sqlite3Connector {}

export interface Sqlite3TransactionOptions {
  connection: SqlDatabase;
  connector: Sqlite3Connector;
}
export interface Sqlite3ExecuteOptions {
  transaction?: Sqlite3TransactionOptions;
}

export interface Sqlite3ModelOptions {
  tableName?: string;
  explicitAutoIncrement?: boolean; // default depends on Sqlite3Settings.implicitAutoincrementByDefault
  withoutRowId?: boolean; // defaults to false
}
export interface Sqlite3PropertyOptions {
  columnName?: string;
  dbtype?: string;
  isJson?: boolean;
  dateInMilliSeconds?: boolean; // defaults to true
  transform?: ValueTransformer;
  [key: string]: any;
}

export interface Sqlite3ForeignKeyOptions {
  properties: string;
  refTable: string;
  refColumns: string;
}
