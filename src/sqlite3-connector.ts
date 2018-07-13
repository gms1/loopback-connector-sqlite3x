// tslint:disable no-require-imports
import lC = require('loopback-connector');
import * as _dbg from 'debug';

// NOTE: only importing types from 'loopback-datasource-juggler' => no require
//  => not a runtime dependency
// tslint:disable-next-line no-implicit-dependencies
import {Callback, Connector, DataSource, Filter, PropertyDefinition, PromiseOrVoid} from 'loopback-datasource-juggler';
import _sg = require('strong-globalize');
/*
 * SQLite3 connector for LoopBack
 */
import {SqlDatabase, SqlConnectionPool, SqlRunResult, SQL_OPEN_DEFAULT, SQL_MEMORY_DB_SHARED} from '../../node-sqlite3-orm/dist';

import {Sqlite3AllSettings, Sqlite3Settings} from './sqlite3-settings';
import {Sqlite3ExecuteOptions, Sqlite3PropertyOptions} from './sqlite3-options';
import {callbackifyOrPromise, callbackAndPromise} from './utils';


const g = new _sg();
const debug = _dbg('loopback:connector:sqlite3x');

const SQLITE3_CONNECTOR_NAME = 'sqlite3x';
const SQLITE3_CONNECTOR_DESCRIPTION =
    g.f('SQLite3 (unofficial) connector for LoopBack');

export const name = SQLITE3_CONNECTOR_NAME;

export class Sqlite3Connector extends lC.SQLConnector implements Connector {
  settings!: Sqlite3AllSettings;

  private _pool: SqlConnectionPool;
  get pool(): SqlConnectionPool {
    return this._pool;
  }

  /* istanbul ignore next */
  static get debugEnabled(): boolean {
    return debug.enabled;
  }

  /* istanbul ignore next */
  static set debugEnabled(enabled: boolean) {
    debug.enabled = enabled;
  }

  constructor(settings: Sqlite3AllSettings) {
    super(SQLITE3_CONNECTOR_NAME, settings);
    /* istanbul ignore if */
    if (Sqlite3Connector.debugEnabled) {
      debug(`${SQLITE3_CONNECTOR_NAME}`);
      debug(`  ${SQLITE3_CONNECTOR_DESCRIPTION}`);
      debug(`  settings: %j`, this.settings);
      SqlDatabase.verbose();
    }
    this._pool = new SqlConnectionPool();
  }

  /* istanbul ignore next */
  static debug(arg: any, ...args: any[]): void {
    debug(arg, ...args);
  }

  // *************************************************************************************
  //  connect, disconnect, ping, ...

  /**
   * connect to Sqlite3 database pool
   *
   * @callback [cb] The callback function
   */
  async connect(cb?: Callback<void>): Promise<void> {
    if (this.pool.isOpen()) {
      return callbackAndPromise(cb);
    }
    let err: Error|undefined;
    try {
      debug('connecting pool...');
      await this.pool.open(
          this.settings.file, this.settings.mode, this.settings.poolMin,
          this.settings.poolMax);
      debug('connected pool');
    } catch (e) {
      err = e;
      debug('connecting pool failed: ' + err);
      // run through
    }
    return callbackAndPromise(cb, err);
  }

  /**
   * disconnect from Sqlite3 database pool
   *
   * @callback [cb] The callback function
   */
  async disconnect(cb?: Callback<void>): Promise<void> {
    if (!this.pool.isOpen()) {
      return callbackAndPromise(cb);
    }
    let err: Error|undefined;
    try {
      debug('disconnecting pool...');
      await this.pool.close();
      debug('disconnected pool');
    } catch (e) /* istanbul ignore next */ {
      err = e;
      debug('disconnecting pool failed: ' + err);
      // run through
    }
    return callbackAndPromise(cb, err);
  }


  /**
   * get connecton from pool
   */
  async getConnection(): Promise<SqlDatabase> {
    if (!this.pool || !this.pool.isOpen()) {
      return Promise.reject(new Error(g.f('no pool connected')));
    }
    try {
      const res = await this.pool.get();
      return res;
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(g.f('connecting failed'));
    }
  }

  /**
   * ping the database backend
   *
   * @callback [cb] The callback function
   */
  ping(cb?: Callback<void>): PromiseOrVoid {
    const sql = 'PRAGMA user_version';
    return callbackifyOrPromise(this._executeSQL(sql), cb);
  }

  // *************************************************************************************
  //  Transactions

  async beginTransaction(isolationLevel: string, cb?: Callback): Promise<void>;
  async beginTransaction(cb?: Callback): Promise<void>;
  async beginTransaction(isolationLevel?: string|Callback, cb?: Callback):
      Promise<void> {
    /* istanbul ignore if */
    if (typeof isolationLevel === 'function' && cb === undefined) {
      return this._beginTransaction(isolationLevel);
    } else {
      return this._beginTransaction(cb);
    }
  }

  protected async _beginTransaction(cb?: Callback): Promise<void> {
    let connection: SqlDatabase|undefined;
    let err: Error|undefined;
    try {
      debug('begin transaction...');
      connection = await this.getConnection();
      await Sqlite3Connector.runSqlOnConnection(
          connection, `BEGIN DEFERRED TRANSACTION`);
    } catch (e) /* istanbul ignore next */ {
      err = e;
      debug(`begin transaction failed: ` + err);
      if (connection) {
        try {
          connection.close();
        } catch (_ignore) {
        }
      }
    }
    callbackAndPromise(cb, err, connection);
  }

  async commit(connection: SqlDatabase, cb?: Callback): Promise<void> {
    debug('commit transaction');
    let err: Error|undefined;
    try {
      await Sqlite3Connector.runSqlOnConnection(
          connection, `COMMIT TRANSACTION`);
      await connection.close();
    } catch (e) /* istanbul ignore next */ {
      err = e;
    }
    callbackAndPromise(cb, err);
  }

  async rollback(connection: SqlDatabase, cb?: Callback): Promise<void> {
    debug('rollback transaction');
    try {
      await Sqlite3Connector.runSqlOnConnection(
          connection, `ROLLBACK TRANSACTION`);
    } catch (e) /* istanbul ignore next */ {
      // ignore
      // see: https://www.sqlite.org/lang_transaction.html
      // quote: If the transaction has already been rolled back automatically by
      // the error response, then the ROLLBACK command will fail with an error,
      // but no harm is caused by this.
    }
    try {
      await connection.close();
    } catch (_ignore) {
    }
    callbackAndPromise(cb);
  }

  // *************************************************************************************
  //  Execute sql

  /**
   * Execute a SQL statement with given parameters
   *
   * @param sql The SQL statement
   * @param [params] An array of parameter values
   * @param [options] Options object
   * @callback [callback] The callback function
   */
  async executeSQL(
      sql: string, params?: any[], options?: Sqlite3ExecuteOptions,
      cb?: Callback): Promise<void>;
  async executeSQL(sql: string, params?: any[], cb?: Callback): Promise<void>;
  async executeSQL(sql: string, cb?: Callback): Promise<void>;
  async executeSQL(
      sql: string, params?: any[]|Callback,
      options?: Sqlite3ExecuteOptions|Callback, cb?: Callback): Promise<void> {
    let res: any[]|SqlRunResult|undefined;
    let err: Error|undefined;
    try {
      if (typeof params === 'function' && cb === undefined &&
          options === undefined) {
        cb = params;
        res = await this._executeSQL(sql);
      } else if (typeof options === 'function' && cb === undefined) {
        cb = options;
        res = await this._executeSQL(sql, params as any[]);
      } else {
        res = await this._executeSQL(
            sql, params as any[], options as Sqlite3ExecuteOptions);
      }
    } catch (e) {
      err = e;
    }
    callbackAndPromise(cb, err, res);
  }

  protected async _executeSQL(
      sql: string, params?: any[],
      options?: Sqlite3ExecuteOptions): Promise<any[]|SqlRunResult> {
    params = params || [];
    options = options || {};
    let res: any[]|SqlRunResult;
    try {
      if (params.length > 0) {
        debug('sql: %s\n  parameters: %j', sql, params);
      } else {
        debug('sql: %s', sql);
      }
      const transaction = options && options.transaction;
      if (transaction && transaction.connection &&
          transaction.connector === this) {
        res = await Sqlite3Connector.executeSqlOnConnection(
            transaction.connection, sql, params, options);
      } else {
        const connection = await this.getConnection();
        res = await Sqlite3Connector.executeSqlOnConnection(
            connection, sql, params, options);
        // release connection to pool
        await connection.close();
      }
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(res);
  }

  protected static async queryAllSqlOnConnection(
      conn: SqlDatabase, sql: string, params?: any[],
      options?: Sqlite3ExecuteOptions): Promise<any[]|SqlRunResult> {
    let res: any[];
    try {
      res = await conn.all(sql, params);
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(res);
  }

  protected static async runSqlOnConnection(
      conn: SqlDatabase, sql: string, params?: any[],
      options?: Sqlite3ExecuteOptions): Promise<any[]|SqlRunResult> {
    let res: SqlRunResult;
    try {
      res = await conn.run(sql, params);
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(res);
  }


  protected static async executeSqlOnConnection(
      conn: SqlDatabase, sql: string, params?: any[],
      options?: Sqlite3ExecuteOptions): Promise<any[]|SqlRunResult> {
    const sqlType = sql.trimLeft().substring(0, 6).toUpperCase();
    if (sqlType === 'SELECT' || sqlType === 'PRAGMA') {
      return Sqlite3Connector.queryAllSqlOnConnection(
          conn, sql, params, options);
    } else {
      return Sqlite3Connector.runSqlOnConnection(conn, sql, params, options);
    }
  }


  getInsertedId(model: string, result?: SqlRunResult): number|undefined {
    return result && result.lastID;  // TODO: do we always want to return the
                                     // lastID or do we want to handle the
                                     // primary key properly ?
  }

  getCountForAffectedRows(model: string, result?: SqlRunResult): number
      |undefined {
    return (result && result.changes) || 0;
  }

  getPlaceholderForValue(varName: string): string {
    return ':' + varName;
  }

  buildInsertDefaultValues(model: string, data: any, options?: object): string {
    return 'DEFAULT VALUES';
  }

  fromColumnValue(prop: PropertyDefinition, val: any): any {
    // tslint:disable-next-line no-null-keyword
    if (val == null) {
      return val;
    }
    const type = prop && prop.type;
    const mytype =
        (prop && prop[SQLITE3_CONNECTOR_NAME] as Sqlite3PropertyOptions) ||
        undefined;
    switch (type) {
      case Boolean:
        if (typeof val !== 'string') {
          return !!val;
        } else {
          return (
              val === 'T' || val === 't' || val === 'Y' || val === 'y' ||
              val === '1');
        }
        break;
      case Date:
        return (mytype && mytype.dbtype === 'TEXT') ?
            val.toISOString() :
            Math.floor(val.getTime() / 1000);
        break;
    }

    return val;
  }


  toColumnValue(prop: PropertyDefinition, val: any): any {
    // tslint:disable-next-line no-null-keyword
    if (val == null) {
      return val;
    }
    switch (prop.type) {
      case Boolean:
        return !!val;
        break;
      case String:
        return (typeof val !== 'string') ? String(val) : val;
        break;
      case Number:
        return (typeof val !== 'number') ? Number(val) : val;
        break;
      case Date:
        switch (typeof val) {
          case 'string':
            return new Date(Date.parse(val));
            break;
          case 'number':
            if (Number.isInteger(val)) {
              // unix time
              return new Date(val * 1000);
            }
            return NaN;
            break;
        }
        return NaN;
        break;
    }
    return this.serializeObject(val);
  }



  // *************************************************************************************
  // Mapping:
  // -------------------------------------------------------------------------------------
  //  Schema:
  // -------------------------------------------------------------------------------------
  //  this.schema(model) retrieves the schema name for a given model name
  //    the corresponding model definition can have a connector specific setting
  //    having the properties:
  //      'schema' or 'schemaName'
  //    a connector can have 'settings' having the properties
  //      'schema' or 'schemaName'
  //    a connector can implement getDefaultSchemaName()
  //  Sqlite3 schema: one of 'main', 'temp' or the schema name of an attached
  //  database Sqlite3Connector:
  //    TODO: use the connector specific setting with the 'schemaName' property
  //    default: the default schema can be specified by the 'schemaName'
  //    property in the settings or 'main' if not set

  // -------------------------------------------------------------------------------------
  //  Table:
  // -------------------------------------------------------------------------------------
  //  this.table(model) retrieves the table name for a given model name
  //    the corresponding model definition can have a connector specific setting
  //    having the properties:
  //      'table' or 'tableName'
  //  otherwise defaults to this.dbName(model) if this function exist or to the
  //  given model name

  // -------------------------------------------------------------------------------------
  //  Column:
  // -------------------------------------------------------------------------------------
  //  this.column(model, property) retrieves the column name for a given model
  //  and property name
  //    the corresponding property definition can have a connector specific
  //    setting having the properties:
  //      'column' or 'columnName'
  //  otherwise defaults to this.dbName(property) if this function exist or to
  //  the given property name

  // -------------------------------------------------------------------------------------

  /**
   * get the default table/column name for a given model/property name
   * @param name The name
   */

  dbName(modelOrProperty: string): string {
    return modelOrProperty ? modelOrProperty.toLowerCase() : modelOrProperty;
  }


  /**
   * escape/quote the table/column name
   * @param name The name
   */

  escapeName(dbName?: string): string|undefined {
    if (!dbName) {
      return dbName;
    }
    return '"' + dbName.replace(/\"/g, '""').replace(/\./, '"."') + '"';
  }

  /**
   * escape a value
   * @param name The name
   */
  escapeValue(value: any): any {
    return value;
  }

  // *************************************************************************************
  // pagination

  static buildLimit(filter: Filter): string|undefined {
    const limit = filter.limit ? (isNaN(filter.limit) ? 0 : filter.limit) : 0;
    const offset =
        filter.offset ? (isNaN(filter.offset) ? 0 : filter.offset) : 0;
    if (!limit && !offset) {
      return undefined;
    }
    const res: string[] = [];
    if (limit) {
      res.push(`LIMIT ${limit}`);
    }
    if (offset) {
      res.push(`OFFSET ${offset}`);
    }
    return res.join(' ');
  }

  applyPagination(model: string, sql: lC.ParameterizedSQL, filter: Filter):
      lC.ParameterizedSQL {
    const limitClause = Sqlite3Connector.buildLimit(filter);
    return limitClause ? sql.merge(limitClause) : sql;
  }


  // TODO: createTable
  // TODO: buildColumnDefinitions

  // *************************************************************************************

  /*

  TODO: see node_modules/loopback-connector/lib/sql.js:

  getColumnsToAdd(model, fields);
  getColumnsToDrop(model, fields);
  buildColumnType(property);
  alterTable(model, fields, indexes, cb);
  showFields(model, cb);
  showIndexes(model, cb);
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

  // *************************************************************************************

  /**
   *
   * Initialize the Sqlite3Connector for the given data source
   *
   * @param dataSource The dataSource
   * @callback [cb] The callback function
   */
}

export function initialize(dataSource: DataSource, cb?: Callback<void>): void {
  const inputSettings = dataSource.settings || {};

  const connectorSettings: Sqlite3Settings = {};
  connectorSettings.file = inputSettings.file || SQL_MEMORY_DB_SHARED;
  connectorSettings.mode = inputSettings.mode || SQL_OPEN_DEFAULT;
  connectorSettings.poolMin = inputSettings.poolMin || 1;
  connectorSettings.poolMax = 0;
  connectorSettings.schemaName = 'main';
  // tslint:disable-next-line triple-equals
  if (inputSettings.poolMax != undefined) {
    connectorSettings.poolMax = inputSettings.poolMax;
  }
  /* istanbul ignore if */
  if (!!inputSettings.debug) {
    Sqlite3Connector.debugEnabled = connectorSettings.debug = true;
  } else {
    connectorSettings.debug = Sqlite3Connector.debugEnabled;
  }
  debug(`initialize ${SQLITE3_CONNECTOR_NAME}...`);
  const connector =
      new Sqlite3Connector(connectorSettings as Sqlite3AllSettings);
  dataSource.connector = connector;
  dataSource.connector.dataSource = dataSource;
  /* istanbul ignore else */
  if (cb) {
    if (inputSettings.lazyConnect) {
      cb();
    } else {
      connector.connect(cb);
    }
  }
  debug(`initialized ${SQLITE3_CONNECTOR_NAME}`);
}
