// tslint:disable no-require-imports no-implicit-dependencies
// tslint:disable variable-name no-null-keyword
import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';
import * as sinon from 'sinon';
import {Sqlite3JugglerConnector} from '../../..';

import {getDataSource, initDataSource} from '../core/test-init';

initDataSource();

describe('loopback-datasource-juggler filter undefined fields', () => {
  let ds: DataSource;
  let db: any;
  let connector: Sqlite3JugglerConnector;

  const postFilterUndefinedSchema = {
    name: 'PostFilterUndefined',
    options:
        {idInjection: false, sqlite3x: {tableName: 'POST_FILTER_UNDEFINED'}},
    properties: {
      id: {
        type: 'Number',
        id: 1,
        sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'}
      },
      defaultInt:
          {type: 'Number', sqlite3x: {dbtype: 'INTEGER NOT NULL DEFAULT 5'}},
      first: {type: 'String'},
      second: {type: 'Number', sqlite3x: {dbtype: 'REAL'}},
      third: {type: 'Number', sqlite3x: {dbtype: 'REAL'}}
    }
  };
  let Post: any;

  before(() => {
    ds = getDataSource();
    db = ds as any;
    should(ds.connector).be.instanceof (Sqlite3JugglerConnector);
    connector = ds.connector as Sqlite3JugglerConnector;
    const models: any = db.modelBuilder.buildModels(postFilterUndefinedSchema);
    Post = models[postFilterUndefinedSchema.name];
    Post.attachTo(db);
  });

  before((done) => {
    ds.automigrate(postFilterUndefinedSchema.name, (err) => {
      should.not.exists(err);
      done();
    });
  });


  after(async () => {
    try {
      await connector.dropTable(postFilterUndefinedSchema.name);
    } catch (err) {
      return Promise.reject(err);
    }
    connector.destroyMetaModel(postFilterUndefinedSchema.name);
    return;
  });

  it('should insert only default value', (done) => {
    const dflPost = new Post();
    dflPost.save((err: any, p: any) => {
      should.not.exist(err);
      Post.findOne({where: {id: p.id}}, (err2: any, p2: any) => {
        should.not.exist(err2);
        p2.defaultInt.should.be.equal(5);
        should.not.exist(p2.first);
        should.not.exist(p2.second);
        should.not.exist(p2.third);
      });
      done();
    });
  });

  it('should insert default value and \'third\' field', (done) => {
    const dflPost = new Post();
    dflPost.third = 3;
    dflPost.save((err: any, p: any) => {
      should.not.exist(err);
      Post.findOne({where: {id: p.id}}, (err2: any, p2: any) => {
        should.not.exist(err2);
        p2.defaultInt.should.be.equal(5);
        should.not.exist(p2.first);
        should.not.exist(p2.second);
        should.exist(p2.third);
        p2.third.should.be.equal(3);
      });
      done();
    });
  });

  it('should update \'first\' and \'third\' fields of record with id==2 to ' +
         'predefined values',
     (done) => {
       Post.findOne({where: {id: 2}}, (err: any, p: any) => {
         should.not.exist(err);
         should.exist(p);
         p.id.should.be.equal(2);
         p.updateAttributes({first: 'one', third: 4}, () => {
           Post.findOne({where: {id: 2}}, (err2: any, p2: any) => {
             should.not.exist(err2);
             p2.defaultInt.should.be.equal(5);
             p2.first.should.be.equal('one');
             should.not.exist(p2.second);
             p2.third.should.be.equal(4);
             done();
           });
         });
       });
     });

  it('should update \'third\' field of record with id==2 to null value',
     (done) => {
       Post.findOne({where: {id: 2}}, (err: any, p: any) => {
         should.not.exist(err);
         should.exist(p);
         p.id.should.be.equal(2);
         p.updateAttributes({first: 'null in third', third: null}, () => {
           Post.findOne({where: {id: 2}}, (err2: any, p2: any) => {
             should.not.exist(err2);
             p2.defaultInt.should.be.equal(5);
             p2.first.should.be.equal('null in third');
             should.not.exist(p2.second);
             should.not.exist(p2.third);
             done();
           });
         });
       });
     });

  it('should insert a value into \'defaultInt\' and \'second\'', (done) => {
    const dflPost = new Post();
    dflPost.second = 2;
    dflPost.defaultInt = 11;
    dflPost.save((err: any, p: any) => {
      should.not.exist(err);
      Post.findOne({where: {id: p.id}}, (err2: any, p2: any) => {
        should.not.exist(err2);
        p2.defaultInt.should.be.equal(11);
        p2.second.should.be.equal(2);
        should.not.exist(p2.first);
        should.not.exist(p2.third);
        done();
      });
    });
  });

  it('should create an object with a null value in \'first\'', (done) => {
    Post.create({first: null}, (err: any, p: any) => {
      should.not.exist(err);
      Post.findOne({where: {id: p.id}}, (err2: any, p2: any) => {
        should.not.exist(err2);
        p2.defaultInt.should.equal(5);
        should.not.exist(p2.first);
        should.not.exist(p2.second);
        should.not.exist(p2.third);
        done();
      });
    });
  });

});
