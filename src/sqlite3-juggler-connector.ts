// tslint:disable no-implicit-dependencies no-string-literal

import {
  Callback,
  DataSource,
  Filter,
  PromiseOrVoid,
  PropertyDefinition,
  TransactionMixin
} from 'loopback-datasource-juggler';
import {AutoUpgrader, MetaModel, SqlConnectionPool, SqlDatabase, SqlRunResult, Table} from 'sqlite3orm';

import {ParameterizedSQL, SQLConnector} from './lc-import';
import {SQLITE3_CONNECTOR_NAME, Sqlite3Connector} from './sqlite3-connector';
import {Sqlite3ExecuteOptions} from './sqlite3-options';
import {Sqlite3AllSettings, Sqlite3Settings} from './sqlite3-settings';
import {callbackifyOrPromise} from './utils';

/* istanbul ignore next */
function debug(arg: any, ...args: any[]): void {
  Sqlite3Connector.debug(arg, ...args);
}

/*
 * wrapper class around Sqlite3CrudConnector to make juggler happy
 */
export class Sqlite3JugglerConnector extends SQLConnector implements TransactionMixin {
  readonly name: string = SQLITE3_CONNECTOR_NAME;

  private readonly connector: Sqlite3Connector;
  readonly settings: Sqlite3AllSettings;

  get pool(): SqlConnectionPool {
    return this.connector.pool;
  }

  constructor(settings: Sqlite3Settings) {
    super(SQLITE3_CONNECTOR_NAME);
    this.connector = new Sqlite3Connector(settings);
    this.settings = this.connector.settings;
  }

  /* istanbul ignore next */
  static debug(arg: any, ...args: any[]): void {
    debug(arg, ...args);
  }

  // *************************************************************************************
  //  connect, disconnect, ping, ...
  // -------------------------------------------------------------------------------------

  /**
   * connect to Sqlite3 database pool
   *
   * @callback [cb] The callback function
   */
  connect(cb?: Callback<void>): PromiseOrVoid {
    return callbackifyOrPromise(this.connector.connect(), cb);
  }

  /**
   * disconnect from Sqlite3 database pool
   *
   * @callback [cb] The callback function
   */
  disconnect(cb?: Callback<void>): PromiseOrVoid {
    return callbackifyOrPromise(this.connector.disconnect(), cb);
  }

  /**
   * ping the database backend
   *
   * @callback [cb] The callback function
   */
  ping(cb?: Callback<void>): PromiseOrVoid {
    return callbackifyOrPromise(this.connector.ping(), cb);
  }

  // *************************************************************************************
  //  Transactions
  // -------------------------------------------------------------------------------------

  beginTransaction(isolationLevel: string, cb?: Callback): PromiseOrVoid<SqlDatabase>;
  beginTransaction(cb?: Callback): PromiseOrVoid;
  beginTransaction(isolationLevel?: string|Callback, cb?: Callback): PromiseOrVoid {
    /* istanbul ignore if */
    if (typeof isolationLevel === 'function' && cb === undefined) {
      return this._beginTransaction(isolationLevel);
    } else {
      return this._beginTransaction(cb);
    }
  }

  protected _beginTransaction(cb?: Callback): PromiseOrVoid<SqlDatabase> {
    return callbackifyOrPromise(this.connector.begin(), cb);
  }

  commit(connection: SqlDatabase, cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this.connector.commit(connection), cb);
  }

  rollback(connection: SqlDatabase, cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this.connector.rollback(connection), cb);
  }

  // *************************************************************************************
  //  Execute sql
  // -------------------------------------------------------------------------------------

  /**
   * Execute a SQL statement with given parameters
   *
   * @param sql The SQL statement
   * @param [params] An array of parameter values
   * @param [options] Options object
   * @callback [callback] The callback function
   */
  executeSQL(sql: string, params?: any[], options?: Sqlite3ExecuteOptions, cb?: Callback): PromiseOrVoid;
  executeSQL(sql: string, params?: any[], cb?: Callback): PromiseOrVoid;
  executeSQL(sql: string, cb?: Callback): PromiseOrVoid;
  executeSQL(sql: string, params?: any[]|Callback, options?: Sqlite3ExecuteOptions|Callback, cb?: Callback):
      PromiseOrVoid {
    /* istanbul ignore if */
    if (typeof params === 'function' && cb === undefined && options === undefined) {
      cb = params;
      return this._executeSQL(sql, undefined, undefined, cb);
    } else {
      /* istanbul ignore if */
      if (typeof options === 'function' && cb === undefined) {
        cb = options;
        return this._executeSQL(sql, params as any[], undefined, cb);
      } else {
        return this._executeSQL(sql, params as any[], options as Sqlite3ExecuteOptions, cb);
      }
    }
  }

  protected _executeSQL(sql: string, params?: any[], options?: Sqlite3ExecuteOptions, cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this.promisifiedExecuteSql(sql, params, options), cb);
  }

  public async promisifiedExecuteSql(sql: string, params?: any[], options?: Sqlite3ExecuteOptions):
      Promise<any[]|SqlRunResult> {
    params = params || [];
    options = options || {};
    let res: any[]|SqlRunResult;
    try {
      const transaction = options && options.transaction;
      if (transaction && transaction.connection && transaction.connector === this) {
        res = await this.connector.runSQL(transaction.connection, sql, params);
      } else {
        res = await this.connector.execSql(sql, params);
      }
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(res);
  }


  getInsertedId(model: string, result?: SqlRunResult): number|undefined {
    // the 'result.lastID' is the last inserted RowId
    const metaModel = this.getMetaModel(model);
    /* istanbul ignore else */
    if (result && metaModel.table.mapNameToIdentityField.size === 1) {
      const fld = metaModel.table.mapNameToIdentityField.values().next();
      if (fld.value.dbTypeInfo.typeAffinity === 'INTEGER') {
        // Only if the primary key is integer, it is an alias for the RowId.
        return result.lastID;
      }
    }
    // result.lastID is not the "inserted ID"
    return undefined;
  }



  getCountForAffectedRows(model: string, result?: SqlRunResult): number|undefined {
    return (result && result.changes) || 0;
  }

  getPlaceholderForValue(varName: string): string {
    return ':' + varName;
  }

  buildInsertDefaultValues(model: string, data: any, options?: object): string {
    return 'DEFAULT VALUES';
  }

  fromColumnValue(prop: PropertyDefinition, value: any): any {
    /* istanbul ignore else */
    if (prop && prop[this.name] && prop[this.name].transform && prop[this.name].transform.fromDB) {
      const v = prop[this.name].transform.fromDB(value);  // using 'undefined' for NULL
      return v !== undefined ? v : this.settings.propertyValueForNULL;
    }
    /* istanbul ignore next */
    throw new Error(`something happened calling fromColumnValue`);
  }


  toColumnValue(prop: PropertyDefinition, value: any): any {
    /* istanbul ignore else */
    if (prop && prop[this.name] && prop[this.name].transform && prop[this.name].transform.toDB) {
      return prop[this.name].transform.toDB(value);
    }
    /* istanbul ignore next */
    throw new Error(`something happened calling toColumnValue`);
  }


  // *************************************************************************************
  // Mapping:
  // -------------------------------------------------------------------------------------

  /**
   * get the default table/column name for a given model/property name
   * @param name The name
   */

  dbName(modelOrProperty?: string): string|undefined {
    return this.connector.dbName(modelOrProperty);
  }


  /**
   * escape/quote the table/column name
   * @param name The name
   */

  escapeName(dbName?: string): string|undefined {
    /* istanbul ignore if */
    if (!dbName) {
      return dbName;
    }
    return '`' + dbName.replace(/\`/g, '``').replace(/\./, '`.`') + '`';
  }

  /**
   * escape a value
   * @param name The name
  escapeValue(value: any): any {
    return value;
  }
   */

  // *************************************************************************************
  // pagination
  // -------------------------------------------------------------------------------------

  static buildLimit(filter: Filter): string|undefined {
    const limit = filter.limit ? (isNaN(filter.limit) ? 0 : filter.limit) : 0;
    const offset = filter.offset ? (isNaN(filter.offset) ? 0 : filter.offset) : 0;
    /* istanbul ignore if */
    if (!limit && !offset) {
      return undefined;
    }
    const res: string[] = [];
    /* istanbul ignore else */
    if (limit) {
      res.push(`LIMIT ${limit}`);
    }
    if (offset) {
      res.push(`OFFSET ${offset}`);
    }
    return res.join(' ');
  }

  applyPagination(model: string, sql: ParameterizedSQL, filter: Filter): ParameterizedSQL {
    const limitClause = Sqlite3JugglerConnector.buildLimit(filter);
    return limitClause ? sql.merge(limitClause) : sql;
  }

  // *************************************************************************************
  // automigration/autoupdate/isActual
  // -------------------------------------------------------------------------------------
  // TODO(?): add foreign_key_check to automigrate and autoupdate if foreign
  // keys are enabled?

  /**
   * Create the table for the given model
   * @param model The model name
   * @param  [cb] The callback function
   */
  createTable(model: string, cb?: Callback): PromiseOrVoid {
    const fn = async(): Promise<void> => {
      try {
        const metaModel = this.getMetaModel(model, true);
        await this.promisifiedExecuteSql(metaModel.table.getCreateTableStatement());
      } catch (err /* istanbul ignore next */) {
        return Promise.reject(err);
      }
      return;
    };
    return callbackifyOrPromise(fn(), cb);
  }


  /**
   * drop the table for the given model
   * @param model The model name
   * @param  [cb] The callback function
   */
  dropTable(model: string, cb?: Callback): PromiseOrVoid {
    const fn = async(): Promise<void> => {
      try {
        const metaModel = this.getMetaModel(model);
        await this.promisifiedExecuteSql(metaModel.table.getDropTableStatement());
      } catch (err /* istanbul ignore next */) {
        return Promise.reject(err);
      }
      return;
    };
    return callbackifyOrPromise(fn(), cb);
  }


  /**
   * Perform autoupdate for the given models or all models
   *
   * @param [models] - The model name or array of model names
   * @param [cb] - The callback function
   */
  autoupdate(models?: string|string[], cb?: Callback): PromiseOrVoid;
  autoupdate(cb?: Callback): PromiseOrVoid;
  autoupdate(models?: string|string[]|Callback, cb?: Callback): PromiseOrVoid {
    if (!cb && typeof models === 'function') {
      cb = models;
      models = undefined;
    }
    if (models && typeof models === 'string') {
      models = [models];
    }
    models = models || Object.keys((this as any)._models);
    return this._autoupate(models as string[], cb);
  }

  protected _autoupate(models?: string[], cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this.promisifiedAutoupdate(models), cb);
  }

  protected async promisifiedAutoupdate(models?: string[]): Promise<void> {
    try {
      const tables: Table[] = [];
      /* istanbul ignore else */
      if (models) {
        models.forEach((model) => {
          const metaModel = this.getMetaModel(model, true);
          tables.push(metaModel.table);
        });
      }
      const connection = await this.connector.getConnection();

      const autoUpgrader = new AutoUpgrader(connection);
      await autoUpgrader.upgradeTables(tables);
      try {
        await connection.close();
      } catch (_ignore) {
      }
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(err);
    }
  }

  /**
   * Check if the models exist and are up-to-date
   *
   * @param [models] - The model name or array of model names
   * @param [cb] - The callback function
   */
  isActual(models?: string|string[], cb?: Callback): PromiseOrVoid<boolean>;
  isActual(cb?: Callback): PromiseOrVoid<boolean>;
  isActual(models?: string|string[]|Callback, cb?: Callback): PromiseOrVoid<boolean> {
    if (!cb && typeof models === 'function') {
      cb = models;
      models = undefined;
    }
    if (models && typeof models === 'string') {
      models = [models];
    }
    models = models || Object.keys((this as any)._models);
    return this._isActual(models as string[], cb);
  }

  protected _isActual(models?: string[], cb?: Callback): PromiseOrVoid<boolean> {
    return callbackifyOrPromise(this.promisifiedIsActual(models), cb);
  }

  protected async promisifiedIsActual(models?: string[]): Promise<boolean> {
    try {
      const tables: Table[] = [];
      /* istanbul ignore else */
      if (models) {
        models.forEach((model) => {
          const metaModel = this.getMetaModel(model, true);
          tables.push(metaModel.table);
        });
      }
      const connection = await this.connector.getConnection();

      const autoUpgrader = new AutoUpgrader(connection);
      const result = await autoUpgrader.isActual(tables);
      try {
        await connection.close();
      } catch (_ignore) {
      }
      return result;
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(err);
    }
  }

  // *************************************************************************************
  // TODO(?): discover model definition
  // -------------------------------------------------------------------------------------

  // discoverModelDefinitions
  // discoverModelProperties
  // discoverPrimaryKeys
  // discoverForeignKeys
  // discoverExportedForeignKeys
  // discoverSchema

  // discoverAndBuildModels

  // *************************************************************************************
  // model definitions
  // -------------------------------------------------------------------------------------

  getMetaModel(modelName: string, recreate?: boolean): MetaModel {
    const lbModelDef: any /* juggler.PersistedModelClass */ = (this as any)._models[modelName];
    /* istanbul ignore if */
    if (!lbModelDef) {
      throw new Error(`model '${modelName}' not found`);
    }
    return this.connector.getMetaModelFromJuggler(modelName, lbModelDef, recreate);
  }

  destroyMetaModel(modelName: string): void {
    this.connector.destroyMetaModel(modelName);
  }

  destroyAllMetaModels(): void {
    this.connector.destroyAllMetaModels();
  }

  modelNames(): string[] {
    return this.connector.metaModels.modelNames();
  }
}



/**
 *
 * Initialize the Sqlite3Connector for the given data source
 *
 * @param dataSource The dataSource
 * @callback [cb] The callback function
 */
export function initialize(dataSource: DataSource, cb?: Callback<void>): void {
  /* istanbul ignore if */
  if (dataSource.settings && !!dataSource.settings.debug) {
    Sqlite3Connector.debugEnabled = true;
  }
  debug(`initialize ${SQLITE3_CONNECTOR_NAME} juggler connector ...`);
  const connector = new Sqlite3JugglerConnector(dataSource.settings as Sqlite3Settings);
  dataSource.connector = connector;
  dataSource.connector.dataSource = dataSource;
  /* istanbul ignore else */
  if (cb) {
    if (dataSource.settings && dataSource.settings.lazyConnect) {
      cb();
    } else {
      debug(`initial connect`);
      connector.connect((err: any): void => {
        /* istanbul ignore if */
        if (err) {
          debug(`initial connect failed: `, err);
        } else {
          debug(`initial connect succeeded`);
        }
        debug(`initialized ${SQLITE3_CONNECTOR_NAME} juggler connector`);
        cb(err);
      });
      return;
    }
  }
  debug(`initialized ${SQLITE3_CONNECTOR_NAME} juggler connector`);
}
