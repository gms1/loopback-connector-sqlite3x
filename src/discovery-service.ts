import {SqlConnectionPool, SqlDatabase, DbCatalogDAO} from 'sqlite3orm';
import {Sqlite3ModelOptions, Sqlite3PropertyOptions, Sqlite3ForeignKeyOptions} from './sqlite3-options';
import {CamelCase, camelCase} from './utils/string-utils';

export interface SchemaProperty {
  type?: string;
  required?: boolean;
  id?: 0|1;
  generated?: 0|1;
  sqlite3x?: Sqlite3PropertyOptions;
}

export interface RelationOptions {
  model: string;
  type: string;
  foreignKey: string;
}

export interface Schema {
  name: string;
  options: {
    idInjection: boolean,
    sqlite3x?: Sqlite3ModelOptions,
    foreignKeys?: {[key: string]: Sqlite3ForeignKeyOptions},
    relations?: {[key: string]: RelationOptions},
  };
  properties: {[key: string]: SchemaProperty};
}

export interface Schemas { [key: string]: Schema; }


export interface DiscoverSchemasOptions {
  owner?: string;
  schema?: string;
  schemaName?: string;
  associations?: boolean;
  relations?: boolean;
  visited?: Schemas;
  nameMapper?(type: string, name: string): string;
}


export interface DiscoveredSchema {
  catalog?: string;
  schema: string;
}

export interface DiscoveredTable {
  type: 'table'|'view';
  name: string;
  owner: string;
}



export function defaultNameMapper(type: string, input: string): string {
  if (type === 'table' || type === 'model') {
    return CamelCase(input);
  } else {
    return camelCase(input);
  }
}

export class DiscoveryService {
  constructor(private readonly pool: SqlConnectionPool) {}

  async schemas(): Promise<DiscoveredSchema[]> {
    let sqldb: SqlDatabase|undefined;
    try {
      sqldb = await this.pool.get();
      const dao = new DbCatalogDAO(sqldb);
      const res: DiscoveredSchema[] = [];
      const schemas = await dao.readSchemas();
      schemas.forEach((schemaName) => {
        res.push({schema: schemaName});
      });
      return res;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      if (sqldb) {
        try {
          await sqldb.close();
        } catch (_ignore) {
        }
      }
    }
  }

  async tables(schemaName: string): Promise<DiscoveredTable[]> {
    let sqldb: SqlDatabase|undefined;
    try {
      sqldb = await this.pool.get();
      const dao = new DbCatalogDAO(sqldb);
      const res: DiscoveredTable[] = [];
      const tables = await dao.readTables(schemaName);
      tables.forEach((name) => {
        res.push({type: 'table', name, owner: schemaName});
      });
      return res;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      if (sqldb) {
        try {
          await sqldb.close();
        } catch (_ignore) {
        }
      }
    }
  }

  async table(tableName: string, schemaName?: string, options?: DiscoverSchemasOptions): Promise<Schema> {
    let sqldb: SqlDatabase|undefined;
    try {
      sqldb = await this.pool.get();
      const dao = new DbCatalogDAO(sqldb);
      const tableInfo = await dao.readTableInfo(tableName, schemaName);
      if (!tableInfo) {
        return Promise.reject(`table ${schemaName}.${tableName} not found`);
      }
      const autoId = tableInfo.autoIncrement && tableInfo.primaryKey.length === 1 ? tableInfo.primaryKey[0] : undefined;

      const pkCols: {[key: string]: number} = {};
      let keySeq = 1;
      tableInfo.primaryKey.forEach((colName: string) => {
        pkCols[colName] = keySeq;
        keySeq += 1;
      });

      const schema: Schema = {
        name: options && options.nameMapper ? options.nameMapper('table', tableName) : tableName,
        options: {
          idInjection: false,
          sqlite3x: {tableName: tableInfo.name},
        },
        properties: {},
      };

      const cols: {[key: string]: string} = {};
      Object.keys(tableInfo.columns).forEach((colName) => {
        const colInfo = tableInfo.columns[colName];
        const propName = options && options.nameMapper ? options.nameMapper('column', colName) : colName;
        schema.properties[propName] = {
          type: this.propertyType(colInfo.typeAffinity),
          required: colInfo.notNull ? true : false,
          sqlite3x: {
            columnName: colName,
            dbtype: colInfo.notNull ? `${colInfo.type} NOT NULL` : colInfo.type,

            dataType: colInfo.typeAffinity,
            nullable: colInfo.notNull ? 'N' : 'Y',
          }
        };
        if (pkCols[colName]) {
          schema.properties[propName].id = 1;
          if (colName === autoId) {
            schema.properties[propName].generated = 1;
          }
        }
        cols[colName] = propName;
      });

      schema.options.foreignKeys = {};
      Object.keys(tableInfo.foreignKeys).forEach((fkName) => {
        const fkInfo = tableInfo.foreignKeys[fkName];
        const props = fkInfo.columns.map((colName) => cols[colName]);
        // tslint:disable no-non-null-assertion
        schema.options.foreignKeys![fkName] = {
          properties: props.join(','),
          refTable: fkInfo.refTable,
          refColumns: fkInfo.refColumns.join(','),
        };
      });
      return schema;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      if (sqldb) {
        try {
          await sqldb.close();
        } catch (_ignore) {
        }
      }
    }
  }


  protected propertyType(type: string): string {
    // 'Date' and 'Boolean' not detectable
    switch (type) {
      case 'INTEGER':
      case 'REAL':
        return 'Number';
      case 'TEXT':
      case 'NUMERIC':
        return 'String';
      case 'BLOB':
        return 'Binary';
      default:
        throw new Error(`unknown type affinity '${type}'`);
    }
  }
}
