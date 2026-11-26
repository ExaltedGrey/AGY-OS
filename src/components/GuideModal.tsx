import {
  BookOpen,
  HardDriveDownload,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
  onOpenBackup: () => void;
}

type GuideTab = 'backups' | 'install' | 'tips';

export const GuideModal: React.FC<GuideModalProps> = ({ open, onClose, onOpenBackup }) => {
  const [tab, setTab] = useState<GuideTab>('backups');

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="How to use Fieldnotes"
      onClick={onClose}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">How to Use Fieldnotes</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close guide">
            <X size={18} />
          </button>
        </div>

        <div className="guide-tabs" role="tablist" aria-label="Guide sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'backups'}
            className={`guide-tab ${tab === 'backups' ? 'active' : ''}`}
            onClick={() => setTab('backups')}
          >
            <ShieldCheck size={14} />
            Privacy &amp; Backups
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'install'}
            className={`guide-tab ${tab === 'install' ? 'active' : ''}`}
            onClick={() => setTab('install')}
          >
            <Smartphone size={14} />
            Install as App
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tips'}
            className={`guide-tab ${tab === 'tips' ? 'active' : ''}`}
            onClick={() => setTab('tips')}
          >
            <Sparkles size={14} />
            Tips &amp; Notes
          </button>
        </div>

        <div className="modal-body">
          {tab === 'backups' && (
            <>
              <div className="callout-box">
                <Lock size={16} style={{ color: 'var(--status-study)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>100% Private &amp; Stored on Your Device</strong>
                  <p>
                    Fieldnotes has no accounts and no cloud server. Your contacts, addresses, and
                    study notes live strictly in a local SQLite database inside your own browser —
                    nobody else can ever see them.
                  </p>
                </div>
              </div>

              <div className="transfer-card">
                <h3>Why Backing Up Matters</h3>
                <p>
                  Because nothing is stored in the cloud, clearing your browser data, uninstalling
                  the browser, or switching to a new phone will not carry your notes over
                  automatically. Save an encrypted backup file regularly so your notes are always
                  safe.
                </p>
              </div>

              <div className="transfer-card">
                <h3>How to Back Up or Switch Devices</h3>
                <ol className="guide-steps">
                  <li>
                    Tap <strong>Backup &amp; Sync</strong> at the bottom of the left sidebar (an
                    amber dot reminds you whenever you have new changes).
                  </li>
                  <li>
                    Enter a passphrase you will remember and click{' '}
                    <strong>Export Encrypted (.fnvault)</strong>.
                  </li>
                  <li>
                    Save that single file to <strong>iCloud Drive</strong>,{' '}
                    <strong>Google Drive</strong>, or send it via <strong>AirDrop / Quick Share</strong>.
                  </li>
                  <li>
                    On your new phone or computer, open Fieldnotes, go to{' '}
                    <strong>Backup &amp; Sync → Restore on This Device</strong>, pick your{' '}
                    <code>.fnvault</code> file, and enter your passphrase.
                  </li>
                </ol>
                <div style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      onClose();
                      onOpenBackup();
                    }}
                  >
                    <HardDriveDownload size={14} />
                    Open Backup &amp; Sync
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'install' && (
            <>
              <div className="callout-box">
                <Smartphone size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Works Offline Like a Native App</strong>
                  <p>
                    Add Fieldnotes to your home screen for a full-screen app icon that works even
                    with zero cell reception in field service.
                  </p>
                </div>
              </div>

              <div className="transfer-card">
                <h3>iPhone &amp; iPad (Safari)</h3>
                <ol className="guide-steps">
                  <li>
                    Open this page in <strong>Safari</strong>.
                  </li>
                  <li>
                    Tap the <strong>Share</strong> icon (the square with an upward arrow at the
                    bottom of the screen).
                  </li>
                  <li>
                    Scroll down and tap <strong>Add to Home Screen</strong>, then tap{' '}
                    <strong>Add</strong>.
                  </li>
                </ol>
              </div>

              <div className="transfer-card">
                <h3>Android (Chrome)</h3>
                <ol className="guide-steps">
                  <li>
                    Open this page in <strong>Chrome</strong>.
                  </li>
                  <li>
                    Tap the <strong>Menu (⋮)</strong> button in the top-right corner.
                  </li>
                  <li>
                    Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>) and
                    confirm.
                  </li>
                </ol>
              </div>

              <div className="transfer-card">
                <h3>Computer (Chrome, Edge, or Mac Safari)</h3>
                <ol className="guide-steps">
                  <li>
                    In Chrome or Edge, click the <strong>Install</strong> icon on the right side of
                    the address bar.
                  </li>
                  <li>
                    In Mac Safari, click <strong>File → Add to Dock</strong>.
                  </li>
                </ol>
              </div>
            </>
          )}

          {tab === 'tips' && (
            <>
              <div className="transfer-card">
                <h3>
                  <BookOpen size={15} style={{ color: 'var(--accent)' }} />
                  Obsidian-Style Notes
                </h3>
                <ul className="guide-list">
                  <li>
                    <strong>Link related people:</strong> Type <code>[[Name]]</code> inside notes to
                    link spouses, family members, or neighbors. Clicking the link jumps right to
                    them, and the other contact automatically shows a <em>Linked from</em> backlink.
                  </li>
                  <li>
                    <strong>Organize with tags:</strong> Type <code>#tags</code> like{' '}
                    <code>#resurrection</code> or <code>#evening-call</code> anywhere in your notes
                    to filter them from the sidebar.
                  </li>
                  <li>
                    <strong>Scripture quotes &amp; prep lists:</strong> Start a line with{' '}
                    <code>&gt;</code> for styled scripture quotes, and <code>- [ ]</code> for
                    interactive checkboxes you can tick off while reading.
                  </li>
                </ul>
              </div>

              <div className="transfer-card">
                <h3>Quick Workflow &amp; Portability</h3>
                <ul className="guide-list">
                  <li>
                    <strong>Fast doorstep logging:</strong> Tap <strong>Log Visit</strong> at the
                    top of any contact to record the scripture, placement, next follow-up question,
                    and schedule the next visit date in one step.
                  </li>
                  <li>
                    <strong>Command Palette:</strong> Press <span className="kbd">⌘K</span> (or{' '}
                    <span className="kbd">Ctrl+K</span>) on desktop to jump to any contact,
                    territory, or tag instantly.
                  </li>
                  <li>
                    <strong>No lock-in:</strong> Export your entire notebook as a raw{' '}
                    <code>.sqlite</code> file or an Obsidian-ready Markdown <code>.zip</code>{' '}
                    anytime from <strong>Backup &amp; Sync</strong>.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
