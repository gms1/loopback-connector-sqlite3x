// tslint:disable no-require-imports
import loopbackConnector = require('loopback-connector');

// tslint:disable no-implicit-dependencies
import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';

import * as ConnectorModule from '..';
import {Sqlite3Connector} from '../sqlite3-connector';
import {SqlDatabase} from '../../../node-sqlite3-orm/dist';
import {AsyncResource} from 'async_hooks';


describe('transaction', () => {
  let ds: DataSource;
  let connector: Sqlite3Connector;
  let connection: SqlDatabase;

  function getTransaction(): Promise<loopbackConnector.Transaction> {
    return new Promise((resolve, reject) => {
      loopbackConnector.Transaction.begin(
          connector, (err: Error, tx: loopbackConnector.Transaction) => {
            if (err) {
              reject(err);
            } else {
              resolve(tx);
            }
          });
    });
  }

  function commitTransaction(tx: loopbackConnector.Transaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.commit((err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  function rollbackTransaction(tx: loopbackConnector.Transaction):
      Promise<void> {
    return new Promise((resolve, reject) => {
      tx.rollback((err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }



  before(async () => {
    try {
      ds = new DataSource(ConnectorModule as any, {debug: false});
      connector = ds.connector as any as Sqlite3Connector;
      await ds.connect();
      connection = await connector.getConnection();
      await connection.exec(
          'CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY, col VARCHAR(50))');
    } catch (err) {
      err.should.fail();
    }
  });

  after(async () => {
    try {
      await connection.exec('DROP TABLE TEST');
      await connection.close();
      connection = undefined as any as SqlDatabase;
      connector = undefined as any as Sqlite3Connector;
      await ds.disconnect();
      ds = undefined as any as DataSource;
    } catch (err) {
      err.should.fail();
    }
  });

  afterEach(async () => {
    try {
      await connection.run('DELETE FROM TEST');
    } catch (err) {
      err.should.fail();
    }
  });

  it('commit', async () => {
    try {
      const tx = await getTransaction();
      let rows: any[];

      await(tx.connection as SqlDatabase)
          .run('INSERT INTO TEST (id, col) values (1, \'commit test\')');

      // tx session should see newly inserted row
      rows = await(tx.connection as SqlDatabase)
                 .all('SELECT id, col FROM TEST ORDER BY id');
      rows.length.should.be.equal(1);

      // other sessions should not see newly inserted row
      rows = await connection.all('SELECT id, col FROM TEST ORDER BY id');
      rows.length.should.be.equal(0);

      await commitTransaction(tx);

      // other sessions should see newly inserted row
      rows = await connection.all('SELECT id, col FROM TEST ORDER BY id');
      rows.length.should.be.equal(1);

    } catch (err) {
      err.should.fail();
    }
  });

  it('rollback', async () => {
    const tx = await getTransaction();
    let rows: any[];

    await(tx.connection as SqlDatabase)
        .run('INSERT INTO TEST (id, col) values (2, \'rollback test\')');

    // tx session should see newly inserted row
    rows = await(tx.connection as SqlDatabase)
               .all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(1);

    // other sessions should not see newly inserted row
    rows = await connection.all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(0);

    await rollbackTransaction(tx);

    // other sessions should not see rollbacked row
    rows = await connection.all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(0);
  });

});
