// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable variable-name no-null-keyword
// tslint:disable await-promise
import * as should from 'should';
import * as sinon from 'sinon';

import { getDefaultDataSource, getDefaultConnector } from '../core/test-init.spec';
import { Sqlite3JugglerConnector } from '../../..';
import { Callback, DataSource, PromiseOrVoid } from 'loopback-datasource-juggler';

describe('sqlite3-juggler-connector: basic', () => {
  let ds: DataSource;
  let connector: Sqlite3JugglerConnector;
  let db: any;

  const postBasicSchema = {
    name: 'PostBasic',
    options: {
      idInjection: false,
      sqlite3x: { tableName: 'POST_BASIC' },
      persistUndefinedAsNull: true,
    },
    properties: {
      id: { type: 'Number', id: 1, sqlite3x: { columnName: 'ID', dbtype: 'INTEGER NOT NULL' } },
      title: { type: String, length: 255, index: true },
      content: { type: String },
      approved: Boolean,
      proofread: { type: 'Boolean', sqlite3x: { dbtype: 'INTEGER' } },
    },
  };

  let Post: any;

  let spyExecuteSql: sinon.SinonSpy<[string, (Callback | undefined)?], PromiseOrVoid>;

  let escapedID: string;

  before(async () => {
    ds = getDefaultDataSource();
    connector = getDefaultConnector();
    db = ds as any;
    if (!ds.connected) {
      await ds.connect();
    }
    const connection = await connector.pool.get();
    await connection.exec('DROP TABLE IF EXISTS POST_BASIC');
    await connection.close();
    escapedID = connector.escapeName('ID') as string;
    const models: any = db.modelBuilder.buildModels(postBasicSchema);
    Post = models[postBasicSchema.name];
    Post.attachTo(db);
  });

  before((done) => {
    ds.automigrate(postBasicSchema.name, (err) => {
      should.not.exists(err);
      done();
    });
  });

  after(async () => {
    for (const modelName of connector.modelNames()) {
      await connector.dropTable(modelName);
    }
    connector.destroyAllMetaModels();
  });

  beforeEach(() => {
    spyExecuteSql = sinon.spy(Sqlite3JugglerConnector.prototype, 'executeSQL');
  });

  afterEach(() => {
    (Sqlite3JugglerConnector.prototype.executeSQL as any).restore();
    (spyExecuteSql as any) = undefined;
  });

  it('should support boolean types with true value', (done) => {
    Post.create(
      { title: 'T1', content: 'C1', approved: true, proofread: true },
      (err: any, p: any) => {
        should.not.exists(err);
        Post.findById(p.id, (err2: any, p2: any) => {
          should.not.exists(err2);
          p2.should.have.property('approved', true);
          p2.should.have.property('proofread', true);
          done();
        });
      },
    );
  });

  it('should support boolean types with false value', (done) => {
    Post.create(
      { title: 'T1', content: 'C1', approved: false, proofread: false },
      (err: any, p: any) => {
        should.not.exists(err);
        Post.findById(p.id, (err2: any, p2: any) => {
          should.not.exists(err2);
          p2.should.have.property('approved', false);
          p2.should.have.property('proofread', false);
          done();
        });
      },
    );
  });

  it('should support boolean types with null value', (done) => {
    // NOTE: persistUndefinedAsNull has been set in the model definition
    // see: postBasicSchema
    Post.create({ title: 'T1', content: 'C1' }, (err: any, p: any) => {
      should.not.exists(err);
      Post.findById(p.id, (err2: any, p2: any) => {
        should.not.exists(err2);
        p2.should.have.property('approved', null);
        p2.should.have.property('proofread', null);
        done();
      });
    });
  });

  it('should return the model instance for upsert', (done) => {
    const id = 2;
    Post.upsert({ id, title: 'T2_new', content: 'C2_new', approved: true }, (err: any, p: any) => {
      should.not.exists(err);
      p.should.have.property('id', id);
      p.should.have.property('title', 'T2_new');
      p.should.have.property('content', 'C2_new');
      p.should.have.property('approved', true);
      done();
    });
  });

  it('should return the model instance for upsert when id is not present', (done) => {
    Post.upsert({ title: 'T2_new', content: 'C2_new', approved: true }, (err: any, p: any) => {
      should.not.exists(err);
      p.should.have.property('id').which.is.a.Number();
      p.should.have.property('title', 'T2_new');
      p.should.have.property('content', 'C2_new');
      p.should.have.property('approved', true);
      done();
    });
  });

  it('should escape number values to defect SQL injection in findById', (done) => {
    Post.findById('(SELECT 1+1)', (err: any) => {
      // SQLite3 doesnt error on invalid type
      should.not.exists(err);
      spyExecuteSql.callCount.should.be.equal(1);
      spyExecuteSql.args[0][0].should.not.containEql('1+1');
      spyExecuteSql.args[0][0].should.containEql(` ${escapedID}=:1 `);
      done();
    });
  });

  it('should escape number values to defect SQL injection in find', (done) => {
    Post.find({ where: { id: '(SELECT 1+1)' } }, (err: any) => {
      // SQLite3 doesnt error on invalid type
      should.not.exists(err);
      spyExecuteSql.callCount.should.be.equal(1);
      spyExecuteSql.args[0][0].should.not.containEql('1+1');
      spyExecuteSql.args[0][0].should.containEql(` ${escapedID}=:1 `);
      done();
    });
  });

  it('should escape number values to defect SQL injection in find with gt', (done) => {
    Post.find({ where: { id: { gt: '(SELECT 1+1)' } } }, (err: any) => {
      // SQLite3 doesnt error on invalid type
      should.not.exists(err);
      spyExecuteSql.callCount.should.be.equal(1);
      spyExecuteSql.args[0][0].should.not.containEql('1+1');
      spyExecuteSql.args[0][0].should.containEql(` ${escapedID}>:1 `);
      done();
    });
  });

  it('should escape number values to defect SQL injection in find', (done) => {
    Post.find({ limit: '(SELECT 1+1)' }, (err: any) => {
      should.exists(err);
      spyExecuteSql.callCount.should.be.equal(0);
      done();
    });
  });

  it('should escape number values to defect SQL injection in find with inq', (done) => {
    Post.find({ where: { id: { inq: ['(SELECT 1+1)'] } } }, (err: any) => {
      // SQLite3 doesnt error on invalid type
      should.not.exists(err);
      spyExecuteSql.callCount.should.be.equal(1);
      spyExecuteSql.args[0][0].should.not.containEql('1+1');
      spyExecuteSql.args[0][0].should.containEql(` ${escapedID} IN (:1) `);
      done();
    });
  });
});
