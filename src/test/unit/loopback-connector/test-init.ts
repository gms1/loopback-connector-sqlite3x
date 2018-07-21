// tslint:disable no-implicit-dependencies no-require-imports
import {DataSource} from 'loopback-datasource-juggler';

import * as ConnectorModule from '../../..';

const glob = global as any;
glob.ds = undefined;

export function initDataSource(config?: {}): DataSource {
  glob.ds = new DataSource(ConnectorModule as any, config);
  glob.getDataSource = glob.getSchema = (): DataSource => {
    return glob.ds;
  };
  return glob.ds;
}

export function getDataSource(): DataSource {
  return glob.ds;
}

glob.connectorCapabilities = {
  ilike: false,
  nilike: false
};
