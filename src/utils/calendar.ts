import { STATUS_META, type ContactSummary } from '../types/models';
import { buildMapsUrl, formatCoordinates, hasCoordinates } from './location';

function escapeICSText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatDateCompact(isoDate: string): string {
  return isoDate.slice(0, 10).replace(/-/g, '');
}

function addOneDayISO(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(next.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function formatTimestampUTC(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export interface CalendarOverride {
  nextVisitDate?: string | null;
  scriptures?: string;
  nextQuestion?: string;
  visitNotes?: string;
}

export function buildFollowUpICS(
  contact: ContactSummary,
  override?: CalendarOverride
): string {
  const dateISO = override?.nextVisitDate ?? contact.next_visit_date;
  if (!dateISO) {
    throw new Error('A next visit date is required to create a calendar event.');
  }

  const startStr = formatDateCompact(dateISO);
  const endStr = formatDateCompact(addOneDayISO(dateISO));
  const statusLabel = STATUS_META[contact.status]?.label ?? 'Return Visit';
  const summary = `${statusLabel} — ${contact.name.trim() || 'Contact'}`;
  const coords = hasCoordinates(contact)
    ? formatCoordinates(contact.gps_lat, contact.gps_lng)
    : '';
  const location = [contact.address, contact.apartment].filter(Boolean).join(', ') || coords;
  const mapsUrl = buildMapsUrl(contact);

  const nextQuestion = override?.nextQuestion?.trim() || contact.last_next_question.trim();
  const scriptures = override?.scriptures?.trim() || contact.last_scriptures.trim();
  const visitNotes = override?.visitNotes?.trim() || contact.notes.trim();

  const descParts = [
    contact.best_time ? `Best time: ${contact.best_time}` : null,
    contact.territory ? `Territory: ${contact.territory}` : null,
    coords ? `GPS: ${coords}` : null,
    mapsUrl ? `Maps: ${mapsUrl}` : null,
    contact.publication
      ? `Study: ${contact.publication}${contact.current_lesson ? ` (${contact.current_lesson})` : ''}`
      : null,
    scriptures ? `Last scriptures: ${scriptures}` : null,
    nextQuestion ? `Next question: ${nextQuestion}` : null,
    visitNotes ? `\nVisit notes:\n${visitNotes}` : null,
  ].filter(Boolean) as string[];

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fieldnotes//Return Visit & Bible Study Journal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:fieldnotes-${contact.id}-${startStr}@fieldnotes.local`,
    `DTSTAMP:${formatTimestampUTC()}`,
    `DTSTART;VALUE=DATE:${startStr}`,
    `DTEND;VALUE=DATE:${endStr}`,
    `SUMMARY:${escapeICSText(summary)}`,
    location ? `LOCATION:${escapeICSText(location)}` : null,
    hasCoordinates(contact) ? `GEO:${contact.gps_lat};${contact.gps_lng}` : null,
    descParts.length > 0 ? `DESCRIPTION:${escapeICSText(descParts.join('\n'))}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(summary)}`,
    'TRIGGER;RELATED=START:PT9H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n') + '\r\n';
}

export function downloadFollowUpICS(
  contact: ContactSummary,
  override?: CalendarOverride
): void {
  const ics = buildFollowUpICS(contact, override);
  const safeName = (contact.name.trim() || 'follow-up')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fieldnotes-${safeName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
