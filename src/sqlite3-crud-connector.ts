
// tslint:disable no-require-imports member-ordering no-implicit-dependencies
import _sg = require('strong-globalize');
import {Sqlite3Connector} from './sqlite3-connector';
import {Sqlite3Settings} from './sqlite3-settings';
import {Class, Entity, EntityData, Options, Filter, Where} from '@loopback/repository';
// import {METADATA_MODEL_KEY, MetaModel} from 'sqlite3orm';

// tslint:disable-next-line no-unused-variable
const g = new _sg();


/* istanbul ignore next */  // tslint:disable-next-line no-unused-variable
function debug(arg: any, ...args: any[]): void {
  Sqlite3Connector.debug(arg, ...args);
}

// sample implementation for MySql:
// https://github.com/strongloop/loopback4-example-microservices/blob/master/services/account-without-juggler/repositories/account/datasources/mysqlconn.ts


/* istanbul ignore next */
export class Sqlite3CrudConnector extends Sqlite3Connector /* implements
    CrudConnector */ {
  /*************************************************************************************
   * Connector interface
   */
  interfaces?: string[];

  constructor(settings?: Sqlite3Settings|Object) {
    super(settings);
  }

  /*
  public classToMetaModel(modelClass: Class<Entity>): MetaModel {
    let metaModel =
        Reflect.getMetadata(METADATA_MODEL_KEY, modelClass.prototype);
    if (!metaModel) {
      metaModel =
          super.getMetaModel(modelClass.modelName, modelClass.definition);
    }
    return metaModel;
  }
  */


  /*************************************************************************************
   * CrudConnector interface
   */


  /**
   * Create a new entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns A promise of the entity created
   */
  create(modelClass: Class<Entity>, entity: EntityData, options: Options): Promise<EntityData> {
    throw new Error('TODO: Not implemented yet.');
  }

  /**
   * Create multiple entities
   * @param modelClass The model class
   * @param entities An array of entity instances or data
   * @param options Options for the operation
   * @returns A promise of an array of entities created
   */
  createAll(modelClass: Class<Entity>, entities: EntityData[], options?: Options): Promise<EntityData[]> {
    throw new Error('TODO: Not implemented yet.');
  }

  /**
   * Save an entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns A promise of the entity saved
   */
  save(modelClass: Class<Entity>, entity: EntityData, options?: Options): Promise<EntityData> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Find matching entities by the filter
   * @param modelClass The model class
   * @param filter The query filter
   * @param options Options for the operation
   * @returns A promise of an array of entities found for the filter
   */
  find(modelClass: Class<Entity>, filter?: Filter, options?: Options): Promise<EntityData[]> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Find an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param options Options for the operation
   * @returns A promise of the entity found for the id
   */
  findById<IdType>(modelClass: Class<Entity>, id: IdType, options?: Options): Promise<EntityData> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Update an entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns Promise<true> if an entity is updated, otherwise
   * Promise<false>
   */
  update(modelClass: Class<Entity>, entity: EntityData, options?: Options): Promise<boolean> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Delete an entity
   * @param modelClass The model class
   * @param entity The entity instance or data
   * @param options Options for the operation
   * @returns Promise<true> if an entity is deleted, otherwise
   * Promise<false>
   */
  delete(modelClass: Class<Entity>, entity: EntityData, options?: Options): Promise<boolean> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Update matching entities
   * @param modelClass The model class
   * @param data The data attributes to be updated
   * @param where The matching criteria
   * @param options Options for the operation
   * @returns A promise of number of matching entities deleted
   */
  updateAll(modelClass: Class<Entity>, data: EntityData, where?: Where, options?: Options): Promise<number> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Update an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param data The data attributes to be updated
   * @param options Options for the operation
   * @returns Promise<true> if an entity is updated for the id, otherwise
   * Promise<false>
   */
  updateById<IdType>(modelClass: Class<Entity>, id: IdType, data: EntityData, options?: Options): Promise<boolean> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Replace an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param data The data attributes to be updated
   * @param options Options for the operation
   * @returns Promise<true> if an entity is replaced for the id, otherwise
   * Promise<false>
   */
  replaceById<IdType>(modelClass: Class<Entity>, id: IdType, data: EntityData, options?: Options): Promise<boolean> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Delete matching entities
   * @param modelClass The model class
   * @param where The matching criteria
   * @param options Options for the operation
   * @returns A promise of number of matching entities deleted
   */
  deleteAll(modelClass: Class<Entity>, where?: Where, options?: Options): Promise<number> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Delete an entity by id
   * @param modelClass The model class
   * @param id The entity id value
   * @param options Options for the operation
   * @returns Promise<true> if an entity is deleted for the id, otherwise
   * Promise<false>
   */
  deleteById<IdType>(modelClass: Class<Entity>, id: IdType, options?: Options): Promise<boolean> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Count matching entities
   * @param modelClass The model class
   * @param where The matching criteria
   * @param options Options for the operation
   * @returns A promise of number of matching entities
   */
  count(modelClass: Class<Entity>, where?: Where, options?: Options): Promise<number> {
    throw new Error('TODO: Not implemented yet.');
  }
  /**
   * Check if an entity exists for the id
   * @param modelClass The model class
   * @param id The entity id value
   * @param options Options for the operation
   * @returns Promise<true> if an entity exists for the id, otherwise
   * Promise<false>
   */
  exists<IdType>(modelClass: Class<Entity>, id: IdType, options?: Options): Promise<boolean> {
    throw new Error('TODO: Not implemented yet.');
  }
}
