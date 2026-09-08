import React from 'react';
import { TrackerProvider } from './context/TrackerContext';
import { AppLayout } from './components/Layout/AppLayout';

export function App() {
  return (
    <TrackerProvider>
      <AppLayout />
    </TrackerProvider>
  );
}

export default App;
