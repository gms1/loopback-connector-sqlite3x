// tslint:disable no-require-imports no-implicit-dependencies
import * as should from 'should';

import {SQL_OPEN_READWRITE, Sqlite3CrudConnector} from '../../..';


describe('crud-connector sqlite3x', () => {

  it('should connect using default settings', async () => {
    const crudCon = new Sqlite3CrudConnector();
    await crudCon.connect();
    should(crudCon.pool.isOpen()).be.true();
    await crudCon.connect();
  });

});
