declare module 'loopback-connector' {
  /**
   * Connector from `loopback-connector` module
   * stolen from loopback-datasource-juggler
   */
  export class Connector {
    name: string;  // Name/type of the connector
    dataSource?: DataSource;
    connect(callback?: Callback):
        PromiseOrVoid;  // Connect to the underlying system
    disconnect(callback?: Callback):
        PromiseOrVoid;  // Disconnect from the underlying system
    ping(callback?: Callback): PromiseOrVoid;  // Ping the underlying system
    execute?(...args: any[]): Promise<any>;
  }

  export class SQLConnector extends Connector {
    constructor(name: string, settings?: any);

    executeSQL(
        sql: string, params?: any[], options?: object, callback?: Callback);

    serializeObject(val: any): string;
  }

  export class Transaction {
    connection: any;
    static begin(connector: SQLConnector, callback: Callback): void;
    commit(callback: Callback): void;
    rollback(callback: Callback): void;
  }

  export class ParameterizedSQL { merge(sql: string): ParameterizedSQL; }
}
