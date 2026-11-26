import {
  Archive,
  BookOpen,
  CalendarClock,
  Command,
  DoorClosed,
  Hash,
  HardDriveDownload,
  HelpCircle,
  Inbox,
  MapPin,
  Moon,
  Plus,
  ShieldCheck,
  Smartphone,
  Sun,
  UserCheck,
  X,
} from 'lucide-react';
import React from 'react';
import type {
  BackupMeta,
  ContactStatus,
  SmartFilter,
  TagCount,
  TerritoryCount,
  ThemeMode,
} from '../types/models';
import type { GuideTab } from './GuideModal';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  filter: SmartFilter;
  onSelectFilter: (filter: SmartFilter) => void;
  totalCount: number;
  dueCount: number;
  statusCounts: Record<ContactStatus, number>;
  territories: TerritoryCount[];
  tags: TagCount[];
  backupMeta: BackupMeta;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNewContact: () => void;
  onOpenCommandPalette: () => void;
  onOpenBackupModal: () => void;
  onOpenGuideModal: (tab?: GuideTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  filter,
  onSelectFilter,
  totalCount,
  dueCount,
  statusCounts,
  territories,
  tags,
  backupMeta,
  theme,
  onToggleTheme,
  onNewContact,
  onOpenCommandPalette,
  onOpenBackupModal,
  onOpenGuideModal,
}) => {
  const select = (next: SmartFilter) => {
    onSelectFilter(next);
    onClose();
  };

  const isActive = (type: SmartFilter['type'], value?: string) =>
    filter.type === type && filter.value === value;

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Workspace navigation">
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <BookOpen size={15} strokeWidth={2.2} />
            </div>
            <span className="brand-title">Fieldnotes</span>
          </div>
          <button
            type="button"
            className="btn-icon mobile-only"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-actions">
          <button
            type="button"
            id="btn-new-contact"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => {
              onNewContact();
              onClose();
            }}
          >
            <Plus size={15} />
            New Contact
          </button>
          <button
            type="button"
            id="btn-command-palette"
            className="btn btn-secondary"
            onClick={onOpenCommandPalette}
            title="Command Palette (⌘K)"
            aria-label="Open Command Palette"
          >
            <Command size={14} />
          </button>
        </div>

        <nav className="sidebar-scroll">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Ministry</div>
            <button
              type="button"
              className={`nav-item ${isActive('all') ? 'active' : ''}`}
              onClick={() => select({ type: 'all' })}
            >
              <span className="nav-item-left">
                <Inbox size={15} />
                <span className="nav-item-label">All Contacts</span>
              </span>
              <span className="nav-badge">{totalCount}</span>
            </button>

            <button
              type="button"
              className={`nav-item ${isActive('due') ? 'active' : ''}`}
              onClick={() => select({ type: 'due' })}
            >
              <span className="nav-item-left">
                <CalendarClock size={15} />
                <span className="nav-item-label">Follow-ups Due</span>
              </span>
              {dueCount > 0 && <span className="nav-badge alert">{dueCount}</span>}
            </button>

            <button
              type="button"
              className={`nav-item ${isActive('status', 'bible_study') ? 'active' : ''}`}
              onClick={() => select({ type: 'status', value: 'bible_study' })}
            >
              <span className="nav-item-left">
                <BookOpen size={15} />
                <span className="nav-item-label">Bible Studies</span>
              </span>
              <span className="nav-badge">{statusCounts.bible_study}</span>
            </button>

            <button
              type="button"
              className={`nav-item ${isActive('status', 'return_visit') ? 'active' : ''}`}
              onClick={() => select({ type: 'status', value: 'return_visit' })}
            >
              <span className="nav-item-left">
                <UserCheck size={15} />
                <span className="nav-item-label">Return Visits</span>
              </span>
              <span className="nav-badge">{statusCounts.return_visit}</span>
            </button>

            <button
              type="button"
              className={`nav-item ${isActive('status', 'not_at_home') ? 'active' : ''}`}
              onClick={() => select({ type: 'status', value: 'not_at_home' })}
            >
              <span className="nav-item-left">
                <DoorClosed size={15} />
                <span className="nav-item-label">Not at Home</span>
              </span>
              <span className="nav-badge">{statusCounts.not_at_home}</span>
            </button>

            <button
              type="button"
              className={`nav-item ${isActive('status', 'inactive') ? 'active' : ''}`}
              onClick={() => select({ type: 'status', value: 'inactive' })}
            >
              <span className="nav-item-left">
                <Archive size={15} />
                <span className="nav-item-label">Archive</span>
              </span>
              <span className="nav-badge">{statusCounts.inactive}</span>
            </button>
          </div>

          {territories.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Territories</div>
              {territories.map((t) => (
                <button
                  key={t.territory}
                  type="button"
                  className={`nav-item ${isActive('territory', t.territory) ? 'active' : ''}`}
                  onClick={() => select({ type: 'territory', value: t.territory })}
                >
                  <span className="nav-item-left">
                    <MapPin size={14} />
                    <span className="nav-item-label">{t.territory}</span>
                  </span>
                  <span className="nav-badge">{t.count}</span>
                </button>
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-title">Tags</div>
              {tags.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  className={`nav-item ${isActive('tag', t.tag) ? 'active' : ''}`}
                  onClick={() => select({ type: 'tag', value: t.tag })}
                >
                  <span className="nav-item-left">
                    <Hash size={14} />
                    <span className="nav-item-label">{t.tag}</span>
                  </span>
                  <span className="nav-badge">{t.count}</span>
                </button>
              ))}
            </div>
          )}
          <div className="sidebar-section">
            <div className="sidebar-section-title">Guide</div>
            <button
              type="button"
              id="btn-how-to-use"
              className="nav-item"
              onClick={() => {
                onOpenGuideModal('how_to_use');
                onClose();
              }}
            >
              <span className="nav-item-left">
                <HelpCircle size={15} />
                <span className="nav-item-label">How to Use</span>
              </span>
            </button>
            <button
              type="button"
              id="btn-install-guide"
              className="nav-item"
              onClick={() => {
                onOpenGuideModal('install');
                onClose();
              }}
            >
              <span className="nav-item-left">
                <Smartphone size={15} />
                <span className="nav-item-label">Install on Device</span>
              </span>
            </button>
            <button
              type="button"
              id="btn-privacy-guide"
              className="nav-item"
              onClick={() => {
                onOpenGuideModal('backups');
                onClose();
              }}
            >
              <span className="nav-item-left">
                <ShieldCheck size={15} />
                <span className="nav-item-label">Privacy &amp; Backups</span>
              </span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            id="btn-backup-vault"
            className="backup-pill"
            onClick={onOpenBackupModal}
            title="Backup & Transfer across devices"
          >
            <span
              className={`backup-dot ${
                backupMeta.has_unsaved_changes_since_backup ? 'needs-backup' : ''
              }`}
            />
            <HardDriveDownload size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {backupMeta.has_unsaved_changes_since_backup ? 'Backup needed' : 'Backup & Sync'}
            </span>
          </button>

          <button
            type="button"
            id="btn-toggle-theme"
            className="btn-icon"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
};
