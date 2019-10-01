// tslint:disable no-require-imports no-implicit-dependencies

import { camelCase, CamelCase } from '../../../utils/string-utils';
import should = require('should');

describe('utils: string-utils', () => {
  it('camelCase: multiple single character delimiter', () => {
    const givenInput = 'loopback-connector_sqlite3x';
    const expectedOutput = 'loopbackConnectorSqlite3x';
    should(camelCase(givenInput)).equal(expectedOutput);
  });

  it('camelCase: multiple multi character delimiter', () => {
    const givenInput = 'loopback-_connector_-sqlite3x';
    const expectedOutput = 'loopbackConnectorSqlite3x';
    should(camelCase(givenInput)).equal(expectedOutput);
  });

  it('camelCase: delimiter at end', () => {
    const givenInput = 'loopback-_connector_-';
    const expectedOutput = 'loopbackConnector';
    should(camelCase(givenInput)).equal(expectedOutput);
  });

  it('camelCase: empty input', () => {
    const givenInput = '';
    const expectedOutput = '';
    should(camelCase(givenInput)).equal(expectedOutput);
  });

  it('CamelCase: multiple single character delimiter', () => {
    const givenInput = 'loopback-connector_sqlite3x';
    const expectedOutput = 'LoopbackConnectorSqlite3x';
    should(CamelCase(givenInput)).equal(expectedOutput);
  });

  it('CamelCase: multiple multi character delimiter', () => {
    const givenInput = 'loopback_-connector-_sqlite3x';
    const expectedOutput = 'LoopbackConnectorSqlite3x';
    should(CamelCase(givenInput)).equal(expectedOutput);
  });

  it('CamelCase: delimiter at end', () => {
    const givenInput = 'loopback_-connector-_';
    const expectedOutput = 'LoopbackConnector';
    should(CamelCase(givenInput)).equal(expectedOutput);
  });

  it('CamelCase: empty input', () => {
    const givenInput = '';
    const expectedOutput = '';
    should(CamelCase(givenInput)).equal(expectedOutput);
  });
});
