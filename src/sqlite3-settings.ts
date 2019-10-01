import { SqlDatabaseSettings } from 'sqlite3orm';
import { AnyObject } from 'loopback-datasource-juggler';
import { Sqlite3PropertyOptions } from './sqlite3-options';

export interface Sqlite3AllSettings {
  name: string;
  /**
   * file - The database file to open
   */
  file: string;
  /**
   * [mode=SQL_OPEN_DEFAULT] - The mode for opening the database file
   * A bit flag combination of:
   *   SQL_OPEN_CREATE,
   *   SQL_OPEN_READONLY,
   *   SQL_OPEN_READWRITE
   * SQL_OPEN_DEFAULT = SQL_OPEN_CREATE | SQL_OPEN_READWRITE
   */
  mode: number;
  /**
   * [min=1] - Minimum connections which should be opened by the connection pool
   */
  poolMin: number;
  /*
   * [max=0] - Maximum connections which can be opened by this connection pool
   */
  poolMax: number;
  /*
   * [debug=false] - enable debug
   */
  debug: boolean;
  /*
   * [lazyConnect=false] - enable lazy connect
   */
  lazyConnect: boolean;
  /*
   * [schemaName='main'] - the default schema
   */
  schemaName: string;
  /*
   * [dbSettings]
   */
  dbSettings: SqlDatabaseSettings;

  /*
   * [propertyValueForNULL]
   */
  // tslint:disable-next-line no-null-keyword
  propertyValueForNULL?: null;

  /*
   * default property options
   */
  propertyOptions?: { [modelName: string]: { [propName: string]: Sqlite3PropertyOptions } };
}

export type Sqlite3Settings = Partial<Sqlite3AllSettings>;
