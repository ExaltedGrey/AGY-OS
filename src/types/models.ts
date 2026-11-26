export type ContactStatus = 'return_visit' | 'bible_study' | 'not_at_home' | 'inactive';

export type VisitOutcome = 'spoke' | 'study_conducted' | 'not_at_home' | 'letter_or_call';

export type SortOption = 'due_first' | 'updated_desc' | 'name_asc' | 'territory_asc';

export type ThemeMode = 'light' | 'dark';

export interface Contact {
  id: string;
  name: string;
  status: ContactStatus;
  address: string;
  apartment: string;
  gps_lat: number | null;
  gps_lng: number | null;
  territory: string;
  best_time: string;
  language: string;
  phone: string;
  publication: string;
  current_lesson: string;
  lesson_progress: number;
  lesson_total: number;
  visited_date: string | null;
  next_visit_date: string | null;
  notes: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactSummary extends Contact {
  visit_count: number;
  last_visit_date: string | null;
  last_scriptures: string;
  last_next_question: string;
}

export interface Visit {
  id: string;
  contact_id: string;
  visit_date: string;
  outcome: VisitOutcome;
  scriptures: string;
  publication_placed: string;
  next_question: string;
  notes: string;
  created_at: string;
}

export interface NewVisitInput {
  contact_id: string;
  visit_date: string;
  outcome: VisitOutcome;
  scriptures: string;
  publication_placed: string;
  next_question: string;
  notes: string;
}

export interface SmartFilter {
  type: 'all' | 'due' | 'status' | 'territory' | 'tag';
  value?: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface TerritoryCount {
  territory: string;
  count: number;
}

export interface BacklinkItem {
  contact_id: string;
  contact_name: string;
  status: ContactStatus;
  snippet: string;
}

export interface BackupMeta {
  last_backup_at: string | null;
  last_modified_at: string | null;
  has_unsaved_changes_since_backup: boolean;
  db_size_bytes: number;
  contact_count: number;
  visit_count: number;
}

export interface PublicationPreset {
  name: string;
  totalLessons: number;
  lessonPrefix: string;
}

export const PUBLICATION_PRESETS: PublicationPreset[] = [
  { name: 'Enjoy Life Forever! (Book)', totalLessons: 60, lessonPrefix: 'Lesson' },
  { name: 'Enjoy Life Forever! (Brochure)', totalLessons: 3, lessonPrefix: 'Lesson' },
  { name: 'Listen to God and Live Forever', totalLessons: 16, lessonPrefix: 'Section' },
  { name: 'Good News From God!', totalLessons: 15, lessonPrefix: 'Lesson' },
  { name: 'Custom Study', totalLessons: 12, lessonPrefix: 'Part' },
];

export const STATUS_META: Record<
  ContactStatus,
  { label: string; shortLabel: string; colorVar: string }
> = {
  bible_study: {
    label: 'Bible Study',
    shortLabel: 'Study',
    colorVar: 'var(--status-study)',
  },
  return_visit: {
    label: 'Return Visit',
    shortLabel: 'RV',
    colorVar: 'var(--status-rv)',
  },
  not_at_home: {
    label: 'Not at Home',
    shortLabel: 'NAH',
    colorVar: 'var(--status-nah)',
  },
  inactive: {
    label: 'Archive',
    shortLabel: 'Archived',
    colorVar: 'var(--status-inactive)',
  },
};

export const OUTCOME_META: Record<VisitOutcome, { label: string; shortLabel: string }> = {
  study_conducted: { label: 'Bible Study Conducted', shortLabel: 'Study' },
  spoke: { label: 'Return Visit — Spoke', shortLabel: 'Spoke' },
  not_at_home: { label: 'Not at Home', shortLabel: 'Not at Home' },
  letter_or_call: { label: 'Phone / Letter / Message', shortLabel: 'Call / Msg' },
};
