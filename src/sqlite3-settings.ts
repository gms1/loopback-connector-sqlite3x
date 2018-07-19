export {SQL_MEMORY_DB_PRIVATE, SQL_MEMORY_DB_SHARED, SQL_OPEN_CREATE, SQL_OPEN_DEFAULT, SQL_OPEN_READONLY, SQL_OPEN_READWRITE} from 'sqlite3orm';

export interface Sqlite3AllSettings {
  file: string;
  mode: number;
  debug: boolean;
  poolMin: number;
  poolMax: number;
  schemaName: string;
}

export type Sqlite3Settings = Partial<Sqlite3AllSettings>;
