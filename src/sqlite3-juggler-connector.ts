// resolve types only:
// tslint:disable no-implicit-dependencies no-string-literal
// tslint:disable no-non-null-assertion


import {Callback, DataSource, Filter, PromiseOrVoid, PropertyDefinition, TransactionMixin} from 'loopback-datasource-juggler';
import {FieldOpts, MetaModel, SqlConnectionPool, SqlDatabase, SqlRunResult, TableOpts} from 'sqlite3orm';

import {ParameterizedSQL, SQLConnector} from './export-lc';
import {SQLITE3_CONNECTOR_NAME, Sqlite3CrudConnector} from './sqlite3-crud-connector';
import {Sqlite3ExecuteOptions, Sqlite3ModelOptions, Sqlite3PropertyOptions} from './sqlite3-options';
import {Sqlite3Settings} from './sqlite3-settings';
import {callbackifyOrPromise} from './utils';


export const name = SQLITE3_CONNECTOR_NAME;

function debug(arg: any, ...args: any[]): void {
  Sqlite3CrudConnector.debug(arg, ...args);
}

/*
 * wrapper class around Sqlite3CrudConnector to make juggler happy
 */
export class Sqlite3JugglerConnector extends SQLConnector implements
    TransactionMixin {
  readonly name: string = SQLITE3_CONNECTOR_NAME;

  private _metaModelMap: Map<string, MetaModel>;

  private _crudConnector: Sqlite3CrudConnector;
  get pool(): SqlConnectionPool {
    return this._crudConnector.pool;
  }

  constructor(settings: Sqlite3Settings|Object) {
    super(SQLITE3_CONNECTOR_NAME, settings);
    this._metaModelMap = new Map<string, MetaModel>();
    this._crudConnector = new Sqlite3CrudConnector(settings);
  }

  // *************************************************************************************
  //  connect, disconnect, ping, ...

  /**
   * connect to Sqlite3 database pool
   *
   * @callback [cb] The callback function
   */
  connect(cb?: Callback<void>): PromiseOrVoid {
    return callbackifyOrPromise(this._crudConnector.connect(), cb);
  }

  /**
   * disconnect from Sqlite3 database pool
   *
   * @callback [cb] The callback function
   */
  disconnect(cb?: Callback<void>): PromiseOrVoid {
    return callbackifyOrPromise(this._crudConnector.disconnect(), cb);
  }

  /**
   * ping the database backend
   *
   * @callback [cb] The callback function
   */
  ping(cb?: Callback<void>): PromiseOrVoid {
    return callbackifyOrPromise(this._crudConnector.ping(), cb);
  }

  // *************************************************************************************
  //  Transactions

  beginTransaction(isolationLevel: string, cb?: Callback): PromiseOrVoid;
  beginTransaction(cb?: Callback): PromiseOrVoid;
  beginTransaction(isolationLevel?: string|Callback, cb?: Callback):
      PromiseOrVoid {
    /* istanbul ignore if */
    if (typeof isolationLevel === 'function' && cb === undefined) {
      return this._beginTransaction(isolationLevel);
    } else {
      return this._beginTransaction(cb);
    }
  }

  protected _beginTransaction(cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this._crudConnector.begin(), cb);
  }

  commit(connection: SqlDatabase, cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this._crudConnector.commit(connection), cb);
  }

  rollback(connection: SqlDatabase, cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(this._crudConnector.rollback(connection), cb);
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
  executeSQL(
      sql: string, params?: any[], options?: Sqlite3ExecuteOptions,
      cb?: Callback): PromiseOrVoid;
  executeSQL(sql: string, params?: any[], cb?: Callback): PromiseOrVoid;
  executeSQL(sql: string, cb?: Callback): PromiseOrVoid;
  executeSQL(
      sql: string, params?: any[]|Callback,
      options?: Sqlite3ExecuteOptions|Callback, cb?: Callback): PromiseOrVoid {
    if (typeof params === 'function' && cb === undefined &&
        options === undefined) {
      cb = params;
      return this._executeSQL(sql, undefined, undefined, cb);
    } else if (typeof options === 'function' && cb === undefined) {
      cb = options;
      return this._executeSQL(sql, params as any[], undefined, cb);
    } else {
      return this._executeSQL(
          sql, params as any[], options as Sqlite3ExecuteOptions, cb);
    }
  }

  public _executeSQL(
      sql: string, params?: any[], options?: Sqlite3ExecuteOptions,
      cb?: Callback): PromiseOrVoid {
    return callbackifyOrPromise(
        this.promisifiedExecuteSql(sql, params, options), cb);
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
    throw new Error(`TODO: not implemented yet`);
    // return this.serializeObject(val);
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

  applyPagination(model: string, sql: ParameterizedSQL, filter: Filter):
      ParameterizedSQL {
    const limitClause = Sqlite3JugglerConnector.buildLimit(filter);
    return limitClause ? sql.merge(limitClause) : sql;
  }

  // *************************************************************************************
  // automigration

  /**
   * Create the table for the given model
   * @param model The model name
   * @param  [cb] The callback function
   */
  createTable(model: string, cb?: Callback): PromiseOrVoid {
    const fn = async(): Promise<void> => {
      try {
        const metaModel = this.getMetaModel(model);
        await this.promisifiedExecuteSql(
            metaModel.table.getCreateTableStatement());
        await new Promise((resolve) => {
          process.nextTick(() => resolve());
        });
      } catch (err) {
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
        await this.promisifiedExecuteSql(
            metaModel.table.getDropTableStatement());
      } catch (err) {
        return Promise.reject(err);
      }
      return;
    };
    return callbackifyOrPromise(fn(), cb);
  }



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
  // model definitions


  getMetaModel(modelName: string): MetaModel {
    let metaModel = this._metaModelMap.get(modelName);
    if (metaModel) {
      return metaModel;
    }
    const model: any = (this as any)._models[modelName];
    if (!model) {
      throw new Error(`model '${modelName}' not found`);
    }
    const settings = model.settings || {};
    const modelOpts = (settings[this.name] || {}) as Sqlite3ModelOptions;
    debug(`registering model '${modelName}'`);
    metaModel = new MetaModel(modelName);
    const tableOpts: TableOpts = {
      name: modelOpts.tableName || this.dbName(modelName),
      autoIncrement: modelOpts.autoIncrement,
      withoutRowId: modelOpts.withoutRowId
    };
    const properties = model.properties || {};
    Object.keys(properties).forEach((propName) => {
      const property = properties[propName] || {};
      const propertyOpts =
          (property[this.name] || {}) as Sqlite3PropertyOptions;
      const fieldOpts: FieldOpts = {
        name: propertyOpts.columnName || this.dbName(propName),
        dbtype: propertyOpts.dbtype,
        isJson: propertyOpts.isJson
      };
      const metaProp = metaModel!.getPropertyAlways(propName);
      metaProp.setPropertyType(property.type);
      metaProp.setFieldProperties(
          fieldOpts.name as string, !!property.id, fieldOpts);
    });
    metaModel.init(tableOpts);
    this._metaModelMap.set(metaModel.name, metaModel);
    return metaModel;
  }

  // *************************************************************************************
  // promisified helper functions

  public async promisifiedExecuteSql(
      sql: string, params?: any[],
      options?: Sqlite3ExecuteOptions): Promise<any[]|SqlRunResult> {
    params = params || [];
    options = options || {};
    let res: any[]|SqlRunResult;
    try {
      const transaction = options && options.transaction;
      if (transaction && transaction.connection &&
          transaction.connector === this) {
        res = await Sqlite3CrudConnector.runSQL(
            transaction.connection, sql, params);
      } else {
        res = await this._crudConnector.execSql(sql, params);
      }
    } catch (err) {
      return Promise.reject(err);
    }
    return Promise.resolve(res);
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
    Sqlite3CrudConnector.debugEnabled = true;
  }
  debug(`initialize ${SQLITE3_CONNECTOR_NAME} juggler connector...`);
  const connector =
      new Sqlite3JugglerConnector(dataSource.settings as Sqlite3Settings);
  dataSource.connector = connector;
  dataSource.connector.dataSource = dataSource;
  /* istanbul ignore else */
  if (cb) {
    if (dataSource.settings && dataSource.settings.lazyConnect) {
      cb();
    } else {
      debug(`initial connect`);
      connector.connect((err: any): void => {
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
