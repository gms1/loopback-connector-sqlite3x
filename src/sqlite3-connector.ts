// tslint:disable no-require-imports
import loopbackConnector = require('loopback-connector');
import * as _dbg from 'debug';

// NOTE: only importing types from 'loopback-datasource-juggler' => no require
//  => not a runtime dependency
// tslint:disable-next-line no-implicit-dependencies
import {Callback, DataSource} from 'loopback-datasource-juggler';
import _sg = require('strong-globalize');
/*
 * SQLite3 connector for LoopBack
 */
import {SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, SqlDatabase} from 'sqlite3orm/SqlDatabase';

import {Sqlite3AllSettings, Sqlite3Settings} from './sqlite3-settings';
import {promisify} from './utils';

const g = new _sg();
const debug = _dbg('loopback:connector:sqlite3x:connector');

const SQLITE3_CONNECTOR_NAME = 'sqlite3x';
const SQLITE3_CONNECTOR_DESCRIPTION =
    g.f('unofficial SQLite3 connector for LoopBack');

// TODO: type for SQLConnector is missing
export class Sqlite3Connector extends loopbackConnector.SQLConnector {
  settings!: Sqlite3AllSettings;
  connecting?: Promise<void>;

  private _sqldb: SqlDatabase;
  get sqldb(): SqlDatabase {
    return this._sqldb;
  }

  constructor(settings: Sqlite3AllSettings) {
    super(SQLITE3_CONNECTOR_NAME, settings);
    this._sqldb = new SqlDatabase();
    if (this.settings.debug) {
      debug(`${SQLITE3_CONNECTOR_NAME}`);
      debug(`  ${SQLITE3_CONNECTOR_DESCRIPTION}`);
      debug(`  settings: %j`, this.settings);
      SqlDatabase.verbose();
    }
  }

  /**
   *
   * connect to Sqlite3 database
   *
   * @callback [cb] The callback function
   */

  connect(cb?: Callback<void>): Promise<void> {
    this.connecting =
        promisify(this._sqldb.open(this.settings.file, this.settings.mode), cb);
    return this.connecting;
  }

  /**
   *
   * disconnect from Sqlite3 database
   *
   * @callback [cb] The callback function
   */

  disconnect(cb?: Callback<void>): Promise<void> {
    return promisify(this._sqldb.close(), cb);
  }


  ping(cb?: Callback<void>): Promise<number> {
    return promisify(this._sqldb.getUserVersion());
  }

  /*

  TODO: see node_modules/loopback-connector/lib/sql.js:

  getColumnsToAdd(model, fields);
  getColumnsToDrop(model, fields);
  buildColumnType(property);
  alterTable(model, fields, indexes, cb);
  showFields(model, cb);
  showIndexes(model, cb);
  toColumnValue(propertyDef, value)
  fromColumnValue(propertyDef, value)
  escapeName(name)
  escapeValue(value)
  getPlaceholderForIdentifier(key)
  getPlaceholderForValue(key)
  applyPagination(model, stmt, filter)
  getCountForAffectedRows(model, info)
  getInsertedId(model, info)
  executeSQL(sql, params, options, cb)
  paginateSQL(sql, orderBy, options)
  buildQueryTables(options)
  buildQueryViews(options)
  buildQueryColumns(schema, table)
  buildPropertyType(columnDefinition, options)
  getArgs(table, options, cb)
  buildQueryPrimaryKeys(schema, table)
  buildQueryForeignKeys(schema, table)
  buildQueryExportedForeignKeys(schema, table)
  getDefaultSchema(options)
  setDefaultOptions(options)
  setNullableProperty(property)


  */

  /**
   *
   * Initialize the Sqlite3Connector for the given data source
   *
   * @param dataSource The dataSource
   * @callback [cb] The callback function
   */
}

export function initialize(dataSource: DataSource, cb?: Callback<void>): void {
  const connectorSettings: Sqlite3Settings = {};
  connectorSettings.file =
      (dataSource.settings && dataSource.settings.file) || SQL_MEMORY_DB_SHARED;

  connectorSettings.mode =
      (dataSource.settings && dataSource.settings.mode) || SQL_OPEN_DEFAULT;

  connectorSettings.debug =
      (dataSource.settings && !!dataSource.settings.debug) || !!debug.enabled;

  dataSource.connector =
      new Sqlite3Connector(connectorSettings as Sqlite3AllSettings);
  dataSource.connector.dataSource = dataSource;

  /* istanbul ignore else */
  if (cb) {
    dataSource.connector.connect(cb);
  }
}

export const name = SQLITE3_CONNECTOR_NAME;
