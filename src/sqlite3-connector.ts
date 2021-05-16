import { Connector } from '@loopback/repository';
import _sg = require('strong-globalize');
import * as _dbg from 'debug';
import {
  SqlConnectionPool,
  SqlDatabase,
  SqlRunResult,
  SQL_MEMORY_DB_SHARED,
  SQL_OPEN_DEFAULT,
  MetaModel,
} from 'sqlite3orm';

import { Sqlite3AllSettings, Sqlite3Settings } from './sqlite3-settings';
import { MetaModelFactory } from './meta-model-factory';

const g = new _sg();

export const SQLITE3_CONNECTOR_NAME = 'sqlite3x';
const SQLITE3_CONNECTOR_DESCRIPTION = g.f('unofficial LoopBack connector for SQLite3');

const debug = _dbg('sqlite3x');

export class Sqlite3Connector implements Connector {
  readonly name: string = SQLITE3_CONNECTOR_NAME;

  readonly settings: Sqlite3AllSettings;
  readonly pool: SqlConnectionPool;
  readonly metaModels: MetaModelFactory;

  /* istanbul ignore next */
  static get debugEnabled(): boolean {
    return debug.enabled;
  }

  /* istanbul ignore next */
  static set debugEnabled(enabled: boolean) {
    debug.enabled = enabled;
  }

  constructor(settings?: Sqlite3Settings) {
    this.settings = Sqlite3Connector.enrichInputSettings(settings || {});
    /* istanbul ignore if */
    if (Sqlite3Connector.debugEnabled) {
      debug(`${SQLITE3_CONNECTOR_NAME}`);
      debug(`  ${SQLITE3_CONNECTOR_DESCRIPTION}`);
      debug(`  settings: %j`, settings);
      SqlDatabase.verbose();
    }
    this.pool = new SqlConnectionPool();
    this.metaModels = new MetaModelFactory(this.settings);
  }

  /* istanbul ignore next */
  static debug(arg: any, ...args: any[]): void {
    debug(arg, ...args);
  }

  /*************************************************************************************
   * Connector interface
   */

  /**
   * connect to Sqlite3 database pool
   *
   * @returns a void-promise
   */
  async connect(): Promise<void> {
    try {
      debug(`connecting pool...`);
      await this.pool.open(
        this.settings.file,
        this.settings.mode,
        this.settings.poolMin,
        this.settings.poolMax,
        this.settings.dbSettings,
      );
      debug('connected pool');
    } catch (err) {
      debug(`connecting pool failed: ${err}`);
      return Promise.reject(err);
    }
  }

  /**
   * disconnect from Sqlite3 database pool
   *
   * @returns a void-promise
   */
  async disconnect(): Promise<void> {
    if (!this.pool.isOpen()) {
      return;
    }
    try {
      debug('disconnecting pool...');
      await this.pool.close();
      debug('disconnected pool');
    } catch (err) /* istanbul ignore next */ {
      debug(`disconnecting pool failed: ${err}`);
      return Promise.reject(err);
    }
  }

  /**
   * ping the database backend
   *
   * @returns a void-promise
   */
  ping(): Promise<void> {
    const sql = 'PRAGMA user_version';
    return this.execSql(sql).then(() => {});
  }

  /**
   * get connecton from pool
   */
  async getConnection(): Promise<SqlDatabase> {
    if (!this.pool || !this.pool.isOpen()) {
      return Promise.reject(new Error(g.f('no pool connected')));
    }
    return this.pool.get();
  }

  /**
   * begin transaction
   */
  async begin(): Promise<SqlDatabase> {
    try {
      debug('begin transaction...');
      const connection = await this.getConnection();
      await Sqlite3Connector.runDML(connection, `BEGIN DEFERRED TRANSACTION`);
      return connection;
    } catch (err) /* istanbul ignore next */ {
      debug(`begin transaction failed: ${err}`);
      return Promise.reject(err);
    }
  }

  /**
   * execute sql on new connection from pool
   * release connection afterwards
   */
  async execSql(sql: string, params?: any[]): Promise<any[] | SqlRunResult> {
    try {
      const connection = await this.getConnection();
      const res = await this.runSQL(connection, sql, params);
      // release connection to pool
      try {
        await connection.close();
      } catch (_ignore) {}
      return res;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * commit transaction
   *
   * @param connection
   */
  async commit(connection: SqlDatabase): Promise<void> {
    debug('commit transaction');
    let err;
    try {
      await Sqlite3Connector.runDML(connection, `COMMIT TRANSACTION`);
    } catch (e) /* istanbul ignore next */ {
      err = e;
    }
    try {
      await connection.close();
    } catch (_ignore) {}
    /* istanbul ignore if */
    if (err) {
      return Promise.reject(err);
    }
  }

  /**
   * rollback transaction
   *
   * @param connection
   */
  async rollback(connection: SqlDatabase): Promise<void> {
    debug('rollback transaction');
    try {
      await Sqlite3Connector.runDML(connection, `ROLLBACK TRANSACTION`);
    } catch (e) /* istanbul ignore next */ {
      // ignore
      // see: https://www.sqlite.org/lang_transaction.html
      // quote: If the transaction has already been rolled back automatically by
      // the error response, then the ROLLBACK command will fail with an error,
      // but no harm is caused by this.
    }
    try {
      await connection.close();
    } catch (_ignore) {}
  }

  static runDQL(conn: SqlDatabase, sql: string, params?: any[]): Promise<any[]> {
    return conn.all(sql, params);
  }

  static runDML(conn: SqlDatabase, sql: string, params?: any[]): Promise<SqlRunResult> {
    return conn.run(sql, params).catch((err) => {
      if (err && err.message.match(/UNIQUE constraint failed/i)) {
        err.message = `DUPLICATE: ${err.message}`;
      }
      return Promise.reject(err);
    });
  }

  async runSQL(conn: SqlDatabase, sql: string, params?: any[]): Promise<any[] | SqlRunResult> {
    try {
      let res: any[] | SqlRunResult;
      const sqlType = sql
        .trimLeft()
        .substring(0, 6)
        .toUpperCase();
      if (sqlType === 'SELECT' || sqlType === 'PRAGMA') {
        res = await Sqlite3Connector.runDQL(conn, sql, params);
      } else {
        res = await Sqlite3Connector.runDML(conn, sql, params);
      }
      return Promise.resolve(res);
    } catch (err) /* istanbul ignore nothing */ {
      return Promise.reject(err);
    }
  }

  // *************************************************************************************
  // model definitions
  // -------------------------------------------------------------------------------------

  getMetaModelFromJuggler(modelName: string, lbModelDef: any, recreate?: boolean): MetaModel {
    return this.metaModels.getMetaModelFromJuggler(modelName, lbModelDef, recreate);
  }

  destroyMetaModel(modelName: string): void {
    this.metaModels.destroyMetaModel(modelName);
  }

  destroyAllMetaModels(): void {
    this.metaModels.destroyAllMetaModels();
  }

  dbName(modelOrProperty?: string): string | undefined {
    return this.metaModels.dbName(modelOrProperty);
  }

  // *************************************************************************************
  // settings
  // -------------------------------------------------------------------------------------

  static enrichInputSettings(inputSettings: Sqlite3Settings | Object): Sqlite3AllSettings {
    const connectorSettings: Sqlite3Settings = Object.assign({}, inputSettings);

    connectorSettings.file = connectorSettings.file || SQL_MEMORY_DB_SHARED;
    connectorSettings.mode = connectorSettings.mode || SQL_OPEN_DEFAULT;
    connectorSettings.poolMin = connectorSettings.poolMin || 1;
    connectorSettings.poolMax =
      connectorSettings.poolMax == undefined ? 0 : connectorSettings.poolMax;
    connectorSettings.schemaName = connectorSettings.schemaName || 'main';
    connectorSettings.debug = Sqlite3Connector.debugEnabled;
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings) {
      connectorSettings.dbSettings = {};
    }
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings.busyTimeout) {
      connectorSettings.dbSettings.busyTimeout = 30000;
    }
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings.readUncommitted) {
      connectorSettings.dbSettings.readUncommitted = 'FALSE';
    }
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings.executionMode) {
      connectorSettings.dbSettings.executionMode = 'PARALLELIZE';
    }

    return connectorSettings as Sqlite3AllSettings;
  }
}
