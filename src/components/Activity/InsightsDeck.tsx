import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, Zap, Clock, ShieldAlert, Award } from 'lucide-react';
import { useTracker } from '../../context/TrackerContext';
import { computeSmartInsights } from '../../utils/insightsEngine';
import { SmartInsight } from '../../types';

export const InsightsDeck: React.FC = () => {
  const {
    focusSessions,
    activitySummary,
    metrics,
    todayEntries,
    todayEvents,
    goals,
  } = useTracker();

  const insights = useMemo(() => {
    return computeSmartInsights({
      focusSessions,
      activitySummary,
      metrics,
      entries: todayEntries,
      events: todayEvents,
      goals,
    });
  }, [focusSessions, activitySummary, metrics, todayEntries, todayEvents, goals]);

  const getInsightIcon = (type: SmartInsight['type']) => {
    switch (type) {
      case 'focus_multiplier':
        return <TrendingUp size={15} />;
      case 'peak_time':
        return <Clock size={15} />;
      case 'switching_rate':
        return <Zap size={15} />;
      case 'optimal_duration':
        return <Award size={15} />;
      case 'habit_impact':
        return <ShieldAlert size={15} />;
      default:
        return <Sparkles size={15} />;
    }
  };

  return (
    <div className="insights-container">
      <div className="panel-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={15} style={{ color: '#ffffff' }} />
          <span className="panel-title">Smart Insights & Correlations</span>
        </div>
        <span className="tray-section-count">{insights.length} active patterns</span>
      </div>

      <div className="insights-grid">
        {insights.map((insight) => (
          <div key={insight.id} className="insight-card">
            <div className="insight-card-top">
              <div className="insight-icon-box">
                {getInsightIcon(insight.type)}
              </div>
              {insight.badge && (
                <span className="insight-badge">{insight.badge}</span>
              )}
            </div>

            <div className="insight-card-body">
              <h4 className="insight-card-title">{insight.title}</h4>
              <p className="insight-card-desc">{insight.description}</p>
            </div>

            {insight.actionableRecommendation && (
              <div className="insight-card-footer">
                <span className="insight-rec-label">Takeaway</span>
                <span className="insight-rec-text">{insight.actionableRecommendation}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
