// tslint:disable no-implicit-dependencies no-require-imports
import {testInit} from './test-init';

describe('imported tests', () => {
  before(() => {
    testInit();
  });

  // require('loopback-datasource-juggler/test/common.batch.js');
  // require('loopback-datasource-juggler/test/default-scope.test.js');
  // require('loopback-datasource-juggler/test/include.test.js');
});
