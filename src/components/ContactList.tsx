import { HelpCircle, Menu, Pin, Plus, Search, Smartphone, Sparkles, X } from 'lucide-react';
import React from 'react';
import {
  STATUS_META,
  type ContactStatus,
  type ContactSummary,
  type SmartFilter,
  type SortOption,
} from '../types/models';
import { formatRelativeDue } from '../utils/date';
import type { GuideTab } from './GuideModal';

interface ContactListProps {
  contacts: ContactSummary[];
  totalContacts: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: SmartFilter;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenSidebar: () => void;
  onNewContact: () => void;
  onLoadSample: () => void;
  onOpenGuide: (tab?: GuideTab) => void;
}

function getFilterTitle(filter: SmartFilter): string {
  switch (filter.type) {
    case 'all':
      return 'All Contacts';
    case 'due':
      return 'Follow-ups Due';
    case 'status':
      return STATUS_META[(filter.value as ContactStatus) || 'return_visit']?.label ?? 'Contacts';
    case 'territory':
      return filter.value || 'Territory';
    case 'tag':
      return `#${filter.value}`;
    default:
      return 'Contacts';
  }
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  totalContacts,
  selectedId,
  onSelect,
  filter,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenSidebar,
  onNewContact,
  onLoadSample,
  onOpenGuide,
}) => {
  return (
    <section className="list-pane" aria-label="Contacts list">
      <div className="list-header">
        <div className="list-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button
              type="button"
              className="btn-icon mobile-only"
              onClick={onOpenSidebar}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="list-view-title">{getFilterTitle(filter)}</h1>
            <span className="list-count">{contacts.length}</span>
          </div>

          <button
            type="button"
            className="btn-icon mobile-only"
            onClick={onNewContact}
            aria-label="Add contact"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="search-box">
          <Search size={14} className="search-box-icon" />
          <input
            id="contact-search-input"
            type="text"
            className="search-input"
            placeholder="Search names, scriptures, notes…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search contacts and notes"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="sort-row">
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Sort by</span>
          <select
            id="contact-sort-select"
            className="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort contacts"
          >
            <option value="due_first">Follow-up Due</option>
            <option value="updated_desc">Recently Updated</option>
            <option value="name_asc">Name (A–Z)</option>
            <option value="territory_asc">Territory</option>
          </select>
        </div>
      </div>

      <div className="list-scroll">
        {contacts.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13.5px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <p style={{ margin: 0 }}>
              {searchQuery
                ? 'No contacts or visits match your search.'
                : totalContacts === 0
                  ? 'Your local notebook is ready. Add your first Return Visit or load sample notes to explore.'
                  : 'No contacts in this view yet.'}
            </p>
            {totalContacts === 0 && !searchQuery && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '220px', marginTop: '4px' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={onNewContact}>
                  <Plus size={14} /> New Return Visit
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={onLoadSample}>
                  <Sparkles size={14} /> Load Sample Notes
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onOpenGuide('how_to_use')}
                >
                  <HelpCircle size={14} /> How to Use
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => onOpenGuide('install')}
                >
                  <Smartphone size={14} /> Install on Device
                </button>
              </div>
            )}
          </div>
        ) : (
          contacts.map((c) => {
            const due = formatRelativeDue(c.next_visit_date);
            const metaParts = [c.address, c.territory].filter(Boolean);
            const initials = (c.name || '?')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? '')
              .join('') || '?';
            const snippet =
              c.status === 'bible_study' && c.current_lesson
                ? `${c.publication || 'Study'} · ${c.current_lesson}`
                : c.last_next_question
                  ? `Next: ${c.last_next_question}`
                  : c.last_scriptures
                    ? `Scripture: ${c.last_scriptures}`
                    : c.best_time || 'No visits logged yet';

            return (
              <button
                key={c.id}
                type="button"
                className={`contact-row ${c.id === selectedId ? 'selected' : ''}`}
                onClick={() => onSelect(c.id)}
              >
                <div className="contact-row-inner">
                  <span
                    className="avatar-badge"
                    data-status={c.status}
                    title={STATUS_META[c.status].label}
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <div className="contact-row-content">
                    <div className="contact-row-top">
                      <div className="contact-row-name">
                        <span>{c.name || 'Untitled Contact'}</span>
                        {c.pinned && (
                          <Pin
                            size={11}
                            style={{ color: 'var(--warm)', flexShrink: 0 }}
                            aria-label="Pinned"
                          />
                        )}
                      </div>
                      {due.tone !== 'none' && c.status !== 'inactive' && (
                        <span className={`due-pill ${due.tone}`}>{due.label}</span>
                      )}
                    </div>

                    {metaParts.length > 0 && (
                      <div className="contact-row-meta">{metaParts.join(' · ')}</div>
                    )}

                    <div className="contact-row-snippet">{snippet}</div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};
