import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Clock } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { requestNotificationPermission } from '../../utils/notifications';

interface ReminderPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Pre-filled title from the input field */
  prefillTitle?: string;
}

export const ReminderPopover: React.FC<ReminderPopoverProps> = ({ isOpen, onClose, anchorRef, prefillTitle }) => {
  const { addOneTimeReminder } = useTracker();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');

  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // Set sensible defaults when popover opens
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    setReminderDate(now.toISOString().slice(0, 10));
    const mins = now.getMinutes();
    const roundedMins = mins < 30 ? 30 : 0;
    const roundedHours = mins < 30 ? now.getHours() : now.getHours() + 1;
    setReminderTime(`${String(roundedHours % 24).padStart(2, '0')}:${String(roundedMins).padStart(2, '0')}`);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const checkPosition = () => {
      const targetEl = anchorRef?.current || popoverRef.current?.parentElement;
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.offsetHeight || 160;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < popoverHeight + 20 && spaceAbove > spaceBelow) {
          setPlacement('top');
        } else {
          setPlacement('bottom');
        }
      }
    };
    checkPosition();
    window.addEventListener('resize', checkPosition);
    window.addEventListener('scroll', checkPosition, true);
    return () => {
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('scroll', checkPosition, true);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const handleSet = async () => {
    if (!reminderDate || !reminderTime) return;
    const title = prefillTitle?.trim() || 'Reminder';
    const datetime = `${reminderDate}T${reminderTime}:00`;
    await requestNotificationPermission();
    await addOneTimeReminder(title, datetime);
    onClose();
  };

  // Quick preset buttons
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

  const presets = [
    { label: 'In 30m', getDatetime: () => { const d = new Date(Date.now() + 30 * 60000); return { date: d.toISOString().slice(0, 10), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }; } },
    { label: 'In 1h', getDatetime: () => { const d = new Date(Date.now() + 60 * 60000); return { date: d.toISOString().slice(0, 10), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }; } },
    { label: 'In 3h', getDatetime: () => { const d = new Date(Date.now() + 180 * 60000); return { date: d.toISOString().slice(0, 10), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }; } },
    { label: 'Tomorrow 9AM', getDatetime: () => ({ date: tomorrowStr, time: '09:00' }) },
  ];

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-medium)',
    borderRadius: 5,
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.78rem',
    fontWeight: 500,
    outline: 'none',
    padding: '5px 8px',
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: placement === 'bottom' ? 'calc(100% + 8px)' : 'auto',
        bottom: placement === 'top' ? 'calc(100% + 8px)' : 'auto',
        right: 0,
        width: 250,
        background: '#111115',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        padding: '10px 12px',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        animation: placement === 'top' ? 'popoverFadeInUp 0.12s ease' : 'popoverFadeIn 0.12s ease',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff' }}>
          Remind me
        </span>
      </div>

      {/* Quick Presets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {presets.map((preset) => {
          const { date, time } = preset.getDatetime();
          const isActive = reminderDate === date && reminderTime === time;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => { setReminderDate(date); setReminderTime(time); }}
              style={{
                background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isActive ? '#ffffff' : 'var(--border-subtle)'}`,
                borderRadius: 5,
                padding: '4px 2px',
                color: isActive ? '#000000' : 'var(--text-secondary)',
                fontSize: '0.66rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Date + Time Row */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="date"
          value={reminderDate}
          onChange={(e) => setReminderDate(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          style={{ ...inputStyle, width: 85 }}
        />
      </div>

      {/* Set Button */}
      <button
        type="button"
        onClick={handleSet}
        disabled={!reminderDate || !reminderTime}
        style={{
          background: reminderDate && reminderTime ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
          border: 'none',
          borderRadius: 6,
          padding: '6px 0',
          color: reminderDate && reminderTime ? '#000000' : 'var(--text-muted)',
          fontSize: '0.76rem',
          fontWeight: 600,
          cursor: reminderDate && reminderTime ? 'pointer' : 'not-allowed',
          transition: 'all 0.12s ease',
        }}
      >
        Set Reminder
      </button>
    </div>
  );
};
