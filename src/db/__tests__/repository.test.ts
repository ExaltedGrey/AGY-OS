import path from 'node:path';
import initSqlJs from 'sql.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { addDaysISO, getTodayISO } from '../../utils/date';
import { FieldnotesRepository } from '../repository';
import { SQLiteClient } from '../sqliteClient';

describe('FieldnotesRepository (SQLite)', () => {
  let client: SQLiteClient;
  let repo: FieldnotesRepository;

  beforeEach(async () => {
    const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    client = new SQLiteClient();
    client.initWithDatabase(SQL);
    repo = new FieldnotesRepository(client);
  });

  it('creates, updates, and deletes contacts with cascade visit deletion', () => {
    const created = repo.createContact({
      name: 'David Chen',
      status: 'return_visit',
      territory: 'Oak Park',
      address: '92 Maplewood Ave',
      next_visit_date: getTodayISO(),
      notes: 'Interested in resurrection hope #hope #oak-park',
    });

    repo.addVisit({
      contact_id: created.id,
      visit_date: getTodayISO(),
      outcome: 'spoke',
      scriptures: 'John 5:28, 29',
      publication_placed: 'Enjoy Life Forever! Brochure',
      next_question: 'How does the Bible comfort those who grieve?',
      notes: 'Warm conversation.',
    });

    const list = repo.listContacts();
    expect(list).toHaveLength(1);
    expect(list[0].visit_count).toBe(1);
    expect(list[0].last_scriptures).toBe('John 5:28, 29');
    expect(repo.countDueFollowUps()).toBe(1);

    repo.updateContact(created.id, { status: 'bible_study', lesson_progress: 2 });
    expect(repo.getContactById(created.id)?.status).toBe('bible_study');

    repo.deleteContact(created.id);
    expect(repo.listContacts()).toHaveLength(0);
    expect(repo.listVisitsForContact(created.id)).toHaveLength(0);
  });

  it('resolves [[wikilinks]] backlinks, #tags, territories, and unified search', () => {
    const maria = repo.createContact({
      name: 'Maria Santos',
      status: 'bible_study',
      territory: 'Northside',
      notes: 'Lives with [[Carlos Santos]] #family #study',
    });

    const carlos = repo.createContact({
      name: 'Carlos Santos',
      status: 'return_visit',
      territory: 'Northside',
      notes: 'Husband of [[Maria Santos]] #science',
      next_visit_date: addDaysISO(5),
    });

    repo.addVisit({
      contact_id: carlos.id,
      visit_date: getTodayISO(),
      outcome: 'spoke',
      scriptures: 'Heb 3:4',
      publication_placed: '',
      next_question: 'Was life designed?',
      notes: '',
    });

    const backlinksToMaria = repo.getBacklinks(maria.id, maria.name);
    expect(backlinksToMaria).toHaveLength(1);
    expect(backlinksToMaria[0].contact_name).toBe('Carlos Santos');

    expect(repo.listTerritories()).toEqual([{ territory: 'Northside', count: 2 }]);
    expect(repo.listTags().map((t) => t.tag)).toContain('science');
    expect(repo.getContactIdsWithTag('family').has(maria.id)).toBe(true);

    // Search matches visit scripture even when not in contact notes
    const searchHits = repo.searchContactIds('Heb 3:4');
    expect(searchHits.has(carlos.id)).toBe(true);
    expect(searchHits.has(maria.id)).toBe(false);
  });

  it('round-trips binary SQLite export and import cleanly', async () => {
    repo.createContact({
      name: 'Elena Rostova',
      status: 'return_visit',
      territory: 'West End',
      notes: 'Prefers evening visits #evening',
    });

    const binary = client.exportBinary();
    expect(binary.byteLength).toBeGreaterThan(0);

    // Import into a brand new client instance
    const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({ locateFile: () => wasmPath });
    const freshClient = new SQLiteClient();
    freshClient.initWithDatabase(SQL);
    await freshClient.importBinary(binary);

    const freshRepo = new FieldnotesRepository(freshClient);
    const contacts = freshRepo.listContacts();
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe('Elena Rostova');
    expect(contacts[0].territory).toBe('West End');
  });
});
