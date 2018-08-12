// tslint:disable no-implicit-dependencies no-non-null-assertion
import {Class, CrudRepositoryImpl, Entity, model, property} from '@loopback/repository';
import {expect} from '@loopback/testlab';

import {Sqlite3CrudConnector} from '../../../sqlite3-crud-connector';

class Sqlite3CrudRepository<T extends Entity, ID> extends
    CrudRepositoryImpl<T, ID> {
  constructor(modelClass: Class<T>, ds: Sqlite3CrudConnector) {
    super(ds, modelClass);
  }
}

/* TODO

describe('Sqlite3CrudRepository', () => {
  let ds: Sqlite3CrudConnector;

  @model({name: 'note7', settings: {sqlite3x: {tableName: 'NOTE7'}}})
  class Note extends Entity {
    @property()
    title?: string;

    @property()
    content?: string;

    @property(
        {name: 'id', type: 'number', id: true, sqlite3x: {columnName: 'ID4'}})
    id!: number;

    constructor(data: Partial<Note>) {
      super(data);
      // NOTE: do not initialize properties here or this will overwrite the
      // property values from repo.findById
      // TODO: report issue?
    }
  }

  let repo: Sqlite3CrudRepository<Note, {}>;

  beforeEach(async () => {
    ds = new Sqlite3CrudConnector();
    await ds.connect();  // wait until we are connected
    repo = new Sqlite3CrudRepository(Note, ds);
    await ds.automigrate('note7');
  });

  afterEach(async () => {
    const model = ds.createModel<typeof juggler.PersistedModel>('note7');
    model.attachTo(ds);
    await model.deleteAll();
    await connector.dropTable('note7');
    ds.destroyMetaModel('note7');
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
    // NOTE see: ../juggler-bridge/repository.ts if this fails:
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


*/
