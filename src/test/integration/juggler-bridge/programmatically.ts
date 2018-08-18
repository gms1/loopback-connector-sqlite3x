// tslint:disable no-implicit-dependencies no-non-null-assertion
// tslint:disable no-duplicate-imports await-promise

// stolen from
// loopback-next/packages/repository/test/unit/repositories/legacy-juggler-bridge.unit.ts

import {DefaultCrudRepository, Entity, juggler, ModelDefinition} from '@loopback/repository';
import {expect} from '@loopback/testlab';

import * as ConnectorModule from '../../..';
import {Sqlite3JugglerConnector} from '../../..';


describe('programmatically ModelDefinition and DefaultCrudRepository', () => {
  let ds: juggler.DataSource;
  let connector: Sqlite3JugglerConnector;

  class Note extends Entity {
    // NOTE: from this ModelDefinition, the juggler bridge will create an
    // internal legacy model attached to our datasource.
    // So our connector will then only see this legacy model
    static definition: ModelDefinition = new ModelDefinition({
      name: 'note3',
      properties: {
        title: 'string',
        content: 'string',
        id: {
          name: 'id',
          type: 'number',
          id: true,
          sqlite3x: {columnName: 'ID3'}
        }
      },
      settings: {sqlite3x: {tableName: 'NOTE3'}}
    });

    title?: string;
    content?: string;
    id!: number;

    constructor(data: Partial<Note>) {
      super(data);
      // NOTE: do not initialize properties here or this will overwrite the
      // property values from repo.findById
      // TODO: report issue?
    }
  }

  let repo: DefaultCrudRepository<Note, number>;

  beforeEach(async () => {
    ds = new juggler.DataSource(ConnectorModule as any, {name: 'db'});
    connector = ds.connector as Sqlite3JugglerConnector;
    await ds.connect();  // wait until we are connected
    repo = new DefaultCrudRepository<Note, number>(Note, ds);
    await ds.automigrate('note3');
  });

  afterEach(async () => {
    const model = ds.createModel<typeof juggler.PersistedModel>('note3');
    model.attachTo(ds);
    await model.deleteAll();
    await connector.dropTable('note3');
    connector.destroyMetaModel('note3');
  });

  it('shares the backing PersistedModel across repo instances', async () => {
    const model1 = new DefaultCrudRepository<Note, number>(Note, ds).modelClass;
    const model2 = new DefaultCrudRepository<Note, number>(Note, ds).modelClass;

    expect(model1 === model2).to.be.true();
  });

  it('implements Repository.create()', async () => {
    const note = await repo.create({title: 't3', content: 'c3'});
    const result = await repo.findById(note.id);
    expect(result.toJSON()).to.eql(note.toJSON());
  });

  it('implements Repository.createAll()', async () => {
    const notes = await repo.createAll(
        [{title: 't3', content: 'c3'}, {title: 't4', content: 'c4'}]);
    expect(notes.length).to.eql(2);
  });

  it('implements Repository.find()', async () => {
    await repo.createAll(
        [{title: 't1', content: 'c1'}, {title: 't2', content: 'c2'}]);
    const notes = await repo.find({where: {title: 't1'}});
    expect(notes.length).to.eql(1);
  });

  it('implements Repository.findOne()', async () => {
    await repo.createAll(
        [{title: 't1', content: 'c1'}, {title: 't1', content: 'c2'}]);
    const note =
        await repo.findOne({where: {title: 't1'}, order: ['content DESC']});
    expect(note).to.not.be.null();
    expect(note && note.title).to.eql('t1');
    expect(note && note.content).to.eql('c2');
  });
  it('returns null if Repository.findOne() does not return a value',
     async () => {
       await repo.createAll(
           [{title: 't1', content: 'c1'}, {title: 't1', content: 'c2'}]);
       const note =
           await repo.findOne({where: {title: 't5'}, order: ['content DESC']});
       expect(note).to.be.null();
     });

  it('implements Repository.delete()', async () => {
    const note = await repo.create({title: 't3', content: 'c3'});
    const result = await repo.delete(note);
    expect(result).to.eql(true);
  });

  it('implements Repository.deleteById()', async () => {
    const note = await repo.create({title: 't3', content: 'c3'});
    const result = await repo.deleteById(note.id);
    expect(result).to.eql(true);
  });

  it('implements Repository.deleteAll()', async () => {
    await repo.create({title: 't3', content: 'c3'});
    await repo.create({title: 't4', content: 'c4'});
    const result = await repo.deleteAll({title: 't3'});
    expect(result).to.eql(1);
  });

  it('implements Repository.updateById()', async () => {
    const note = await repo.create({title: 't3', content: 'c3'});
    note.content = 'c4';
    const id = note.id;
    delete note.id;
    const result = await repo.updateById(id, note);
    expect(result).to.eql(true);
  });

  it('implements Repository.updateAll()', async () => {
    await repo.create({title: 't3', content: 'c3'});
    await repo.create({title: 't4', content: 'c4'});
    const result = await repo.updateAll({content: 'c5'}, {});
    expect(result).to.eql(2);
    const notes = await repo.find({where: {title: 't3'}});
    expect(notes[0].content).to.eql('c5');
  });

  xit('implements Repository.updateAll() without a where object', async () => {
    await repo.create({title: 't3', content: 'c3'});
    await repo.create({title: 't4', content: 'c4'});
    // TODO: got: AssertionError [ERR_ASSERTION]:
    //     "The where argument must be an object"
    //   at Function.DataAccessObject.update.DataAccessObject.updateAll
    //       (node_modules/loopback-datasource-juggler/lib/dao.js:2653:3)
    const result = await repo.updateAll({content: 'c5'});
    expect(result).to.eql(2);
    const notes = await repo.find();
    const titles = notes.map((n) => `${n.title}:${n.content}`);
    expect(titles).to.deepEqual(['t3:c5', 't4:c5']);
  });

  it('implements Repository.count()', async () => {
    await repo.create({title: 't3', content: 'c3'});
    await repo.create({title: 't4', content: 'c4'});
    const result = await repo.count();
    expect(result).to.eql(2);
  });

  it('implements Repository.save() without id', async () => {
    const note = await repo.save(new Note({title: 't3', content: 'c3'}));
    const result = await repo.findById(note!.id);
    expect(result.toJSON()).to.eql(note!.toJSON());
  });

  it('implements Repository.save() with id', async () => {
    const note1 = await repo.create({title: 't3', content: 'c3'});
    note1.content = 'c4';
    const note = await repo.save(note1);
    const result = await repo.findById(note!.id);
    expect(result.toJSON()).to.eql(note1.toJSON());
  });

  it('implements Repository.replaceById()', async () => {
    const note1 = await repo.create({title: 't3', content: 'c3'});
    note1.title = 't4';
    note1.content = undefined;
    const ok = await repo.replaceById(note1.id, note1);
    expect(ok).to.be.true();
    const result = await repo.findById(note1.id);
    if (result.content === null) {
      // TODO: undefined vs null
      // see Sqlite3JugglerConnector.fromColumnValue
      // imported tests of the juggler are forcing us to return 'null' for
      // DB-null but here we should return 'undefined
      //
      // btw this property is defined as 'string|undefined' and so should not be
      // set to 'null'
      result.content = undefined;
    }
    expect(result.toJSON()).to.eql(note1.toJSON());
  });

  it('implements Repository.exists()', async () => {
    const note1 = await repo.create({title: 't3', content: 'c3'});
    const ok = await repo.exists(note1.id);
    expect(ok).to.be.true();
  });

  it('throws if findById does not return a value', async () => {
    try {
      await repo.findById(999999);
    } catch (err) {
      expect(err).to.match(/no Note was found with id/);
      return;
    }
    throw new Error('No error was returned!');
  });
});
