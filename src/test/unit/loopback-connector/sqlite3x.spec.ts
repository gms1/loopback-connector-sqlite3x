// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable variable-name no-null-keyword
import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';
import * as sinon from 'sinon';

import {Sqlite3JugglerConnector} from '../../..';

import {getDataSource, initDataSource} from './test-init';

initDataSource();

describe('loopback-datasource-juggler sqlite3x', () => {
  let ds: DataSource;
  let db: any;
  let connector: Sqlite3JugglerConnector;

  const schemaName = 'PostBasic';
  const schemas = {
    name: schemaName,
    options: {
      idInjection: false,
      sqlite3x: {tableName: 'POST_BASIC', autoIncrement: true}
    },
    properties: {
      id: {
        type: 'Number',
        id: 1,
        sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'}
      },
      title: {type: String, length: 255, index: true},
      content: {type: String},
      approved: Boolean,
      proofread: {type: 'Boolean', sqlite3x: {dbtype: 'INTEGER'}}
    }
  };

  let Post: any;


  let spyExecuteSql: sinon.SinonSpy;

  let escapedID: string;

  before(() => {
    ds = getDataSource();
    db = ds as any;
    should(ds.connector).be.instanceof (Sqlite3JugglerConnector);
    connector = ds.connector as Sqlite3JugglerConnector;
    escapedID = connector.escapeName('ID') as string;
    const models: any = db.modelBuilder.buildModels(schemas);
    Post = models[schemaName];
    Post.attachTo(db);
  });

  before((done) => {
    ds.automigrate(schemaName, (err) => {
      should.not.exists(err);
      done();
    });
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
        {title: 'T1', content: 'C1', approved: true, proofread: true},
        (err: any, p: any) => {
          should.not.exists(err);
          Post.findById(p.id, (err2: any, p2: any) => {
            should.not.exists(err2);
            p2.should.have.property('approved', true);
            p2.should.have.property('proofread', true);
            done();
          });
        });
  });

  it('should support boolean types with false value', (done) => {
    Post.create(
        {title: 'T1', content: 'C1', approved: false, proofread: false},
        (err: any, p: any) => {
          should.not.exists(err);
          Post.findById(p.id, (err2: any, p2: any) => {
            should.not.exists(err2);
            p2.should.have.property('approved', false);
            p2.should.have.property('proofread', false);
            done();
          });
        });
  });

  it('should support boolean types with null value', (done) => {
    Post.create({title: 'T1', content: 'C1'}, (err: any, p: any) => {
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
    Post.upsert(
        {id, title: 'T2_new', content: 'C2_new', approved: true},
        (err: any, p: any) => {
          should.not.exists(err);
          p.should.have.property('id', id);
          p.should.have.property('title', 'T2_new');
          p.should.have.property('content', 'C2_new');
          p.should.have.property('approved', true);
          done();
        });
  });

  it('should return the model instance for upsert when id is not present',
     (done) => {
       Post.upsert(
           {title: 'T2_new', content: 'C2_new', approved: true},
           (err: any, p: any) => {
             should.not.exists(err);
             p.should.have.property('id').which.is.a.Number();
             p.should.have.property('title', 'T2_new');
             p.should.have.property('content', 'C2_new');
             p.should.have.property('approved', true);
             done();
           });
     });

  it('should escape number values to defect SQL injection in findById',
     (done) => {
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
    Post.find({where: {id: '(SELECT 1+1)'}}, (err: any) => {
      // SQLite3 doesnt error on invalid type
      should.not.exists(err);
      spyExecuteSql.callCount.should.be.equal(1);
      spyExecuteSql.args[0][0].should.not.containEql('1+1');
      spyExecuteSql.args[0][0].should.containEql(` ${escapedID}=:1 `);
      done();
    });
  });

  it('should escape number values to defect SQL injection in find with gt',
     (done) => {
       Post.find({where: {id: {gt: '(SELECT 1+1)'}}}, (err: any) => {
         // SQLite3 doesnt error on invalid type
         should.not.exists(err);
         spyExecuteSql.callCount.should.be.equal(1);
         spyExecuteSql.args[0][0].should.not.containEql('1+1');
         spyExecuteSql.args[0][0].should.containEql(` ${escapedID}>:1 `);
         done();
       });
     });

  it('should escape number values to defect SQL injection in find', (done) => {
    Post.find({limit: '(SELECT 1+1)'}, (err: any) => {
      should.exists(err);
      spyExecuteSql.callCount.should.be.equal(0);
      done();
    });
  });

  it('should escape number values to defect SQL injection in find with inq',
     (done) => {
       Post.find({where: {id: {inq: ['(SELECT 1+1)']}}}, (err: any) => {
         // SQLite3 doesnt error on invalid type
         should.not.exists(err);
         spyExecuteSql.callCount.should.be.equal(1);
         spyExecuteSql.args[0][0].should.not.containEql('1+1');
         spyExecuteSql.args[0][0].should.containEql(` ${escapedID} IN (:1) `);
         done();
       });
     });


});
