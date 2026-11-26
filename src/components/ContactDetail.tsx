import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarCheck2,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Globe,
  HelpCircle,
  Link2,
  Mail,
  MapPin,
  Mic,
  Minus,
  Navigation,
  Pencil,
  Phone,
  Pin,
  Plus,
  ScrollText,
  Share2,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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
import { downloadFollowUpICS } from '../utils/calendar';
import { addDaysISO, formatRelativeDue, formatShortDate, getTodayISO } from '../utils/date';
import { toggleCheckboxAtLine } from '../utils/markdown';
import {
  buildContactMailtoUrl,
  canUseNativeShare,
  copyContactToClipboard,
  shareContactNatively,
} from '../utils/shareContact';
import { MarkdownPreview } from './MarkdownPreview';

interface ContactDetailProps {
  contact: ContactSummary;
  visits: Visit[];
  backlinks: BacklinkItem[];
  onUpdate: (id: string, patch: Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at'>>) => void;
  onDelete: (id: string) => void;
  onAddVisit: (input: NewVisitInput, nextVisitDate?: string | null) => void;
  onUpdateVisit: (
    visitId: string,
    patch: Partial<Omit<Visit, 'id' | 'contact_id' | 'created_at'>>
  ) => void;
  onDeleteVisit: (visitId: string) => void;
  onClickTag: (tag: string) => void;
  onClickWikilink: (name: string) => void;
  onSelectContact: (id: string) => void;
  onBackMobile: () => void;
  onNotify?: (message: string) => void;
  composerOpenSignal?: number;
}

const STATUS_OPTIONS: ContactStatus[] = ['return_visit', 'bible_study', 'not_at_home', 'inactive'];

type DictationTarget =
  | null
  | 'new_visit_notes'
  | 'new_visit_question'
  | 'pinned_note'
  | 'edit_visit_notes'
  | 'edit_visit_question';

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contact,
  visits,
  backlinks,
  onUpdate,
  onDelete,
  onAddVisit,
  onUpdateVisit,
  onDeleteVisit,
  onClickTag,
  onClickWikilink,
  onSelectContact,
  onBackMobile,
  onNotify,
  composerOpenSignal = 0,
}) => {
  const [editingInfo, setEditingInfo] = useState(
    () => !(contact.name.trim() || contact.address.trim() || contact.territory.trim())
  );
  const [showVisitComposer, setShowVisitComposer] = useState(() => visits.length === 0);
  const [showPinnedEditor, setShowPinnedEditor] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // New Visit & Note composer fields
  const [visitDate, setVisitDate] = useState(contact.visited_date || getTodayISO());
  const [outcome, setOutcome] = useState<VisitOutcome>(
    contact.status === 'bible_study' ? 'study_conducted' : 'spoke'
  );
  const [scriptures, setScriptures] = useState('');
  const [publicationPlaced, setPublicationPlaced] = useState('');
  const [nextQuestion, setNextQuestion] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(addDaysISO(7));
  const [addToCalendar, setAddToCalendar] = useState(false);

  // Edit existing visit fields
  const [editVisitDate, setEditVisitDate] = useState('');
  const [editOutcome, setEditOutcome] = useState<VisitOutcome>('spoke');
  const [editScriptures, setEditScriptures] = useState('');
  const [editPublication, setEditPublication] = useState('');
  const [editNextQuestion, setEditNextQuestion] = useState('');
  const [editVisitNotes, setEditVisitNotes] = useState('');

  // Unified single-microphone dictation state
  const [dictationTarget, setDictationTarget] = useState<DictationTarget>(null);
  const dictationTargetRef = useRef<DictationTarget>(null);
  dictationTargetRef.current = dictationTarget;

  const contactRef = useRef(contact);
  contactRef.current = contact;

  const nameInputRef = useRef<HTMLInputElement>(null);

  const dictation = useDictation((spoken) => {
    const target = dictationTargetRef.current;
    if (target === 'new_visit_notes') {
      setVisitNotes((prev) => appendDictatedText(prev, spoken));
    } else if (target === 'new_visit_question') {
      setNextQuestion((prev) => appendDictatedText(prev, spoken));
    } else if (target === 'pinned_note') {
      const curr = contactRef.current;
      onUpdate(curr.id, { notes: appendDictatedText(curr.notes, spoken) });
    } else if (target === 'edit_visit_notes') {
      setEditVisitNotes((prev) => appendDictatedText(prev, spoken));
    } else if (target === 'edit_visit_question') {
      setEditNextQuestion((prev) => appendDictatedText(prev, spoken));
    }
  });

  const stopDictation = () => {
    dictation.stop();
    setDictationTarget(null);
  };

  const toggleDictationFor = (target: Exclude<DictationTarget, null>) => {
    if (dictation.listening && dictationTarget === target) {
      stopDictation();
    } else {
      setDictationTarget(target);
      dictation.start();
    }
  };

  useEffect(() => {
    if (!dictation.listening && dictationTarget !== null) {
      setDictationTarget(null);
    }
  }, [dictation.listening, dictationTarget]);

  useEffect(() => {
    stopDictation();
    setEditingInfo(!(contact.name.trim() || contact.address.trim() || contact.territory.trim()));
    setShowVisitComposer(visits.length === 0);
    setShowPinnedEditor(false);
    setEditingVisitId(null);
    setConfirmDelete(false);
    setShareMenuOpen(false);
    setOutcome(contact.status === 'bible_study' ? 'study_conducted' : 'spoke');
    setVisitDate(contact.visited_date || getTodayISO());
    setNextFollowUp(addDaysISO(7));
    setAddToCalendar(false);
    if (!contact.name.trim()) {
      setTimeout(() => nameInputRef.current?.focus(), 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [shareMenuOpen]);

  useEffect(() => {
    if (composerOpenSignal > 0) {
      setShowVisitComposer(true);
    }
  }, [composerOpenSignal]);

  const due = formatRelativeDue(contact.next_visit_date);
  const lastVisitedDisplay = contact.last_visit_date || contact.visited_date;

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

  const handleTogglePinnedCheckbox = (lineIndex: number) => {
    const updated = toggleCheckboxAtLine(contact.notes, lineIndex);
    onUpdate(contact.id, { notes: updated });
  };

  const handleToggleVisitCheckbox = (visit: Visit, lineIndex: number) => {
    const updated = toggleCheckboxAtLine(visit.notes, lineIndex);
    onUpdateVisit(visit.id, { notes: updated });
  };

  const handleSubmitVisit = (e: React.FormEvent) => {
    e.preventDefault();
    stopDictation();
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
    if (addToCalendar && nextFollowUp) {
      downloadFollowUpICS(contact, {
        nextVisitDate: nextFollowUp,
        scriptures,
        nextQuestion,
        visitNotes,
      });
    }
    setScriptures('');
    setPublicationPlaced('');
    setNextQuestion('');
    setVisitNotes('');
    setAddToCalendar(false);
    setShowVisitComposer(false);
  };

  const startEditingVisit = (v: Visit) => {
    stopDictation();
    setEditingVisitId(v.id);
    setEditVisitDate(v.visit_date);
    setEditOutcome(v.outcome);
    setEditScriptures(v.scriptures);
    setEditPublication(v.publication_placed);
    setEditNextQuestion(v.next_question);
    setEditVisitNotes(v.notes);
  };

  const handleSaveEditedVisit = (e: React.FormEvent, visitId: string) => {
    e.preventDefault();
    stopDictation();
    onUpdateVisit(visitId, {
      visit_date: editVisitDate || getTodayISO(),
      outcome: editOutcome,
      scriptures: editScriptures.trim(),
      publication_placed: editPublication.trim(),
      next_question: editNextQuestion.trim(),
      notes: editVisitNotes.trim(),
    });
    setEditingVisitId(null);
  };

  const progressPct =
    contact.lesson_total > 0
      ? Math.min(100, Math.round((contact.lesson_progress / contact.lesson_total) * 100))
      : 0;

  const renderDictateButton = (target: Exclude<DictationTarget, null>, label = 'Dictate') => {
    if (!dictation.supported) return null;
    const isThisRecording = dictation.listening && dictationTarget === target;
    return (
      <button
        type="button"
        className={`btn-dictate ${isThisRecording ? 'recording' : ''}`}
        onClick={() => toggleDictationFor(target)}
        title={isThisRecording ? 'Stop dictation' : 'Dictate with microphone'}
      >
        {isThisRecording ? (
          <>
            <span className="recording-dot" />
            <Square size={11} />
            Stop
          </>
        ) : (
          <>
            <Mic size={13} />
            {label}
          </>
        )}
      </button>
    );
  };

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
            onClick={() => setShowVisitComposer((v) => !v)}
          >
            <Plus size={14} />
            New Visit / Note
          </button>

          <div className="share-menu-wrap" ref={shareMenuRef}>
            <button
              type="button"
              id="btn-share-contact"
              className={`btn-icon ${shareMenuOpen ? 'active' : ''}`}
              onClick={() => setShareMenuOpen((v) => !v)}
              title="Email or share contact details"
              aria-label="Share contact"
              aria-expanded={shareMenuOpen}
            >
              <Share2 size={16} />
            </button>

            {shareMenuOpen && (
              <div className="share-popover" role="menu" aria-label="Share contact options">
                <a
                  className="share-popover-item"
                  role="menuitem"
                  href={buildContactMailtoUrl(contact, visits)}
                  onClick={() => setShareMenuOpen(false)}
                >
                  <Mail size={15} style={{ color: 'var(--accent)' }} />
                  <span>Email Contact</span>
                </a>

                {canUseNativeShare() && (
                  <button
                    type="button"
                    className="share-popover-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      void shareContactNatively(contact, visits).catch(() => {
                        // User canceled native share sheet
                      });
                    }}
                  >
                    <Share2 size={15} style={{ color: 'var(--warm)' }} />
                    <span>Share via Phone…</span>
                  </button>
                )}

                <button
                  type="button"
                  className="share-popover-item"
                  role="menuitem"
                  onClick={() => {
                    setShareMenuOpen(false);
                    void copyContactToClipboard(contact, visits).then(() => {
                      onNotify?.('Contact details copied to clipboard');
                    });
                  }}
                >
                  <Copy size={15} style={{ color: 'var(--text-secondary)' }} />
                  <span>Copy as Text</span>
                </button>
              </div>
            )}
          </div>

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
          {/* Header: Monogram, Name with Pencil Cue & Status Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="contact-header-row">
              <span className="avatar-badge lg" data-status={contact.status} aria-hidden="true">
                {(contact.name || '?')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? '')
                  .join('') || '?'}
              </span>
              <div className="contact-title-wrap">
                <input
                  ref={nameInputRef}
                  id="contact-name-input"
                  type="text"
                  className={`contact-title-input ${!contact.name.trim() ? 'is-empty' : ''}`}
                  value={contact.name}
                  placeholder="Tap to enter name…"
                  onChange={(e) => onUpdate(contact.id, { name: e.target.value })}
                  aria-label="Contact name"
                />
                <button
                  type="button"
                  className="btn-icon name-edit-btn"
                  onClick={() => {
                    nameInputRef.current?.focus();
                    nameInputRef.current?.select();
                  }}
                  title="Edit contact name"
                  aria-label="Edit contact name"
                >
                  <Pencil size={15} />
                </button>
              </div>
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
                    <span>{[contact.address, contact.apartment].filter(Boolean).join(', ')}</span>
                  </a>
                )}
                {lastVisitedDisplay && (
                  <span className="info-pill">
                    <CalendarCheck2 size={12} />
                    <span>Visited {formatShortDate(lastVisitedDisplay)}</span>
                  </span>
                )}
                {contact.next_visit_date && (
                  <button
                    type="button"
                    id="btn-add-to-calendar"
                    className="info-pill interactive"
                    onClick={() =>
                      downloadFollowUpICS(contact, {
                        visitNotes: visits[0]?.notes || contact.notes,
                      })
                    }
                    title="Add follow-up visit to your phone or computer calendar"
                  >
                    <CalendarPlus size={12} />
                    <span>Next: {formatShortDate(contact.next_visit_date)} · Calendar</span>
                  </button>
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
                {!contact.address &&
                  !lastVisitedDisplay &&
                  !contact.best_time &&
                  !contact.language &&
                  !contact.phone && (
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Add address, best time, territory, or date visited…
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
              <div
                className="meta-grid"
                style={{ border: 'none', padding: '6px 0 0', background: 'transparent' }}
              >
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
                    <Calendar size={11} /> Date Visited
                  </span>
                  <input
                    type="date"
                    className="meta-input"
                    value={contact.visited_date ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? e.target.value : null;
                      onUpdate(contact.id, { visited_date: val });
                      if (val) setVisitDate(val);
                    }}
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

              <div
                className="progress-track"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
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

          {/* Unified Notes & Visit Log */}
          <section aria-label="Notes and visit log">
            <div className="section-header">
              <h2 className="section-heading">
                <BookMarked size={13} /> Notes &amp; Visits ({visits.length})
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!contact.notes.trim() && !showPinnedEditor && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPinnedEditor(true)}
                  >
                    <ScrollText size={13} /> Pinned Note
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowVisitComposer((v) => !v)}
                >
                  {showVisitComposer ? 'Hide Form' : '+ Log Visit'}
                </button>
              </div>
            </div>

            {dictation.error && (
              <div className="error-banner" style={{ marginBottom: '12px' }}>
                {dictation.error}
              </div>
            )}

            {/* Combined New Visit & Note Composer */}
            {showVisitComposer && (
              <form className="visit-composer" onSubmit={handleSubmitVisit}>
                <div className="form-grid-2">
                  <label className="field-group">
                    <span className="field-label">Date Visited</span>
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

                {/* Combined Notes Field with Dictation & Markdown */}
                <div className="field-group">
                  <div className="field-label-row">
                    <label htmlFor="visit-notes-textarea" className="field-label">
                      Visit Notes (Markdown, #tags, [[Wikilinks]])
                    </label>
                    {renderDictateButton('new_visit_notes', 'Dictate Notes')}
                  </div>
                  <textarea
                    id="visit-notes-textarea"
                    className="textarea"
                    rows={4}
                    placeholder="Write or dictate what you talked about, family details, #tags, [[linked names]], or - [ ] study prep…"
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                  />
                  {dictation.listening && dictationTarget === 'new_visit_notes' && (
                    <div className="dictation-live" aria-live="polite">
                      {dictation.interimText
                        ? `Listening: "${dictation.interimText}"`
                        : 'Listening… speak your notes now.'}
                    </div>
                  )}
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

                <div className="field-group">
                  <div className="field-label-row">
                    <label htmlFor="visit-next-question" className="field-label">
                      Next Question / Follow-up Topic
                    </label>
                    {renderDictateButton('new_visit_question', 'Dictate')}
                  </div>
                  <input
                    id="visit-next-question"
                    type="text"
                    className="input"
                    placeholder="What will you follow up on next time?"
                    value={nextQuestion}
                    onChange={(e) => setNextQuestion(e.target.value)}
                  />
                  {dictation.listening && dictationTarget === 'new_visit_question' && (
                    <div className="dictation-live" aria-live="polite">
                      {dictation.interimText
                        ? `Listening: "${dictation.interimText}"`
                        : 'Listening… speak your follow-up question.'}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '10px',
                    paddingTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                    <label className="field-group">
                      <span className="field-label">Schedule Next Visit</span>
                      <input
                        type="date"
                        className="input"
                        value={nextFollowUp}
                        onChange={(e) => setNextFollowUp(e.target.value)}
                      />
                    </label>
                    {nextFollowUp && (
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          fontSize: '12.5px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={addToCalendar}
                          onChange={(e) => setAddToCalendar(e.target.checked)}
                          style={{ accentColor: 'var(--accent)', width: '15px', height: '15px' }}
                        />
                        <span>Add to phone calendar (.ics)</span>
                      </label>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        stopDictation();
                        setShowVisitComposer(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" id="btn-save-visit" className="btn btn-primary">
                      Save Visit &amp; Note
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Optional Pinned Background / Overview Note (for family details, prep checklists, etc.) */}
            {(contact.notes.trim() || showPinnedEditor) && (
              <div className="pinned-note-card">
                <div className="visit-card-header">
                  <span className="section-heading" style={{ color: 'var(--accent-text)' }}>
                    <Pin size={12} /> Pinned Background &amp; Prep
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {showPinnedEditor && renderDictateButton('pinned_note', 'Dictate')}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        if (showPinnedEditor) stopDictation();
                        setShowPinnedEditor((v) => !v);
                      }}
                    >
                      {showPinnedEditor ? (
                        <>
                          <Check size={13} /> Done
                        </>
                      ) : (
                        <>
                          <Pencil size={12} /> Edit
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {showPinnedEditor ? (
                  <div>
                    <textarea
                      id="contact-notes-editor"
                      className="notes-textarea"
                      style={{ minHeight: '130px' }}
                      value={contact.notes}
                      onChange={(e) => onUpdate(contact.id, { notes: e.target.value })}
                      placeholder="Background info, family names like [[Carlos Santos]], #tags, > scripture quotes, or - [ ] prep checklists…"
                    />
                    {dictation.listening && dictationTarget === 'pinned_note' && (
                      <div className="dictation-live" aria-live="polite">
                        {dictation.interimText
                          ? `Listening: "${dictation.interimText}"`
                          : 'Listening… speak your background notes.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div onDoubleClick={() => setShowPinnedEditor(true)}>
                    <MarkdownPreview
                      content={contact.notes}
                      onClickTag={onClickTag}
                      onClickWikilink={onClickWikilink}
                      onToggleCheckbox={handleTogglePinnedCheckbox}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Chronological Visit & Note Cards */}
            {visits.length === 0 ? (
              !showVisitComposer && (
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
                  No visits logged yet. Tap <strong>+ Log Visit</strong> to write or dictate notes
                  and schedule your next follow-up.
                </div>
              )
            ) : (
              <div className="visit-timeline">
                {visits.map((v) =>
                  editingVisitId === v.id ? (
                    <form
                      key={v.id}
                      className="visit-composer"
                      style={{ marginBottom: 0 }}
                      onSubmit={(e) => handleSaveEditedVisit(e, v.id)}
                    >
                      <div className="form-grid-2">
                        <label className="field-group">
                          <span className="field-label">Date Visited</span>
                          <input
                            type="date"
                            className="input"
                            value={editVisitDate}
                            onChange={(e) => setEditVisitDate(e.target.value)}
                            required
                          />
                        </label>
                        <label className="field-group">
                          <span className="field-label">Outcome</span>
                          <select
                            className="select"
                            value={editOutcome}
                            onChange={(e) => setEditOutcome(e.target.value as VisitOutcome)}
                          >
                            {Object.entries(OUTCOME_META).map(([key, meta]) => (
                              <option key={key} value={key}>
                                {meta.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="field-group">
                        <div className="field-label-row">
                          <span className="field-label">Visit Notes</span>
                          {renderDictateButton('edit_visit_notes', 'Dictate')}
                        </div>
                        <textarea
                          className="textarea"
                          rows={4}
                          value={editVisitNotes}
                          onChange={(e) => setEditVisitNotes(e.target.value)}
                        />
                        {dictation.listening && dictationTarget === 'edit_visit_notes' && (
                          <div className="dictation-live" aria-live="polite">
                            {dictation.interimText
                              ? `Listening: "${dictation.interimText}"`
                              : 'Listening… speak to append to this note.'}
                          </div>
                        )}
                      </div>

                      <div className="form-grid-2">
                        <label className="field-group">
                          <span className="field-label">Scriptures</span>
                          <input
                            type="text"
                            className="input"
                            value={editScriptures}
                            onChange={(e) => setEditScriptures(e.target.value)}
                          />
                        </label>
                        <label className="field-group">
                          <span className="field-label">Publication / Video</span>
                          <input
                            type="text"
                            className="input"
                            value={editPublication}
                            onChange={(e) => setEditPublication(e.target.value)}
                          />
                        </label>
                      </div>

                      <div className="field-group">
                        <div className="field-label-row">
                          <span className="field-label">Next Question</span>
                          {renderDictateButton('edit_visit_question', 'Dictate')}
                        </div>
                        <input
                          type="text"
                          className="input"
                          value={editNextQuestion}
                          onChange={(e) => setEditNextQuestion(e.target.value)}
                        />
                        {dictation.listening && dictationTarget === 'edit_visit_question' && (
                          <div className="dictation-live" aria-live="polite">
                            {dictation.interimText
                              ? `Listening: "${dictation.interimText}"`
                              : 'Listening…'}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            stopDictation();
                            setEditingVisitId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm">
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <article key={v.id} className="visit-card">
                      <div className="visit-card-header">
                        <div className="visit-card-meta">
                          <span className="visit-date">{formatShortDate(v.visit_date)}</span>
                          <span className="outcome-pill" data-outcome={v.outcome}>
                            {OUTCOME_META[v.outcome]?.label ?? v.outcome}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => startEditingVisit(v)}
                            title="Edit or dictate into this visit note"
                            aria-label="Edit visit note"
                          >
                            <Pencil size={14} />
                          </button>
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
                          <HelpCircle
                            size={15}
                            style={{ color: 'var(--warm)', flexShrink: 0, marginTop: '2px' }}
                          />
                          <span>
                            <strong>Next:</strong> {v.next_question}
                          </span>
                        </div>
                      )}

                      {v.notes && (
                        <div className="visit-notes">
                          <MarkdownPreview
                            content={v.notes}
                            onClickTag={onClickTag}
                            onClickWikilink={onClickWikilink}
                            onToggleCheckbox={(lineIdx) => handleToggleVisitCheckbox(v, lineIdx)}
                          />
                        </div>
                      )}
                    </article>
                  )
                )}
              </div>
            )}

            {/* Incoming [[Wikilink]] Backlinks */}
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
        </div>
      </div>
    </main>
  );
};
