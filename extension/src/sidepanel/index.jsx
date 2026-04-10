import React from 'react';
import { createRoot } from 'react-dom/client';
import '../content/styles.css';

function SidePanel() {
  return (
    <div className="h-screen bg-white p-4">
      <h1 className="text-lg font-bold text-primary-700">Hermex</h1>
      <p className="text-sm text-surface-500 mt-1">Side Panel</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<SidePanel />);
