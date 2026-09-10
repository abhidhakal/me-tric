import React, { useEffect, useState } from 'react';
import { TrackerProvider } from './context/TrackerContext';
import { AppLayout } from './components/Layout/AppLayout';
import { TrayPopover } from './components/Tray/TrayPopover';

export function App() {
  const [isTrayView, setIsTrayView] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash === '#tray';
  });

  useEffect(() => {
    const handleHashChange = () => {
      setIsTrayView(window.location.hash === '#tray');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isTrayView) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
    }
  }, [isTrayView]);

  return (
    <TrackerProvider>
      {isTrayView ? <TrayPopover /> : <AppLayout />}
    </TrackerProvider>
  );
}

export default App;
