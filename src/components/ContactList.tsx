import { Menu, Pin, Plus, Search, X } from 'lucide-react';
import React from 'react';
import {
  STATUS_META,
  type ContactStatus,
  type ContactSummary,
  type SmartFilter,
  type SortOption,
} from '../types/models';
import { formatRelativeDue } from '../utils/date';

interface ContactListProps {
  contacts: ContactSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: SmartFilter;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenSidebar: () => void;
  onNewContact: () => void;
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
  selectedId,
  onSelect,
  filter,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onOpenSidebar,
  onNewContact,
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
            }}
          >
            {searchQuery
              ? 'No contacts or visits match your search.'
              : 'No contacts in this view yet.'}
          </div>
        ) : (
          contacts.map((c) => {
            const due = formatRelativeDue(c.next_visit_date);
            const metaParts = [c.address, c.territory].filter(Boolean);
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
                <div className="contact-row-top">
                  <div className="contact-row-name">
                    <span
                      className="status-dot"
                      style={{ background: STATUS_META[c.status].colorVar }}
                      title={STATUS_META[c.status].label}
                    />
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
              </button>
            );
          })
        )}
      </div>
    </section>
  );
};
