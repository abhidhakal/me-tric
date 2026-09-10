import React, { useState, useMemo } from 'react';
import { useTracker } from '../../context/TrackerContext';
import {
  Maximize2,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Check,
  Zap,
  Clock,
  Play,
  Pause,
} from 'lucide-react';

export const TrayPopover: React.FC = () => {
  const {
    metrics,
    todayEntries,
    activePlans,
    togglePlan,
    logMetric,
    activityStatus,
    activitySummary,
    toggleActivityTracking,
  } = useTracker();

  // Active enabled metrics
  const activeMetrics = useMemo(() => {
    return metrics.filter((m) => m.enabled !== false);
  }, [metrics]);

  const [selectedMetricId, setSelectedMetricId] = useState<string>(() => {
    return activeMetrics[0]?.id || '';
  });

  // Keep selectedMetricId in sync if empty
  React.useEffect(() => {
    if (!selectedMetricId && activeMetrics.length > 0) {
      setSelectedMetricId(activeMetrics[0].id);
    }
  }, [activeMetrics, selectedMetricId]);

  const currentMetric = useMemo(() => {
    return activeMetrics.find((m) => m.id === selectedMetricId) || activeMetrics[0];
  }, [activeMetrics, selectedMetricId]);

  // Current metric value today
  const currentMetricTodayTotal = useMemo(() => {
    if (!currentMetric) return 0;
    const entries = todayEntries.filter((e) => e.metricId === currentMetric.id);
    if (entries.length === 0) return 0;
    if (currentMetric.type === 'rating') {
      return entries[entries.length - 1].value;
    }
    return entries.reduce((sum, e) => sum + e.value, 0);
  }, [todayEntries, currentMetric]);

  // Quick log input state
  const defaultStep = useMemo(() => {
    if (!currentMetric) return 1;
    if (currentMetric.type === 'boolean') return 1;
    const unit = currentMetric.unit?.toLowerCase() || '';
    if (unit.includes('ml')) return 250;
    if (unit.includes('min')) return 15;
    if (unit.includes('page')) return 5;
    if (unit.includes('cal')) return 100;
    return 1;
  }, [currentMetric]);

  const [logValue, setLogValue] = useState<number>(defaultStep);
  const [justLogged, setJustLogged] = useState(false);
  const [isTogglingActivity, setIsTogglingActivity] = useState(false);

  // Update default logValue when metric changes
  React.useEffect(() => {
    setLogValue(defaultStep);
  }, [defaultStep, selectedMetricId]);

  const handleLog = async () => {
    if (!currentMetric) return;
    try {
      await logMetric(currentMetric.id, Number(logValue));
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 1800);
    } catch (err) {
      console.error('Failed to quick-log from tray:', err);
    }
  };

  const handleOpenMain = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openMainWindow) {
      window.electronAPI.openMainWindow();
    }
  };

  const handleToggleTracking = async () => {
    setIsTogglingActivity(true);
    try {
      await toggleActivityTracking();
    } finally {
      setIsTogglingActivity(false);
    }
  };

  // Date display
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  // Format active seconds
  const formattedActiveTime = useMemo(() => {
    const secs = activitySummary?.totalActiveSeconds || 0;
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [activitySummary?.totalActiveSeconds]);

  // Completed plans count
  const completedPlansCount = activePlans.filter((p) => p.completed).length;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'rgba(9, 9, 12, 0.96)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif)',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '14px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '-0.5px',
            }}
          >
            M
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-0.2px' }}>MeTric</div>
            <div style={{ fontSize: '11px', color: '#a1a1aa' }}>{todayFormatted}</div>
          </div>
        </div>

        {/* Activity tracking pill */}
        <button
          onClick={handleToggleTracking}
          disabled={isTogglingActivity}
          title={activityStatus?.isTracking ? 'Tracking Active (Click to Pause)' : 'Tracking Paused (Click to Resume)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activityStatus?.isTracking
              ? 'rgba(34, 197, 94, 0.12)'
              : 'rgba(255, 255, 255, 0.06)',
            border: activityStatus?.isTracking
              ? '1px solid rgba(34, 197, 94, 0.28)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            borderRadius: '20px',
            color: activityStatus?.isTracking ? '#4ade80' : '#a1a1aa',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: activityStatus?.isTracking ? '#22c55e' : '#71717a',
              boxShadow: activityStatus?.isTracking ? '0 0 8px #22c55e' : 'none',
            }}
          />
          {activityStatus?.isTracking ? (
            <span>{formattedActiveTime}</span>
          ) : (
            <span>Paused</span>
          )}
          {activityStatus?.isTracking ? (
            <Pause size={10} style={{ marginLeft: '2px', opacity: 0.7 }} />
          ) : (
            <Play size={10} style={{ marginLeft: '2px', opacity: 0.7 }} />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Quick Log Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Zap size={12} color="#ffffff" />
              <span>Quick Log</span>
            </div>
            {currentMetric && (
              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                Today:{' '}
                <span style={{ color: '#ffffff', fontWeight: 600 }}>
                  {currentMetricTodayTotal} {currentMetric.unit || ''}
                </span>
                {currentMetric.targetValue && (
                  <span style={{ color: '#71717a' }}> / {currentMetric.targetValue}</span>
                )}
              </div>
            )}
          </div>

          {/* Metric Selector Pills */}
          {activeMetrics.length > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '10px',
                scrollbarWidth: 'none',
              }}
            >
              {activeMetrics.slice(0, 6).map((metric) => {
                const isSelected = metric.id === (currentMetric?.id || selectedMetricId);
                return (
                  <button
                    key={metric.id}
                    onClick={() => setSelectedMetricId(metric.id)}
                    style={{
                      background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#000000' : '#d4d4d8',
                      border: isSelected ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: isSelected ? 600 : 400,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      flexShrink: 0,
                    }}
                  >
                    {metric.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#71717a', padding: '6px 0' }}>
              No active metrics configured yet.
            </div>
          )}

          {/* Stepper / Input & Log Button */}
          {currentMetric && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '2px',
                  flex: 1,
                }}
              >
                <button
                  onClick={() => setLogValue((v) => Math.max(0, v - defaultStep))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  value={logValue}
                  onChange={(e) => setLogValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'center',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => setLogValue((v) => v + defaultStep)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                onClick={handleLog}
                disabled={justLogged}
                style={{
                  background: justLogged ? '#22c55e' : '#ffffff',
                  color: justLogged ? '#ffffff' : '#000000',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  flexShrink: 0,
                }}
              >
                {justLogged ? (
                  <>
                    <Check size={14} /> Logged!
                  </>
                ) : (
                  <>
                    <span>+ Log</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Today's Tasks & Checklist */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <Clock size={12} color="#ffffff" />
              <span>Today's Priorities</span>
            </div>
            {activePlans.length > 0 && (
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                {completedPlansCount} of {activePlans.length} done
              </span>
            )}
          </div>

          {activePlans.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#71717a', padding: '6px 0', textAlign: 'center' }}>
              No tasks for today. Open app to add one!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activePlans.slice(0, 4).map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => togglePlan(plan.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    background: plan.completed ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                >
                  {plan.completed ? (
                    <CheckCircle2 size={15} color="#22c55e" style={{ flexShrink: 0 }} />
                  ) : (
                    <Circle size={15} color="#71717a" style={{ flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: '12px',
                      color: plan.completed ? '#71717a' : '#ffffff',
                      textDecoration: plan.completed ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {plan.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={handleOpenMain}
          style={{
            width: '100%',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            color: '#ffffff',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)';
          }}
        >
          <span>Open Full MeTric Dashboard</span>
          <Maximize2 size={13} style={{ opacity: 0.8 }} />
        </button>
      </div>
    </div>
  );
};
