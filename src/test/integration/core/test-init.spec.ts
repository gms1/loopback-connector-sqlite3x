// tslint:disable no-implicit-dependencies no-require-imports
import { DataSource } from 'loopback-datasource-juggler';
import { initialize, Sqlite3JugglerConnector } from '../../../sqlite3-juggler-connector';

export const SQLITE3_MODULE = {
  initialize,
};

// ================================================================
// datasource for internal test cases:

let defaultDataSource: DataSource;

export function getDefaultDataSource(): DataSource {
  if (defaultDataSource) {
    return defaultDataSource;
  }

  const config: any = {
    name: `test`,
    file: `test_default.db`,
    poolMin: 5,
    poolMax: 20,
  };
  defaultDataSource = new DataSource(SQLITE3_MODULE, config);
  return defaultDataSource;
}

export function getDefaultConnector(): Sqlite3JugglerConnector {
  return getDefaultDataSource().connector as Sqlite3JugglerConnector;
}

// ================================================================
// datasource for executing juggler imported tests:

const JUGGLER_TEST_DATABASE = 'test_juggler.db';
const JUGGLER_DATASOURCE_NAME = 'imported juggler';

let jugglerDataSource: DataSource;

function getJugglerDataSource(): DataSource {
  return jugglerDataSource;
}

const glob = global as any;

export function initJugglerDataSource(config: any): DataSource {
  glob.getDataSource = glob.getSchema = getJugglerDataSource;
  config = config || {};
  config.name = config.name || JUGGLER_DATASOURCE_NAME;
  config.file = config.file || JUGGLER_TEST_DATABASE;
  jugglerDataSource = new DataSource(SQLITE3_MODULE, config);
  return jugglerDataSource;
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
  set geoPoint(val: boolean) {},
};
