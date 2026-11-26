import JSZip from 'jszip';
import { OUTCOME_META, STATUS_META, type Contact, type Visit } from '../types/models';

const TAG_REGEX = /(?:^|[\s(])#([a-zA-Z0-9][a-zA-Z0-9_/-]*)/g;
const WIKILINK_REGEX = /\[\[([^\[\]\n]+)\]\]/g;

export function extractTags(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(TAG_REGEX)) {
    const tag = match[1].toLowerCase();
    if (tag) found.add(tag);
  }
  return Array.from(found);
}

export function extractWikilinks(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(WIKILINK_REGEX)) {
    const target = match[1].trim();
    if (target) found.add(target);
  }
  return Array.from(found);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toggleCheckboxAtLine(markdown: string, lineIndex: number): string {
  const lines = markdown.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return markdown;
  const line = lines[lineIndex];
  if (/^(\s*[-*]\s+)\[ \]/.test(line)) {
    lines[lineIndex] = line.replace(/^(\s*[-*]\s+)\[ \]/, '$1[x]');
  } else if (/^(\s*[-*]\s+)\[[xX]\]/.test(line)) {
    lines[lineIndex] = line.replace(/^(\s*[-*]\s+)\[[xX]\]/, '$1[ ]');
  }
  return lines.join('\n');
}

export interface MarkdownInlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'tag' | 'wikilink';
  value: string;
}

export function tokenizeInline(line: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  // Combined tokenizer for [[wikilinks]], `code`, **bold**, *italic*, and #tags
  const pattern =
    /(\[\[[^\[\]\n]+\]\]|`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|(?:^|(?<=[\s(]))#[a-zA-Z0-9][a-zA-Z0-9_/-]*)/g;

  let lastIndex = 0;
  for (const match of line.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      tokens.push({ type: 'text', value: line.slice(lastIndex, idx) });
    }
    const raw = match[0];
    if (raw.startsWith('[[') && raw.endsWith(']]')) {
      tokens.push({ type: 'wikilink', value: raw.slice(2, -2).trim() });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else if (raw.startsWith('#')) {
      tokens.push({ type: 'tag', value: raw.slice(1).toLowerCase() });
    } else {
      tokens.push({ type: 'text', value: raw });
    }
    lastIndex = idx + raw.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'text', value: line.slice(lastIndex) });
  }
  return tokens;
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return cleaned || 'Untitled Contact';
}

export function contactToObsidianMarkdown(contact: Contact, visits: Visit[]): string {
  const tags = new Set<string>([
    ...extractTags(contact.notes),
    ...visits.flatMap((v) => extractTags(v.notes)),
  ]);
  const frontmatterLines = [
    '---',
    `name: "${contact.name.replace(/"/g, '\\"')}"`,
    `status: "${STATUS_META[contact.status].label}"`,
    contact.territory ? `territory: "${contact.territory.replace(/"/g, '\\"')}"` : null,
    contact.address
      ? `address: "${[contact.address, contact.apartment].filter(Boolean).join(', ').replace(/"/g, '\\"')}"`
      : null,
    contact.best_time ? `best_time: "${contact.best_time.replace(/"/g, '\\"')}"` : null,
    contact.language ? `language: "${contact.language.replace(/"/g, '\\"')}"` : null,
    contact.phone ? `phone: "${contact.phone.replace(/"/g, '\\"')}"` : null,
    contact.publication ? `publication: "${contact.publication.replace(/"/g, '\\"')}"` : null,
    contact.current_lesson
      ? `current_lesson: "${contact.current_lesson.replace(/"/g, '\\"')}"`
      : null,
    contact.next_visit_date ? `next_visit: ${contact.next_visit_date}` : null,
    tags.size > 0 ? `tags: [${Array.from(tags).join(', ')}]` : null,
    `updated: ${contact.updated_at}`,
    '---',
  ].filter(Boolean);

  const sections: string[] = [frontmatterLines.join('\n'), '', `# ${contact.name}`, ''];

  if (contact.notes.trim()) {
    sections.push(contact.notes.trim(), '');
  }

  if (visits.length > 0) {
    sections.push('## Visit Log', '');
    for (const v of visits) {
      const outcomeLabel = OUTCOME_META[v.outcome]?.label ?? v.outcome;
      sections.push(`### ${v.visit_date} — ${outcomeLabel}`);
      if (v.scriptures) sections.push(`- **Scriptures:** ${v.scriptures}`);
      if (v.publication_placed) sections.push(`- **Shared / Placed:** ${v.publication_placed}`);
      if (v.next_question) sections.push(`- **Next Question:** ${v.next_question}`);
      if (v.notes.trim()) {
        sections.push('', v.notes.trim());
      }
      sections.push('');
    }
  }

  return sections.join('\n').trim() + '\n';
}

export async function exportObsidianZip(
  contacts: Contact[],
  visitsByContact: Map<string, Visit[]>
): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const contact of contacts) {
    let base = sanitizeFilename(contact.name);
    let filename = `${base}.md`;
    let counter = 2;
    while (usedNames.has(filename.toLowerCase())) {
      filename = `${base} (${counter}).md`;
      counter++;
    }
    usedNames.add(filename.toLowerCase());

    const visits = visitsByContact.get(contact.id) ?? [];
    const md = contactToObsidianMarkdown(contact, visits);
    zip.file(filename, md);
  }

  return zip.generateAsync({ type: 'blob' });
}
