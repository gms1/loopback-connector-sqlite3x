import sg = require('strong-globalize');
sg.SetRootDir(__dirname);

export * from './sqlite3-settings';
export * from './sqlite3-options';
export * from './sqlite3-juggler-connector';
// export * from './sqlite3-crud-connector';

export {
  AutoUpgrader,
  SQL_MEMORY_DB_PRIVATE,
  SQL_MEMORY_DB_SHARED,
  SQL_OPEN_CREATE,
  SQL_OPEN_DEFAULT,
  SQL_OPEN_READONLY,
  SQL_OPEN_READWRITE,
  SqlDatabaseSettings,
  ValueTransformer,
} from 'sqlite3orm';
