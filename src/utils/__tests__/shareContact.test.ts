import { describe, expect, it } from 'vitest';
import type { ContactSummary, Visit } from '../../types/models';
import {
  buildContactMailtoUrl,
  formatContactShareSubject,
  formatContactShareText,
} from '../shareContact';

const contact: ContactSummary = {
  id: 'c1',
  name: 'Maria Santos',
  status: 'bible_study',
  address: '418 Cedarbrook Lane',
  apartment: 'Apt 2B',
  gps_lat: null,
  gps_lng: null,
  territory: 'Northside — Map 14',
  best_time: 'Sat mornings 10:30 AM',
  language: 'English / Spanish',
  phone: '(555) 234-8910',
  publication: 'Enjoy Life Forever! (Book)',
  current_lesson: 'Lesson 04',
  lesson_progress: 4,
  lesson_total: 60,
  visited_date: '2026-11-20',
  next_visit_date: '2026-11-28',
  notes: 'Very warm reader. Husband Carlos listens nearby.',
  pinned: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-25T00:00:00.000Z',
  visit_count: 1,
  last_visit_date: '2026-11-20',
  last_scriptures: 'Ps 83:18',
  last_next_question: 'What qualities of Jehovah draw us closest to him?',
};

const visits: Visit[] = [
  {
    id: 'v1',
    contact_id: 'c1',
    visit_date: '2026-11-20',
    outcome: 'study_conducted',
    scriptures: 'Ps 83:18; Jas 4:8',
    publication_placed: 'Started Lesson 04',
    next_question: 'What qualities of Jehovah draw us closest to him?',
    notes: 'Completed points 1–3 of Lesson 04.',
    created_at: '2026-11-20T12:00:00.000Z',
  },
];

describe('shareContact utilities', () => {
  it('formats a clean plain-text summary including address Maps link, background notes, and visit log', () => {
    const text = formatContactShareText(contact, visits);

    expect(text).toContain('Maria Santos (Bible Study)');
    expect(text).toContain('Address: 418 Cedarbrook Lane, Apt 2B');
    expect(text).toContain('Maps: https://maps.google.com/?q=418%20Cedarbrook%20Lane%2C%20Apt%202B');
    expect(text).toContain('Study: Enjoy Life Forever! (Book) — Lesson 04');
    expect(text).toContain('Very warm reader. Husband Carlos listens nearby.');
    expect(text).toContain('Scriptures: Ps 83:18; Jas 4:8');
    expect(text).toContain('Next Question: What qualities of Jehovah draw us closest to him?');
    expect(text).toContain('Notes: Completed points 1–3 of Lesson 04.');
  });

  it('includes GPS coordinates and pinpoint Maps link even when no street address is entered', () => {
    const text = formatContactShareText(
      { ...contact, address: '', apartment: '', gps_lat: 34.052235, gps_lng: -118.243683 },
      []
    );
    expect(text).toContain('GPS: 34.052235, -118.243683');
    expect(text).toContain('Maps: https://maps.google.com/?q=34.052235,-118.243683');
  });

  it('builds a properly encoded mailto URL with subject and body', () => {
    const url = buildContactMailtoUrl(contact, visits);
    expect(formatContactShareSubject(contact)).toBe('Bible Study: Maria Santos');
    expect(url.startsWith('mailto:?subject=Bible%20Study%3A%20Maria%20Santos&body=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('418 Cedarbrook Lane, Apt 2B');
  });
});
