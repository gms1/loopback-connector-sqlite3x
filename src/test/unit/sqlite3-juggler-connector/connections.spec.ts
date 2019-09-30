// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable no-duplicate-imports
// tslint:disable await-promise
import { DataSource } from 'loopback-datasource-juggler';
import * as should from 'should';

import { SQLITE3_MODULE } from '../core/test-init';
import { SQL_OPEN_READWRITE, Sqlite3JugglerConnector } from '../../..';

describe('sqlite3-juggler-connector: connections', () => {
  it('should connect using default settings', async () => {
    const ds = new DataSource(SQLITE3_MODULE);
    should(ds.connector).be.instanceof(Sqlite3JugglerConnector);
    const connector = ds.connector as Sqlite3JugglerConnector;
    ds.should.be.equal(connector.dataSource);

    await ds.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();
    await connector.ping();
    await ds.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should fail to connect to wrong db file (lazyConnect and connect() having callback)', async () => {
    const ds = new DataSource(SQLITE3_MODULE, {
      file: '::/.',
      mode: SQL_OPEN_READWRITE,
      lazyConnect: true,
    } as any);
    should(ds.connector).be.instanceof(Sqlite3JugglerConnector);
    const connector = ds.connector as Sqlite3JugglerConnector;
    ds.should.be.equal(connector.dataSource);

    try {
      const p = new Promise<void>((resolve, reject) => {
        connector.connect((err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      await p;
      should.should.fail();
      return;
    } catch (err) {}
    should(connector.pool.isOpen()).be.false();
    try {
      await ds.ping();
      should.should.fail();
      return;
    } catch (err) {}
    try {
      await ds.disconnect();
      should.should.fail();
      return;
    } catch (err) {}
  });

  it('should fail to connect to wrong db file (lazyConnect and connect() returning promise)', async () => {
    const ds = new DataSource(SQLITE3_MODULE, {
      file: '::/.',
      mode: SQL_OPEN_READWRITE,
      lazyConnect: true,
    } as any);
    should(ds.connector).be.instanceof(Sqlite3JugglerConnector);
    const connector = ds.connector as Sqlite3JugglerConnector;
    ds.should.be.equal(connector.dataSource);

    try {
      await connector.connect();
      should.should.fail();
      return;
    } catch (err) {}
    should(connector.pool.isOpen()).be.false();
    try {
      await ds.ping();
      should.should.fail();
      return;
    } catch (err) {}
    try {
      await ds.disconnect();
      should.should.fail();
      return;
    } catch (err) {}
  });
});
