import { OUTCOME_META, STATUS_META, type ContactSummary, type Visit } from '../types/models';
import { formatShortDate } from './date';
import { buildMapsUrl, formatCoordinates, hasCoordinates } from './location';

export function formatContactShareSubject(contact: ContactSummary): string {
  const statusLabel = STATUS_META[contact.status]?.label ?? 'Contact';
  const name = contact.name.trim() || 'Contact';
  return `${statusLabel}: ${name}`;
}

export function formatContactShareText(contact: ContactSummary, visits: Visit[]): string {
  const statusLabel = STATUS_META[contact.status]?.label ?? 'Return Visit';
  const name = contact.name.trim() || 'Untitled Contact';
  const fullAddress = [contact.address, contact.apartment].filter(Boolean).join(', ');
  const visitedDate = contact.last_visit_date || contact.visited_date;
  const mapsUrl = buildMapsUrl(contact);

  const lines: string[] = [`${name} (${statusLabel})`, ''];

  const details: string[] = [];
  if (fullAddress) {
    details.push(`Address: ${fullAddress}`);
  }
  if (hasCoordinates(contact)) {
    details.push(`GPS: ${formatCoordinates(contact.gps_lat, contact.gps_lng)}`);
  }
  if (mapsUrl) {
    details.push(`Maps: ${mapsUrl}`);
  }
  if (contact.territory) details.push(`Territory: ${contact.territory}`);
  if (contact.best_time) details.push(`Best Time: ${contact.best_time}`);
  if (contact.language) details.push(`Language: ${contact.language}`);
  if (contact.phone) details.push(`Phone: ${contact.phone}`);
  if (visitedDate) details.push(`Last Visited: ${formatShortDate(visitedDate)}`);
  if (contact.next_visit_date) {
    details.push(`Next Visit: ${formatShortDate(contact.next_visit_date)}`);
  }
  if (contact.publication) {
    const lessonPart = contact.current_lesson ? ` — ${contact.current_lesson}` : '';
    details.push(`Study: ${contact.publication}${lessonPart}`);
  }

  if (details.length > 0) {
    lines.push(...details, '');
  }

  if (contact.notes.trim()) {
    lines.push('--- Background & Notes ---', contact.notes.trim(), '');
  }

  if (visits.length > 0) {
    lines.push('--- Visit Log ---');
    for (const v of visits) {
      const outcomeLabel = OUTCOME_META[v.outcome]?.label ?? v.outcome;
      lines.push(`${formatShortDate(v.visit_date)} — ${outcomeLabel}`);
      if (v.scriptures) lines.push(`  Scriptures: ${v.scriptures}`);
      if (v.publication_placed) lines.push(`  Shared: ${v.publication_placed}`);
      if (v.next_question) lines.push(`  Next Question: ${v.next_question}`);
      if (v.notes.trim()) lines.push(`  Notes: ${v.notes.trim()}`);
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export function buildContactMailtoUrl(contact: ContactSummary, visits: Visit[]): string {
  const subject = formatContactShareSubject(contact);
  const body = formatContactShareText(contact, visits);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareContactNatively(
  contact: ContactSummary,
  visits: Visit[]
): Promise<boolean> {
  if (!canUseNativeShare()) return false;
  await navigator.share({
    title: formatContactShareSubject(contact),
    text: formatContactShareText(contact, visits),
  });
  return true;
}

export async function copyContactToClipboard(
  contact: ContactSummary,
  visits: Visit[]
): Promise<void> {
  const text = formatContactShareText(contact, visits);
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}
