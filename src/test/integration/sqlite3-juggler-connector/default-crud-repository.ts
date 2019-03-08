// tslint:disable no-implicit-dependencies no-non-null-assertion
// tslint:disable no-duplicate-imports await-promise

// stolen from
// loopback-next/packages/repository/test/unit/repositories/legacy-juggler-bridge.unit.ts

import {
  DefaultCrudRepository,
  Entity,
  juggler,
  model,
  property,
  EntityNotFoundError,
} from '@loopback/repository';
import { expect } from '@loopback/testlab';

import * as ConnectorModule from '../../..';
import { Sqlite3JugglerConnector } from '../../..';

describe('sqlite3-juggler-connector: DefaultCrudRepository', () => {
  let ds: juggler.DataSource;

  // NOTE: from this ModelDefinition, the juggler bridge will create an
  // internal legacy model attached to our datasource.
  // So our connector will then only see this legacy model
  @model({ name: 'Note1', settings: { sqlite3x: { tableName: 'NOTE1' } } })
  class Note1 extends Entity {
    @property()
    title?: string;

    @property()
    content?: string;

    @property({ name: 'id', type: 'number', id: true, sqlite3x: { columnName: 'ID4' } })
    id!: number;

    constructor(data: Partial<Note1>) {
      super(data);
    }
  }

  before(async () => {
    ds = new juggler.DataSource(ConnectorModule as any, { name: 'db' });
    if (!ds.connected) {
      await ds.connect();
    }
    // tslint:disable-next-line no-unused-expression
    new DefaultCrudRepository<Note1, number>(Note1, ds);
    await ds.automigrate('Note1');
  });

  beforeEach(async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.deleteAll();
  });

  after(async () => {
    await (ds.connector as Sqlite3JugglerConnector).dropTable('Note1');
    (ds.connector as Sqlite3JugglerConnector).destroyMetaModel('Note1');
  });

  it('shares the backing PersistedModel across repo instances', async () => {
    const model1 = new DefaultCrudRepository<Note1, number>(Note1, ds).modelClass;
    const model2 = new DefaultCrudRepository<Note1, number>(Note1, ds).modelClass;

    expect(model1 === model2).to.be.true();
  });

  it('implements Repository.create()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note = await repo.create({ title: 't3', content: 'c3' });
    const result = await repo.findById(note.id);
    expect(result.toJSON()).to.eql(note.toJSON());
  });

  it('implements Repository.createAll()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const notes = await repo.createAll([
      { title: 't3', content: 'c3' },
      { title: 't4', content: 'c4' },
    ]);
    expect(notes.length).to.eql(2);
  });

  it('implements Repository.find()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.createAll([{ title: 't1', content: 'c1' }, { title: 't2', content: 'c2' }]);
    const notes = await repo.find({ where: { title: 't1' } });
    expect(notes.length).to.eql(1);
  });

  it('implements Repository.findOne()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.createAll([{ title: 't1', content: 'c1' }, { title: 't1', content: 'c2' }]);
    const note = await repo.findOne({ where: { title: 't1' }, order: ['content DESC'] });
    expect(note).to.not.be.null();
    expect(note && note.title).to.eql('t1');
    expect(note && note.content).to.eql('c2');
  });
  it('returns null if Repository.findOne() does not return a value', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.createAll([{ title: 't1', content: 'c1' }, { title: 't1', content: 'c2' }]);
    const note = await repo.findOne({ where: { title: 't5' }, order: ['content DESC'] });
    expect(note).to.be.null();
  });

  describe('findById', () => {
    it('returns the correct instance', async () => {
      const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
      const note = await repo.create({ title: 'a-title', content: 'a-content' });
      const result = await repo.findById(note.id);
      expect(result && result.toJSON()).to.eql(note.toJSON());
    });

    it('throws when the instance does not exist', async () => {
      const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
      await expect(repo.findById(999999)).to.be.rejectedWith({
        code: 'ENTITY_NOT_FOUND',
        message: 'Entity not found: Note1 with id 999999',
      });
    });
  });

  it('implements Repository.delete()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note = await repo.create({ title: 't3', content: 'c3' });

    await repo.delete(note);

    const found = await repo.find({ where: { id: note.id } });
    expect(found).to.be.empty();
  });

  it('implements Repository.deleteById()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note = await repo.create({ title: 't3', content: 'c3' });

    await repo.deleteById(note.id);

    const found = await repo.find({ where: { id: note.id } });
    expect(found).to.be.empty();
  });

  it('throws EntityNotFoundError when deleting an unknown id', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await expect(repo.deleteById(99999)).to.be.rejectedWith(EntityNotFoundError);
  });

  it('implements Repository.deleteAll()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.create({ title: 't3', content: 'c3' });
    await repo.create({ title: 't4', content: 'c4' });
    const result = await repo.deleteAll({ title: 't3' });
    expect(result.count).to.eql(1);
  });

  it('implements Repository.updateById()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note = await repo.create({ title: 't3', content: 'c3' });

    const id = note.id;
    const delta = { content: 'c4' };
    await repo.updateById(id, delta);
    const updated = await repo.findById(id);
    expect(updated.toJSON()).to.eql(Object.assign(note.toJSON(), delta));
  });

  it('throws EntityNotFound error when updating an unknown id', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await expect(repo.updateById(9999, { title: 't4' })).to.be.rejectedWith(EntityNotFoundError);
  });

  it('implements Repository.updateAll()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.create({ title: 't3', content: 'c3' });
    await repo.create({ title: 't4', content: 'c4' });
    const result = await repo.updateAll({ content: 'c5' }, {});
    expect(result.count).to.eql(2);
    const notes = await repo.find({ where: { title: 't3' } });
    expect(notes[0].content).to.eql('c5');
  });

  it('implements Repository.updateAll() without a where object', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.create({ title: 't3', content: 'c3' });
    await repo.create({ title: 't4', content: 'c4' });
    const result = await repo.updateAll({ content: 'c5' });
    expect(result.count).to.eql(2);
    const notes = await repo.find();
    const titles = notes.map((n) => `${n.title}:${n.content}`);
    expect(titles).to.deepEqual(['t3:c5', 't4:c5']);
  });

  it('implements Repository.count()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await repo.create({ title: 't3', content: 'c3' });
    await repo.create({ title: 't4', content: 'c4' });
    const result = await repo.count();
    expect(result.count).to.eql(2);
  });

  it('implements Repository.save() without id', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note = await repo.save(new Note1({ title: 't3', content: 'c3' }));
    const result = await repo.findById(note.id);
    expect(result.toJSON()).to.eql(note.toJSON());
  });

  it('implements Repository.save() with id', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note1 = await repo.create({ title: 't3', content: 'c3' });
    note1.content = 'c4';
    const note = await repo.save(note1);
    const result = await repo.findById(note.id);
    expect(result.toJSON()).to.eql(note1.toJSON());
  });

  it('implements Repository.replaceById()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note = await repo.create({ title: 't3', content: 'c3' });
    await repo.replaceById(note.id, { title: 't4', content: undefined });
    const result = await repo.findById(note.id);
    expect(result.toJSON()).to.eql({
      id: note.id,
      title: 't4',
      content: undefined,
    });
  });

  it('throws EntityNotFound error when replacing an unknown id', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    await expect(repo.replaceById(9999, { title: 't4' })).to.be.rejectedWith(EntityNotFoundError);
  });

  it('implements Repository.exists()', async () => {
    const repo = new DefaultCrudRepository<Note1, number>(Note1, ds);
    const note1 = await repo.create({ title: 't3', content: 'c3' });
    const ok = await repo.exists(note1.id);
    expect(ok).to.be.true();
  });
});
