// tslint:disable

// from loopback-connector/index.js:
//   exports.Connector = require('./lib/connector');
//   Set up SqlConnector as an alias to SQLConnector
//   exports.SQLConnector = exports.SqlConnector = require('./lib/sql');
//   exports.ParameterizedSQL = exports.SQLConnector.ParameterizedSQL;
//   exports.Transaction = require('./lib/transaction');


declare module 'loopback-connector' {
  import {Callback, Connector as ConnectorInterface, DataSource, Filter, PromiseOrVoid, PropertyDefinition, Transaction as TransactionInterface, TransactionMixin} from 'loopback-datasource-juggler';

  export class Connector implements ConnectorInterface {
    name: string;  // Name/type of the connector
    dataSource?: DataSource;
    connect(callback?: Callback):
        PromiseOrVoid;  // Connect to the underlying system
    disconnect(callback?: Callback):
        PromiseOrVoid;  // Disconnect from the underlying system
    ping(callback?: Callback): PromiseOrVoid;  // Ping the underlying system
    execute?(...args: any[]): Promise<any>;
  }

  export class ParameterizedSQL { merge(sql: string): ParameterizedSQL; }

  export class SQLConnector extends Connector {
    constructor(name: string, settings?: any);

    execute(...args: any[]): Promise<any>;

    executeSQL(
        sql: string, params?: any[], options?: object,
        callback?: Callback): PromiseOrVoid;

    automigrate(models?: string|string[]|Callback, cb?: Callback):
        PromiseOrVoid;
    serializeObject(val: any): string;
  }

  export class Transaction implements TransactionInterface {
    connector?: Connector;
    connection?: Object;

    constructor(connector: Connector, connection: Object);
    /**
     * Commit the transaction
     * @param callback
     */
    commit(callback?: Callback): PromiseOrVoid;
    /**
     * Rollback the transaction
     * @param callback
     */
    rollback(callback?: Callback): PromiseOrVoid;


    static begin(connector: Connector, options: Object, callback?: Callback):
        PromiseOrVoid;
  }
}
