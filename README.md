# loopback-connector-sqlite3x

alternative and unofficial LoopBack connector for SQLite3.

[![npm version](https://badge.fury.io/js/loopback-connector-sqlite3x.svg)](https://badge.fury.io/js/loopback-connector-sqlite3x)
[![Known Vulnerabilities](https://snyk.io/test/github/gms1/loopback-connector-sqlite3x/badge.svg)](https://snyk.io/test/github/gms1/loopback-connector-sqlite3x)
[![Build Status](https://api.travis-ci.org/gms1/loopback-connector-sqlite3x.svg?branch=master)](https://travis-ci.org/gms1/loopback-connector-sqlite3x)
[![Coverage Status](https://coveralls.io/repos/github/gms1/loopback-connector-sqlite3x/badge.svg?branch=master&service=github)](https://coveralls.io/github/gms1/loopback-connector-sqlite3x?branch=master)
[![DeepScan Grade](https://deepscan.io/api/projects/742/branches/1407/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=742&bid=1407)
[![Dependency Status](https://david-dm.org/gms1/loopback-connector-sqlite3x.svg)](https://david-dm.org/gms1/loopback-connector-sqlite3x)
[![Greenkeeper badge](https://badges.greenkeeper.io/gms1/loopback-connector-sqlite3x.svg)](https://greenkeeper.io/)

## Features

* auto-migrate and auto-update for tables, indexes, foreign keys
* connection pool
* full control over the names for tables, fields, indexes and foreign key constraints in the mapped database schema

### TODO

* discovering models
* LB4 CrudConnector (if we gain any advantage)
  
## Installation

```shell
npm install loopback-connector-sqlite3x --save
```

## Connector settings

```TypeScript

export interface Sqlite3AllSettings {
  /**
   * [file=shared memory] - The database file to open
   */
  file: string;
  /**
   * [mode=SQL_OPEN_DEFAULT] - The mode for opening the database file
   * A bit flag combination of:
   *   SQL_OPEN_CREATE,
   *   SQL_OPEN_READONLY,
   *   SQL_OPEN_READWRITE
   * SQL_OPEN_DEFAULT = SQL_OPEN_CREATE | SQL_OPEN_READWRITE
   */
  mode: number;
  /**
   * [min=1] - Minimum connections which should be opened by the connection pool
   */
  poolMin: number;
  /*
   * [max=0] - Maximum connections which can be opened by this connection pool
   */
  poolMax: number;
  /*
   * [debug=false] - enable debug
   */
  debug: boolean;
  /*
   * [lazyConnect=false] - enable lazy connect
   */
  lazyConnect: boolean;
  /*
   * [schemaName='main'] - the default schema
   */
  schemaName: string;
  /*
   * [dbSettings]
   */
  dbSettings: SqlDatabaseSettings;
}

/*
 * additional database settings
 * 
 *  for a description of the pragma setting see: https://www.sqlite.org/pragma.html
 *  for a description of the execution mode see: https://github.com/mapbox/node-sqlite3/wiki/Control-Flow
 * 
 * defaults:
 *   journalMode 'WAL'
 *   busyTimout = 3000
 *   readUncommitted = 'FALSE
 *   executionMode = 'PARALLELIZE'
 */
export interface SqlDatabaseSettings {
  /*
   * PRAGMA schema.journal_mode = DELETE | TRUNCATE | PERSIST | MEMORY | WAL | OFF
   */
  journalMode?: string|string[];
  /*
   * PRAGMA busy_timeout = milliseconds
   */
  busyTimeout?: number;
  /*
   * PRAGMA schema.synchronous = OFF | NORMAL | FULL | EXTRA;
   */
  synchronous?: string|string[];
  /*
   * PRAGMA case_sensitive_like = TRUE | FALSE
   */
  caseSensitiveLike?: string;

  /*
   * PRAGMA foreign_keys = TRUE | FALSE
   */
  foreignKeys?: string;

  /*
   * PRAGMA ignore_check_constraints = TRUE | FALSE
   */
  ignoreCheckConstraints?: string;

  /*
   * PRAGMA query_only = TRUE | FALSE
   */
  queryOnly?: string;

  /*
   * PRAGMA read_uncommitted = TRUE | FALSE
   */
  readUncommitted?: string;

  /*
   * PRAGMA recursive_triggers = TRUE | FALSE
   */
  recursiveTriggers?: string;

  /*
   * PRAGMA schema.secure_delete = TRUE | FALSE | FAST
   */
  secureDelete?: string|string[];

  /*
   *  SERIALIZE | PARALLELIZE
   */
  executionMode?: string;
}
```

## Model definition

You can use the 'sqlite3x' property to specify additional database-specific options for a LoopBack model (see Sqlite3ModelOptions).

```TypeScript
{
    name: 'TestModel',
    options:
        {
          sqlite3x: {tableName: 'TEST_MODEL'}
        },

```

### properties

You can use the 'sqlite3x' property to specify additional database-specific options for a LoopBack property (see Sqlite3PropertyOptions).

```TypeScript
{
    name: 'TestModel',
    properties: {
      id: {
        type: 'Number',
        id: 1,
        sqlite3x: {columnName: 'ID', dbtype: 'INTEGER NOT NULL'}
      },
      created: {
        type: 'Date'
        sqlite3x: {columnName 'CREATED'}
      }

```

#### default type mapping

| LoopBack type | Database type |
|-----|-----|
| Number| INTEGER if primary key, REAL otherwise |
| Boolean | INTEGER 1 or 0 |
| Date | INTEGER milliseconds since Jan 01 1970 |
| String | TEXT |
| JSON / Complex types | TEXT in JSON format |


### indexes

you can define indexes using the loopback 'indexes' property in the standard or shortened form, as well as using the MySql form

<!-- -->
> NOTE: specifying indexes at the model property level is not supported

### foreign key constraints

It seems there is no standard way to define database-specific foreign key constraints using loopback, therefore a new way has been introduced:
You can define foreign keys using a 'foreignKeys' property

```Json
"foreignKeys": {
    "<constraint identifier>": {
      "properties": "<property key>[,<property key>]...",
      "refTable": "<table identifier>",
      "refColumns": "<column identifier>[,<column identifier>]...",
    }
  }
```

## License

**loopback-connector-sqlite3x** is licensed under the Artistic License 2.0:
[LICENSE](./LICENSE)

## Release Notes

[CHANGELOG](./CHANGELOG.md)
