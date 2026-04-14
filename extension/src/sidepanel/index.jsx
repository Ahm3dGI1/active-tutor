import React from 'react';
import { createRoot } from 'react-dom/client';
import SidePanel from './SidePanel.jsx';
import { syncDarkTheme } from '../shared/theme.js';
import '../content/styles.css';

syncDarkTheme();

createRoot(document.getElementById('root')).render(<SidePanel />);
