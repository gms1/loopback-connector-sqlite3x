// tslint:disable no-implicit-dependencies no-require-imports
import {DataSource} from 'loopback-datasource-juggler';

import * as ConnectorModule from '..';


let db: DataSource|undefined;

export function testInit(config?: {}): void {
  const glob = global as any;
  glob.getDataSource = glob.getSchema = () => {
    if (db) {
      return db;
    }
    db = new DataSource(ConnectorModule as any, config || {});
    return db;
  };
  glob.connectorCapabilities = {ilike: false, nilike: false};
}
