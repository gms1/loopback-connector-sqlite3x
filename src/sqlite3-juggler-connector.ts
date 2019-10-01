// tslint:disable no-implicit-dependencies no-string-literal

import {
  Callback,
  DataSource,
  Filter,
  PromiseOrVoid,
  PropertyDefinition,
  TransactionMixin,
} from 'loopback-datasource-juggler';
import {
  AutoUpgrader,
  MetaModel,
  SqlConnectionPool,
  SqlDatabase,
  SqlRunResult,
  Table,
  UpgradeInfo,
  sequentialize,
} from 'sqlite3orm';

import { ParameterizedSQL, SQLConnector } from './lc-import';
import { SQLITE3_CONNECTOR_NAME, Sqlite3Connector } from './sqlite3-connector';
import { Sqlite3ExecuteOptions } from './sqlite3-options';
import { Sqlite3AllSettings, Sqlite3Settings } from './sqlite3-settings';
import { callbackifyOrPromise, callbackify } from './utils';
import {
  DiscoveredSchema,
  DiscoveredTable,
  DiscoveryService,
  DiscoverSchemasOptions,
  Schemas,
  defaultNameMapper,
} from './discovery-service';

/* istanbul ignore next */
function debug(arg: any, ...args: any[]): void {
  Sqlite3Connector.debug(arg, ...args);
}

/*
 * juggler sql-connector
 */
export class Sqlite3JugglerConnector extends SQLConnector implements TransactionMixin {
  readonly connector: Sqlite3Connector;
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
  beginTransaction(isolationLevel?: string | Callback, cb?: Callback): PromiseOrVoid {
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
  executeSQL(
    sql: string,
    params?: any[],
    options?: Sqlite3ExecuteOptions,
    cb?: Callback,
  ): PromiseOrVoid;
  executeSQL(sql: string, params?: any[], cb?: Callback): PromiseOrVoid;
  executeSQL(sql: string, cb?: Callback): PromiseOrVoid;
  executeSQL(
    sql: string,
    params?: any[] | Callback,
    options?: Sqlite3ExecuteOptions | Callback,
    cb?: Callback,
  ): PromiseOrVoid {
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

  protected _executeSQL(
    sql: string,
    params?: any[],
    options?: Sqlite3ExecuteOptions,
    cb?: Callback,
  ): PromiseOrVoid {
    return callbackifyOrPromise(this.promisifiedExecuteSql(sql, params, options), cb);
  }

  public async promisifiedExecuteSql(
    sql: string,
    params?: any[],
    options?: Sqlite3ExecuteOptions,
  ): Promise<any[] | SqlRunResult> {
    params = params || [];
    options = options || {};
    let res: any[] | SqlRunResult;
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

  getInsertedId(model: string, result?: SqlRunResult): number | undefined {
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

  getCountForAffectedRows(model: string, result?: SqlRunResult): number | undefined {
    return (result && result.changes) || 0;
  }

  getPlaceholderForValue(varName: string): string {
    return ':' + varName;
  }

  buildInsertDefaultValues(model: string, data: any, options?: object): string {
    return 'DEFAULT VALUES';
  }

  fromColumnValue(prop: PropertyDefinition, value: any): any {
    const transform = this.connector.metaModels.getValueTransformer(prop);
    /* istanbul ignore else */
    if (transform) {
      const v = transform.fromDB(value); // using 'undefined' for NULL
      return v !== undefined ? v : this.settings.propertyValueForNULL;
    }
    /* istanbul ignore next */
    throw new Error(`something happened calling fromColumnValue`);
  }

  toColumnValue(prop: PropertyDefinition, value: any): any {
    const transform = this.connector.metaModels.getValueTransformer(prop);
    /* istanbul ignore else */
    if (transform) {
      return transform.toDB(value);
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

  dbName(modelOrProperty?: string): string | undefined {
    return this.connector.dbName(modelOrProperty);
  }

  /**
   * escape/quote the table/column name
   * @param name The name
   */

  escapeName(dbName?: string): string | undefined {
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

  static buildLimit(filter: Filter): string | undefined {
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
    const fn = async (): Promise<void> => {
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
    const fn = async (): Promise<void> => {
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
  autoupdate(models?: string | string[], cb?: Callback): PromiseOrVoid;
  autoupdate(cb?: Callback): PromiseOrVoid;
  autoupdate(models?: string | string[] | Callback, cb?: Callback): PromiseOrVoid {
    if (!cb && typeof models === 'function') {
      cb = models;
      models = undefined;
    }
    models = models || Object.keys((this as any)._models);
    return this._autoupate(models as string[], cb);
  }

  protected _autoupate(models?: string[], cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this.executeAutoupdate(models), cb);
  }

  async executeAutoupdate(model?: string | string[]): Promise<void> {
    let connection: SqlDatabase | undefined;
    const models: string[] | undefined = model
      ? typeof model === 'string'
        ? [model]
        : model
      : undefined;
    try {
      const tables: Table[] = [];
      /* istanbul ignore else */
      if (models) {
        models.forEach((modelName) => {
          const metaModel = this.getMetaModel(modelName, true);
          tables.push(metaModel.table);
        });
      }
      connection = await this.connector.getConnection();

      const autoUpgrader = new AutoUpgrader(connection);
      await autoUpgrader.upgradeTables(tables);
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(err);
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  /**
   * Check if the models exist and are up-to-date
   *
   * @param [models] - The model name or array of model names
   * @param [cb] - The callback function
   */
  isActual(models?: string | string[], cb?: Callback): PromiseOrVoid<boolean>;
  isActual(cb?: Callback): PromiseOrVoid<boolean>;
  isActual(models?: string | string[] | Callback, cb?: Callback): PromiseOrVoid<boolean> {
    if (!cb && typeof models === 'function') {
      cb = models;
      models = undefined;
    }
    models = models || Object.keys((this as any)._models);
    return this._isActual(models as string[], cb);
  }

  protected _isActual(models?: string[], cb?: Callback): PromiseOrVoid<boolean> {
    return callbackifyOrPromise(this.executeIsActual(models), cb);
  }

  async executeIsActual(model?: string | string[]): Promise<boolean> {
    let connection: SqlDatabase | undefined;
    const models: string[] | undefined = model
      ? typeof model === 'string'
        ? [model]
        : model
      : undefined;
    try {
      const tables: Table[] = [];
      /* istanbul ignore else */
      if (models) {
        models.forEach((modelName) => {
          const metaModel = this.getMetaModel(modelName, true);
          tables.push(metaModel.table);
        });
      }
      connection = await this.connector.getConnection();

      const autoUpgrader = new AutoUpgrader(connection);
      const result = await autoUpgrader.isActual(tables);
      return result;
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(err);
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  async getUpgradeInfo(model: string): Promise<UpgradeInfo> {
    let connection: SqlDatabase | undefined;
    try {
      const metaModel = this.getMetaModel(model, true);
      connection = await this.connector.getConnection();

      const autoUpgrader = new AutoUpgrader(connection);
      const result = await autoUpgrader.getUpgradeInfo(metaModel.table);
      return result;
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(err);
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  // *************************************************************************************
  // discover
  // -------------------------------------------------------------------------------------

  discoverDatabaseSchemas(cb: Callback<DiscoveredSchema[]>): void;
  discoverDatabaseSchemas(options: Object, cb: Callback<DiscoveredSchema[]>): void;
  discoverDatabaseSchemas(
    options?: Object | Callback<DiscoveredSchema[]>,
    cb?: Callback<DiscoveredSchema[]>,
  ): void {
    if (typeof options === 'function' && !cb) {
      cb = options as Callback<DiscoveredSchema[]>;
      options = {};
    }
    if (!cb) {
      return;
    }
    const ds = new DiscoveryService(this.pool);
    callbackify(ds.schemas(), cb);
  }

  discoverModelDefinitions(cb: Callback<DiscoveredTable[]>): void;
  discoverModelDefinitions(options: Object, cb: Callback<DiscoveredTable[]>): void;
  discoverModelDefinitions(
    options?: Object | Callback<DiscoveredTable[]>,
    cb?: Callback<DiscoveredTable[]>,
  ): void {
    if (typeof options === 'function' && !cb) {
      cb = options as Callback<DiscoveredTable[]>;
      options = {};
    }
    if (!cb) {
      return;
    }
    if (!options) {
      options = {};
    }
    const schemaName =
      (options as any).owner || (options as any).schema || this.settings.schemaName;
    const ds = new DiscoveryService(this.pool);
    callbackify(ds.tables(schemaName), cb);
  }

  /*
   * discover schema from a given tableName
   * @param tableName
   * @param options
   * @param cb callback
   *
   */
  discoverSchemas(tableName: string, options: DiscoverSchemasOptions, cb: Callback<Schemas>): void {
    callbackify(this.executeDiscoverSchemas(tableName, options), cb);
  }

  /*
   * discover schema from a given tableName
   * @param tableName
   * @param options
   * @returns promise
   *
   */
  async executeDiscoverSchemas(
    tableName: string,
    options: DiscoverSchemasOptions,
  ): Promise<Schemas> {
    const ds = new DiscoveryService(this.pool);

    if (options.nameMapper === undefined) {
      options.nameMapper = defaultNameMapper;
    }
    const schemaName = options.owner || options.schema || this.settings.schemaName;
    const schemaKey = `${schemaName}.${tableName}`;

    options.visited = options.visited || {};
    if (options.visited[schemaKey]) {
      return options.visited;
    }
    try {
      const schema = await ds.table(tableName, schemaName, options);
      if (options.visited[schemaKey]) {
        return options.visited;
      }
      options.visited[schemaKey] = schema;
      debug(`disovered: ${schemaKey}`);
      const fks = schema.options.foreignKeys;
      if (!fks || Object.keys(fks).length === 0 || (!options.associations && !options.relations)) {
        return options.visited;
      }

      schema.options.relations = {};
      Object.keys(fks).forEach((fkName) => {
        const fk = fks[fkName];
        // NOTE: fkName is a generic name not intended for use in model definitions
        // => defering fkModelName from refTable
        const fkModelName = options.nameMapper
          ? options.nameMapper('fk', fk.refTable)
          : fk.refTable;
        let fkKey = fkModelName;
        let fkLastId = 0;
        // tslint:disable-next-line no-non-null-assertion
        while (schema.options.relations![fkKey]) {
          fkKey = `${fkModelName}${++fkLastId}`;
        }
        (schema.options.relations as any)[fkKey] = {
          model: options.nameMapper ? options.nameMapper('table', fk.refTable) : fk.refTable,
          type: 'belongsTo',
          foreignKey: fk.properties,
        };
      });

      // NOTE: because of sqlite3 limitation, all referenced tables are in the same schema as the referencing table
      await sequentialize(
        Object.keys(fks).map((fkName) => () =>
          this.executeDiscoverSchemas(fks[fkName].refTable, options),
        ),
      );

      return options.visited;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // *************************************************************************************
  // model definitions
  // -------------------------------------------------------------------------------------
  modelNames(): string[] {
    const lbModelDef: any /* juggler.PersistedModelClass */ = (this as any)._models;
    return lbModelDef ? Object.keys(lbModelDef) : [];
  }

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
