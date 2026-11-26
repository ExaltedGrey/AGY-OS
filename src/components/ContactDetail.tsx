import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  HelpCircle,
  Link2,
  MapPin,
  Mic,
  Minus,
  Navigation,
  Phone,
  Pin,
  Plus,
  ScrollText,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { appendDictatedText, useDictation } from '../hooks/useDictation';
import {
  OUTCOME_META,
  PUBLICATION_PRESETS,
  STATUS_META,
  type BacklinkItem,
  type Contact,
  type ContactStatus,
  type ContactSummary,
  type NewVisitInput,
  type Visit,
  type VisitOutcome,
} from '../types/models';
import { addDaysISO, formatRelativeDue, formatShortDate, getTodayISO } from '../utils/date';
import { toggleCheckboxAtLine } from '../utils/markdown';
import { MarkdownPreview } from './MarkdownPreview';

interface ContactDetailProps {
  contact: ContactSummary;
  visits: Visit[];
  backlinks: BacklinkItem[];
  onUpdate: (id: string, patch: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>) => void;
  onDelete: (id: string) => void;
  onAddVisit: (input: NewVisitInput, nextVisitDate?: string | null) => void;
  onDeleteVisit: (visitId: string) => void;
  onClickTag: (tag: string) => void;
  onClickWikilink: (name: string) => void;
  onSelectContact: (id: string) => void;
  onBackMobile: () => void;
  composerOpenSignal?: number;
}

const STATUS_OPTIONS: ContactStatus[] = ['return_visit', 'bible_study', 'not_at_home', 'inactive'];

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contact,
  visits,
  backlinks,
  onUpdate,
  onDelete,
  onAddVisit,
  onDeleteVisit,
  onClickTag,
  onClickWikilink,
  onSelectContact,
  onBackMobile,
  composerOpenSignal = 0,
}) => {
  const [notesMode, setNotesMode] = useState<'preview' | 'edit'>(() =>
    contact.notes.trim() ? 'preview' : 'edit'
  );
  const [editingInfo, setEditingInfo] = useState(
    () => !(contact.name.trim() || contact.address.trim() || contact.territory.trim())
  );
  const [mobileTab, setMobileTab] = useState<'notes' | 'visits'>('notes');
  const [showVisitComposer, setShowVisitComposer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Visit composer fields
  const [visitDate, setVisitDate] = useState(getTodayISO());
  const [outcome, setOutcome] = useState<VisitOutcome>(
    contact.status === 'bible_study' ? 'study_conducted' : 'spoke'
  );
  const [scriptures, setScriptures] = useState('');
  const [publicationPlaced, setPublicationPlaced] = useState('');
  const [nextQuestion, setNextQuestion] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(addDaysISO(7));

  const notesDictation = useDictation((spoken) => {
    onUpdate(contact.id, { notes: appendDictatedText(contact.notes, spoken) });
  });

  const visitDictation = useDictation((spoken) => {
    setVisitNotes((prev) => appendDictatedText(prev, spoken));
  });

  useEffect(() => {
    notesDictation.stop();
    visitDictation.stop();
    setNotesMode(contact.notes.trim() ? 'preview' : 'edit');
    setEditingInfo(!(contact.name.trim() || contact.address.trim() || contact.territory.trim()));
    setMobileTab('notes');
    setShowVisitComposer(false);
    setConfirmDelete(false);
    setOutcome(contact.status === 'bible_study' ? 'study_conducted' : 'spoke');
    setVisitDate(getTodayISO());
    setNextFollowUp(addDaysISO(7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  useEffect(() => {
    if (composerOpenSignal > 0) {
      setShowVisitComposer(true);
    }
  }, [composerOpenSignal]);

  const due = formatRelativeDue(contact.next_visit_date);

  const handlePublicationChange = (pubName: string) => {
    const preset = PUBLICATION_PRESETS.find((p) => p.name === pubName);
    if (preset) {
      const nextProgress = Math.min(contact.lesson_progress || 1, preset.totalLessons);
      onUpdate(contact.id, {
        publication: preset.name,
        lesson_total: preset.totalLessons,
        lesson_progress: nextProgress,
        current_lesson: `${preset.lessonPrefix} ${String(nextProgress).padStart(2, '0')}`,
      });
    } else {
      onUpdate(contact.id, { publication: pubName });
    }
  };

  const stepLesson = (delta: number) => {
    const total = Math.max(1, contact.lesson_total || 60);
    const next = Math.max(0, Math.min(total, (contact.lesson_progress || 0) + delta));
    const preset = PUBLICATION_PRESETS.find((p) => p.name === contact.publication);
    const prefix = preset?.lessonPrefix ?? 'Lesson';
    onUpdate(contact.id, {
      lesson_progress: next,
      current_lesson: next > 0 ? `${prefix} ${String(next).padStart(2, '0')}` : '',
    });
  };

  const handleToggleCheckbox = (lineIndex: number) => {
    const updated = toggleCheckboxAtLine(contact.notes, lineIndex);
    onUpdate(contact.id, { notes: updated });
  };

  const handleSubmitVisit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVisit(
      {
        contact_id: contact.id,
        visit_date: visitDate || getTodayISO(),
        outcome,
        scriptures,
        publication_placed: publicationPlaced,
        next_question: nextQuestion,
        notes: visitNotes,
      },
      nextFollowUp ? nextFollowUp : null
    );
    setScriptures('');
    setPublicationPlaced('');
    setNextQuestion('');
    setVisitNotes('');
    setShowVisitComposer(false);
  };

  const progressPct =
    contact.lesson_total > 0
      ? Math.min(100, Math.round((contact.lesson_progress / contact.lesson_total) * 100))
      : 0;

  return (
    <main className="detail-pane" aria-label="Contact details and notes">
      <div className="detail-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            type="button"
            className="btn-icon mobile-only"
            onClick={onBackMobile}
            aria-label="Back to contacts list"
          >
            <ArrowLeft size={18} />
          </button>
          <span
            style={{
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contact.territory || STATUS_META[contact.status].label}
            {contact.visit_count > 0
              ? ` · ${contact.visit_count} ${contact.visit_count === 1 ? 'visit' : 'visits'}`
              : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            id="btn-log-visit-top"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setMobileTab('visits');
              setShowVisitComposer((v) => !v);
            }}
          >
            <Plus size={14} />
            Log Visit
          </button>

          <button
            type="button"
            className={`btn-icon ${contact.pinned ? 'active' : ''}`}
            onClick={() => onUpdate(contact.id, { pinned: !contact.pinned })}
            title={contact.pinned ? 'Unpin contact' : 'Pin contact to top'}
            aria-label="Toggle pin"
          >
            <Pin size={16} />
          </button>

          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(contact.id)}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setConfirmDelete(true)}
              title="Delete contact"
              aria-label="Delete contact"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="detail-scroll">
        <div className="detail-container">
          {/* Header: Monogram, Name & Status Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="contact-header-row">
              <span
                className="avatar-badge lg"
                data-status={contact.status}
                aria-hidden="true"
              >
                {(contact.name || '?')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('') || '?'}
              </span>
              <input
                id="contact-name-input"
                type="text"
                className="contact-title-input"
                value={contact.name}
                placeholder="Contact Name…"
                onChange={(e) => onUpdate(contact.id, { name: e.target.value })}
                aria-label="Contact name"
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div className="status-selector" role="group" aria-label="Contact status">
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    data-status={st}
                    className={`status-chip ${contact.status === st ? 'active' : ''}`}
                    onClick={() => onUpdate(contact.id, { status: st })}
                  >
                    <span
                      className="status-dot"
                      style={{ background: STATUS_META[st].colorVar }}
                    />
                    {STATUS_META[st].label}
                  </button>
                ))}
              </div>

              {due.tone !== 'none' && contact.status !== 'inactive' && (
                <span className={`due-pill ${due.tone}`}>{due.label}</span>
              )}
            </div>
          </div>

          {/* Compact Collapsible Contact Info Summary */}
          <section className="info-summary-card" aria-label="Contact details">
            <div className="info-summary-top">
              <div className="info-pills">
                {contact.address && (
                  <a
                    className="info-pill interactive"
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      [contact.address, contact.apartment].filter(Boolean).join(', ')
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open address in Maps"
                  >
                    <Navigation size={12} />
                    <span>
                      {[contact.address, contact.apartment].filter(Boolean).join(', ')}
                    </span>
                  </a>
                )}
                {contact.best_time && (
                  <span className="info-pill">
                    <Clock size={12} />
                    <span>{contact.best_time}</span>
                  </span>
                )}
                {contact.language && (
                  <span className="info-pill">
                    <Globe size={12} />
                    <span>{contact.language}</span>
                  </span>
                )}
                {contact.phone && (
                  <a
                    className="info-pill interactive"
                    href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}
                    title="Call phone number"
                  >
                    <Phone size={12} />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.next_visit_date && (
                  <span className="info-pill">
                    <Calendar size={12} />
                    <span>Next: {formatShortDate(contact.next_visit_date)}</span>
                  </span>
                )}
                {!contact.address &&
                  !contact.best_time &&
                  !contact.language &&
                  !contact.phone &&
                  !contact.next_visit_date && (
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Add address, best time to visit, territory, or next visit date…
                    </span>
                  )}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditingInfo((v) => !v)}
                aria-expanded={editingInfo}
              >
                {editingInfo ? (
                  <>
                    Done <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Edit Info <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>

            {editingInfo && (
              <div className="meta-grid" style={{ border: 'none', padding: '6px 0 0', background: 'transparent' }}>
                <label className="meta-field">
                  <span className="meta-label">
                    <MapPin size={11} /> Address
                  </span>
                  <input
                    type="text"
                    className="meta-input"
                    value={contact.address}
                    placeholder="Street address"
                    onChange={(e) => onUpdate(contact.id, { address: e.target.value })}
                  />
                </label>

                <label className="meta-field">
                  <span className="meta-label">Unit / Apt</span>
                  <input
                    type="text"
                    className="meta-input"
                    value={contact.apartment}
                    placeholder="Apt, floor, or gate"
                    onChange={(e) => onUpdate(contact.id, { apartment: e.target.value })}
                  />
                </label>

                <label className="meta-field">
                  <span className="meta-label">Territory / Area</span>
                  <input
                    type="text"
                    className="meta-input"
                    value={contact.territory}
                    placeholder="e.g. Northside — Map 14"
                    onChange={(e) => onUpdate(contact.id, { territory: e.target.value })}
                  />
                </label>

                <label className="meta-field">
                  <span className="meta-label">
                    <Clock size={11} /> Best Time
                  </span>
                  <input
                    type="text"
                    className="meta-input"
                    value={contact.best_time}
                    placeholder="e.g. Sat mornings"
                    onChange={(e) => onUpdate(contact.id, { best_time: e.target.value })}
                  />
                </label>

                <label className="meta-field">
                  <span className="meta-label">
                    <Globe size={11} /> Language
                  </span>
                  <input
                    type="text"
                    className="meta-input"
                    value={contact.language}
                    placeholder="e.g. English, Spanish"
                    onChange={(e) => onUpdate(contact.id, { language: e.target.value })}
                  />
                </label>

                <label className="meta-field">
                  <span className="meta-label">
                    <Phone size={11} /> Phone
                  </span>
                  <input
                    type="tel"
                    className="meta-input"
                    value={contact.phone}
                    placeholder="Optional"
                    onChange={(e) => onUpdate(contact.id, { phone: e.target.value })}
                  />
                </label>

                <label className="meta-field">
                  <span className="meta-label">
                    <Calendar size={11} /> Next Visit
                  </span>
                  <input
                    type="date"
                    className="meta-input"
                    value={contact.next_visit_date ?? ''}
                    onChange={(e) =>
                      onUpdate(contact.id, {
                        next_visit_date: e.target.value ? e.target.value : null,
                      })
                    }
                  />
                </label>
              </div>
            )}
          </section>

          {/* Bible Study Progress Tracker */}
          {(contact.status === 'bible_study' || contact.publication) && (
            <section className="study-card" aria-label="Bible study progress">
              <div className="study-card-top">
                <div className="study-title">
                  <BookOpen size={15} />
                  <span>Study Progress</span>
                </div>

                <div className="study-controls">
                  <select
                    className="study-select"
                    value={
                      PUBLICATION_PRESETS.some((p) => p.name === contact.publication)
                        ? contact.publication
                        : ''
                    }
                    onChange={(e) => handlePublicationChange(e.target.value)}
                    aria-label="Study publication"
                  >
                    <option value="">Select publication…</option>
                    {PUBLICATION_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <div className="stepper" aria-label="Lesson progress stepper">
                    <button
                      type="button"
                      onClick={() => stepLesson(-1)}
                      disabled={contact.lesson_progress <= 0}
                      aria-label="Previous lesson"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="stepper-value">
                      {contact.lesson_progress} / {contact.lesson_total}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepLesson(1)}
                      disabled={contact.lesson_progress >= contact.lesson_total}
                      aria-label="Next lesson"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>{contact.current_lesson || 'Not started'}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{progressPct}%</span>
              </div>
            </section>
          )}

          {/* Mobile Notes / Visits Tab Switcher */}
          <div className="mobile-section-tabs" role="tablist" aria-label="Contact sections">
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'notes'}
              className={`mobile-section-tab ${mobileTab === 'notes' ? 'active' : ''}`}
              onClick={() => setMobileTab('notes')}
            >
              <ScrollText size={14} />
              Notes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'visits'}
              className={`mobile-section-tab ${mobileTab === 'visits' ? 'active' : ''}`}
              onClick={() => setMobileTab('visits')}
            >
              <BookMarked size={14} />
              Visits ({visits.length})
            </button>
          </div>

          {/* Obsidian-style Markdown Notes */}
          <section
            aria-label="Markdown notes"
            className={mobileTab === 'visits' ? 'mobile-tab-hidden' : undefined}
          >
            <div className="section-header">
              <h2 className="section-heading">
                <ScrollText size={13} /> Notes
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {notesDictation.supported && (
                  <button
                    type="button"
                    id="btn-dictate-notes"
                    className={`btn-dictate ${notesDictation.listening ? 'recording' : ''}`}
                    onClick={() => {
                      if (!notesDictation.listening) {
                        visitDictation.stop();
                        setNotesMode('edit');
                      }
                      notesDictation.toggle();
                    }}
                    title={notesDictation.listening ? 'Stop dictation' : 'Dictate notes with microphone'}
                  >
                    {notesDictation.listening ? (
                      <>
                        <span className="recording-dot" />
                        <Square size={11} />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic size={13} />
                        Dictate
                      </>
                    )}
                  </button>
                )}
                <div className="segmented" role="tablist" aria-label="Notes mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notesMode === 'preview'}
                    className={notesMode === 'preview' ? 'active' : ''}
                    onClick={() => {
                      notesDictation.stop();
                      setNotesMode('preview');
                    }}
                  >
                    Read
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={notesMode === 'edit'}
                    className={notesMode === 'edit' ? 'active' : ''}
                    onClick={() => setNotesMode('edit')}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {notesDictation.error && (
              <div className="error-banner" style={{ marginBottom: '8px' }}>
                {notesDictation.error}
              </div>
            )}

            {notesMode === 'edit' ? (
              <div>
                <textarea
                  id="contact-notes-editor"
                  className="notes-textarea"
                  value={contact.notes}
                  onChange={(e) => onUpdate(contact.id, { notes: e.target.value })}
                  placeholder={`Write or dictate notes in Markdown…\n\n- Use [[Name]] to link to a family member or neighbor\n- Use #tags like #bible-study or #resurrection\n- Use > for scripture quotes and - [ ] for study prep checklists`}
                />
                {notesDictation.listening && (
                  <div className="dictation-live" aria-live="polite">
                    {notesDictation.interimText
                      ? `Listening: "${notesDictation.interimText}"`
                      : 'Listening… speak your notes now.'}
                  </div>
                )}
                <div className="notes-hint">
                  Supports Markdown headings, <code>&gt;</code> scripture quotes,{' '}
                  <code>- [ ]</code> checklists, <code>[[Wikilinks]]</code>, and <code>#tags</code>.
                </div>
              </div>
            ) : (
              <div
                className="notes-preview-box"
                onDoubleClick={() => setNotesMode('edit')}
                title="Double-click to edit notes"
              >
                <MarkdownPreview
                  content={contact.notes}
                  onClickTag={onClickTag}
                  onClickWikilink={onClickWikilink}
                  onToggleCheckbox={handleToggleCheckbox}
                />
              </div>
            )}

            {backlinks.length > 0 && (
              <div className="backlinks-box">
                <div className="section-heading">
                  <Link2 size={13} /> Linked from ({backlinks.length})
                </div>
                <div className="backlinks-list">
                  {backlinks.map((bl) => (
                    <button
                      key={bl.contact_id}
                      type="button"
                      className="backlink-item"
                      onClick={() => onSelectContact(bl.contact_id)}
                    >
                      <span className="backlink-name">{bl.contact_name}</span>
                      <span className="backlink-snippet">{bl.snippet}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Visit Log Timeline */}
          <section
            aria-label="Visit history"
            className={mobileTab === 'notes' ? 'mobile-tab-hidden' : undefined}
          >
            <div className="section-header">
              <h2 className="section-heading">
                <BookMarked size={13} /> Visit Log ({visits.length})
              </h2>
              {!showVisitComposer && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowVisitComposer(true)}
                >
                  <Plus size={13} /> Add Entry
                </button>
              )}
            </div>

            {showVisitComposer && (
              <form className="visit-composer" onSubmit={handleSubmitVisit}>
                <div className="form-grid-2">
                  <label className="field-group">
                    <span className="field-label">Visit Date</span>
                    <input
                      type="date"
                      className="input"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      required
                    />
                  </label>

                  <label className="field-group">
                    <span className="field-label">Outcome</span>
                    <select
                      className="select"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value as VisitOutcome)}
                    >
                      {Object.entries(OUTCOME_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-grid-2">
                  <label className="field-group">
                    <span className="field-label">Scriptures Discussed</span>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Ps 37:29; Rev 21:4"
                      value={scriptures}
                      onChange={(e) => setScriptures(e.target.value)}
                    />
                  </label>

                  <label className="field-group">
                    <span className="field-label">Publication / Video Shared</span>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Enjoy Life Forever! Lesson 04"
                      value={publicationPlaced}
                      onChange={(e) => setPublicationPlaced(e.target.value)}
                    />
                  </label>
                </div>

                <label className="field-group">
                  <span className="field-label">Question / Topic for Next Visit</span>
                  <input
                    type="text"
                    className="input"
                    placeholder="What will you follow up on next time?"
                    value={nextQuestion}
                    onChange={(e) => setNextQuestion(e.target.value)}
                  />
                </label>

                <div className="field-group">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <label htmlFor="visit-notes-textarea" className="field-label">
                      Visit Notes
                    </label>
                    {visitDictation.supported && (
                      <button
                        type="button"
                        className={`btn-dictate ${visitDictation.listening ? 'recording' : ''}`}
                        onClick={() => {
                          if (!visitDictation.listening) notesDictation.stop();
                          visitDictation.toggle();
                        }}
                      >
                        {visitDictation.listening ? (
                          <>
                            <span className="recording-dot" />
                            <Square size={11} />
                            Stop
                          </>
                        ) : (
                          <>
                            <Mic size={13} />
                            Dictate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <textarea
                    id="visit-notes-textarea"
                    className="textarea"
                    rows={3}
                    placeholder="Key points from the conversation, reactions, family details…"
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                  />
                  {visitDictation.listening && (
                    <div className="dictation-live" aria-live="polite">
                      {visitDictation.interimText
                        ? `Listening: "${visitDictation.interimText}"`
                        : 'Listening… speak your visit notes now.'}
                    </div>
                  )}
                  {visitDictation.error && (
                    <div className="error-banner">{visitDictation.error}</div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <label className="field-group" style={{ minWidth: '180px' }}>
                    <span className="field-label">Schedule Next Visit</span>
                    <input
                      type="date"
                      className="input"
                      value={nextFollowUp}
                      onChange={(e) => setNextFollowUp(e.target.value)}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowVisitComposer(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" id="btn-save-visit" className="btn btn-primary">
                      Save Visit
                    </button>
                  </div>
                </div>
              </form>
            )}

            {visits.length === 0 ? (
              <div
                style={{
                  padding: '22px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-strong)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13.5px',
                }}
              >
                No visits logged yet. Click <strong>Log Visit</strong> to record scriptures,
                placements, and your next follow-up question.
              </div>
            ) : (
              <div className="visit-timeline">
                {visits.map((v) => (
                  <article key={v.id} className="visit-card">
                    <div className="visit-card-header">
                      <div className="visit-card-meta">
                        <span className="visit-date">{formatShortDate(v.visit_date)}</span>
                        <span className="outcome-pill" data-outcome={v.outcome}>
                          {OUTCOME_META[v.outcome]?.label ?? v.outcome}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => onDeleteVisit(v.id)}
                        title="Remove visit entry"
                        aria-label="Remove visit entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {(v.scriptures || v.publication_placed) && (
                      <div className="visit-details-row">
                        {v.scriptures && (
                          <span className="visit-detail-item">
                            <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                            <strong>{v.scriptures}</strong>
                          </span>
                        )}
                        {v.publication_placed && (
                          <span className="visit-detail-item">
                            <BookOpen size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{v.publication_placed}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {v.next_question && (
                      <div className="next-question-banner">
                        <HelpCircle size={15} style={{ color: 'var(--warm)', flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          <strong>Next:</strong> {v.next_question}
                        </span>
                      </div>
                    )}

                    {v.notes && <div className="visit-notes">{v.notes}</div>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};
