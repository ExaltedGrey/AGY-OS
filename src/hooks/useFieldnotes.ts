import { useCallback, useEffect, useMemo, useState } from 'react';
import { repository } from '../db/repository';
import { seedSampleMinistryData } from '../db/seedData';
import { sqliteClient } from '../db/sqliteClient';
import type {
  BacklinkItem,
  BackupMeta,
  Contact,
  ContactStatus,
  ContactSummary,
  NewVisitInput,
  SmartFilter,
  SortOption,
  TagCount,
  TerritoryCount,
  ThemeMode,
  Visit,
} from '../types/models';
import { getTodayISO } from '../utils/date';
import { exportObsidianZip } from '../utils/markdown';
import { decryptVault, encryptVault, isEncryptedVaultBytes } from '../utils/vaultCrypto';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useFieldnotes() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [territories, setTerritories] = useState<TerritoryCount[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [backupMeta, setBackupMeta] = useState<BackupMeta>({
    last_backup_at: null,
    last_modified_at: null,
    has_unsaved_changes_since_backup: false,
    db_size_bytes: 0,
    contact_count: 0,
    visit_count: 0,
  });

  const [filter, setFilter] = useState<SmartFilter>({ type: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('due_first');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = window.localStorage.getItem('fieldnotes_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage access errors in sandboxed/file:// contexts
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('fieldnotes_theme', theme);
    } catch {
      // Ignore storage access errors
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#161716' : '#FAF8F5');
    }
  }, [theme]);

  const refreshAll = useCallback(() => {
    const all = repository.listContacts();
    setContacts(all);
    setTerritories(repository.listTerritories());
    setTags(repository.listTags());
    setDueCount(repository.countDueFollowUps());
    setBackupMeta(repository.getBackupMeta());
    setVersion((v) => v + 1);
    setSelectedContactId((prev) => {
      if (prev && all.some((c) => c.id === prev)) return prev;
      return all[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const wasmUrl = `${import.meta.env.BASE_URL}sql-wasm.wasm`;
    sqliteClient
      .init(wasmUrl)
      .then(() => {
        if (cancelled) return;
        refreshAll();
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setInitError(err instanceof Error ? err.message : 'Failed to initialize SQLite.');
      });
    return () => {
      cancelled = true;
    };
  }, [refreshAll]);

  const filteredContacts = useMemo(() => {
    if (!ready) return [];
    const today = getTodayISO();
    let list = [...contacts];

    if (filter.type === 'due') {
      list = list.filter(
        (c) => c.status !== 'inactive' && c.next_visit_date !== null && c.next_visit_date <= today
      );
    } else if (filter.type === 'status' && filter.value) {
      list = list.filter((c) => c.status === filter.value);
    } else if (filter.type === 'territory' && filter.value) {
      const target = filter.value.toLowerCase();
      list = list.filter((c) => c.territory.trim().toLowerCase() === target);
    } else if (filter.type === 'tag' && filter.value) {
      const matchingIds = repository.getContactIdsWithTag(filter.value);
      list = list.filter((c) => matchingIds.has(c.id));
    }

    if (searchQuery.trim()) {
      const matchingIds = repository.searchContactIds(searchQuery);
      list = list.filter((c) => matchingIds.has(c.id));
    }

    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sortBy === 'due_first') {
        const aDue = a.next_visit_date ?? '9999-12-31';
        const bDue = b.next_visit_date ?? '9999-12-31';
        if (aDue !== bDue) return aDue.localeCompare(bDue);
        return b.updated_at.localeCompare(a.updated_at);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'territory_asc') {
        const t = (a.territory || 'zzz').localeCompare(b.territory || 'zzz');
        return t !== 0 ? t : a.name.localeCompare(b.name);
      }
      return b.updated_at.localeCompare(a.updated_at);
    });

    return list;
  }, [contacts, filter, ready, searchQuery, sortBy]);

  const selectedContact: ContactSummary | null = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const selectedVisits: Visit[] = useMemo(() => {
    if (!ready || !selectedContactId) return [];
    return repository.listVisitsForContact(selectedContactId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedContactId, version]);

  const selectedBacklinks: BacklinkItem[] = useMemo(() => {
    if (!ready || !selectedContact) return [];
    return repository.getBacklinks(selectedContact.id, selectedContact.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedContact, version]);

  const statusCounts = useMemo(() => {
    const counts: Record<ContactStatus, number> = {
      bible_study: 0,
      return_visit: 0,
      not_at_home: 0,
      inactive: 0,
    };
    for (const c of contacts) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [contacts]);

  const createContact = useCallback(
    (initial?: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>) => {
      const created = repository.createContact(initial ?? { name: '', status: 'return_visit' });
      refreshAll();
      setSelectedContactId(created.id);
      setFilter({ type: 'all' });
      setSearchQuery('');
      return created;
    },
    [refreshAll]
  );

  const updateContact = useCallback(
    (id: string, patch: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>) => {
      repository.updateContact(id, patch);
      refreshAll();
    },
    [refreshAll]
  );

  const deleteContact = useCallback(
    (id: string) => {
      repository.deleteContact(id);
      refreshAll();
      showToast('Contact deleted');
    },
    [refreshAll, showToast]
  );

  const addVisit = useCallback(
    (input: NewVisitInput, nextVisitDate?: string | null) => {
      repository.addVisit(input);
      if (nextVisitDate !== undefined) {
        repository.updateContact(input.contact_id, { next_visit_date: nextVisitDate });
      }
      refreshAll();
      showToast('Visit & note saved');
    },
    [refreshAll, showToast]
  );

  const updateVisit = useCallback(
    (visitId: string, patch: Partial<Omit<Visit, 'id' | 'contact_id' | 'created_at'>>) => {
      repository.updateVisit(visitId, patch);
      refreshAll();
    },
    [refreshAll]
  );

  const deleteVisit = useCallback(
    (visitId: string) => {
      repository.deleteVisit(visitId);
      refreshAll();
      showToast('Visit removed');
    },
    [refreshAll, showToast]
  );

  const openWikilink = useCallback(
    (targetName: string) => {
      const existing = repository.findContactByName(targetName);
      if (existing) {
        setSelectedContactId(existing.id);
        setFilter({ type: 'all' });
        setSearchQuery('');
        return existing.id;
      }
      const created = repository.createContact({ name: targetName, status: 'return_visit' });
      refreshAll();
      setSelectedContactId(created.id);
      setFilter({ type: 'all' });
      setSearchQuery('');
      showToast(`Created linked contact "${targetName}"`);
      return created.id;
    },
    [refreshAll, showToast]
  );

  const loadSampleData = useCallback(() => {
    const firstId = seedSampleMinistryData(repository);
    refreshAll();
    setSelectedContactId(firstId);
    showToast('Sample ministry notes loaded');
  }, [refreshAll, showToast]);

  const exportEncryptedVault = useCallback(
    async (passphrase: string) => {
      repository.recordBackupCompleted();
      await sqliteClient.flushNow();
      const raw = sqliteClient.exportBinary();
      const encrypted = await encryptVault(raw, passphrase);
      const stamp = getTodayISO();
      triggerDownload(
        new Blob([encrypted.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
        `fieldnotes-backup-${stamp}.fnvault`
      );
      refreshAll();
      showToast('Encrypted vault exported (.fnvault)');
    },
    [refreshAll, showToast]
  );

  const exportRawSqlite = useCallback(async () => {
    repository.recordBackupCompleted();
    await sqliteClient.flushNow();
    const raw = sqliteClient.exportBinary();
    const stamp = getTodayISO();
    triggerDownload(
      new Blob([raw.buffer as ArrayBuffer], { type: 'application/x-sqlite3' }),
      `fieldnotes-${stamp}.sqlite`
    );
    refreshAll();
    showToast('SQLite database exported (.sqlite)');
  }, [refreshAll, showToast]);

  const exportMarkdownBundle = useCallback(async () => {
    const allContacts = repository.listContacts();
    const visitsMap = repository.listAllVisitsGrouped();
    const zipBlob = await exportObsidianZip(allContacts, visitsMap);
    const stamp = getTodayISO();
    triggerDownload(zipBlob, `fieldnotes-obsidian-${stamp}.zip`);
    showToast('Obsidian Markdown bundle exported (.zip)');
  }, [showToast]);

  const importBackupFile = useCallback(
    async (file: File, passphrase?: string) => {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      let sqliteBytes: Uint8Array;
      if (isEncryptedVaultBytes(bytes)) {
        if (!passphrase) {
          throw new Error('This is an encrypted .fnvault file — please enter its passphrase.');
        }
        sqliteBytes = await decryptVault(bytes, passphrase);
      } else {
        sqliteBytes = bytes;
      }

      await sqliteClient.importBinary(sqliteBytes);
      refreshAll();
      showToast('Backup restored successfully');
    },
    [refreshAll, showToast]
  );

  const resetAllData = useCallback(async () => {
    await sqliteClient.resetDatabase();
    refreshAll();
    setSelectedContactId(null);
    showToast('Local database cleared');
  }, [refreshAll, showToast]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  return {
    ready,
    initError,
    contacts,
    filteredContacts,
    selectedContact,
    selectedContactId,
    setSelectedContactId,
    selectedVisits,
    selectedBacklinks,
    territories,
    tags,
    dueCount,
    statusCounts,
    backupMeta,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    theme,
    toggleTheme,
    toast,
    showToast,
    createContact,
    updateContact,
    deleteContact,
    addVisit,
    updateVisit,
    deleteVisit,
    openWikilink,
    loadSampleData,
    exportEncryptedVault,
    exportRawSqlite,
    exportMarkdownBundle,
    importBackupFile,
    resetAllData,
  };
}
