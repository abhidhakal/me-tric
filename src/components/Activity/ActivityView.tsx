import React from 'react';
import {
  Clock,
  Code2,
  Palette,
  FileText,
  MessageSquare,
  Compass,
  Film,
  Layers,
  FolderGit2,
  Pause,
  Play,
  ShieldCheck,
  Zap,
  Coffee,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { ActivityCategory } from '../../types';
import { formatDateHeader, getTodayIso } from '../../utils/dateUtils';

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  if (mins > 0) return `${mins}m`;
  return `${seconds}s`;
}

const CATEGORY_META: Record<
  ActivityCategory,
  { label: string; icon: React.ReactNode; color: string; isDeepWork: boolean }
> = {
  development: {
    label: 'Development',
    icon: <Code2 size={14} />,
    color: '#ffffff',
    isDeepWork: true,
  },
  design: {
    label: 'Design',
    icon: <Palette size={14} />,
    color: '#e4e4e7',
    isDeepWork: true,
  },
  writing: {
    label: 'Writing & Planning',
    icon: <FileText size={14} />,
    color: '#d4d4d8',
    isDeepWork: true,
  },
  communication: {
    label: 'Communication',
    icon: <MessageSquare size={14} />,
    color: '#a1a1aa',
    isDeepWork: false,
  },
  research: {
    label: 'Research & Browsing',
    icon: <Compass size={14} />,
    color: '#71717a',
    isDeepWork: false,
  },
  entertainment: {
    label: 'Entertainment',
    icon: <Film size={14} />,
    color: '#52525b',
    isDeepWork: false,
  },
  other: {
    label: 'System & Other',
    icon: <Layers size={14} />,
    color: '#3f3f46',
    isDeepWork: false,
  },
};

export const ActivityView: React.FC = () => {
  const {
    activeDate,
    activitySummary,
    activityStatus,
    toggleActivityTracking,
    openDataFolder,
  } = useTracker();

  const today = getTodayIso();
  const isViewingToday = activeDate === today;

  const totalActive = activitySummary?.totalActiveSeconds || 0;
  const deepWork = activitySummary?.deepWorkSeconds || 0;
  const totalIdle = activitySummary?.totalIdleSeconds || 0;
  const focusRatio = totalActive > 0 ? Math.round((deepWork / totalActive) * 100) : 0;

  const topProjects = activitySummary?.topProjects || [];
  const topApps = activitySummary?.topApps || [];
  const hourlyActivity = activitySummary?.hourlyActivity || new Array(24).fill(0);
  const categories = activitySummary?.categoryBreakdown || ({} as Record<ActivityCategory, number>);

  const isTracking = activityStatus?.isTracking ?? true;
  const isIdle = activityStatus?.isIdle ?? false;
  const currentApp = activityStatus?.currentApp || '';
  const currentCategory = activityStatus?.currentCategory || 'other';

  // Sort categories by time spent
  const sortedCategories = (Object.keys(CATEGORY_META) as ActivityCategory[])
    .map((cat) => ({
      category: cat,
      seconds: categories[cat] || 0,
      percent: totalActive > 0 ? Math.round(((categories[cat] || 0) / totalActive) * 100) : 0,
      meta: CATEGORY_META[cat],
    }))
    .filter((c) => c.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const topProject = topProjects[0]?.project || 'None';

  return (
    <div className="view-container">
      {/* Top Header */}
      <div className="view-header">
        <div className="view-title-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="view-title">Activity & Screen Time</h2>
            <p className="view-subtitle">
              {formatDateHeader(activeDate)} · Automatic Work & Project Categorization
            </p>
          </div>

          {/* Live Status Pill & Tracking Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isViewingToday && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: !isTracking ? '#71717a' : isIdle ? '#f59e0b' : '#22c55e',
                    boxShadow: isTracking && !isIdle ? '0 0 8px #22c55e' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                <span style={{ color: '#ffffff', fontWeight: 500 }}>
                  {!isTracking
                    ? 'Tracking Paused'
                    : isIdle
                    ? 'Away from desk (Idle)'
                    : currentApp
                    ? `Active: ${currentApp}`
                    : 'Monitoring active work'}
                </span>
                {isTracking && !isIdle && currentCategory && (
                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {currentCategory}
                  </span>
                )}
              </div>
            )}

            <button
              type="button"
              className="chip-btn"
              onClick={() => toggleActivityTracking()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: '0.78rem',
                color: isTracking ? 'var(--text-secondary)' : '#ffffff',
                borderColor: !isTracking ? '#ffffff' : 'var(--border-subtle)',
              }}
              title={isTracking ? 'Pause automatic tracking' : 'Resume automatic tracking'}
            >
              {isTracking ? <Pause size={12} /> : <Play size={12} />}
              <span>{isTracking ? 'Pause Tracking' : 'Resume Tracking'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hourly Screen Time Bar Chart */}
      <div className="card-panel" style={{ marginBottom: 20 }}>
        <div className="panel-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="panel-title">Hourly Activity Bar Chart</span>
              <span
                style={{
                  fontSize: '0.74rem',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 4,
                  padding: '1px 7px',
                  fontWeight: 600,
                }}
              >
                Minutes Active / Hour
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Shows your active keyboard and computer usage for each hour of the day
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>Active Screen Time</span>
            </div>
            <span style={{ color: 'var(--border-medium)' }}>|</span>
            <span style={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              Total: {formatDuration(totalActive)}
            </span>
          </div>
        </div>

        {/* Chart with Y-Axis and Bars */}
        <div style={{ display: 'flex', gap: 12, height: 160, paddingTop: 14 }}>
          {/* Y-Axis Labels */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              paddingBottom: 24,
              textAlign: 'right',
              width: 32,
              flexShrink: 0,
            }}
          >
            <span>60m</span>
            <span>45m</span>
            <span>30m</span>
            <span>15m</span>
            <span>0m</span>
          </div>

          {/* Chart Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Horizontal Gridlines */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                pointerEvents: 'none',
              }}
            >
              <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.08)' }} />
              <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.06)' }} />
              <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.06)' }} />
              <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.06)' }} />
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }} />
            </div>

            {/* 24 Bar Columns */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(24, 1fr)',
                gap: 5,
                alignItems: 'flex-end',
                zIndex: 2,
              }}
            >
              {hourlyActivity.map((sec, hour) => {
                const currentHour = new Date().getHours();
                const isCurrent = isViewingToday && hour === currentHour;
                const minutes = Math.min(Math.round(sec / 60), 60);
                const heightPercent = Math.min(Math.round((sec / 3600) * 100), 100);

                const hourLabel =
                  hour === 0 ? '12 AM' :
                  hour < 12 ? `${hour} AM` :
                  hour === 12 ? '12 PM' :
                  `${hour - 12} PM`;

                return (
                  <div
                    key={hour}
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      position: 'relative',
                    }}
                  >
                    {/* Background Bar Slot Track */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        top: 0,
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '3px 3px 0 0',
                      }}
                    />

                    {/* Active Blue Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: sec > 0 ? `${Math.max(heightPercent, 4)}%` : '0%',
                        background: isCurrent
                          ? 'linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)'
                          : 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                        borderRadius: '3px 3px 0 0',
                        boxShadow: sec > 0 ? '0 0 10px rgba(59, 130, 246, 0.35)' : 'none',
                        transition: 'height 0.25s ease',
                        position: 'relative',
                        zIndex: 3,
                      }}
                      title={`${hourLabel} (${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00): ${minutes}m active`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Hour Labels */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(24, 1fr)',
                gap: 5,
                height: 24,
                alignItems: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {Array.from({ length: 24 }).map((_, hour) => {
                const currentHour = new Date().getHours();
                const isCurrent = isViewingToday && hour === currentHour;
                const showLabel = hour % 3 === 0;

                const labelText =
                  hour === 0 ? '12a' :
                  hour === 3 ? '3a' :
                  hour === 6 ? '6a' :
                  hour === 9 ? '9a' :
                  hour === 12 ? '12p' :
                  hour === 15 ? '3p' :
                  hour === 18 ? '6p' :
                  hour === 21 ? '9p' :
                  '';

                return (
                  <div
                    key={hour}
                    style={{
                      textAlign: 'center',
                      fontSize: '0.66rem',
                      fontFamily: 'var(--font-mono)',
                      color: isCurrent ? '#60a5fa' : 'var(--text-muted)',
                      fontWeight: isCurrent ? 700 : 500,
                    }}
                  >
                    {showLabel ? labelText : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Work Category Breakdown Panel */}
      <div className="card-panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <span className="panel-title">Work Category Breakdown</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Categorized by active application & context
          </span>
        </div>

        {sortedCategories.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedCategories.map((item) => (
              <div key={item.category}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 5,
                    fontSize: '0.86rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#ffffff' }}>{item.meta.icon}</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{item.meta.label}</span>
                    {item.meta.isDeepWork && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid var(--border-subtle)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Deep Work
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {formatDuration(item.seconds)}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>
                      {item.percent}%
                    </span>
                  </div>
                </div>

                <div className="progress-bar-track" style={{ height: 6 }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${item.percent}%`,
                      background: item.meta.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            No activity recorded yet for this date. Keep MeTric running to automatically record screen time.
          </p>
        )}
      </div>

      {/* Side-by-Side: Projects & Applications */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Left: Top Projects */}
        <div className="card-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderGit2 size={15} style={{ color: '#ffffff' }} />
              <span className="panel-title">Projects</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Detected from IDEs & repos
            </span>
          </div>

          {topProjects.length > 0 ? (
            <div className="highlight-list">
              {topProjects.map((p, idx) => (
                <div key={p.project} className="highlight-item" style={{ cursor: 'default' }}>
                  <div className="highlight-left">
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="highlight-title" style={{ fontSize: '0.88rem' }}>
                        {p.project}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatDuration(p.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>
              No specific project names detected yet. Work in VS Code, Cursor, or Terminal to attribute time to projects.
            </p>
          )}
        </div>

        {/* Right: Top Applications */}
        <div className="card-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} style={{ color: '#ffffff' }} />
              <span className="panel-title">Top Applications</span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {topApps.length} apps logged
            </span>
          </div>

          {topApps.length > 0 ? (
            <div className="highlight-list">
              {topApps.slice(0, 8).map((appItem, idx) => {
                const appPercent = totalActive > 0 ? Math.round((appItem.durationSeconds / totalActive) * 100) : 0;
                return (
                  <div key={appItem.appName} className="highlight-item" style={{ cursor: 'default' }}>
                    <div className="highlight-left">
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: 'rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div className="highlight-title" style={{ fontSize: '0.88rem' }}>
                          {appItem.appName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {appItem.category}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#ffffff',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {formatDuration(appItem.durationSeconds)}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>
                        {appPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>
              No applications logged yet today.
            </p>
          )}
        </div>
      </div>

      {/* Privacy & Permissions Card */}
      <div
        className="card-panel"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          borderColor: 'var(--border-subtle)',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={18} style={{ color: '#ffffff' }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#ffffff' }}>
                100% Local &amp; Private to Your Mac
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                All screen time logs and window titles are processed on-device and stored locally in your Application Support folder. Never transmitted to the cloud.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="chip-btn"
            onClick={() => openDataFolder()}
            style={{ fontSize: '0.76rem', padding: '5px 10px', color: 'var(--text-secondary)' }}
          >
            <span>View Storage Folder</span>
            <ExternalLink size={11} style={{ marginLeft: 4 }} />
          </button>
        </div>
      </div>
    </div>
  );
};
