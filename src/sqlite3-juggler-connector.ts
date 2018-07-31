// resolve types only:
// tslint:disable no-implicit-dependencies no-string-literal
// tslint:disable no-non-null-assertion


import {Callback, DataSource, Filter, PromiseOrVoid, PropertyDefinition, TransactionMixin} from 'loopback-datasource-juggler';

import {FieldOpts, MetaModel, schema, SqlConnectionPool, SqlDatabase, SqlRunResult, Table, TableOpts} from 'sqlite3orm';

import {ParameterizedSQL, SQLConnector} from './export-lc';
import {SQLITE3_CONNECTOR_NAME, Sqlite3CrudConnector} from './sqlite3-crud-connector';
import {Sqlite3ExecuteOptions, Sqlite3ModelOptions, Sqlite3PropertyOptions} from './sqlite3-options';
import {Sqlite3Settings} from './sqlite3-settings';
import {callbackifyOrPromise, MetaModelRef} from './utils';


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

  private _metaModelMap: Map<string, MetaModelRef>;

  private _crudConnector: Sqlite3CrudConnector;

  get pool(): SqlConnectionPool {
    return this._crudConnector.pool;
  }

  constructor(settings: Sqlite3Settings|Object) {
    super(SQLITE3_CONNECTOR_NAME, settings);
    this._metaModelMap = new Map<string, MetaModelRef>();
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
    /* istanbul ignore if */
    if (typeof params === 'function' && cb === undefined &&
        options === undefined) {
      cb = params;
      return this._executeSQL(sql, undefined, undefined, cb);
    } else /* istanbul ignore if */
        if (typeof options === 'function' && cb === undefined) {
      cb = options;
      return this._executeSQL(sql, params as any[], undefined, cb);
    } else {
      return this._executeSQL(
          sql, params as any[], options as Sqlite3ExecuteOptions, cb);
    }
  }

  protected _executeSQL(
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

  // tslint:disable cyclomatic-complexity
  fromColumnValue(prop: PropertyDefinition, value: any): any {
    // tslint:disable-next-line triple-equals no-null-keyword
    if (value == null || !prop) {
      return value;
    }

    const type = (prop.type as any).name;
    // const propertyOpts = (prop[this.name] || {}) as Sqlite3PropertyOptions;
    switch (type) {
      case 'Number':
        return Number(value);
      case 'String':
        return String(value);
      case 'Boolean':
        /* istanbul ignore if */
        if (typeof value === 'string') {
          if (value === '0' || value === 'false') {
            return false;
          } else if (value === '1' || value === 'true') {
            return true;
          } else {
            debug(`invalid boolean value '${value}'`);
            return undefined;
          }
        } else {
          return Boolean(value);
        }
      case 'Date':
        switch (typeof value) {
          /* istanbul ignore next */
          case 'string':
            return new Date(Date.parse(value));
          case 'number':
            /* istanbul ignore else */
            if (Number.isInteger(value)) {
              // unix time
              return new Date((value as number) * 1000);
            } else {
              // Julian day numbers ?
              // TODO: convert real-number to Date is currently not supported
              return NaN;
            }
          /* istanbul ignore next */
          default:
            // NOTE: should not happen
            return NaN;
        }

      case 'Object':
      case 'Array':
      case 'List':
      case 'Point':
      case 'GeoPoint':
      case 'ModelConstructor':
      case 'JSON':
        return JSON.parse(value);

      default:
        return JSON.parse(value);
    }
  }
  // tslint:enable cyclomatic-complexity


  toColumnValue(prop: PropertyDefinition, value: any): any {
    // tslint:disable-next-line no-null-keyword
    if (value == null || !prop) {
      return value;
    }

    // TODO: currently we are assuming that the default datatype mapping is in
    // use!
    //    Boolean => INTEGER
    //    Date => INTEGER
    const type = (prop.type as any).name;
    // const propertyOpts = (prop[this.name] || {}) as Sqlite3PropertyOptions;
    switch (type) {
      case 'Number':
      case 'String':
        return value;
      case 'Boolean':
        return !value ? 0 : 1;
      case 'Date':
        return Math.floor((value as Date).getTime() / 1000);

      case 'JSON':
        return String(value);

      case 'Object':
      case 'Array':
      case 'List':
      case 'Point':
      case 'GeoPoint':
      case 'ModelConstructor':
        return JSON.stringify(value);

      default:
        return JSON.stringify(value);
    }
  }


  // *************************************************************************************
  // Mapping:
  // -------------------------------------------------------------------------------------
  //  Schema:
  // -------------------------------------------------------------------------------------
  //  this.schema(model) retrieves the schema name for a given model name
  //    the corresponding model definition can have a connector specific
  //    setting having the properties:
  //      'schema' or 'schemaName'
  //    a connector can have 'settings' having the properties
  //      'schema' or 'schemaName'
  //    a connector can implement getDefaultSchemaName()
  //  Sqlite3 schema: one of 'main', 'temp' or the schema name of an attached
  //  database Sqlite3Connector:
  //    TODO: use the connector specific setting with the 'schemaName'
  //    property default: the default schema can be specified by the
  //    'schemaName' property in the settings or 'main' if not set

  // -------------------------------------------------------------------------------------
  //  Table:
  // -------------------------------------------------------------------------------------
  //  this.table(model) retrieves the table name for a given model name
  //    the corresponding model definition can have a connector specific
  //    setting having the properties:
  //      'table' or 'tableName'
  //  otherwise defaults to this.dbName(model) if this function exist or to
  //  the given model name

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

  dbName(modelOrProperty?: string): string|undefined {
    /* istanbul ignore if */
    if (!modelOrProperty) {
      return modelOrProperty;
    }
    return modelOrProperty.toLowerCase();
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
        await this.promisifiedExecuteSql(
            metaModel.table.getDropTableStatement());
      } catch (err /* istanbul ignore next */) {
        return Promise.reject(err);
      }
      return;
    };
    return callbackifyOrPromise(fn(), cb);
  }

  // *************************************************************************************
  // autoupdate


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

  // TODO: indexes

  getMetaModel(modelName: string): MetaModel {
    const model: any = (this as any)._models[modelName];
    /* istanbul ignore if */
    if (!model) {
      throw new Error(`model '${modelName}' not found`);
    }

    let metaModelRef = this._metaModelMap.get(modelName);
    if (metaModelRef) {
      if (model === metaModelRef.juggler) {
        return metaModelRef.ref;
      }
      // recreate
      this._metaModelMap.delete(modelName);
      metaModelRef.ref.destroy();
    }

    const settings = model.settings || {};
    const modelOpts = (settings[this.name] || {}) as Sqlite3ModelOptions;
    debug(`registering model '${modelName}'`);
    metaModelRef = {ref: new MetaModel(modelName), juggler: model};

    const tableOpts: TableOpts = {
      name: modelOpts.tableName || this.dbName(modelName),
      withoutRowId: modelOpts.withoutRowId
    };
    const properties = model.properties || {};
    Object.keys(properties).forEach((propName) => {
      // TODO?: if (!properties.hasOwnProperty(propName)) {
      //  return;
      // }
      const property = properties[propName] || {};
      // tslint:disable-next-line no-null-keyword triple-equals
      if (!!property.id && !!property.generated) {
        tableOpts.autoIncrement = true;
      }
      const propertyOpts =
          (property[this.name] || {}) as Sqlite3PropertyOptions;
      const fieldOpts: FieldOpts = {
        name: propertyOpts.columnName || this.dbName(propName),
        dbtype: propertyOpts.dbtype,
        isJson: propertyOpts.isJson
      };
      const metaProp = metaModelRef!.ref.getPropertyAlways(propName);
      metaProp.setPropertyType(property.type);
      metaProp.addField(fieldOpts.name as string, !!property.id, fieldOpts);
    });
    metaModelRef!.ref.init(tableOpts);
    this._metaModelMap.set(metaModelRef!.ref.name, metaModelRef);
    return metaModelRef!.ref;
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
        res = await this._crudConnector.runSQL(
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
