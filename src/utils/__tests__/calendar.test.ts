import { describe, expect, it } from 'vitest';
import type { ContactSummary } from '../../types/models';
import { buildFollowUpICS } from '../calendar';

const sampleContact: ContactSummary = {
  id: 'c-123',
  name: 'Maria Santos',
  status: 'bible_study',
  address: '418 Cedarbrook Lane',
  apartment: 'Apt 2B',
  territory: 'Northside — Map 14',
  best_time: 'Sat mornings, 10:30 AM',
  language: 'English',
  phone: '',
  publication: 'Enjoy Life Forever! (Book)',
  current_lesson: 'Lesson 04',
  lesson_progress: 4,
  lesson_total: 60,
  next_visit_date: '2026-12-31',
  notes: '',
  pinned: false,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-25T00:00:00.000Z',
  visit_count: 2,
  last_visit_date: '2026-11-20',
  last_scriptures: 'Ps 83:18; Jas 4:8',
  last_next_question: 'What qualities draw us close to God?',
};

describe('buildFollowUpICS', () => {
  it('generates valid RFC 5545 all-day event handling year rollovers and escaping', () => {
    const ics = buildFollowUpICS(sampleContact);

    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
    expect(ics).toContain('SUMMARY:Bible Study — Maria Santos\r\n');
    expect(ics).toContain('LOCATION:418 Cedarbrook Lane\\, Apt 2B\r\n');
    expect(ics).toContain('Last scriptures: Ps 83:18\\; Jas 4:8');
    expect(ics).toContain('Next question: What qualities draw us close to God?');
    expect(ics).toContain('BEGIN:VALARM\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');
  });

  it('uses override follow-up date and question when provided from a fresh visit', () => {
    const ics = buildFollowUpICS(sampleContact, {
      nextVisitDate: '2027-01-10',
      scriptures: 'Rev 21:4',
      nextQuestion: 'How will God end suffering?',
    });

    expect(ics).toContain('DTSTART;VALUE=DATE:20270110\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270111\r\n');
    expect(ics).toContain('Last scriptures: Rev 21:4');
    expect(ics).toContain('Next question: How will God end suffering?');
  });

  it('throws if no next visit date is available', () => {
    expect(() =>
      buildFollowUpICS({ ...sampleContact, next_visit_date: null })
    ).toThrow(/next visit date is required/i);
  });
});
