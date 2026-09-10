import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BarChart3,
  Sliders,
  Target,
  BookOpen,
  Settings,
} from 'lucide-react';
import { useTracker, ActiveTab } from '../../context/TrackerContext';
import { UpdateModal } from '../Common/UpdateModal';
import { SettingsModal } from '../Settings/SettingsModal';
import { UpdateInfo } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
    openOnboarding,
  } = useTracker();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const api = (window as any).electronAPI;
    if (api?.onUpdateAvailable) {
      api.onUpdateAvailable((info: UpdateInfo) => {
        setAvailableUpdate(info);
      });
    }
    if (api?.onOpenUpdateModal) {
      api.onOpenUpdateModal(() => {
        setIsUpdateModalOpen(true);
      });
    }
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'today', label: 'Today', icon: <Calendar size={18} />, shortcut: '⌘1' },
    { id: 'activity', label: 'Activity', icon: <Clock size={18} />, shortcut: '⌘2' },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} />, shortcut: '⌘3' },
    { id: 'metrics', label: 'Metrics', icon: <Sliders size={18} />, shortcut: '⌘4' },
    { id: 'goals', label: 'Goals', icon: <Target size={18} />, shortcut: '⌘5' },
    { id: 'reviews', label: 'Reviews', icon: <BookOpen size={18} />, shortcut: '⌘6' },
  ];

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

        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
          <button
            className="nav-item"
            onClick={() => setIsSettingsOpen(true)}
            style={{ width: '100%' }}
            title="Application settings, backups & updates"
          >
            <div className="nav-item-left">
              <Settings size={18} />
              <span>Settings</span>
            </div>
            {availableUpdate && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px rgba(34, 197, 94, 0.7)',
                }}
                title={`Update v${availableUpdate.latestVersion} available!`}
              />
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

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        initialUpdateInfo={availableUpdate}
      />
    </aside>
  );
};
