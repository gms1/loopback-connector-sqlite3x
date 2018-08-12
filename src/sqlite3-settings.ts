import {SqlDatabaseSettings} from '../../node-sqlite3-orm/dist';
export {SQL_MEMORY_DB_PRIVATE, SQL_MEMORY_DB_SHARED, SQL_OPEN_CREATE, SQL_OPEN_DEFAULT, SQL_OPEN_READONLY, SQL_OPEN_READWRITE, SqlDatabaseSettings} from '../../node-sqlite3-orm/dist';

export interface Sqlite3AllSettings {
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
}

export type Sqlite3Settings = Partial<Sqlite3AllSettings>;
