// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable await-promise
import * as should from 'should';

import {SQL_OPEN_READWRITE} from '../../..';
import {Sqlite3CrudConnector} from '../../../sqlite3-crud-connector';


describe('crud-connector connections', () => {

  it('should connect using default settings', async () => {
    const connector = new Sqlite3CrudConnector();
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();
    await connector.ping();
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should connect using custom settings', async () => {
    const connector = new Sqlite3CrudConnector({poolMin: 3, poolMax: 3});
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();
    await connector.ping();
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should fail to connect to wrong db file', async () => {
    const connector = new Sqlite3CrudConnector({file: '::/.', mode: SQL_OPEN_READWRITE, lazyConnect: true});
    try {
      await connector.connect();
      should.should.fail();
      return;
    } catch (err) {
    }
    should(connector.pool.isOpen()).be.false();
    try {
      await connector.ping();
      should.should.fail();
      return;
    } catch (err) {
    }
    try {
      await connector.disconnect();
      should.should.fail();
      return;
    } catch (err) {
    }
  });

});
