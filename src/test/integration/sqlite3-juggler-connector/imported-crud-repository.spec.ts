import { DefaultTransactionalRepository } from '@loopback/repository';
import { CrudRepositoryCtor, crudRepositoryTestSuite } from '@loopback/repository-tests';

import { initialize, Sqlite3JugglerConnector } from '../../../sqlite3-juggler-connector';
import { DataSource } from 'loopback-datasource-juggler/types/datasource';
import { Callback } from 'loopback-datasource-juggler/types/common';
import { Sqlite3Settings } from '../../../sqlite3-settings';

import { NumberDefaultTransformer } from 'sqlite3orm/metadata/DefaultValueTransformers';

/*
  FAILED:
    CRUD Repository operations
      HasMany relation (acceptance)
        when targeting the source model
          creates a child entity through the parent entity:
            AssertionError: expected Array [] to contain Object { id: 16, name: 'child customer', parentId: '15' }

    this is because data-type for parentId is not defined in the model, so defaults to JSON string

    WORKAROUND: defined 'dbtype' as 'INTEGER and configured 'transform' for number
*/

const TEST_SETTINGS: Sqlite3Settings = {
  debug: false,
  name: `test repository`,
  file: `test_repository.db`,
  propertyOptions: {
    Customer: {
      parentId: {
        dbtype: 'INTEGER',
        transform: new NumberDefaultTransformer(),
      },
    },
  },
};

describe('DefaultCrudRepository + sqlite3x connector', () => {
  let connector: Sqlite3JugglerConnector | undefined;

  after(async () => {
    if (!connector) {
      throw new Error('NO CONNECTOR!!!');
    }
    if (connector.pool.isOpen()) {
      for (const modelName of connector.modelNames()) {
        await connector.dropTable(modelName);
      }
    }
    connector.destroyAllMetaModels();
  });

  crudRepositoryTestSuite(
    {
      initialize: (dataSource: DataSource, cb?: Callback<void> | undefined) => {
        dataSource.settings = Object.assign(
          dataSource.settings ? dataSource.settings : {},
          TEST_SETTINGS,
        );
        initialize(dataSource, cb);
        connector = dataSource.connector as Sqlite3JugglerConnector;
        return;
      },
    },
    // Workaround for the following TypeScript error
    //   Type 'DefaultCrudRepository<T, ID, {}>' is not assignable to
    //     type 'EntityCrudRepository<T, ID, Relations>'.
    // See https://github.com/microsoft/TypeScript/issues/31840
    DefaultTransactionalRepository as CrudRepositoryCtor,
    {
      idType: 'number',
      freeFormProperties: false,
    },
  );
});
