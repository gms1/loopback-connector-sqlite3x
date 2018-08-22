// tslint:disable no-require-imports no-implicit-dependencies no-var-requires
// tslint:disable await-promise

import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';

import {Sqlite3JugglerConnector} from '../../..';

import {getDataSource, initDataSource} from '../core/test-init';


describe('loopback-datasource-juggler autoupdate', () => {
  let ds: DataSource;
  let db: any;
  let connector: Sqlite3JugglerConnector;

  const autoupdateSchemaV1 = {
    name: 'AutoUpdate',
    options: {idInjection: false, sqlite3x: {tableName: 'AUTOUPDATE'}},
    properties: {
      id: {type: 'Number', id: 1, sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'}},
      col1: {type: 'String', sqlite3x: {columnName: 'COL1', dbtype: 'TEXT'}}
    }
  };

  const autoupdateSchemaV2 = {
    name: 'AutoUpdate',
    options: {
      idInjection: false,
      sqlite3x: {tableName: 'AUTOUPDATE'},
      indexes: {IDXAUTOUPDATE: {keys: {col1: -1, col2: 1}, options: {unique: false}}}
    },
    properties: {
      id: {type: 'Number', id: 1, sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'}},
      col1: {type: 'String', sqlite3x: {columnName: 'COL1', dbtype: 'TEXT'}},
      col2: {type: 'String'}
    }
  };


  before(() => {
    initDataSource();
    ds = getDataSource();
    db = ds as any;
    should(ds.connector).be.instanceof (Sqlite3JugglerConnector);
    connector = ds.connector as Sqlite3JugglerConnector;
  });

  it('autoupdate should work', async () => {
    let models: any = db.modelBuilder.buildModels(autoupdateSchemaV1);
    models[autoupdateSchemaV1.name].attachTo(db);

    const isActualV1R1 = await connector.isActual(autoupdateSchemaV1.name);
    (isActualV1R1 as boolean).should.be.false();
    await connector.autoupdate(autoupdateSchemaV1.name);
    const isActualV1R2 = await connector.isActual(autoupdateSchemaV1.name);
    (isActualV1R2 as boolean).should.be.true();

    models = db.modelBuilder.buildModels(autoupdateSchemaV2);
    models[autoupdateSchemaV1.name].attachTo(db);

    const isActualV2R1 = await connector.isActual(autoupdateSchemaV2.name);
    (isActualV2R1 as boolean).should.be.false();
    await connector.autoupdate(autoupdateSchemaV2.name);
    const isActualV2R2 = await connector.isActual(autoupdateSchemaV2.name);
    (isActualV2R2 as boolean).should.be.true();


    const metaModel = connector.getMetaModel(autoupdateSchemaV2.name);
    const table = metaModel.table;
    const idxDef = table.getIDXDefinition('IDXAUTOUPDATE');
    should.exists(idxDef);
    idxDef.should.have.property('name', 'IDXAUTOUPDATE');
    idxDef.should.have.property('isUnique', false);
    idxDef.should.have.property('id', 'IDXAUTOUPDATE(COL1 DESC,col2)');

  });


  after(async () => {
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
