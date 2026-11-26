import React from 'react';
import { tokenizeInline } from '../utils/markdown';

interface MarkdownPreviewProps {
  content: string;
  onClickTag: (tag: string) => void;
  onClickWikilink: (name: string) => void;
  onToggleCheckbox?: (lineIndex: number) => void;
}

function renderInline(
  text: string,
  onClickTag: (tag: string) => void,
  onClickWikilink: (name: string) => void
): React.ReactNode[] {
  return tokenizeInline(text).map((tok, i) => {
    switch (tok.type) {
      case 'bold':
        return <strong key={i}>{tok.value}</strong>;
      case 'italic':
        return <em key={i}>{tok.value}</em>;
      case 'code':
        return <code key={i}>{tok.value}</code>;
      case 'tag':
        return (
          <button
            key={i}
            type="button"
            className="md-tag"
            onClick={(e) => {
              e.stopPropagation();
              onClickTag(tok.value);
            }}
          >
            #{tok.value}
          </button>
        );
      case 'wikilink':
        return (
          <button
            key={i}
            type="button"
            className="md-wikilink"
            onClick={(e) => {
              e.stopPropagation();
              onClickWikilink(tok.value);
            }}
          >
            {tok.value}
          </button>
        );
      default:
        return <React.Fragment key={i}>{tok.value}</React.Fragment>;
    }
  });
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  onClickTag,
  onClickWikilink,
  onToggleCheckbox,
}) => {
  if (!content.trim()) {
    return (
      <p style={{ color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
        No notes yet. Click Edit to jot down conversation details, scriptures, #tags, or
        [[linked contacts]].
      </p>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = renderInline(headingMatch[2], onClickTag, onClickWikilink);
      if (level === 1) elements.push(<h1 key={i}>{headingContent}</h1>);
      else if (level === 2) elements.push(<h2 key={i}>{headingContent}</h2>);
      else elements.push(<h3 key={i}>{headingContent}</h3>);
      i++;
      continue;
    }

    // Blockquote (great for scripture quotations)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      const start = i;
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={start}>
          {renderInline(quoteLines.join(' '), onClickTag, onClickWikilink)}
        </blockquote>
      );
      continue;
    }

    // Bullet / Task list
    if (/^\s*[-*]\s+/.test(line)) {
      const listStart = i;
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const lineIdx = i;
        const rawLine = lines[i];
        const taskMatch = rawLine.match(/^\s*[-*]\s+\[([ xX])\]\s*(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === 'x';
          items.push(
            <li key={lineIdx} className="md-task-item">
              <input
                type="checkbox"
                className="md-task-checkbox"
                checked={checked}
                onChange={() => onToggleCheckbox?.(lineIdx)}
                aria-label={`Toggle task: ${taskMatch[2]}`}
              />
              <span className={checked ? 'md-task-done' : undefined}>
                {renderInline(taskMatch[2], onClickTag, onClickWikilink)}
              </span>
            </li>
          );
        } else {
          const text = rawLine.replace(/^\s*[-*]\s+/, '');
          items.push(<li key={lineIdx}>{renderInline(text, onClickTag, onClickWikilink)}</li>);
        }
        i++;
      }
      elements.push(<ul key={listStart}>{items}</ul>);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i}>{renderInline(line, onClickTag, onClickWikilink)}</p>);
    i++;
  }

  return <div className="md-prose">{elements}</div>;
};
