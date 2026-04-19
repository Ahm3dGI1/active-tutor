import React, { useState, useEffect, useRef } from 'react';

export default function ProgressBarOverlay({ currentTime, duration, checkpoints, onCheckpointClick }) {
  const [container, setContainer] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    // Insert progress bar below the YouTube player
    const findTarget = () => {
      const targets = [
        '#below',
        '#info-contents',
        'ytd-watch-metadata',
      ];
      for (const selector of targets) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    };

    const target = findTarget();
    if (target && !container) {
      const wrapper = document.createElement('div');
      wrapper.id = 'hermex-progress-wrapper';
      wrapper.style.cssText = 'margin: 4px 0 8px 0; pointer-events: auto;';
      target.insertBefore(wrapper, target.firstChild);
      setContainer(wrapper);
    }

    return () => {
      document.getElementById('hermex-progress-wrapper')?.remove();
    };
  }, []);

  useEffect(() => {
    if (container && barRef.current) {
      container.appendChild(barRef.current);
    }
  }, [container]);

  if (!duration || !checkpoints) return null;

  const progress = (currentTime / duration) * 100;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={barRef} style={{ pointerEvents: 'auto' }}>
      <div style={{
        position: 'relative', width: '100%', height: '10px',
        backgroundColor: '#e7e5e4', borderRadius: '5px',
        cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {/* Progress fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          backgroundColor: '#14b8a6', borderRadius: '5px',
          transition: 'width 0.3s ease', width: `${Math.min(progress, 100)}%`,
        }} />

        {/* Checkpoint markers */}
        {checkpoints.map((cp) => {
          const pos = (cp.timestamp_seconds / duration) * 100;
          let color = '#a8a29e'; // not yet reached
          if (cp.user_answer !== null) {
            color = cp.user_answer === cp.correct_option ? '#10b981' : '#ef4444';
          } else if (currentTime >= cp.timestamp_seconds) {
            color = '#f97316';
          }

          return (
            <button
              key={cp.id}
              type="button"
              onClick={() => onCheckpointClick?.(cp)}
              title={`Checkpoint @ ${formatTime(cp.timestamp_seconds)}`}
              style={{
                position: 'absolute', top: '50%',
                left: `${pos}%`, transform: 'translate(-50%, -50%)',
                width: '12px', height: '12px',
                backgroundColor: color, borderRadius: '50%',
                border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                cursor: 'pointer', transition: 'all 0.15s',
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
