// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable await-promise
import * as should from 'should';


// todo: test index definitions using standard, shortened and MySql form
// todo: test foreignKeys
import {getDefaultDataSource, getDefaultConnector} from '../core/test-init';
import {DataSource} from 'loopback-datasource-juggler';
import {Sqlite3JugglerConnector} from '../../../sqlite3-juggler-connector';


describe('sqlite3-juggler-connector: meta model', () => {
  let ds: DataSource;
  let connector: Sqlite3JugglerConnector;
  let db: any;

  before(async () => {
    ds = getDefaultDataSource();
    connector = getDefaultConnector();
    db = ds as any;
    if (!ds.connected) {
      await ds.connect();
    }
    const connection = await connector.pool.get();
    await connection.exec('DROP TABLE IF EXISTS TEST_TABLE');
    await connection.exec('DROP TABLE IF EXISTS TEST_PARENT_TABLE');
    await connection.close();
  });

  afterEach(async () => {
    for (const modelName of connector.modelNames()) {
      await connector.dropTable(modelName);
    }
    connector.destroyAllMetaModels();
  });

  // ==============================================================================
  it('default type mapping', async () => {
    const addressSchema = {
      name: 'Address',
      properties: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      }
    };

    const testSchema = {
      name: 'TestModel',
      options: {idInjection: false, sqlite3x: {tableName: 'TEST_TABLE'}},
      properties: {
        id: {type: 'Number', id: 1},
        num: {type: 'Number'},
        bool: {type: 'Boolean'},
        date: {type: 'Date'},
        str: {type: 'String'},
        obj: {type: 'Address'},
        array: [{type: 'String'}]
      }
    };

    const models: any = db.modelBuilder.buildModels([addressSchema, testSchema]);
    const testModel: any = models[testSchema.name];
    testModel.attachTo(db);
    try {
      await ds.automigrate(testSchema.name);
    } catch (err) {
      should.not.exists(err);
    }
    const ts = new Date();
    ts.setUTCMilliseconds(0);


    const model1 = new testModel();
    model1.num = 42;
    model1.bool = true;
    model1.date = ts;
    model1.str = 'foo';
    model1.obj = {
      street: 'my street',
      city: 'my city',
      state: 'my state',
      zipCode: 'my zipcode',
    };
    model1.array = ['a', 'b', 'c'];

    const model2 = await model1.save();

    const model3 = await testModel.findOne({where: {id: model2.id}});

    model3.should.have.property('id', model2.id);
    model3.should.have.property('num', model2.num);
    model3.should.have.property('bool', model2.bool);
    model3.should.have.property('date', model2.date);
    model3.should.have.property('str', model2.str);
    should.exist(model3.obj);
    model3.obj.should.have.property('street', model2.obj.street);
    model3.obj.should.have.property('city', model2.obj.city);
    model3.obj.should.have.property('state', model2.obj.state);
    model3.obj.should.have.property('zipCode', model2.obj.zipCode);

  });


  // ==============================================================================
  it('standard index definition', async () => {
    const testSchema = {
      name: 'TestModel',
      options: {
        idInjection: false,
        sqlite3x: {tableName: 'TEST_TABLE'},
        indexes: {testIdx: {options: {unique: 1}, keys: {col1: 1, col2: -1}}}
      },
      properties: {
        id: {
          type: 'Number',
          id: 1,
          sqlite3x: {
            columnName: 'ID',
            dbtype: 'INTEGER NOT NULL',
          }
        },
        col1: {type: 'String'},
        col2: {type: 'String'}
      }
    };

    const models: any = db.modelBuilder.buildModels(testSchema);
    const testModel: any = models[testSchema.name];
    testModel.attachTo(db);
    const metaModel = connector.getMetaModel(testSchema.name);
    const table = metaModel.table;
    const idxDef = table.getIDXDefinition('testIdx');
    should.exists(idxDef);
    idxDef.should.have.property('name', 'testIdx');
    idxDef.should.have.property('isUnique', true);
    idxDef.should.have.property('id', 'testIdx(col1,col2 DESC):UNIQUE');
    try {
      await ds.automigrate(testSchema.name);
    } catch (err) {
      should.not.exists(err);
    }

  });

  // ==============================================================================
  it('shortened index definition', async () => {
    const testSchema = {
      name: 'TestModel',
      options: {
        idInjection: false,
        sqlite3x: {tableName: 'TEST_TABLE'},
        indexes: {testIdx: {col1: 1, col2: -1}},
      },
      properties: {
        id: {
          type: 'Number',
          id: 1,
          sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'},
        },
        col1: {type: 'String'},
        col2: {type: 'String'}
      }
    };

    const models: any = db.modelBuilder.buildModels(testSchema);
    const testModel: any = models[testSchema.name];
    testModel.attachTo(db);
    const metaModel = connector.getMetaModel(testSchema.name);
    const table = metaModel.table;
    const idxDef = table.getIDXDefinition('testIdx');
    should.exists(idxDef);
    idxDef.should.have.property('name', 'testIdx');
    should(!!idxDef.isUnique).be.false();
    idxDef.should.have.property('id', 'testIdx(col1,col2 DESC)');
    try {
      await ds.automigrate(testSchema.name);
    } catch (err) {
      should.not.exists(err);
    }

  });

  // ==============================================================================
  it('MySql index definition', async () => {
    const testSchema = {
      name: 'TestModel',
      options: {
        idInjection: false,
        sqlite3x: {tableName: 'TEST_TABLE'},
        indexes: {testIdx: {columns: ' col1 , col2 ', kind: 'unique'}}
      },
      properties: {
        id: {
          type: 'Number',
          id: 1,
          sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'},
        },
        col1: {type: 'String'},
        col2: {type: 'String'}
      }
    };

    const models: any = db.modelBuilder.buildModels(testSchema);
    const testModel: any = models[testSchema.name];
    testModel.attachTo(db);
    const metaModel = connector.getMetaModel(testSchema.name);
    const table = metaModel.table;
    const idxDef = table.getIDXDefinition('testIdx');
    should.exists(idxDef);
    idxDef.should.have.property('name', 'testIdx');
    should(!!idxDef.isUnique).be.true();
    idxDef.should.have.property('id', 'testIdx(col1,col2):UNIQUE');
    try {
      await ds.automigrate(testSchema.name);
    } catch (err) {
      should.not.exists(err);
    }

  });


  // ==============================================================================
  it('foreign key constraint definition', async () => {
    const parentSchema = {
      name: 'TestParentModel',
      options: {sqlite3x: {tableName: 'TEST_PARENT_TABLE'}},
      properties: {
        id1: {
          type: 'Number',
          id: 1,
          sqlite3x: {columnName: 'IDP1', dbtype: 'INTEGER NOT NULL'},
        },
        id2: {
          type: 'Number',
          id: 1,
          sqlite3x: {columnName: 'IDP2', dbtype: 'INTEGER NOT NULL'},
        }
      }

    };
    const testSchema = {
      name: 'TestModel',
      options: {
        idInjection: false,
        sqlite3x: {tableName: 'TEST_TABLE'},
        foreignKeys:
            {fk: {properties: 'parentId1, parentId2', refColumns: ' IDP1 , IDP2 ', refTable: 'TEST_PARENT_TABLE'}}
      },
      properties: {
        id: {
          type: 'Number',
          id: 1,
          sqlite3x: {columnName: 'IDC', dbtype: 'INTEGER NOT NULL'},
        },
        parentId1: {
          type: 'Number',
          sqlite3x: {columnName: 'C2P1', dbtype: 'INTEGER'},
        },
        parentId2: {
          type: 'Number',
          sqlite3x: {columnName: 'C2P2', dbtype: 'INTEGER'},
        }
      }
    };

    const models: any = db.modelBuilder.buildModels([parentSchema, testSchema]);
    const parentTestModel: any = models[parentSchema.name];
    parentTestModel.attachTo(db);
    const testModel: any = models[testSchema.name];
    testModel.attachTo(db);
    /*
    const idxDef = table.getIDXDefinition('testIdx');
    should.exists(idxDef);
    idxDef.should.have.property('name', 'testIdx');
    should(!!idxDef.isUnique).be.true();
    idxDef.should.have.property('id', 'testIdx(col1,col2):UNIQUE');
    */
    try {
      await ds.automigrate(parentSchema.name);
      await ds.automigrate(testSchema.name);
    } catch (err) {
      should.not.exists(err);
    }

  });


});
