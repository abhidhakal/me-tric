import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, BarChart3, Target, BookOpen, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTracker, ActiveTab } from '../../context/TrackerContext';
import { UpdateModal } from '../Common/UpdateModal';
import { SettingsModal } from '../Settings/SettingsModal';
import { ProfileModal } from '../Settings/ProfileModal';
import { UpdateInfo } from '../../types';

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: 'today', label: 'Today', icon: <Calendar size={17} />, shortcut: '⌘1' },
  { id: 'plan', label: 'Plan', icon: <Target size={17} />, shortcut: '⌘2' },
  { id: 'progress', label: 'Progress', icon: <BarChart3 size={17} />, shortcut: '⌘3' },
  { id: 'activity', label: 'Activity', icon: <Clock size={17} />, shortcut: '⌘4' },
  { id: 'reviews', label: 'Reviews', icon: <BookOpen size={17} />, shortcut: '⌘5' },
];

const COLLAPSED_KEY = 'metric.sidebarCollapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function initials(name?: string): string {
  if (!name?.trim()) return 'ME';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, profile, openQuickLog } = useTracker();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      } catch {
        // Only a preference; the sidebar still toggles for this session.
      }
      return !c;
    });
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    api?.onUpdateAvailable?.((info: UpdateInfo) => setAvailableUpdate(info));
    api?.onOpenUpdateModal?.(() => setIsUpdateModalOpen(true));

    // Actions from the macOS menu bar (electron/main.ts buildAppMenu).
    const offMenu = api?.onMenuAction?.((action: string) => {
      if (action.startsWith('tab:')) setActiveTab(action.slice(4) as ActiveTab);
      else if (action === 'settings') setIsSettingsOpen(true);
      else if (action === 'profile') setIsProfileOpen(true);
      else if (action === 'quick-log') openQuickLog();
      else if (action === 'toggle-sidebar') toggleCollapsed();
    });

    // ⌘\ toggles the sidebar (the menu shows the shortcut but leaves the key to us).
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      offMenu?.();
      window.removeEventListener('keydown', onKey);
    };
  }, [setActiveTab, openQuickLog, toggleCollapsed]);

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-topbar">
        {!collapsed && (
          <>
            <span className="brand-title">MeTric</span>
            <button className="sidebar-toggle" onClick={toggleCollapsed} title="Collapse sidebar (⌘\)" aria-label="Collapse sidebar">
              <PanelLeftClose size={16} />
            </button>
          </>
        )}
      </div>

      <div className="sidebar-body">
        {profile && (
          <button className="profile-row" onClick={() => setIsProfileOpen(true)} title="Edit profile" aria-label="Edit profile">
            <span className="profile-avatar">{initials(profile.name)}</span>
            {!collapsed && (
              <span className="profile-text">
                <span className="profile-name">{profile.name || 'Your profile'}</span>
                {profile.occupation && <span className="profile-role">{profile.occupation}</span>}
              </span>
            )}
          </button>
        )}

        <nav className="nav-section">
          {collapsed && (
            <button className="nav-item" onClick={toggleCollapsed} title="Expand sidebar (⌘\)" aria-label="Expand sidebar">
              <div className="nav-item-left">
                <PanelLeftOpen size={17} />
              </div>
            </button>
          )}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
              aria-label={item.label}
            >
              <div className="nav-item-left">
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </div>
              {!collapsed && <span className="nav-shortcut">{item.shortcut}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setIsSettingsOpen(true)} title="Settings (⌘,)" aria-label="Settings">
            <div className="nav-item-left">
              <Settings size={17} />
              {!collapsed && <span>Settings</span>}
            </div>
            {availableUpdate && (
              <span className="update-dot" title={`Update v${availableUpdate.latestVersion} available`} />
            )}
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        availableUpdate={availableUpdate}
        onCheckUpdates={() => {
          setIsSettingsOpen(false);
          setIsUpdateModalOpen(true);
        }}
      />

      {isProfileOpen && <ProfileModal onClose={() => setIsProfileOpen(false)} />}

      <UpdateModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} initialUpdateInfo={availableUpdate} />
    </aside>
  );
};
