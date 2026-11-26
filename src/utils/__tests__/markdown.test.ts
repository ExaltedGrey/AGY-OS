import { describe, expect, it } from 'vitest';
import type { Contact, Visit } from '../../types/models';
import {
  contactToObsidianMarkdown,
  extractTags,
  extractWikilinks,
  toggleCheckboxAtLine,
  tokenizeInline,
} from '../markdown';

describe('markdown utilities', () => {
  it('extracts deduplicated lowercase #tags including nested tags', () => {
    const text = 'Met on Saturday #Bible-Study #territory/North #bible-study and #hope';
    expect(extractTags(text)).toEqual(['bible-study', 'territory/north', 'hope']);
  });

  it('extracts [[wikilinks]] cleanly', () => {
    const text = 'Spouse of [[Maria Santos]] and neighbor of [[David Chen]]. Mentioned [[Maria Santos]] again.';
    expect(extractWikilinks(text)).toEqual(['Maria Santos', 'David Chen']);
  });

  it('toggles task checkboxes at a given line index', () => {
    const md = '- [ ] Bring brochure\n- [x] Read Ps 37:29';
    expect(toggleCheckboxAtLine(md, 0)).toBe('- [x] Bring brochure\n- [x] Read Ps 37:29');
    expect(toggleCheckboxAtLine(md, 1)).toBe('- [ ] Bring brochure\n- [ ] Read Ps 37:29');
  });

  it('tokenizes inline bold, italic, code, wikilinks, and tags', () => {
    const tokens = tokenizeInline('Read **Ps 37:29** with [[Maria Santos]] #study');
    expect(tokens.map((t) => `${t.type}:${t.value}`)).toEqual([
      'text:Read ',
      'bold:Ps 37:29',
      'text: with ',
      'wikilink:Maria Santos',
      'text: ',
      'tag:study',
    ]);
  });

  it('exports Obsidian-compatible Markdown with YAML frontmatter and visit log', () => {
    const contact: Contact = {
      id: 'c1',
      name: 'Maria Santos',
      status: 'bible_study',
      address: '418 Cedarbrook Lane',
      apartment: 'Apt 2B',
      territory: 'Northside',
      best_time: 'Sat 10:30 AM',
      language: 'English',
      phone: '',
      publication: 'Enjoy Life Forever! (Book)',
      current_lesson: 'Lesson 04',
      lesson_progress: 4,
      lesson_total: 60,
      visited_date: '2026-11-20',
      next_visit_date: '2026-12-01',
      notes: 'Lives with [[Carlos Santos]] #bible-study',
      pinned: true,
      created_at: '2026-11-01T10:00:00.000Z',
      updated_at: '2026-11-25T10:00:00.000Z',
    };
    const visits: Visit[] = [
      {
        id: 'v1',
        contact_id: 'c1',
        visit_date: '2026-11-20',
        outcome: 'study_conducted',
        scriptures: 'Ps 83:18',
        publication_placed: 'Lesson 04',
        next_question: 'What qualities draw us close to God?',
        notes: 'Great discussion!',
        created_at: '2026-11-20T12:00:00.000Z',
      },
    ];

    const md = contactToObsidianMarkdown(contact, visits);
    expect(md).toContain('---');
    expect(md).toContain('name: "Maria Santos"');
    expect(md).toContain('status: "Bible Study"');
    expect(md).toContain('tags: [bible-study]');
    expect(md).toContain('## Visit Log');
    expect(md).toContain('### 2026-11-20 — Bible Study Conducted');
    expect(md).toContain('- **Scriptures:** Ps 83:18');
    expect(md).toContain('- **Next Question:** What qualities draw us close to God?');
  });
});
