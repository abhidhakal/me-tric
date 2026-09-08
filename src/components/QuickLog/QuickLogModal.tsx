import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Clock, Dumbbell, BookOpen, CreditCard, Sparkles, FileText } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { parseDurationInput, formatDuration } from '../../utils/formatters';

type QuickTargetType = 'metric' | 'event' | 'note';

interface QuickOption {
  id: string;
  type: QuickTargetType;
  title: string;
  metricId?: string;
  icon: React.ReactNode;
  shortcut: string;
}

export const QuickLogModal: React.FC = () => {
  const {
    isQuickLogOpen,
    closeQuickLog,
    metrics,
    preselectedMetricId,
    logMetric,
    logEvent,
    saveNote,
    todayNote,
    activeDate
  } = useTracker();

  const [selectedOption, setSelectedOption] = useState<QuickOption | null>(null);
  const [durationInput, setDurationInput] = useState<string>('');
  const [accumulatedMinutes, setAccumulatedMinutes] = useState<number>(0);
  const [numberInput, setNumberInput] = useState<string>('');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDesc, setEventDesc] = useState<string>('');
  const [noteText, setNoteText] = useState<string>('');

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const enabledMetrics = metrics.filter((m) => m.enabled !== false);

  // If preselectedMetricId is not in the first 4, ensure it's in the top list
  let displayMetrics = enabledMetrics.slice(0, 4);
  if (preselectedMetricId && !displayMetrics.some((m) => m.id === preselectedMetricId)) {
    const preselected = enabledMetrics.find((m) => m.id === preselectedMetricId);
    if (preselected) {
      displayMetrics = [preselected, ...displayMetrics.slice(0, 3)];
    }
  }

  // Build the list of quick options: top metrics + Event + Note
  const quickOptions: QuickOption[] = [
    ...displayMetrics.map((m, idx) => {
      let icon = <Clock size={18} />;
      if (m.name.toLowerCase().includes('exercise') || m.name.toLowerCase().includes('workout')) {
        icon = <Dumbbell size={18} />;
      } else if (m.name.toLowerCase().includes('read') || m.name.toLowerCase().includes('book')) {
        icon = <BookOpen size={18} />;
      } else if (m.type === 'currency') {
        icon = <CreditCard size={18} />;
      }
      return {
        id: `opt-metric-${m.id}`,
        type: 'metric' as QuickTargetType,
        title: m.name,
        metricId: m.id,
        icon,
        shortcut: String(idx + 1),
      };
    }),
    {
      id: 'opt-event',
      type: 'event',
      title: 'Event / Milestone',
      icon: <Sparkles size={18} />,
      shortcut: '5',
    },
    {
      id: 'opt-note',
      type: 'note',
      title: 'Daily Note',
      icon: <FileText size={18} />,
      shortcut: '6',
    },
  ];

  // Auto-select preselectedMetricId if opened from specific card
  useEffect(() => {
    if (isQuickLogOpen) {
      if (preselectedMetricId) {
        const found = quickOptions.find((o) => o.metricId === preselectedMetricId);
        if (found) {
          selectOption(found);
          return;
        }
      }
      // Default reset
      setSelectedOption(quickOptions[0] || null);
      resetFields();
    }
  }, [isQuickLogOpen, preselectedMetricId]);

  // Focus input whenever option changes
  useEffect(() => {
    if (selectedOption && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedOption]);

  // Listen for keyboard number shortcuts 1-6 when modal is open and not typing in text field
  useEffect(() => {
    if (!isQuickLogOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      const isTyping = document.activeElement === inputRef.current;
      if (!isTyping && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const num = parseInt(e.key, 10);
        const opt = quickOptions[num - 1];
        if (opt) {
          e.preventDefault();
          selectOption(opt);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isQuickLogOpen, quickOptions]);

  const selectOption = (opt: QuickOption) => {
    setSelectedOption(opt);
    resetFields();
    if (opt.type === 'note' && todayNote) {
      setNoteText(todayNote.content);
    }
  };

  const resetFields = () => {
    setDurationInput('');
    setAccumulatedMinutes(0);
    setNumberInput('');
    setEventTitle('');
    setEventDesc('');
    setNoteText('');
  };

  if (!isQuickLogOpen) return null;

  const currentMetric = selectedOption?.metricId
    ? metrics.find((m) => m.id === selectedOption.metricId)
    : null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOption) return;

    if (selectedOption.type === 'metric' && currentMetric) {
      let finalValue = 0;
      if (currentMetric.type === 'duration') {
        const typedMinutes = parseDurationInput(durationInput);
        finalValue = (accumulatedMinutes > 0 ? accumulatedMinutes : 0) + typedMinutes;
      } else {
        finalValue = parseFloat(numberInput) || 0;
      }

      if (finalValue <= 0 && currentMetric.type !== 'boolean') {
        return;
      }

      await logMetric(currentMetric.id, finalValue);
    } else if (selectedOption.type === 'event') {
      if (!eventTitle.trim()) return;
      await logEvent(eventTitle.trim(), eventDesc.trim() || undefined);
    } else if (selectedOption.type === 'note') {
      await saveNote(noteText.trim());
    }

    closeQuickLog();
  };

  const addPresetMinutes = (mins: number) => {
    setAccumulatedMinutes((prev) => prev + mins);
  };

  return (
    <div className="modal-overlay" onClick={closeQuickLog}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">What do you want to record?</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Logging for {activeDate}
            </p>
          </div>
          <button className="icon-btn" onClick={closeQuickLog}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Selection Buttons */}
        <div className="quick-selector-grid">
          {quickOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`quick-metric-btn ${selectedOption?.id === opt.id ? 'selected' : ''}`}
              onClick={() => selectOption(opt)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {opt.icon}
                <span>{opt.title}</span>
              </div>
              <span className="kbd-badge">{opt.shortcut}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selectedOption?.type === 'metric' && currentMetric?.type === 'duration' && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="form-label">Duration</label>
                {accumulatedMinutes > 0 && (
                  <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 700 }}>
                    Preset: {formatDuration(accumulatedMinutes)}
                  </span>
                )}
              </div>
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                className="form-input"
                placeholder="e.g. 2h 20m, 45m, or 90"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                autoFocus
              />
              <div className="stepper-row">
                <button type="button" className="chip-btn" onClick={() => addPresetMinutes(15)}>
                  +15m
                </button>
                <button type="button" className="chip-btn" onClick={() => addPresetMinutes(30)}>
                  +30m
                </button>
                <button type="button" className="chip-btn" onClick={() => addPresetMinutes(60)}>
                  +1h
                </button>
                <button type="button" className="chip-btn" onClick={() => addPresetMinutes(120)}>
                  +2h
                </button>
                {accumulatedMinutes > 0 && (
                  <button
                    type="button"
                    className="chip-btn"
                    style={{ color: 'var(--accent-danger)' }}
                    onClick={() => setAccumulatedMinutes(0)}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedOption?.type === 'metric' && currentMetric?.type === 'currency' && (
            <div className="form-group">
              <label className="form-label">Amount ({currentMetric.unit || 'Rs.'})</label>
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="number"
                step="any"
                className="form-input"
                placeholder="e.g. 850"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                autoFocus
              />
              <div className="stepper-row">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setNumberInput((prev) => String((parseFloat(prev) || 0) + 100))}
                >
                  +100
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setNumberInput((prev) => String((parseFloat(prev) || 0) + 500))}
                >
                  +500
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setNumberInput((prev) => String((parseFloat(prev) || 0) + 1000))}
                >
                  +1,000
                </button>
              </div>
            </div>
          )}

          {selectedOption?.type === 'metric' &&
            currentMetric?.type !== 'duration' &&
            currentMetric?.type !== 'currency' && (
              <div className="form-group">
                <label className="form-label">
                  {currentMetric?.name} {currentMetric?.unit ? `(${currentMetric.unit})` : ''}
                </label>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 1"
                  value={numberInput}
                  onChange={(e) => setNumberInput(e.target.value)}
                  autoFocus
                />
              </div>
            )}

          {selectedOption?.type === 'event' && (
            <>
              <div className="form-group">
                <label className="form-label">Accomplishment or Highlight</label>
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  className="form-input"
                  placeholder="e.g. Shipped Aline attendance update"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Details / Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Any context or link..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                />
              </div>
            </>
          )}

          {selectedOption?.type === 'note' && (
            <div className="form-group">
              <label className="form-label">Daily Reflection / Note</label>
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                className="form-textarea"
                rows={4}
                placeholder="Good day. Got most important work done..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={closeQuickLog}>
              Cancel (Esc)
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} />
              <span>Record (↵)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
