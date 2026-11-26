import {
  Database,
  FileArchive,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { BackupMeta } from '../types/models';
import { formatRelativeTimestamp } from '../utils/date';

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
  backupMeta: BackupMeta;
  onExportEncrypted: (passphrase: string) => Promise<void>;
  onExportSqlite: () => Promise<void>;
  onExportMarkdown: () => Promise<void>;
  onImportFile: (file: File, passphrase?: string) => Promise<void>;
  onResetAll: () => Promise<void>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  open,
  onClose,
  backupMeta,
  onExportEncrypted,
  onExportSqlite,
  onExportMarkdown,
  onImportFile,
  onResetAll,
}) => {
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const isVaultFile = selectedFile?.name.toLowerCase().endsWith('.fnvault');

  const handleEncryptedExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onExportEncrypted(exportPassphrase);
      setExportPassphrase('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setError(null);
    setBusy(true);
    try {
      await onImportFile(selectedFile, importPassphrase || undefined);
      setSelectedFile(null);
      setImportPassphrase('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setError(null);
    try {
      await onResetAll();
      setConfirmReset(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Backup and device transfer"
      onClick={onClose}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Backup &amp; Device Transfer</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="vault-stats">
            <div className="vault-stat">
              <span className="vault-stat-val">{backupMeta.contact_count}</span>
              <span className="vault-stat-lbl">Contacts</span>
            </div>
            <div className="vault-stat">
              <span className="vault-stat-val">{backupMeta.visit_count}</span>
              <span className="vault-stat-lbl">Logged Visits</span>
            </div>
            <div className="vault-stat">
              <span className="vault-stat-val">{formatBytes(backupMeta.db_size_bytes)}</span>
              <span className="vault-stat-lbl">
                Last backup: {formatRelativeTimestamp(backupMeta.last_backup_at)}
              </span>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* 1. Encrypted Vault Export */}
          <form className="transfer-card" onSubmit={handleEncryptedExport}>
            <h3>
              <ShieldCheck size={16} style={{ color: 'var(--status-study)' }} />
              Encrypted Vault Backup (.fnvault) — Recommended
            </h3>
            <p>
              Encrypts your entire SQLite database with <strong>AES-256-GCM</strong> right in your
              browser. Save the single file to iCloud Drive, Google Drive, or AirDrop it to your new
              phone or laptop.
            </p>
            <div className="inline-row">
              <input
                id="input-export-passphrase"
                type="password"
                className="input"
                placeholder="Choose a backup passphrase (min 4 chars)…"
                value={exportPassphrase}
                onChange={(e) => setExportPassphrase(e.target.value)}
                required
                minLength={4}
              />
              <button
                type="submit"
                id="btn-export-encrypted"
                className="btn btn-primary"
                disabled={busy || exportPassphrase.trim().length < 4}
              >
                <Lock size={14} />
                Export Encrypted
              </button>
            </div>
          </form>

          {/* 2. Restore / Switch Device */}
          <form className="transfer-card" onSubmit={handleImport}>
            <h3>
              <Upload size={16} style={{ color: 'var(--accent)' }} />
              Restore on This Device (.fnvault or .sqlite)
            </h3>
            <p>
              Switching phones or computers? Select your backup file below to restore all contacts,
              notes, and visit logs locally.
            </p>
            <input
              ref={fileInputRef}
              id="input-import-file"
              type="file"
              accept=".fnvault,.sqlite,.db"
              onChange={(e) => {
                setSelectedFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              style={{ fontSize: '13px' }}
            />
            {selectedFile && (
              <div className="inline-row">
                {isVaultFile && (
                  <input
                    id="input-import-passphrase"
                    type="password"
                    className="input"
                    placeholder="Enter backup passphrase…"
                    value={importPassphrase}
                    onChange={(e) => setImportPassphrase(e.target.value)}
                    required
                  />
                )}
                <button
                  type="submit"
                  id="btn-restore-backup"
                  className="btn btn-primary"
                  disabled={busy || (isVaultFile && !importPassphrase.trim())}
                >
                  Restore Database
                </button>
              </div>
            )}
          </form>

          {/* 3. Raw SQLite & Obsidian Markdown Portability */}
          <div className="transfer-card">
            <h3>
              <Database size={16} style={{ color: 'var(--text-secondary)' }} />
              Open Portability (SQLite &amp; Obsidian Markdown)
            </h3>
            <p>
              Your notes belong to you. Export the raw SQLite 3 database file or download every
              contact and visit log as Obsidian-ready <code>.md</code> files with YAML frontmatter.
            </p>
            <div className="inline-row">
              <button
                type="button"
                id="btn-export-sqlite"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void onExportSqlite()}
              >
                <Database size={14} />
                Export .sqlite
              </button>
              <button
                type="button"
                id="btn-export-markdown"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void onExportMarkdown()}
              >
                <FileArchive size={14} />
                Export Obsidian .zip
              </button>
            </div>
          </div>

          {/* Danger Zone: Clear local DB */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Stored locally in SQLite (IndexedDB). No data leaves your browser.
            </span>
            {confirmReset ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={busy}
                  onClick={() => void handleReset()}
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => setConfirmReset(true)}
              >
                <Trash2 size={13} /> Clear Local Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
