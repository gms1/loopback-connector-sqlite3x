// tslint:disable no-require-imports no-implicit-dependencies no-var-requires
// tslint:disable await-promise

import * as should from 'should';

import { getDefaultDataSource, getDefaultConnector } from '../core/test-init.spec';
import { UpgradeMode } from 'sqlite3orm';
import { DataSource } from 'loopback-datasource-juggler';
import { Sqlite3JugglerConnector } from '../../../sqlite3-juggler-connector';

describe('sqlite3-juggler-connector: autoupdate', () => {
  let ds: DataSource;
  let connector: Sqlite3JugglerConnector;
  let db: any;

  const autoupdateTableName = 'AUTOUPDATE';

  const autoupdateSchemaV1 = {
    name: 'AutoUpdate',
    options: { idInjection: false, sqlite3x: { tableName: autoupdateTableName } },
    properties: {
      id: {
        type: 'Number',
        id: 1,
        sqlite3x: { columnName: 'AUTOUPDATE_ID', dbtype: 'INTEGER NOT NULL' },
      },
      col1: { type: 'String', sqlite3x: { columnName: 'AUTOUPDATE_COL1', dbtype: 'TEXT' } },
    },
  };

  const autoupdateSchemaV2 = {
    name: 'AutoUpdate',
    options: {
      idInjection: false,
      sqlite3x: { tableName: autoupdateTableName },
      indexes: { IDXAUTOUPDATE: { keys: { col1: -1, col2: 1 }, options: { unique: false } } },
    },
    properties: {
      id: {
        type: 'Number',
        id: 1,
        sqlite3x: { columnName: 'AUTOUPDATE_ID', dbtype: 'INTEGER NOT NULL' },
      },
      col1: { type: 'String', sqlite3x: { columnName: 'AUTOUPDATE_COL1', dbtype: 'TEXT' } },
      col2: { type: 'String' },
    },
  };

  before(async () => {
    ds = getDefaultDataSource();
    connector = getDefaultConnector();
    db = ds as any;
    if (!ds.connected) {
      await ds.connect();
    }
    const connection = await connector.pool.get();
    await connection.exec('DROP TABLE IF EXISTS AUTOUPDATE');
    await connection.close();
  });

  after(async () => {
    for (const modelName of connector.modelNames()) {
      await connector.dropTable(modelName);
    }
    connector.destroyAllMetaModels();
  });

  it('autoupdate should work', async () => {
    let models: any = db.modelBuilder.buildModels(autoupdateSchemaV1);
    models[autoupdateSchemaV1.name].attachTo(db);

    const isActualV1R1 = await connector.isActual(autoupdateSchemaV1.name);
    (isActualV1R1 as boolean).should.be.false();
    await connector.autoupdate(autoupdateSchemaV1.name);
    const info = await connector.getUpgradeInfo(autoupdateSchemaV1.name);
    info.upgradeMode.should.be.equal(UpgradeMode.ACTUAL, 'wrong upgrade mode');
    const isActualV1R2 = await connector.isActual([autoupdateSchemaV1.name]);
    (isActualV1R2 as boolean).should.be.true('should be actual');

    models = db.modelBuilder.buildModels(autoupdateSchemaV2);
    models[autoupdateSchemaV1.name].attachTo(db);

    const isActualV2R1 = await connector.isActual(autoupdateSchemaV2.name);
    (isActualV2R1 as boolean).should.be.false();
    await connector.autoupdate([autoupdateSchemaV2.name]);
    const isActualV2R2 = await connector.isActual(autoupdateSchemaV2.name);
    (isActualV2R2 as boolean).should.be.true();

    const metaModel = connector.getMetaModel(autoupdateSchemaV2.name);
    const table = metaModel.table;
    const idxDef = table.getIDXDefinition('IDXAUTOUPDATE');
    should.exists(idxDef);
    idxDef.should.have.property('name', 'IDXAUTOUPDATE');
    idxDef.should.have.property('isUnique', false);
    idxDef.should.have.property('id', 'IDXAUTOUPDATE(AUTOUPDATE_COL1 DESC,col2)');
    return;
  });
});
