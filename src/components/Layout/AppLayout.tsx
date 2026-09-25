import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TodayView } from '../Today/TodayView';
import { ActivityView } from '../Activity/ActivityView';
import { DashboardView } from '../Dashboard/DashboardView';
import { PlanView } from '../Plan/PlanView';
import { ReviewsView } from '../Reviews/ReviewsView';
import { QuickLogModal } from '../QuickLog/QuickLogModal';
import { OnboardingScreen } from '../Onboarding/OnboardingScreen';
import { ToastContainer } from '../Common/ToastContainer';
import { useTracker, ActiveTab } from '../../context/TrackerContext';

export const AppLayout: React.FC = () => {
  const { activeTab, setActiveTab, profile, isLoading } = useTracker();

  // Keyboard shortcuts Cmd+1 to Cmd+5 to switch tabs
  useEffect(() => {
    const tabs: ActiveTab[] = ['today', 'plan', 'progress', 'reviews', 'activity'];
    const handleKey = (e: KeyboardEvent) => {
      const tab = tabs[Number(e.key) - 1];
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && tab) {
        e.preventDefault();
        setActiveTab(tab);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setActiveTab]);

  // Full-screen first-run experience; afterwards profile edits go through the profile modal
  if (!profile?.onboardingCompleted && !isLoading) {
    return (
      <>
        <OnboardingScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-wrapper">
        <main className="content-area">
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'plan' && <PlanView />}
          {activeTab === 'progress' && <DashboardView />}
          {activeTab === 'reviews' && <ReviewsView />}
          {activeTab === 'activity' && <ActivityView />}
        </main>
      </div>

      <QuickLogModal />
      <ToastContainer />
    </div>
  );
};
