import {SqlDatabase} from '../../node-sqlite3-orm/dist';
// tslint:disable-next-line no-unnecessary-class
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
  // autoIncement?: boolean; => using prop.id && prop.generated
  withoutRowId?: boolean;
}


export interface Sqlite3PropertyOptions {
  columnName?: string;
  dbtype?: string;
  isJson?: boolean;
}
