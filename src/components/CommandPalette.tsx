import {
  HardDriveDownload,
  Hash,
  MapPin,
  Moon,
  Plus,
  Search,
  Sun,
  User,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  STATUS_META,
  type ContactSummary,
  type TagCount,
  type TerritoryCount,
  type ThemeMode,
} from '../types/models';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  contacts: ContactSummary[];
  territories: TerritoryCount[];
  tags: TagCount[];
  theme: ThemeMode;
  onSelectContact: (id: string) => void;
  onSelectTerritory: (territory: string) => void;
  onSelectTag: (tag: string) => void;
  onNewContact: () => void;
  onOpenBackup: () => void;
  onToggleTheme: () => void;
}

interface PaletteEntry {
  id: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  run: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  contacts,
  territories,
  tags,
  theme,
  onSelectContact,
  onSelectTerritory,
  onSelectTag,
  onNewContact,
  onOpenBackup,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteEntry[] = [];

    const actions: PaletteEntry[] = [
      {
        id: 'act-new',
        label: 'New Contact',
        sub: 'Create a new Return Visit or Bible Study',
        icon: <Plus size={15} />,
        run: () => {
          onNewContact();
          onClose();
        },
      },
      {
        id: 'act-backup',
        label: 'Backup & Device Transfer',
        sub: 'Export encrypted .fnvault, .sqlite, or Obsidian Markdown',
        icon: <HardDriveDownload size={15} />,
        run: () => {
          onClose();
          onOpenBackup();
        },
      },
      {
        id: 'act-theme',
        label: theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode',
        sub: 'Toggle color theme',
        icon: theme === 'light' ? <Moon size={15} /> : <Sun size={15} />,
        run: () => {
          onToggleTheme();
          onClose();
        },
      },
    ];

    for (const c of contacts) {
      const hay = `${c.name} ${c.address} ${c.territory} ${c.last_scriptures}`.toLowerCase();
      if (!q || hay.includes(q)) {
        list.push({
          id: `contact-${c.id}`,
          label: c.name || 'Untitled Contact',
          sub: [STATUS_META[c.status].shortLabel, c.territory, c.address].filter(Boolean).join(' · '),
          icon: <User size={15} />,
          run: () => {
            onSelectContact(c.id);
            onClose();
          },
        });
      }
    }

    for (const t of territories) {
      if (!q || t.territory.toLowerCase().includes(q)) {
        list.push({
          id: `terr-${t.territory}`,
          label: `Territory: ${t.territory}`,
          sub: `${t.count} contacts`,
          icon: <MapPin size={15} />,
          run: () => {
            onSelectTerritory(t.territory);
            onClose();
          },
        });
      }
    }

    for (const tg of tags) {
      if (!q || `#${tg.tag}`.includes(q) || tg.tag.includes(q)) {
        list.push({
          id: `tag-${tg.tag}`,
          label: `#${tg.tag}`,
          sub: `${tg.count} tagged`,
          icon: <Hash size={15} />,
          run: () => {
            onSelectTag(tg.tag);
            onClose();
          },
        });
      }
    }

    for (const act of actions) {
      if (!q || `${act.label} ${act.sub ?? ''}`.toLowerCase().includes(q)) {
        list.push(act);
      }
    }

    return list.slice(0, 20);
  }, [
    contacts,
    onClose,
    onNewContact,
    onOpenBackup,
    onSelectContact,
    onSelectTag,
    onSelectTerritory,
    onToggleTheme,
    query,
    tags,
    territories,
    theme,
  ]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(entries.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && entries[activeIndex]) {
      e.preventDefault();
      entries[activeIndex].run();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="palette-input-wrap">
          <Search size={17} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Jump to contact, territory, #tag, or action…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          <span className="kbd">ESC</span>
        </div>

        <div className="palette-list">
          {entries.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matching contacts or commands.
            </div>
          ) : (
            entries.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`palette-item ${idx === activeIndex ? 'highlighted' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={item.run}
              >
                <span className="palette-item-left">
                  <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {item.sub && <span className="palette-item-sub">{item.sub}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
