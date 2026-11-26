import { BookOpen, CheckCircle2, Plus, Sparkles, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BackupModal } from './components/BackupModal';
import { CommandPalette } from './components/CommandPalette';
import { ContactDetail } from './components/ContactDetail';
import { ContactList } from './components/ContactList';
import { Sidebar } from './components/Sidebar';
import { useFieldnotes } from './hooks/useFieldnotes';

export function App() {
  const fn = useFieldnotes();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelectContact = (id: string) => {
    fn.setSelectedContactId(id);
    setMobileView('detail');
  };

  const handleNewContact = () => {
    fn.createContact({ name: '', status: 'return_visit' });
    setMobileView('detail');
  };

  const handleClickTag = (tag: string) => {
    fn.setFilter({ type: 'tag', value: tag });
    setMobileView('list');
  };

  const handleClickWikilink = (name: string) => {
    fn.openWikilink(name);
    setMobileView('detail');
  };

  if (fn.initError) {
    return (
      <div className="empty-state" style={{ height: '100vh' }}>
        <div className="empty-icon">
          <BookOpen size={24} />
        </div>
        <h1 className="empty-title">Could not start SQLite database</h1>
        <p className="empty-desc">{fn.initError}</p>
      </div>
    );
  }

  if (!fn.ready) {
    return (
      <div className="empty-state" style={{ height: '100vh' }}>
        <div className="empty-icon">
          <BookOpen size={24} />
        </div>
        <p className="empty-desc">Opening local SQLite notebook…</p>
      </div>
    );
  }

  return (
    <div className="app-shell" data-mobile-view={mobileView}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        filter={fn.filter}
        onSelectFilter={(next) => {
          fn.setFilter(next);
          setMobileView('list');
        }}
        totalCount={fn.contacts.length}
        dueCount={fn.dueCount}
        statusCounts={fn.statusCounts}
        territories={fn.territories}
        tags={fn.tags}
        backupMeta={fn.backupMeta}
        theme={fn.theme}
        onToggleTheme={fn.toggleTheme}
        onNewContact={handleNewContact}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        onOpenBackupModal={() => setBackupOpen(true)}
      />

      <ContactList
        contacts={fn.filteredContacts}
        selectedId={fn.selectedContactId}
        onSelect={handleSelectContact}
        filter={fn.filter}
        searchQuery={fn.searchQuery}
        onSearchChange={fn.setSearchQuery}
        sortBy={fn.sortBy}
        onSortChange={fn.setSortBy}
        onOpenSidebar={() => setSidebarOpen(true)}
        onNewContact={handleNewContact}
      />

      {fn.selectedContact ? (
        <ContactDetail
          contact={fn.selectedContact}
          visits={fn.selectedVisits}
          backlinks={fn.selectedBacklinks}
          onUpdate={fn.updateContact}
          onDelete={(id) => {
            fn.deleteContact(id);
            setMobileView('list');
          }}
          onAddVisit={fn.addVisit}
          onDeleteVisit={fn.deleteVisit}
          onClickTag={handleClickTag}
          onClickWikilink={handleClickWikilink}
          onSelectContact={handleSelectContact}
          onBackMobile={() => setMobileView('list')}
        />
      ) : (
        <main className="detail-pane">
          <div className="empty-state">
            <div className="empty-icon">
              <BookOpen size={26} />
            </div>
            <h2 className="empty-title">Welcome to Fieldnotes</h2>
            <p className="empty-desc">
              A calm, private notebook for Return Visits and Bible Studies. Everything stays
              locally in SQLite on your device, with one-click encrypted backups whenever you
              change devices.
            </p>
            <div className="empty-actions">
              <button
                type="button"
                id="btn-empty-new"
                className="btn btn-primary"
                onClick={handleNewContact}
              >
                <Plus size={15} />
                New Return Visit
              </button>
              {fn.contacts.length === 0 && (
                <button
                  type="button"
                  id="btn-load-sample"
                  className="btn btn-secondary"
                  onClick={() => {
                    fn.loadSampleData();
                    setMobileView('detail');
                  }}
                >
                  <Sparkles size={15} />
                  Load Sample Notes
                </button>
              )}
              <button
                type="button"
                id="btn-empty-restore"
                className="btn btn-secondary"
                onClick={() => setBackupOpen(true)}
              >
                <Upload size={15} />
                Restore Backup
              </button>
            </div>
          </div>
        </main>
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        contacts={fn.contacts}
        territories={fn.territories}
        tags={fn.tags}
        theme={fn.theme}
        onSelectContact={handleSelectContact}
        onSelectTerritory={(territory) => {
          fn.setFilter({ type: 'territory', value: territory });
          setMobileView('list');
        }}
        onSelectTag={handleClickTag}
        onNewContact={handleNewContact}
        onOpenBackup={() => setBackupOpen(true)}
        onToggleTheme={fn.toggleTheme}
      />

      <BackupModal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        backupMeta={fn.backupMeta}
        onExportEncrypted={fn.exportEncryptedVault}
        onExportSqlite={fn.exportRawSqlite}
        onExportMarkdown={fn.exportMarkdownBundle}
        onImportFile={fn.importBackupFile}
        onResetAll={fn.resetAllData}
      />

      {fn.toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={15} />
          <span>{fn.toast}</span>
        </div>
      )}
    </div>
  );
}

export default App;
