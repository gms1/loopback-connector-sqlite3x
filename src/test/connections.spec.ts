// tslint:disable no-implicit-dependencies
import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';

import * as ConnectorModule from '..';
import {Sqlite3Connector} from '../sqlite3-connector';
import {SQL_OPEN_READWRITE} from '../sqlite3-settings';


describe('connections', () => {

  it('should connect using default settings', async () => {
    const ds = new DataSource(ConnectorModule as any);
    should(ds.connector).be.instanceof (Sqlite3Connector);
    const connector = ds.connector as any as Sqlite3Connector;
    ds.should.be.equal(connector.dataSource);

    await ds.connect();
    should(connector.pool.isOpen()).be.true();
    await connector.connect();  // to increase coverage
    await connector.ping();
    await ds.disconnect();
    should(connector.pool.isOpen()).be.false();
    await connector.disconnect();  // to increase coverage
  });

  it('connect should fail for not existing db file (lazyConnect and connect() having callback)',
     async () => {
       const ds = new DataSource(
           ConnectorModule as any,
           {file: '::/.', mode: SQL_OPEN_READWRITE, lazyConnect: true});
       should(ds.connector).be.instanceof (Sqlite3Connector);
       const connector = ds.connector as any as Sqlite3Connector;
       ds.should.be.equal(connector.dataSource);

       try {
         const p = new Promise((resolve, reject) => {
           connector.connect((err) => {
             if (err) {
               reject(err);
             } else {
               resolve();
             }
           });
         });

         await p;
         should.should.fail();
         return;
       } catch (err) {
       }
       should(connector.pool.isOpen()).be.false();
       try {
         await ds.ping();
         should.should.fail();
         return;
       } catch (err) {
       }
       try {
         await ds.disconnect();
         should.should.fail();
         return;
       } catch (err) {
       }
     });


  it('connect should fail for not existing db file (lazyConnect and connect() returning promise)',
     async () => {
       const ds = new DataSource(
           ConnectorModule as any,
           {file: '::/.', mode: SQL_OPEN_READWRITE, lazyConnect: true});
       should(ds.connector).be.instanceof (Sqlite3Connector);
       const connector = ds.connector as any as Sqlite3Connector;
       ds.should.be.equal(connector.dataSource);

       try {
         await connector.connect();
         should.should.fail();
         return;
       } catch (err) {
       }
       should(connector.pool.isOpen()).be.false();
       try {
         await ds.ping();
         should.should.fail();
         return;
       } catch (err) {
       }
       try {
         await ds.disconnect();
         should.should.fail();
         return;
       } catch (err) {
       }
     });



});
