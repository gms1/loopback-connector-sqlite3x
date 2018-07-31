
// tslint:disable no-require-imports member-ordering
import {Class, Connector, CrudConnector, Entity, EntityData, Filter, Options, Where} from '@loopback/repository';
import _sg = require('strong-globalize');
import * as _dbg from 'debug';
import {SqlConnectionPool, SqlDatabase, SqlRunResult, SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT} from 'sqlite3orm';

import {Sqlite3AllSettings, Sqlite3Settings} from './sqlite3-settings';

const g = new _sg();

export const SQLITE3_CONNECTOR_NAME = 'sqlite3x';
const SQLITE3_CONNECTOR_DESCRIPTION =
    g.f('unofficial LoopBack connector for SQLite3');

const debug = _dbg('loopback:connector:sqlite3x');


// tslint:disable-next-line:no-any
export type AnyIdType = any;

export class Sqlite3CrudConnector implements Connector /*, CrudConnector*/ {
  /*************************************************************************************
   * Connector interface
   */
  name: string = SQLITE3_CONNECTOR_NAME;
  interfaces?: string[];

  /*************************************************************************************
   * implementation
   */

  settings!: Sqlite3AllSettings;

  readonly pool: SqlConnectionPool;

  private execCounter: number;

  /* istanbul ignore next */
  static get debugEnabled(): boolean {
    return debug.enabled;
  }

  /* istanbul ignore next */
  static set debugEnabled(enabled: boolean) {
    debug.enabled = enabled;
  }

  constructor(settings?: Sqlite3Settings|Object) {
    /* istanbul ignore if */
    if (Sqlite3CrudConnector.debugEnabled) {
      debug(`${SQLITE3_CONNECTOR_NAME}`);
      debug(`  ${SQLITE3_CONNECTOR_DESCRIPTION}`);
      debug(`  settings: %j`, settings);
      SqlDatabase.verbose();
    }
    this.settings = Sqlite3CrudConnector.enrichInputSettings(settings || {});
    this.pool = new SqlConnectionPool();
    this.execCounter = 0;
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
    if (this.pool.isOpen()) {
      return;
    }
    try {
      debug('connecting pool...');
      await this.pool.open(
          this.settings.file, this.settings.mode, this.settings.poolMin,
          this.settings.poolMax, this.settings.dbSettings);
      debug('connected pool');
    } catch (err) {
      debug('connecting pool failed: ' + err);
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
      debug('disconnecting pool failed: ' + err);
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



  /*************************************************************************************
   * CrudConnector interface
   */


  /**
   * Create a new entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns A promise of the entity created
   */
  // create(modelClass: Class<Entity>, entity: EntityData, options: Options):
  //       Promise<EntityData> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }

  /**
   * Create multiple entities
   * @param modelClass The model class
   * @param entities An array of entity instances or data
   * @param options Options for the operation
   * @returns A promise of an array of entities created
   */
  //   createAll(
  //       modelClass: Class<Entity>, entities: EntityData[],
  //       options?: Options): Promise<EntityData[]> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }

  /**
   * Save an entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns A promise of the entity saved
   */
  //   save(modelClass: Class<Entity>, entity: EntityData, options?: Options):
  //       Promise<EntityData> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Find matching entities by the filter
   * @param modelClass The model class
   * @param filter The query filter
   * @param options Options for the operation
   * @returns A promise of an array of entities found for the filter
   */
  //   find(modelClass: Class<Entity>, filter?: Filter, options?: Options):
  //       Promise<EntityData[]> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Find an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param options Options for the operation
   * @returns A promise of the entity found for the id
   */
  //   findById<IdType>(modelClass: Class<Entity>, id: IdType, options?:
  //   Options):
  //       Promise<EntityData> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Update an entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns Promise<true> if an entity is updated, otherwise
   * Promise<false>
   */
  //   update(modelClass: Class<Entity>, entity: EntityData, options?: Options):
  //       Promise<boolean> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Delete an entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns Promise<true> if an entity is deleted, otherwise
   * Promise<false>
   */
  //   delete(modelClass: Class<Entity>, entity: EntityData, options?: Options):
  //       Promise<boolean> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Update matching entities
   * @param modelClass The model class
   * @param data The data attributes to be updated
   * @param where The matching criteria
   * @param options Options for the operation
   * @returns A promise of number of matching entities deleted
   */
  //   updateAll(
  //       modelClass: Class<Entity>, data: EntityData, where?: Where,
  //       options?: Options): Promise<number> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Update an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param data The data attributes to be updated
   * @param options Options for the operation
   * @returns Promise<true> if an entity is updated for the id, otherwise
   * Promise<false>
   */
  //   updateById<IdType>(
  //       modelClass: Class<Entity>, id: IdType, data: EntityData,
  //       options?: Options): Promise<boolean> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Replace an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param data The data attributes to be updated
   * @param options Options for the operation
   * @returns Promise<true> if an entity is replaced for the id, otherwise
   * Promise<false>
   */
  //   replaceById<IdType>(
  //       modelClass: Class<Entity>, id: IdType, data: EntityData,
  //       options?: Options): Promise<boolean> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Delete matching entities
   * @param modelClass The model class
   * @param where The matching criteria
   * @param options Options for the operation
   * @returns A promise of number of matching entities deleted
   */
  //   deleteAll(modelClass: Class<Entity>, where?: Where, options?: Options):
  //       Promise<number> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Delete an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param options Options for the operation
   * @returns Promise<true> if an entity is deleted for the id, otherwise
   * Promise<false>
   */
  //   deleteById<IdType>(modelClass: Class<Entity>, id: IdType, options?:
  //   Options):
  //       Promise<boolean> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Count matching entities
   * @param modelClass The model class
   * @param where The matching criteria
   * @param options Options for the operation
   * @returns A promise of number of matching entities
   */
  //   count(modelClass: Class<Entity>, where?: Where, options?: Options):
  //       Promise<number> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }
  /**
   * Check if an entity exists for the id
   * @param modelClass The model class
   * @param id The entity id value
   * @param options Options for the operation
   * @returns Promise<true> if an entity exists for the id, otherwise
   * Promise<false>
   */
  //   exists<IdType>(modelClass: Class<Entity>, id: IdType, options?: Options):
  //       Promise<boolean> {
  //     throw new Error('TODO: Not implemented yet.');
  //   }

  /*************************************************************************************
   * helper functions
   */

  /**
   * get connecton from pool
   */
  async getConnection(): Promise<SqlDatabase> {
    if (!this.pool || !this.pool.isOpen()) {
      return Promise.reject(new Error(g.f('no pool connected')));
    }
    try {
      /* istanbul ignore if */
      if (this.pool.opening) {
        // waiting for pool to open
        await this.pool.opening;
      }
      const res = await this.pool.get();
      return res;
    } catch (err) /* istanbul ignore next */ {
      return Promise.reject(g.f('connecting failed'));
    }
  }

  /**
   * begin transaction
   */
  async begin(): Promise<SqlDatabase> {
    try {
      debug('begin transaction...');
      const connection = await this.getConnection();
      await Sqlite3CrudConnector.runDML(
          connection, `BEGIN DEFERRED TRANSACTION`);
      return connection;
    } catch (err) /* istanbul ignore next */ {
      debug(`begin transaction failed: ` + err);
      return Promise.reject(err);
    }
  }


  /**
   * execute sql on new connection from pool
   * release connection afterwards
   */
  async execSql(sql: string, params?: any[]): Promise<any[]|SqlRunResult> {
    let connection: SqlDatabase|undefined;
    let res: any[]|SqlRunResult;
    try {
      connection = await this.getConnection();
      res = await this.runSQL(connection, sql, params);
      // release connection to pool
    } catch (err) {
      if (connection) {
        try {
          await connection.close();
        } catch (e) {
        }
      }
      return Promise.reject(err);
    }
    return res;
  }

  /**
   * commit transaction
   *
   * @param connection
   */
  async commit(connection: SqlDatabase): Promise<void> {
    debug('commit transaction');
    try {
      await Sqlite3CrudConnector.runDML(connection, `COMMIT TRANSACTION`);
      await connection.close();
    } catch (err) /* istanbul ignore next */ {
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
      await Sqlite3CrudConnector.runDML(connection, `ROLLBACK TRANSACTION`);
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
  }

  static runDQL(conn: SqlDatabase, sql: string, params?: any[]):
      Promise<any[]> {
    return conn.all(sql, params);
  }

  static runDML(conn: SqlDatabase, sql: string, params?: any[]):
      Promise<SqlRunResult> {
    return conn.run(sql, params).catch((err) => {
      if (err && err.message.match(/UNIQUE constraint failed/i)) {
        err.message = `DUPLICATE: ${err.message}`;
      }
      return Promise.reject(err);
    });
  }


  async runSQL(conn: SqlDatabase, sql: string, params?: any[]):
      Promise<any[]|SqlRunResult> {
    const execCounter = ++this.execCounter;
    try {
      let res: any[]|SqlRunResult;
      debug(`sql(${execCounter}): ${sql}`);
      if (Array.isArray(params) && params.length) {
        debug(`sql(${execCounter}): params: `, params);
      }
      const sqlType = sql.trimLeft().substring(0, 6).toUpperCase();
      if (sqlType === 'SELECT' || sqlType === 'PRAGMA') {
        res = await Sqlite3CrudConnector.runDQL(conn, sql, params);
        debug(`sql(${execCounter}): succeeded (records: ${res.length})`);
        debug(
            `sql(${execCounter}): result: `, JSON.stringify(res, undefined, 2));
      } else {
        res = await Sqlite3CrudConnector.runDML(conn, sql, params);
        if (res.lastID) {
          debug(
              `sql(${execCounter}): succeeded (records: ${
                                                          res.changes
                                                        }, id: ${res.lastID})`);
        } else {
          debug(`sql(${execCounter}): succeeded (records: ${res.changes})`);
        }
      }
      return Promise.resolve(res);
    } catch (err) {
      debug(`sql(${execCounter}): failed: `, err);
      return Promise.reject(err);
    }
  }

  static enrichInputSettings(inputSettings: Sqlite3Settings|
                             Object): Sqlite3AllSettings {
    const connectorSettings: Sqlite3Settings = Object.assign({}, inputSettings);

    connectorSettings.file = connectorSettings.file || SQL_MEMORY_DB_SHARED;
    connectorSettings.mode = connectorSettings.mode || SQL_OPEN_DEFAULT;
    connectorSettings.poolMin = connectorSettings.poolMin || 1;
    // tslint:disable triple-equals
    connectorSettings.poolMax =
        connectorSettings.poolMax == undefined ? 0 : connectorSettings.poolMax;
    connectorSettings.schemaName = connectorSettings.schemaName || 'main';
    connectorSettings.debug = Sqlite3CrudConnector.debugEnabled;
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings) {
      connectorSettings.dbSettings = {};
    }
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings.journalMode) {
      connectorSettings.dbSettings.journalMode = 'WAL';
    }
    /* istanbul ignore else */
    if (!connectorSettings.dbSettings.busyTimeout) {
      connectorSettings.dbSettings.busyTimeout = 3000;
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
