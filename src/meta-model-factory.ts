// tslint:disable no-non-null-assertion
// import {ModelDefinition} from '@loopback/repository';
import * as juggler from 'loopback-datasource-juggler';
import {
  FieldOpts,
  FKDefinition,
  IDXDefinition,
  MetaModel,
  PropertyType,
  TableOpts,
  ValueTransformer,
} from 'sqlite3orm';

import { SQLITE3_CONNECTOR_NAME, Sqlite3Connector } from './sqlite3-connector';
import { Sqlite3ModelOptions, Sqlite3PropertyOptions } from './sqlite3-options';
import { Sqlite3Settings } from './sqlite3-settings';
import { PropertyDefinition } from 'loopback-datasource-juggler';

function debug(arg: any, ...args: any[]): void {
  Sqlite3Connector.debug(arg, ...args);
}

interface MetaModelRef {
  metaModel: MetaModel;
  lbModelDef?: juggler.ModelDefinition; // |ModelDefinition;
}

/*
 * The MetaModel factory and registry
 */

export class MetaModelFactory {
  private readonly settings: Sqlite3Settings | undefined;
  private mapNameToMetaModel!: Map<string, MetaModelRef>;

  // required in Sqlite3JugglerConnector.fromColumnValue and Sqlite3JugglerConnector.toColumnValue
  private readonly mapPropDefToTransform!: WeakMap<any, ValueTransformer>;

  /**
   * Creates an instance of MetaModelFactory.
   *
   */
  public constructor(settings?: Sqlite3Settings) {
    this.settings = settings;
    this.mapNameToMetaModel = new Map();
    this.mapPropDefToTransform = new WeakMap();
  }

  // required in Sqlite3JugglerConnector.fromColumnValue and Sqlite3JugglerConnector.toColumnValue
  getValueTransformer(prop: PropertyDefinition): ValueTransformer | undefined {
    return this.mapPropDefToTransform.get(prop);
  }

  /**
   * get a MetaModel for a lb4 model definition
   *
   * @param modelName
   * @param lbModelDef
   * @param [recreate]
   */

  // TODO: getMetaModel for the CRUDConnector is not implemented yet
  /*
  getMetaModel(modelName: string, lbModelDef: ModelDefinition, recreate?: boolean): MetaModel {
    throw new Error(`getMetaModel is not implemented yet`);
  }
  */

  /**
   * get a MetaModel for a juggler model definition
   *
   * @param modelName
   * @param lbModelDef
   * @param [recreate]
   */
  getMetaModelFromJuggler(
    modelName: string,
    lbModelDef: juggler.ModelDefinition,
    recreate?: boolean,
  ): MetaModel {
    let metaModelRef = this.mapNameToMetaModel.get(modelName);
    if (metaModelRef) {
      if (!recreate && lbModelDef === metaModelRef.lbModelDef) {
        return metaModelRef.metaModel;
      }
      this.destroyMetaModel(modelName);
    }

    const settings = lbModelDef.settings || {};
    const modelOpts = (settings[SQLITE3_CONNECTOR_NAME] || {}) as Sqlite3ModelOptions;
    debug(`registering model '${modelName}'`);
    metaModelRef = { metaModel: new MetaModel(modelName), lbModelDef };

    const tableOpts: TableOpts = {
      name: modelOpts.tableName || this.dbName(modelName),
      withoutRowId: modelOpts.withoutRowId,
    };

    // properties:
    const properties = lbModelDef.properties || {};
    const mapKeyToColName = new Map<string, string>();
    Object.keys(properties)
      .filter((propName) => properties.hasOwnProperty(propName))
      // tslint:disable-next-line: cyclomatic-complexity
      .forEach((propName) => {
        const property = properties[propName];

        if (property.id && property.generated) {
          // may be set to false later on, if the type for this property is not integer
          // or table has a combined id
          tableOpts.autoIncrement = true;
        }

        let defaultPropertyOpts;
        if (
          this.settings &&
          this.settings.propertyOptions &&
          this.settings.propertyOptions[modelName]
        ) {
          defaultPropertyOpts = this.settings.propertyOptions[modelName][propName];
        }

        const propertyOpts = Object.assign(
          {},
          defaultPropertyOpts,
          property[SQLITE3_CONNECTOR_NAME],
        ) as Sqlite3PropertyOptions;

        const metaProp = metaModelRef!.metaModel.getOrAddProperty(propName);
        if (
          property.type &&
          (typeof property.type === 'function' || typeof property.type === 'string')
        ) {
          metaProp.setPropertyType(property.type);
        }
        // applying defaults:
        if (metaProp.propertyType === PropertyType.UNKNOWN) {
          propertyOpts.isJson = true;
        }
        if (
          metaProp.propertyType === PropertyType.DATE &&
          // tslint:disable-next-line triple-equals
          propertyOpts.dateInMilliSeconds == undefined
        ) {
          propertyOpts.dateInMilliSeconds = true;
        }

        const fieldOpts: FieldOpts = {
          name: propertyOpts.columnName || this.dbName(propName),
          dbtype: propertyOpts.dbtype,
          isJson: propertyOpts.isJson,
          dateInMilliSeconds: propertyOpts.dateInMilliSeconds,
          transform: propertyOpts.transform,
        };

        metaModelRef!.metaModel.setPropertyField(propName, !!property.id, fieldOpts);
        mapKeyToColName.set(propName, fieldOpts.name as string);
      });
    metaModelRef.metaModel.init(tableOpts);

    Object.keys(properties)
      .filter((propName) => properties.hasOwnProperty(propName))
      .forEach((propName) => {
        const property = properties[propName];
        const metaProp = metaModelRef!.metaModel.getOrAddProperty(propName);
        this.mapPropDefToTransform.set(property, metaProp.transform);
      });

    // indexes:
    if (typeof settings.indexes === 'object') {
      this.addIndexDefinitions(metaModelRef, settings.indexes);
    }
    // foreignKeys:
    if (typeof settings.foreignKeys === 'object') {
      this.addForeignKeyDefinitions(metaModelRef, settings.foreignKeys);
    }

    this.mapNameToMetaModel.set(metaModelRef.metaModel.name, metaModelRef);
    return metaModelRef.metaModel;
  }

  protected addIndexDefinitions(metaModelRef: MetaModelRef, indexes: any): void {
    const metaModel = metaModelRef.metaModel;
    const table = metaModel.table;
    Object.keys(indexes)
      .filter((indexName) => indexes.hasOwnProperty(indexName))
      .forEach((indexName) => {
        const indexDef = indexes[indexName];
        if (typeof indexDef.columns === 'string') {
          // using MySql index definition:
          const columns: string[] = indexDef.columns.split(',');
          const idxDef = new IDXDefinition(indexName, indexDef.kind && indexDef.kind === 'unique');
          columns.forEach((colName) => {
            idxDef.fields.push({ name: colName.trim() });
          });
          table.addIDXDefinition(idxDef);
        } else {
          // standard or shortened form:
          const keys = typeof indexDef.keys === 'object' ? indexDef.keys : indexDef;
          // tslint:disable-next-line no-unnecessary-initializer
          let isUnique = undefined;
          if (
            indexDef.options &&
            // tslint:disable-next-line triple-equals
            typeof indexDef.options.unique != undefined
          ) {
            isUnique = !!indexDef.options.unique;
          }
          const idxDef = new IDXDefinition(indexName, isUnique);
          Object.keys(keys).forEach((propName) => {
            const metaProp = metaModel.hasProperty(propName);
            /* istanbul ignore if */
            if (!metaProp) {
              throw new Error(
                `property '${propName}' not defined for model '${metaModel.name}' but referenced in index definition '${indexName}'`,
              );
            }
            idxDef.fields.push({
              name: metaProp.field.name,
              desc: keys[propName] === -1 ? true : false,
            });
          });
          table.addIDXDefinition(idxDef);
        }
      });
  }

  protected addForeignKeyDefinitions(metaModelRef: MetaModelRef, foreignKeys: any): void {
    const metaModel = metaModelRef.metaModel;
    const table = metaModel.table;
    Object.keys(foreignKeys)
      .filter((constraintName) => foreignKeys.hasOwnProperty(constraintName))
      .forEach((constraintName) => {
        const properties: string[] = foreignKeys[constraintName].properties.split(',');
        const refColumns: string[] = foreignKeys[constraintName].refColumns.split(',');
        const refTable: string = foreignKeys[constraintName].refTable;
        if (foreignKeys[constraintName].name) {
          constraintName = foreignKeys[constraintName].name;
        }
        /* istanbul ignore if */
        if (properties.length !== refColumns.length) {
          throw new Error(
            `invalid foreign key definition '${constraintName}': number of items in 'properties' and 'refColumns' must be equal`,
          );
        }

        const fkDef = new FKDefinition(constraintName, refTable);
        for (let i = 0; i < refColumns.length; i++) {
          properties[i] = properties[i].trim();
          const metaProp = metaModel.hasProperty(properties[i]);
          /* istanbul ignore if */
          if (!metaProp) {
            throw new Error(
              `property '${properties[i]}' not defined for model '${metaModel.name}' but referenced in foreign key definition '${constraintName}'`,
            );
          }

          fkDef.fields.push({
            name: metaProp.field.name,
            foreignColumnName: refColumns[i] ? refColumns[i].trim() : '',
          });
        }
        table.addFKDefinition(fkDef);
      });
  }

  /**
   * destroy a MetaModel by name
   *
   * @param modelName
   */
  destroyMetaModel(modelName: string): void {
    const metaModelRef = this.mapNameToMetaModel.get(modelName);
    /* istanbul ignore if */
    if (!metaModelRef) {
      return;
    }
    this.mapNameToMetaModel.delete(modelName);
    metaModelRef.metaModel.destroy();
  }

  /**
   * destroy all models
   *
   */
  destroyAllMetaModels(): void {
    this.mapNameToMetaModel.forEach((metaModelRef) => {
      metaModelRef.metaModel.destroy();
    });
    this.mapNameToMetaModel = new Map<string, MetaModelRef>();
  }

  modelNames(): string[] {
    return Array.from(this.mapNameToMetaModel.keys());
  }

  /**
   * get the default table/column name for a given model/property name
   * @param name The name
   */

  dbName(modelOrProperty?: string): string | undefined {
    /* istanbul ignore if */
    if (!modelOrProperty) {
      return modelOrProperty;
    }
    return modelOrProperty.toLowerCase();
  }
}
