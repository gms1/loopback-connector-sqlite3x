// tslint:disable no-require-imports no-implicit-dependencies
import * as should from 'should';

import {SQL_OPEN_READWRITE, Sqlite3CrudConnector} from '../../..';


describe('crud-connector connections', () => {

  it('should connect using default settings', async () => {
    const crudCon = new Sqlite3CrudConnector();
    await crudCon.connect();
    should(crudCon.pool.isOpen()).be.true();
    await crudCon.connect();
    await crudCon.ping();
    await crudCon.disconnect();
    should(crudCon.pool.isOpen()).be.false();
    await crudCon.disconnect();
  });

  it('should connect using custom settings', async () => {
    const crudCon = new Sqlite3CrudConnector({min: 3, max: 3});
    await crudCon.connect();
    should(crudCon.pool.isOpen()).be.true();
    await crudCon.connect();
    await crudCon.ping();
    await crudCon.disconnect();
    should(crudCon.pool.isOpen()).be.false();
    await crudCon.disconnect();
  });

  it('should fail to connect to wrong db file', async () => {
    const crudCon = new Sqlite3CrudConnector(
        {file: '::/.', mode: SQL_OPEN_READWRITE, lazyConnect: true});
    try {
      await crudCon.connect();
      should.should.fail();
      return;
    } catch (err) {
    }
    should(crudCon.pool.isOpen()).be.false();
    try {
      await crudCon.ping();
      should.should.fail();
      return;
    } catch (err) {
    }
    try {
      await crudCon.disconnect();
      should.should.fail();
      return;
    } catch (err) {
    }
  });

});
