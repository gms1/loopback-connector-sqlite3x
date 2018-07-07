// tslint:disable no-implicit-dependencies
import {DataSource} from 'loopback-datasource-juggler';
import rc = require('rc');

import * as ConnectorModule from '../';

const config = rc('loopback', {test: {sqlite3: {}}}).test.sqlite3;
let db: DataSource|undefined;

export function init(): void {
  const g = global as any;
  g.getDataSource = g.getSchema = () => {
    if (db) {
      return db;
    }
    db = new DataSource(ConnectorModule, config);
    return db;
  };
  g.connectorCapabilities = {ilike: false, nilike: false};
}
