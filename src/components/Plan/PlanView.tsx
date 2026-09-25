import React from 'react';
import { GoalsSection } from '../Goals/GoalsView';
import { MetricsSection } from '../Metrics/MetricsView';

export const PlanView: React.FC = () => (
  <div className="view-container">
    <div className="view-header">
      <div className="view-title-row">
        <div>
          <h2 className="view-title">Plan</h2>
        </div>
      </div>
    </div>

    <GoalsSection />
    <MetricsSection />
  </div>
);
