import React, { useRef } from 'react';
import {
  Calendar,
  BarChart3,
  Sliders,
  Target,
  BookOpen,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  FolderOpen,
  HardDrive
} from 'lucide-react';
import { useTracker, ActiveTab } from '../../context/TrackerContext';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
    openOnboarding,
    exportJson,
    importJson,
    resetToSample,
    resetToBlank,
    openDataFolder,
    storageLocation,
    showToast
  } = useTracker();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'today', label: 'Today', icon: <Calendar size={18} />, shortcut: '⌘1' },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} />, shortcut: '⌘2' },
    { id: 'metrics', label: 'Metrics', icon: <Sliders size={18} />, shortcut: '⌘3' },
    { id: 'goals', label: 'Goals', icon: <Target size={18} />, shortcut: '⌘4' },
    { id: 'reviews', label: 'Reviews', icon: <BookOpen size={18} />, shortcut: '⌘5' },
  ];

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
      showToast('Database exported as JSON');
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
        await importJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-topbar">
        <span className="brand-title">MeTric</span>
      </div>

      <div className="sidebar-body">
        {profile && (
          <div
            className="sidebar-user-pill"
            onClick={() => openOnboarding()}
            title="Edit profile & goals"
            style={{ marginBottom: 14 }}
          >
            <div className="user-avatar-circle">
              {profile.name
                ? profile.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'ME'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div className="user-pill-name">{profile.name || 'Your Profile'}</div>
              {profile.occupation && (
                <div className="user-pill-role">{profile.occupation}</div>
              )}
            </div>
          </div>
        )}

        <nav className="nav-section" style={{ flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <div className="nav-item-left">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <span className="nav-shortcut">{item.shortcut}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', gap: 4, width: '100%' }}>
            <button
              className="nav-item"
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.76rem', justifyContent: 'center' }}
              onClick={() => openDataFolder()}
              title="Open storage folder in macOS Finder"
            >
              <FolderOpen size={13} style={{ marginRight: 4 }} />
              <span>Finder</span>
            </button>

            <button
              className="nav-item"
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.76rem', justifyContent: 'center' }}
              onClick={handleExport}
              title="Export JSON backup"
            >
              <Download size={13} style={{ marginRight: 4 }} />
              <span>Backup</span>
            </button>

            <button
              className="nav-item"
              style={{ flex: 1, padding: '6px 8px', fontSize: '0.76rem', justifyContent: 'center' }}
              onClick={() => fileInputRef.current?.click()}
              title="Restore from JSON backup"
            >
              <Upload size={13} style={{ marginRight: 4 }} />
              <span>Restore</span>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleImportFile}
          />

          <button
            className="nav-item"
            style={{ padding: '4px 8px', fontSize: '0.72rem', color: 'var(--text-muted)', justifyContent: 'center', marginTop: 4 }}
            onClick={() => {
              if (window.confirm('Reset all entries to start with clean slate?')) {
                resetToBlank();
              }
            }}
            title="Reset database to clean state"
          >
            <RotateCcw size={12} style={{ marginRight: 4 }} />
            <span>Reset to Clean Slate</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
