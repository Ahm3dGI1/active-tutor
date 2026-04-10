import React from 'react';
import { createRoot } from 'react-dom/client';
import '../content/styles.css';

function Popup() {
  return (
    <div className="w-72 p-4 bg-white">
      <h1 className="text-lg font-bold text-primary-700">Hermex</h1>
      <p className="text-sm text-surface-500 mt-1">Active YouTube Learning</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Popup />);
