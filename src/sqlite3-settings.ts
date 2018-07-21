import {SqlDatabaseSettings} from 'sqlite3orm';
export {SQL_MEMORY_DB_PRIVATE, SQL_MEMORY_DB_SHARED, SQL_OPEN_CREATE, SQL_OPEN_DEFAULT, SQL_OPEN_READONLY, SQL_OPEN_READWRITE, SqlDatabaseSettings} from 'sqlite3orm';

export interface Sqlite3AllSettings {
  file: string;
  mode: number;
  poolMin: number;
  poolMax: number;
  debug: boolean;
  lazyConnect: boolean;
  schemaName: string;
  dbSettings: SqlDatabaseSettings;
}

export type Sqlite3Settings = Partial<Sqlite3AllSettings>;
