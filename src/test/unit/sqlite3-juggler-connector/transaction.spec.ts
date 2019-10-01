// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable await-promise
import { SqlDatabase } from 'sqlite3orm';

import { Transaction } from '../../../lc-import';
import { getDefaultDataSource, getDefaultConnector } from '../core/test-init.spec';
import { Sqlite3JugglerConnector } from '../../..';
import { DataSource } from 'loopback-datasource-juggler';

describe('sqlite3-juggler-connector: transaction', () => {
  let ds: DataSource;
  let connector: Sqlite3JugglerConnector;
  let connection: SqlDatabase;

  before(async () => {
    ds = getDefaultDataSource();
    connector = getDefaultConnector();
    if (!ds.connected) {
      await ds.connect();
    }
    connection = await connector.pool.get();
    await connection.exec('DROP TABLE IF EXISTS TEST');
    await connection.exec('CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY, col VARCHAR(50))');
  });

  afterEach(async () => {
    try {
      await connection.run('DELETE FROM TEST');
    } catch (err) {
      err.should.fail();
    }
  });

  after(async () => {
    for (const modelName of connector.modelNames()) {
      await connector.dropTable(modelName);
    }
    connector.destroyAllMetaModels();
    await connection.close();
  });

  function getTransaction(): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      Transaction.begin(connector, (err: Error, tx: Transaction) => {
        if (err) {
          reject(err);
        } else {
          resolve(tx);
        }
      });
    });
  }

  function commitTransaction(tx: Transaction): Promise<void> {
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

  function rollbackTransaction(tx: Transaction): Promise<void> {
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

  it('commit', async () => {
    try {
      const tx = await getTransaction();
      let rows: any[];

      await (tx.connection as SqlDatabase).run(
        "INSERT INTO TEST (id, col) values (1, 'commit test')",
      );

      // tx session should see newly inserted row
      rows = await (tx.connection as SqlDatabase).all('SELECT id, col FROM TEST ORDER BY id');
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

    await (tx.connection as SqlDatabase).run(
      "INSERT INTO TEST (id, col) values (2, 'rollback test')",
    );

    // tx session should see newly inserted row
    rows = await (tx.connection as SqlDatabase).all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(1);

    // other sessions should not see newly inserted row
    rows = await connection.all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(0);

    await rollbackTransaction(tx);

    // other sessions should not see rollbacked row
    rows = await connection.all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(0);
  });

  it('basic transaction', async () => {
    const conn = await connector.beginTransaction();
    let rows: any[];

    await conn.run("INSERT INTO TEST (id, col) values (1, 'commit test')");
    rows = await conn.all('SELECT id, col FROM TEST ORDER BY id');
    rows.length.should.be.equal(1);
    await connector.rollback(conn);
  });
});
