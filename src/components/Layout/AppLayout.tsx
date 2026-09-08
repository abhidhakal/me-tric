import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { TodayView } from '../Today/TodayView';
import { DashboardView } from '../Dashboard/DashboardView';
import { MetricsView } from '../Metrics/MetricsView';
import { GoalsView } from '../Goals/GoalsView';
import { ReviewsView } from '../Reviews/ReviewsView';
import { QuickLogModal } from '../QuickLog/QuickLogModal';
import { OnboardingScreen } from '../Onboarding/OnboardingScreen';
import { ToastContainer } from '../Common/ToastContainer';
import { useTracker } from '../../context/TrackerContext';

export const AppLayout: React.FC = () => {
  const { activeTab, setActiveTab, isOnboardingOpen, profile, isLoading } = useTracker();

  // Keyboard shortcuts Cmd+1 to Cmd+5 to switch tabs
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('today');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('dashboard');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('metrics');
        } else if (e.key === '4') {
          e.preventDefault();
          setActiveTab('goals');
        } else if (e.key === '5') {
          e.preventDefault();
          setActiveTab('reviews');
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setActiveTab]);

  // Full-screen first-run experience if not completed, or when re-opened
  if (isOnboardingOpen || (!profile?.onboardingCompleted && !isLoading)) {
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
        <Header />

        <main className="content-area">
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'metrics' && <MetricsView />}
          {activeTab === 'goals' && <GoalsView />}
          {activeTab === 'reviews' && <ReviewsView />}
        </main>
      </div>

      <QuickLogModal />
      <ToastContainer />
    </div>
  );
};
