// tslint:disable no-require-imports no-implicit-dependencies no-var-requires
// tslint:disable await-promise

import * as should from 'should';

import { Sqlite3JugglerConnector } from '../../..';

import { initJugglerDataSource } from '../core/test-init.spec';

describe('sqlite3-juggler-connector: juggler imported tests', () => {
  before(async () => {
    // NOTE: these tests would fail without setting propertyValueForNULL to null:
    //  .) datatypes/model option persistUndefinedAsNull/should convert undefined to null on save
    //  .) relations/embedsOne/should get an embedded item on scope - verify
    //  .) relations/embedsOne/should get an embedded item on scope with promises - verify
    //  .) relations/embedsOne/should delete the embedded document and also update parent

    // tslint:disable-next-line no-null-keyword
    initJugglerDataSource({ propertyValueForNULL: null });

    const ds = (global as any).getSchema();
    if (!ds.connected) {
      await ds.connect();
    }
    should(ds.connector).be.instanceof(Sqlite3JugglerConnector);
  });

  beforeEach(async () => {
    const connection = await (global as any).getSchema().connector.pool.get();
    // TODO: this should not be required:
    await connection.exec('DROP TABLE IF EXISTS author');
    connection.close();
  });

  // ===========================================================
  require('loopback-datasource-juggler/test/common.batch.js');
  require('loopback-datasource-juggler/test/include.test.js');
  // ===========================================================

  after(async () => {
    const ds = (global as any).getSchema();
    should(ds.connector).be.instanceof(Sqlite3JugglerConnector);
    const connector = ds.connector as Sqlite3JugglerConnector;
    for (const modelName of connector.modelNames()) {
      await connector.dropTable(modelName);
    }
    connector.destroyAllMetaModels();
    return;
  });
});
