// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable await-promise
import * as should from 'should';

import { SQL_OPEN_READWRITE, SQL_MEMORY_DB_SHARED } from '../../..';
import { Sqlite3Connector } from '../../../sqlite3-connector';

describe('core: connections', () => {
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
    const connector = new Sqlite3Connector({ poolMin: 3, poolMax: 3 });
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();
    await connector.ping();
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should fail to connect to wrong db file', async () => {
    const connector = new Sqlite3Connector({
      file: '::/.',
      mode: SQL_OPEN_READWRITE,
      lazyConnect: true,
    });
    try {
      await connector.connect();
      should.should.fail();
      return;
    } catch (err) {}
    should(connector.pool.isOpen()).be.false();
    try {
      await connector.ping();
      should.should.fail();
      return;
    } catch (err) {}
    try {
      await connector.disconnect();
      should.should.fail();
      return;
    } catch (err) {}
  });

  it('expect pool to share a memory database', async () => {
    const connector = new Sqlite3Connector({ file: SQL_MEMORY_DB_SHARED, poolMin: 2 });
    await connector.connect();
    // getting first connection
    const sqldb1 = await connector.pool.get();

    // getting second connection
    const sqldb2 = await connector.pool.get();

    // first connection should work
    const ver0 = await sqldb1.getUserVersion();

    // tslint:disable-next-line restrict-plus-operands  ??????????????
    const ver1 = ver0 + 42;
    await sqldb1.setUserVersion(ver1);

    // second connection should work
    const ver2 = await sqldb2.getUserVersion();
    ver2.should.be.equal(ver1, 'got wrong user version from connection 2');

    // closing one connection
    await sqldb2.close();

    // getting third connect should succeed
    const sqldb3 = await connector.pool.get();

    // third connection should work
    const ver3 = await sqldb3.getUserVersion();
    ver3.should.be.equal(ver1, 'got wrong user version from connection 3');

    await sqldb1.close();
    await sqldb2.close();
    await sqldb3.close();
    await connector.disconnect();
  });

  it('should fail to insert into not existing table and forcibly close one open connection', async () => {
    const connector = new Sqlite3Connector({ poolMin: 2, poolMax: 10 });
    await connector.connect();
    should(connector.pool.isOpen()).be.true();
    const connection = await connector.getConnection();
    try {
      await connector.runSQL(connection, 'insert into DOESNOTEXIST (id, col) values (1, 42)');
      should.should.fail();
    } catch (err) {}
    should(connector.pool.openSize).be.eql(1);
    await connector.disconnect();
    should(connector.pool.isOpen()).be.false();
    should(connector.pool.openSize).be.eql(0);
    should(connection.isOpen()).be.false();
    await connector.disconnect();
  });

  it('should succeed to insert into existing table', async () => {
    const connector = new Sqlite3Connector({ file: SQL_MEMORY_DB_SHARED, poolMin: 2 });
    await connector.connect();
    should(connector.pool.isOpen()).be.true();

    const connection1 = await connector.getConnection();
    const connection2 = await connector.getConnection();
    await connector.runSQL(
      connection1,
      'create table DOESEXIST (id INTEGER NOT NULL PRIMARY KEY, col INTEGER)',
    );
    await connector.runSQL(connection2, 'insert into DOESEXIST (id, col) values (1, 42)');
    const results = await connector.runSQL(connection1, 'select id, col from DOESEXIST');
    await connector.runSQL(connection2, 'DROP TABLE DOESEXIST');
    await connection1.close();
    await connection2.close();
    await connector.disconnect();

    results.should.be.deepEqual([{ id: 1, col: 42 }]);
  });
});
