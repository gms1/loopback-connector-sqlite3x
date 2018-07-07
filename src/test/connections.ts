// tslint:disable no-implicit-dependencies
import {DataSource} from 'loopback-datasource-juggler';
import * as should from 'should';

import * as ConnectorModule from '../';
import {Sqlite3Connector} from '../sqlite3-connector';

describe('connections', () => {

  it('using default settings', async () => {
    const ds = new DataSource(ConnectorModule as any);
    should(ds.connector).be.instanceof (Sqlite3Connector);
    const connector = ds.connector as any as Sqlite3Connector;
    ds.should.be.equal(connector.dataSource);
    await connector.connecting;
    should(ds.connected).be.true();
    should(connector.sqldb.isOpen()).be.true();
    const ver = await connector.ping();
    should(ver).be.a.Number().and.be.equal(0);
    await ds.disconnect();
    should(connector.sqldb.isOpen()).be.false();
  });

  it('using debug settings', async () => {
    const ds = new DataSource(ConnectorModule as any, {debug: true});
    should(ds.connector).be.instanceof (Sqlite3Connector);
    const connector = ds.connector as any as Sqlite3Connector;
    ds.should.be.equal(connector.dataSource);
    await connector.connecting;
    should(ds.connected).be.true();
    should(connector.sqldb.isOpen()).be.true();
    const ver = await connector.ping();
    should(ver).be.a.Number().and.be.equal(0);
    await ds.disconnect();
    should(connector.sqldb.isOpen()).be.false();
  });


});
