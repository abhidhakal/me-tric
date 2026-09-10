import React, { useRef, useState } from 'react';
import {
  X,
  Settings,
  FolderOpen,
  Download,
  Upload,
  RotateCcw,
  ArrowUpCircle,
  ExternalLink,
  HardDrive,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { UpdateInfo } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUpdate: UpdateInfo | null;
  onCheckUpdates: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  availableUpdate,
  onCheckUpdates,
}) => {
  const {
    openDataFolder,
    exportJson,
    importJson,
    resetToBlank,
    storageLocation,
    showToast,
  } = useTracker();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'storage' | 'danger'>('general');

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      const json = await exportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metric-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Database backup exported as JSON');
    } catch {
      showToast('Failed to export data', 'error');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await importJson(content);
        if (success) {
          showToast('Database restored successfully');
          onClose();
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all data to a clean slate? This action cannot be undone.')) {
      await resetToBlank();
      showToast('Database reset to clean slate');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: 540, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Settings size={17} strokeWidth={2} />
            </div>
            <div>
              <h3 className="modal-title">Settings</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Application configuration, backups & storage
              </span>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.03)',
            padding: 4,
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSection('general')}
            style={{
              flex: 1,
              height: 30,
              background: activeSection === 'general' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeSection === 'general' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.12s ease',
            }}
          >
            <Info size={13} />
            <span>General & Updates</span>
            {availableUpdate && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('storage')}
            style={{
              flex: 1,
              height: 30,
              background: activeSection === 'storage' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeSection === 'storage' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.12s ease',
            }}
          >
            <HardDrive size={13} />
            <span>Database & Backups</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('danger')}
            style={{
              flex: 1,
              height: 30,
              background: activeSection === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeSection === 'danger' ? '#ef4444' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.12s ease',
            }}
          >
            <ShieldAlert size={13} />
            <span>Danger Zone</span>
          </button>
        </div>

        {/* Section Content */}
        <div style={{ minHeight: 200, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* General & Updates Section */}
          {activeSection === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#ffffff' }}>MeTric Desktop</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Current Version: v{availableUpdate?.currentVersion || '1.0.6'}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onCheckUpdates}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: availableUpdate ? 'rgba(34, 197, 94, 0.15)' : undefined,
                    borderColor: availableUpdate ? 'rgba(34, 197, 94, 0.35)' : undefined,
                    color: availableUpdate ? '#22c55e' : undefined,
                  }}
                >
                  <ArrowUpCircle size={14} />
                  <span>{availableUpdate ? `Update v${availableUpdate.latestVersion} Available` : 'Check for Updates'}</span>
                </button>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: 14,
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
                  Release Information
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>
                  MeTric is an offline-first personal tracker with zero cloud reliance. Check GitHub for full changelogs and downloads.
                </p>
                <a
                  href="https://github.com/abhidhakal/me-tric/releases"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>View Releases on GitHub</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Database & Backups Section */}
          {activeSection === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff' }}>Storage Location</div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openDataFolder()}
                    style={{ height: 30, padding: '0 10px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    <FolderOpen size={13} />
                    <span>Show in Finder</span>
                  </button>
                </div>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    wordBreak: 'break-all',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {storageLocation || '~/Library/Application Support/MeTric/database.json'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
                      Export Backup
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Save a complete JSON snapshot of all metrics, goals, and history.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleExport}
                    style={{ height: 32, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Download size={13} />
                    <span>Export JSON</span>
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
                      Restore Backup
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Restore your data from a previously exported JSON backup file.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ height: 32, fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Upload size={13} />
                    <span>Restore JSON</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".json"
                    onChange={handleImportFile}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Section */}
          {activeSection === 'danger' && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                  Reset to Clean Slate
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  This action permanently deletes all logged metric entries, life events, daily notes, and tomorrow plans. Configured metrics and goals are preserved with zero counts.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    height: 34,
                    padding: '0 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset All Data</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: 14,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ height: 34, padding: '0 18px', borderRadius: '8px', fontSize: '0.82rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
