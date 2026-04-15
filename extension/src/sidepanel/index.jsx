import React from 'react';
import { createRoot } from 'react-dom/client';
import SidePanel from './SidePanel.jsx';
import ToastHost from '../shared/ui/ToastHost.jsx';
import ErrorBoundary from '../shared/ui/ErrorBoundary.jsx';
import { syncDarkTheme } from '../shared/theme.js';
import '../content/styles.css';

syncDarkTheme();

createRoot(document.getElementById('root')).render(
  <ErrorBoundary label="the Hermex side panel">
    <ToastHost>
      <SidePanel />
    </ToastHost>
  </ErrorBoundary>
);
