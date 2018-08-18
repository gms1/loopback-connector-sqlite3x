// tslint:disable no-require-imports no-implicit-dependencies no-var-requires
// tslint:disable await-promise

import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';

import {Sqlite3JugglerConnector} from '../../..';

import {getDataSource, initDataSource, setDefaultConfig} from '../core/test-init';


describe('loopback-datasource-juggler imported tests', () => {
  let ds: DataSource;
  let connector: Sqlite3JugglerConnector;

  before(() => {
    // tslint:disable-next-line no-null-keyword
    setDefaultConfig({propertyValueForNULL: null});
    // NOTE: these tests would fail without setting propertyValueForNULL to null:
    //  .) datatypes/model option persistUndefinedAsNull/should convert undefined to null on save
    //  .) relations/embedsOne/should get an embedded item on scope - verify
    //  .) relations/embedsOne/should get an embedded item on scope with promises - verify
    //  .) relations/embedsOne/should delete the embedded document and also update parent

    initDataSource();
    ds = getDataSource();
    should(ds.connector).be.instanceof (Sqlite3JugglerConnector);
    connector = ds.connector as Sqlite3JugglerConnector;
  });

  // ===========================================================
  require('loopback-datasource-juggler/test/common.batch.js');
  require('loopback-datasource-juggler/test/include.test.js');
  // ===========================================================

  after(async () => {
    setDefaultConfig({});
    try {
      for (const modelName of connector.modelNames()) {
        await connector.dropTable(modelName);
      }
    } catch (err) {
      return Promise.reject(err);
    }
    connector.destroyAllMetaModels();
    return;
  });
});
