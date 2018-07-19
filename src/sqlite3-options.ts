import {SqlDatabase} from 'sqlite3orm';
// tslint:disable-next-line no-unnecessary-class
declare class Sqlite3Connector {}

export interface Sqlite3TransactionOptions {
  connection: SqlDatabase;
  connector: Sqlite3Connector;
}
export interface Sqlite3ExecuteOptions {
  transaction?: Sqlite3TransactionOptions;
}

export interface Sqlite3PropertyOptions { dbtype?: string; }