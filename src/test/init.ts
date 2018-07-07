// tslint:disable no-implicit-dependencies no-require-imports
import {DataSource} from 'loopback-datasource-juggler';
import rc = require('rc');

import * as ConnectorModule from '../';

const config = rc('loopback', {test: {sqlite3: {}}}).test.sqlite3;
let db: DataSource|undefined;

export function init(): void {
  const glob = global as any;
  glob.getDataSource = glob.getSchema = () => {
    if (db) {
      return db;
    }
    db = new DataSource(ConnectorModule, config);
    return db;
  };
  glob.connectorCapabilities = {ilike: false, nilike: false};
}
