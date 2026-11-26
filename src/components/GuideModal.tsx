import {
  BookOpen,
  CalendarPlus,
  HardDriveDownload,
  Lock,
  Mic,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export type GuideTab = 'how_to_use' | 'install' | 'backups';

interface GuideModalProps {
  open: boolean;
  initialTab?: GuideTab;
  onClose: () => void;
  onOpenBackup: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  open,
  initialTab = 'how_to_use',
  onClose,
  onOpenBackup,
}) => {
  const [tab, setTab] = useState<GuideTab>(initialTab);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Fieldnotes Guide"
      onClick={onClose}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {tab === 'install'
              ? 'Install on Your Device'
              : tab === 'backups'
                ? 'Privacy & Backups'
                : 'How to Use Fieldnotes'}
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close guide">
            <X size={18} />
          </button>
        </div>

        <div className="guide-tabs" role="tablist" aria-label="Guide sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'how_to_use'}
            className={`guide-tab ${tab === 'how_to_use' ? 'active' : ''}`}
            onClick={() => setTab('how_to_use')}
          >
            <Sparkles size={14} />
            How to Use
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'install'}
            className={`guide-tab ${tab === 'install' ? 'active' : ''}`}
            onClick={() => setTab('install')}
          >
            <Smartphone size={14} />
            Install on Device
          </button>
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
        </div>

        <div className="modal-body">
          {tab === 'how_to_use' && (
            <>
              <div className="transfer-card">
                <h3>
                  <BookOpen size={15} style={{ color: 'var(--accent)' }} />
                  Contacts &amp; Automatic Organization
                </h3>
                <ul className="guide-list">
                  <li>
                    <strong>Quick start:</strong> Tap <strong>New Contact</strong>, type their name
                    (tap the pencil icon anytime to rename), pick their status (Return Visit, Bible
                    Study, Not at Home), and enter their address, territory, or{' '}
                    <strong>Date Visited</strong>.
                  </li>
                  <li>
                    <strong>Automatic grouping:</strong> Adding a <strong>Territory / Area</strong>{' '}
                    or typing <code>#tags</code> in your notes automatically groups contacts in the
                    left menu — no manual folders needed.
                  </li>
                  <li>
                    <strong>One-tap Maps &amp; Call:</strong> Tap a contact&apos;s address pill to
                    open directions in Google Maps, or tap their phone number to call.
                  </li>
                  <li>
                    <strong>Bible Study tracker:</strong> Set a contact&apos;s status to{' '}
                    <strong>Bible Study</strong> to track lessons in{' '}
                    <em>Enjoy Life Forever!</em> and other publications.
                  </li>
                </ul>
              </div>

              <div className="transfer-card">
                <h3>
                  <Mic size={15} style={{ color: 'var(--warm)' }} />
                  Unified Notes, Visits &amp; Voice Dictation
                </h3>
                <ul className="guide-list">
                  <li>
                    <strong>All-in-one logging:</strong> Tap <strong>New Visit / Note</strong> to
                    record what you discussed, scriptures, publications shared, and your next
                    follow-up question.
                  </li>
                  <li>
                    <strong>Hands-free dictation:</strong> Tap <strong>Dictate</strong> right on
                    Visit Notes, Next Question, or Pinned Notes to speak your notes right after
                    leaving the door. Tap the pencil on any past visit to edit or dictate more.
                  </li>
                  <li>
                    <strong>Obsidian-style notes:</strong> Type <code>[[Name]]</code> to link
                    family members or neighbors (with automatic backlinks), <code>#tags</code> to
                    categorize, <code>&gt;</code> for scripture quotes, and <code>- [ ]</code> for
                    interactive checklists.
                  </li>
                </ul>
              </div>

              <div className="transfer-card">
                <h3>
                  <CalendarPlus size={15} style={{ color: 'var(--status-study)' }} />
                  Phone Calendar Reminders
                </h3>
                <ul className="guide-list">
                  <li>
                    When logging a visit, pick a <strong>Schedule Next Visit</strong> date and check{' '}
                    <strong>Add to phone calendar (.ics)</strong> — or tap the{' '}
                    <strong>Next: … · Calendar</strong> pill at the top of a contact anytime.
                  </li>
                  <li>
                    Your phone&apos;s calendar opens pre-filled with their name, address, best time,
                    last scriptures, next question, and <strong>visit notes</strong>, plus a 9:00 AM
                    reminder.
                  </li>
                </ul>
              </div>

              <div className="transfer-card">
                <h3>
                  <Share2 size={15} style={{ color: 'var(--accent)' }} />
                  Email or Share a Contact
                </h3>
                <ul className="guide-list">
                  <li>
                    Tap the <strong>Share</strong> icon in the top bar of any contact to{' '}
                    <strong>Email Contact</strong> (pre-fills your email app with all details and
                    visit notes as clean plain text — the recipient does not need any app).
                  </li>
                  <li>
                    You can also tap <strong>Share via Phone…</strong> to send via Messages or
                    WhatsApp, or <strong>Copy as Text</strong>.
                  </li>
                  <li>
                    <strong>Desktop shortcut:</strong> Press <span className="kbd">⌘K</span> (or{' '}
                    <span className="kbd">Ctrl+K</span>) to jump to any contact, territory, or tag.
                  </li>
                </ul>
              </div>
            </>
          )}

          {tab === 'install' && (
            <>
              <div className="callout-box">
                <Smartphone
                  size={16}
                  style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <strong>Works Offline Like a Native App</strong>
                  <p>
                    Install Fieldnotes to your home screen for a full-screen app icon that works
                    with zero cell reception in field service — and stays automatically up to date
                    whenever you have internet.
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

          {tab === 'backups' && (
            <>
              <div className="callout-box">
                <Lock
                  size={16}
                  style={{ color: 'var(--status-study)', flexShrink: 0, marginTop: '2px' }}
                />
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
                    <strong>Google Drive</strong>, or send it via{' '}
                    <strong>AirDrop / Quick Share</strong>.
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
        </div>
      </div>
    </div>
  );
};
