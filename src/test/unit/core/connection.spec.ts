// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable await-promise
import * as should from 'should';

import {SQL_OPEN_READWRITE} from '../../..';
import {Sqlite3Connector} from '../../../sqlite3-connector';


describe('crud-connector connections', () => {

  it('should connect using default settings', async () => {
    const connector = new Sqlite3Connector();
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();
    await connector.ping();
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should connect using custom settings', async () => {
    const connector = new Sqlite3Connector({poolMin: 3, poolMax: 3});
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();
    await connector.ping();
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should fail to connect to wrong db file', async () => {
    const connector = new Sqlite3Connector({file: '::/.', mode: SQL_OPEN_READWRITE, lazyConnect: true});
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

  it('should fail to insert into not existing table', async () => {
    const connector = new Sqlite3Connector();
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    const connection = await connector.getConnection();
    try {
      await connector.runSQL(connection, 'insert into DOESNOTEXIST (id, col) values (1, 42)');
      should.should.fail();
    } catch (err) {
    }
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

});
