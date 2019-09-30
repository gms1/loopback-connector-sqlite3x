// tslint:disable no-require-imports no-implicit-dependencies no-var-requires
// tslint:disable await-promise no-non-null-assertion no-string-literal
// tslint:disable no-unused-variable

import * as should from 'should';

import { getDefaultDataSource, getDefaultConnector } from '../core/test-init';

import { table, field, id, schema, fk } from 'sqlite3orm';
import { DataSource } from 'loopback-datasource-juggler';
import { Sqlite3JugglerConnector } from '../../../sqlite3-juggler-connector';
import { DiscoveredTable, DiscoveredSchema } from '../../../discovery-service';

describe('sqlite3-juggler-connector: discover model', () => {
  let ds: DataSource;
  let connector: Sqlite3JugglerConnector;
  let db: any;

  const TEST_PARENT_TABLE_NAME = 'DISCOVER_PARENT_MODEL';
  const TEST_CHILD_TABLE_NAME = 'DISCOVER_CHILD_MODEL';

  @table({ name: TEST_PARENT_TABLE_NAME, autoIncrement: true })
  class TestParentModel {
    @id({ name: 'ID', dbtype: 'INTEGER NOT NULL' })
    id: number;

    @field({ name: 'INFO_COL', dbtype: 'TEXT' })
    infoCol?: string;

    constructor() {
      this.id = 0;
    }
  }

  @table({ name: TEST_CHILD_TABLE_NAME, autoIncrement: true })
  class TestChildModel {
    @id({ name: 'ID', dbtype: 'INTEGER NOT NULL' })
    id: number;

    @field({ name: 'REAL_COL', dbtype: 'REAL' })
    realCol?: number;

    @field({ name: 'TEXT_COL', dbtype: 'TEXT' })
    textCol?: string;

    @field({ name: 'PARENT_ID', dbtype: 'INTEGER' })
    @fk('discoverFKConstraint', TEST_PARENT_TABLE_NAME, 'ID')
    parentId?: number;

    constructor() {
      this.id = 0;
    }
  }

  before(async () => {
    ds = getDefaultDataSource();
    connector = getDefaultConnector();
    db = ds as any;
    if (!ds.connected) {
      await ds.connect();
    }
    const connection = await connector.pool.get();
    await schema().dropTable(connection, TEST_PARENT_TABLE_NAME);
    await schema().dropTable(connection, TEST_CHILD_TABLE_NAME);
    await schema().createTable(connection, TEST_PARENT_TABLE_NAME);
    await schema().createTable(connection, TEST_CHILD_TABLE_NAME);
    await connection.close();
  });

  after(async () => {
    for (const modelName of connector.modelNames()) {
      await connector.dropTable(modelName);
    }
    connector.destroyAllMetaModels();
  });

  it('should discover basic model', (done) => {
    ds.discoverSchemas(TEST_CHILD_TABLE_NAME, {}, (err, schemas: any) => {
      if (err) {
        done(err);
      }
      should.exist(schemas);
      schemas = JSON.parse(JSON.stringify(schemas));
      schemas.should.have.property(`main.${TEST_CHILD_TABLE_NAME}`);
      const modelDef = schemas[`main.${TEST_CHILD_TABLE_NAME}`];
      modelDef.name.should.be.eql('DiscoverChildModel');
      Object.keys(modelDef.properties)
        .sort()
        .should.be.eql(['id', 'parentId', 'realCol', 'textCol']);

      modelDef.properties.should.have.property('id');
      modelDef.properties['id'].should.be.eql({
        type: 'Number',
        required: true,
        id: 1,
        generated: 1,
        sqlite3x: {
          columnName: 'ID',
          dbtype: 'INTEGER NOT NULL',
          dataType: 'INTEGER',
          nullable: 'N',
        },
      });

      modelDef.properties.should.have.property('realCol');
      modelDef.properties['realCol'].should.be.eql({
        type: 'Number',
        required: false,
        sqlite3x: { columnName: 'REAL_COL', dbtype: 'REAL', dataType: 'REAL', nullable: 'Y' },
      });

      modelDef.properties.should.have.property('textCol');
      modelDef.properties['textCol'].should.be.eql({
        type: 'String',
        required: false,
        sqlite3x: { columnName: 'TEXT_COL', dbtype: 'TEXT', dataType: 'TEXT', nullable: 'Y' },
      });

      modelDef.properties.should.have.property('parentId');
      modelDef.properties['parentId'].should.be.eql({
        type: 'Number',
        required: false,
        sqlite3x: {
          columnName: 'PARENT_ID',
          dbtype: 'INTEGER',
          dataType: 'INTEGER',
          nullable: 'Y',
        },
      });
      done();
    });
  });

  it('should discover foreign key relations', (done) => {
    ds.discoverSchemas(TEST_CHILD_TABLE_NAME, { associations: true }, (err, schemas: any) => {
      if (err) {
        done(err);
      }
      should.exist(schemas);
      schemas = JSON.parse(JSON.stringify(schemas));
      schemas.should.have.property(`main.${TEST_CHILD_TABLE_NAME}`);
      const childModelDef = schemas[`main.${TEST_CHILD_TABLE_NAME}`];
      childModelDef.name.should.be.eql('DiscoverChildModel');
      Object.keys(childModelDef.properties)
        .sort()
        .should.be.eql(['id', 'parentId', 'realCol', 'textCol']);

      schemas.should.have.property(`main.${TEST_PARENT_TABLE_NAME}`);
      const parentModelDef = schemas[`main.${TEST_PARENT_TABLE_NAME}`];
      parentModelDef.name.should.be.eql('DiscoverParentModel');
      Object.keys(parentModelDef.properties)
        .sort()
        .should.be.eql(['id', 'infoCol']);

      parentModelDef.properties.should.have.property('id');
      parentModelDef.properties['id'].should.be.eql({
        type: 'Number',
        required: true,
        id: 1,
        generated: 1,
        sqlite3x: {
          columnName: 'ID',
          dbtype: 'INTEGER NOT NULL',
          dataType: 'INTEGER',
          nullable: 'N',
        },
      });

      parentModelDef.properties.should.have.property('infoCol');
      parentModelDef.properties['infoCol'].should.be.eql({
        type: 'String',
        required: false,
        sqlite3x: { columnName: 'INFO_COL', dbtype: 'TEXT', dataType: 'TEXT', nullable: 'Y' },
      });
      done();
    });
  });

  it('should discover model definitions', (done) => {
    (ds.connector as Sqlite3JugglerConnector).discoverModelDefinitions(
      {},
      (err, data: DiscoveredTable[] | undefined) => {
        if (err) {
          done(err);
          return;
        }
        if (!data) {
          done(`nothing found`);
          return;
        }
        // console.log(`discovered model defs: `, JSON.stringify(data));
        data.filter((item: any) => item.name.indexOf('DISCOVER') === 0).length.should.be.eql(2);
        done();
      },
    );
  });

  it('should discover database schemas', (done) => {
    (ds.connector as Sqlite3JugglerConnector).discoverDatabaseSchemas(
      {},
      (err, data: DiscoveredSchema[] | undefined) => {
        if (err) {
          done(err);
          return;
        }
        if (!data) {
          done(`nothing found`);
          return;
        }
        // console.log(`discovered schema defs: `, JSON.stringify(data));
        data.length.should.be.greaterThan(0);
        done();
      },
    );
  });
});
