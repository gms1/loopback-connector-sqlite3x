// tslint:disable no-require-imports no-implicit-dependencies no-var-requires

import {initDataSource} from './test-init';

initDataSource();

describe('loopback-datasource-juggler imported tests', () => {
  before(() => {});

  beforeEach(() => {});

  afterEach(() => {});

  after(() => {});

  // ===========================================================
  // common.batch:

  // require('loopback-datasource-juggler/test/common.batch.js');

  require('loopback-datasource-juggler/test/datatype.test.js');
  require('loopback-datasource-juggler/test/basic-querying.test.js');
  require('loopback-datasource-juggler/test/manipulation.test.js');
  require('loopback-datasource-juggler/test/hooks.test.js');
  // TODO: require('loopback-datasource-juggler/test/relations.test.js');
  // ===========================================================

  // ===========================================================
  // TODO?: require('loopback-datasource-juggler/test/default-scope.test.js');
  // ===========================================================
  require('loopback-datasource-juggler/test/include.test.js');
  // ===========================================================
});
