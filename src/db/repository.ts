import type { BindParams, Database } from 'sql.js';
import type {
  BacklinkItem,
  BackupMeta,
  Contact,
  ContactStatus,
  ContactSummary,
  NewVisitInput,
  TagCount,
  TerritoryCount,
  Visit,
  VisitOutcome,
} from '../types/models';
import { getTodayISO } from '../utils/date';
import { extractTags, extractWikilinks } from '../utils/markdown';
import { sqliteClient, type SQLiteClient } from './sqliteClient';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function queryAll<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: BindParams = []
): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function rowToContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    status: (row.status as ContactStatus) || 'return_visit',
    address: String(row.address ?? ''),
    apartment: String(row.apartment ?? ''),
    gps_lat:
      row.gps_lat !== null && row.gps_lat !== undefined && row.gps_lat !== ''
        ? Number(row.gps_lat)
        : null,
    gps_lng:
      row.gps_lng !== null && row.gps_lng !== undefined && row.gps_lng !== ''
        ? Number(row.gps_lng)
        : null,
    territory: String(row.territory ?? ''),
    best_time: String(row.best_time ?? ''),
    language: String(row.language ?? ''),
    phone: String(row.phone ?? ''),
    publication: String(row.publication ?? ''),
    current_lesson: String(row.current_lesson ?? ''),
    lesson_progress: Number(row.lesson_progress ?? 0),
    lesson_total: Number(row.lesson_total ?? 60),
    visited_date: row.visited_date ? String(row.visited_date) : null,
    next_visit_date: row.next_visit_date ? String(row.next_visit_date) : null,
    notes: String(row.notes ?? ''),
    pinned: Boolean(row.pinned),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

function rowToVisit(row: Record<string, unknown>): Visit {
  return {
    id: String(row.id),
    contact_id: String(row.contact_id),
    visit_date: String(row.visit_date ?? ''),
    outcome: (row.outcome as VisitOutcome) || 'spoke',
    scriptures: String(row.scriptures ?? ''),
    publication_placed: String(row.publication_placed ?? ''),
    next_question: String(row.next_question ?? ''),
    notes: String(row.notes ?? ''),
    created_at: String(row.created_at ?? ''),
  };
}

export class FieldnotesRepository {
  private client: SQLiteClient;

  constructor(client: SQLiteClient = sqliteClient) {
    this.client = client;
  }

  private get db(): Database {
    return this.client.getDatabase();
  }

  private markModified(): void {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO app_meta (key, value) VALUES ('last_modified_at', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [now]
    );
    this.client.scheduleSave();
  }

  getMeta(key: string): string | null {
    const rows = queryAll<{ value: string }>(
      this.db,
      `SELECT value FROM app_meta WHERE key = ?`,
      [key]
    );
    return rows[0]?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db.run(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
    this.client.scheduleSave();
  }

  recordBackupCompleted(): void {
    this.setMeta('last_backup_at', new Date().toISOString());
  }

  getBackupMeta(): BackupMeta {
    const lastBackup = this.getMeta('last_backup_at');
    const lastModified = this.getMeta('last_modified_at');
    const contactCount = Number(
      queryAll<{ c: number }>(this.db, `SELECT COUNT(*) as c FROM contacts`)[0]?.c ?? 0
    );
    const visitCount = Number(
      queryAll<{ c: number }>(this.db, `SELECT COUNT(*) as c FROM visits`)[0]?.c ?? 0
    );
    const dbSize = this.client.exportBinary().byteLength;

    const hasUnsaved =
      contactCount > 0 &&
      (!lastBackup || (lastModified !== null && lastModified > lastBackup));

    return {
      last_backup_at: lastBackup,
      last_modified_at: lastModified,
      has_unsaved_changes_since_backup: hasUnsaved,
      db_size_bytes: dbSize,
      contact_count: contactCount,
      visit_count: visitCount,
    };
  }

  listContacts(): ContactSummary[] {
    const rows = queryAll<Record<string, unknown>>(
      this.db,
      `SELECT
        c.*,
        (SELECT COUNT(*) FROM visits v WHERE v.contact_id = c.id) AS visit_count,
        (SELECT v.visit_date FROM visits v WHERE v.contact_id = c.id ORDER BY v.visit_date DESC, v.created_at DESC LIMIT 1) AS last_visit_date,
        (SELECT v.scriptures FROM visits v WHERE v.contact_id = c.id ORDER BY v.visit_date DESC, v.created_at DESC LIMIT 1) AS last_scriptures,
        (SELECT v.next_question FROM visits v WHERE v.contact_id = c.id ORDER BY v.visit_date DESC, v.created_at DESC LIMIT 1) AS last_next_question
      FROM contacts c
      ORDER BY c.pinned DESC, c.updated_at DESC`
    );

    return rows.map((row) => ({
      ...rowToContact(row),
      visit_count: Number(row.visit_count ?? 0),
      last_visit_date: row.last_visit_date ? String(row.last_visit_date) : null,
      last_scriptures: String(row.last_scriptures ?? ''),
      last_next_question: String(row.last_next_question ?? ''),
    }));
  }

  getContactById(id: string): Contact | null {
    const rows = queryAll<Record<string, unknown>>(
      this.db,
      `SELECT * FROM contacts WHERE id = ?`,
      [id]
    );
    return rows[0] ? rowToContact(rows[0]) : null;
  }

  findContactByName(name: string): Contact | null {
    const rows = queryAll<Record<string, unknown>>(
      this.db,
      `SELECT * FROM contacts WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
      [name]
    );
    return rows[0] ? rowToContact(rows[0]) : null;
  }

  createContact(partial: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>): Contact {
    const now = new Date().toISOString();
    const contact: Contact = {
      id: generateId(),
      name: partial.name !== undefined ? partial.name.trim() : 'New Contact',
      status: partial.status ?? 'return_visit',
      address: partial.address ?? '',
      apartment: partial.apartment ?? '',
      gps_lat: partial.gps_lat ?? null,
      gps_lng: partial.gps_lng ?? null,
      territory: partial.territory ?? '',
      best_time: partial.best_time ?? '',
      language: partial.language ?? '',
      phone: partial.phone ?? '',
      publication: partial.publication ?? '',
      current_lesson: partial.current_lesson ?? '',
      lesson_progress: partial.lesson_progress ?? 0,
      lesson_total: partial.lesson_total ?? 60,
      visited_date: partial.visited_date !== undefined ? partial.visited_date : getTodayISO(),
      next_visit_date: partial.next_visit_date ?? null,
      notes: partial.notes ?? '',
      pinned: partial.pinned ?? false,
      created_at: now,
      updated_at: now,
    };

    this.db.run(
      `INSERT INTO contacts (
        id, name, status, address, apartment, gps_lat, gps_lng, territory, best_time, language, phone,
        publication, current_lesson, lesson_progress, lesson_total, visited_date,
        next_visit_date, notes, pinned, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contact.id,
        contact.name,
        contact.status,
        contact.address,
        contact.apartment,
        contact.gps_lat,
        contact.gps_lng,
        contact.territory,
        contact.best_time,
        contact.language,
        contact.phone,
        contact.publication,
        contact.current_lesson,
        contact.lesson_progress,
        contact.lesson_total,
        contact.visited_date,
        contact.next_visit_date,
        contact.notes,
        contact.pinned ? 1 : 0,
        contact.created_at,
        contact.updated_at,
      ]
    );

    this.markModified();
    return contact;
  }

  updateContact(
    id: string,
    patch: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>
  ): Contact | null {
    const existing = this.getContactById(id);
    if (!existing) return null;

    const updated: Contact = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    this.db.run(
      `UPDATE contacts SET
        name = ?, status = ?, address = ?, apartment = ?, gps_lat = ?, gps_lng = ?, territory = ?,
        best_time = ?, language = ?, phone = ?, publication = ?,
        current_lesson = ?, lesson_progress = ?, lesson_total = ?,
        visited_date = ?, next_visit_date = ?, notes = ?, pinned = ?, updated_at = ?
      WHERE id = ?`,
      [
        updated.name,
        updated.status,
        updated.address,
        updated.apartment,
        updated.gps_lat,
        updated.gps_lng,
        updated.territory,
        updated.best_time,
        updated.language,
        updated.phone,
        updated.publication,
        updated.current_lesson,
        updated.lesson_progress,
        updated.lesson_total,
        updated.visited_date,
        updated.next_visit_date,
        updated.notes,
        updated.pinned ? 1 : 0,
        updated.updated_at,
        id,
      ]
    );

    this.markModified();
    return updated;
  }

  deleteContact(id: string): void {
    this.db.run(`DELETE FROM visits WHERE contact_id = ?`, [id]);
    this.db.run(`DELETE FROM contacts WHERE id = ?`, [id]);
    this.markModified();
  }

  listVisitsForContact(contactId: string): Visit[] {
    const rows = queryAll<Record<string, unknown>>(
      this.db,
      `SELECT * FROM visits WHERE contact_id = ? ORDER BY visit_date DESC, created_at DESC`,
      [contactId]
    );
    return rows.map(rowToVisit);
  }

  listAllVisitsGrouped(): Map<string, Visit[]> {
    const rows = queryAll<Record<string, unknown>>(
      this.db,
      `SELECT * FROM visits ORDER BY visit_date DESC, created_at DESC`
    );
    const map = new Map<string, Visit[]>();
    for (const row of rows) {
      const visit = rowToVisit(row);
      const list = map.get(visit.contact_id) ?? [];
      list.push(visit);
      map.set(visit.contact_id, list);
    }
    return map;
  }

  addVisit(input: NewVisitInput): Visit {
    const now = new Date().toISOString();
    const visit: Visit = {
      id: generateId(),
      contact_id: input.contact_id,
      visit_date: input.visit_date || getTodayISO(),
      outcome: input.outcome,
      scriptures: input.scriptures.trim(),
      publication_placed: input.publication_placed.trim(),
      next_question: input.next_question.trim(),
      notes: input.notes.trim(),
      created_at: now,
    };

    this.db.run(
      `INSERT INTO visits (
        id, contact_id, visit_date, outcome, scriptures, publication_placed,
        next_question, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visit.id,
        visit.contact_id,
        visit.visit_date,
        visit.outcome,
        visit.scriptures,
        visit.publication_placed,
        visit.next_question,
        visit.notes,
        visit.created_at,
      ]
    );

    this.db.run(
      `UPDATE contacts
       SET visited_date = CASE
         WHEN visited_date IS NULL OR ? >= visited_date THEN ?
         ELSE visited_date
       END,
       updated_at = ?
       WHERE id = ?`,
      [visit.visit_date, visit.visit_date, now, visit.contact_id]
    );
    this.markModified();
    return visit;
  }

  updateVisit(
    visitId: string,
    patch: Partial<Omit<Visit, 'id' | 'contact_id' | 'created_at'>>
  ): Visit | null {
    const rows = queryAll<Record<string, unknown>>(
      this.db,
      `SELECT * FROM visits WHERE id = ?`,
      [visitId]
    );
    if (!rows[0]) return null;
    const existing = rowToVisit(rows[0]);
    const updated: Visit = {
      ...existing,
      ...patch,
    };

    this.db.run(
      `UPDATE visits SET
        visit_date = ?, outcome = ?, scriptures = ?, publication_placed = ?,
        next_question = ?, notes = ?
      WHERE id = ?`,
      [
        updated.visit_date,
        updated.outcome,
        updated.scriptures,
        updated.publication_placed,
        updated.next_question,
        updated.notes,
        visitId,
      ]
    );

    this.db.run(`UPDATE contacts SET updated_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      updated.contact_id,
    ]);
    this.markModified();
    return updated;
  }

  deleteVisit(visitId: string): void {
    this.db.run(`DELETE FROM visits WHERE id = ?`, [visitId]);
    this.markModified();
  }

  listTerritories(): TerritoryCount[] {
    const rows = queryAll<{ territory: string; count: number }>(
      this.db,
      `SELECT TRIM(territory) AS territory, COUNT(*) AS count
       FROM contacts
       WHERE TRIM(territory) != ''
       GROUP BY LOWER(TRIM(territory))
       ORDER BY territory ASC`
    );
    return rows.map((r) => ({ territory: r.territory, count: Number(r.count) }));
  }

  listTags(): TagCount[] {
    const contactNotes = queryAll<{ id: string; notes: string }>(
      this.db,
      `SELECT id, notes FROM contacts`
    );
    const visitNotes = queryAll<{ contact_id: string; notes: string }>(
      this.db,
      `SELECT contact_id, notes FROM visits`
    );

    const tagContacts = new Map<string, Set<string>>();

    for (const c of contactNotes) {
      for (const tag of extractTags(c.notes)) {
        const set = tagContacts.get(tag) ?? new Set<string>();
        set.add(c.id);
        tagContacts.set(tag, set);
      }
    }
    for (const v of visitNotes) {
      for (const tag of extractTags(v.notes)) {
        const set = tagContacts.get(tag) ?? new Set<string>();
        set.add(v.contact_id);
        tagContacts.set(tag, set);
      }
    }

    return Array.from(tagContacts.entries())
      .map(([tag, set]) => ({ tag, count: set.size }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  getContactIdsWithTag(tag: string): Set<string> {
    const normalized = tag.toLowerCase();
    const ids = new Set<string>();

    const contactNotes = queryAll<{ id: string; notes: string }>(
      this.db,
      `SELECT id, notes FROM contacts`
    );
    for (const c of contactNotes) {
      if (extractTags(c.notes).includes(normalized)) {
        ids.add(c.id);
      }
    }

    const visitNotes = queryAll<{ contact_id: string; notes: string }>(
      this.db,
      `SELECT contact_id, notes FROM visits`
    );
    for (const v of visitNotes) {
      if (extractTags(v.notes).includes(normalized)) {
        ids.add(v.contact_id);
      }
    }

    return ids;
  }

  getBacklinks(contactId: string, contactName: string): BacklinkItem[] {
    const targetLower = contactName.trim().toLowerCase();
    if (!targetLower) return [];

    const others = queryAll<{ id: string; name: string; status: ContactStatus; notes: string }>(
      this.db,
      `SELECT id, name, status, notes FROM contacts WHERE id != ?`,
      [contactId]
    );
    const otherVisits = queryAll<{ contact_id: string; notes: string }>(
      this.db,
      `SELECT contact_id, notes FROM visits WHERE contact_id != ?`,
      [contactId]
    );
    const visitsByContact = new Map<string, string[]>();
    for (const v of otherVisits) {
      const list = visitsByContact.get(v.contact_id) ?? [];
      list.push(v.notes);
      visitsByContact.set(v.contact_id, list);
    }

    const results: BacklinkItem[] = [];
    for (const row of others) {
      const combinedNotes = [row.notes, ...(visitsByContact.get(row.id) ?? [])]
        .filter(Boolean)
        .join('\n');
      const links = extractWikilinks(combinedNotes);
      if (links.some((l) => l.toLowerCase() === targetLower)) {
        const line =
          combinedNotes
            .split('\n')
            .find((l) => l.toLowerCase().includes(`[[${targetLower}]]`)) ??
          combinedNotes.slice(0, 100);
        results.push({
          contact_id: row.id,
          contact_name: row.name,
          status: row.status,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
    return results;
  }

  searchContactIds(query: string): Set<string> {
    const trimmed = query.trim();
    if (!trimmed) return new Set<string>();
    const like = `%${trimmed}%`;

    const cRows = queryAll<{ id: string }>(
      this.db,
      `SELECT id FROM contacts
       WHERE name LIKE ? OR address LIKE ? OR territory LIKE ?
          OR notes LIKE ? OR publication LIKE ? OR language LIKE ? OR best_time LIKE ?`,
      [like, like, like, like, like, like, like]
    );
    const vRows = queryAll<{ contact_id: string }>(
      this.db,
      `SELECT DISTINCT contact_id FROM visits
       WHERE scriptures LIKE ? OR publication_placed LIKE ? OR next_question LIKE ? OR notes LIKE ?`,
      [like, like, like, like]
    );

    const ids = new Set<string>();
    for (const r of cRows) ids.add(r.id);
    for (const r of vRows) ids.add(r.contact_id);
    return ids;
  }

  countDueFollowUps(): number {
    const today = getTodayISO();
    const rows = queryAll<{ c: number }>(
      this.db,
      `SELECT COUNT(*) AS c FROM contacts
       WHERE status != 'inactive' AND next_visit_date IS NOT NULL AND next_visit_date <= ?`,
      [today]
    );
    return Number(rows[0]?.c ?? 0);
  }
}

export const repository = new FieldnotesRepository(sqliteClient);
