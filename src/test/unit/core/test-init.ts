// tslint:disable no-implicit-dependencies no-require-imports
import {DataSource} from 'loopback-datasource-juggler';

import * as ConnectorModule from '../../..';

const glob = global as any;
glob.ds = undefined;

let defaultConfig: object = {};
export function setDefaultConfig(config: {}): void {
  defaultConfig = config;
}

export function initDataSource(config: object = defaultConfig): DataSource {
  glob.ds = new DataSource(ConnectorModule as any, config);
  glob.getDataSource = glob.getSchema = (): DataSource => {
    return glob.ds;
  };
  return glob.ds;
}

export function getDataSource(): DataSource {
  return glob.ds;
}

// TODO: evaluate if additional features can be supported:
glob.connectorCapabilities = {
  cloudantCompatible: false,
  ilike: false,
  nilike: false,
  supportForceId: false,
  get geoPoint(): boolean {
    return false;
  },
  set geoPoint(val: boolean) {}
};
