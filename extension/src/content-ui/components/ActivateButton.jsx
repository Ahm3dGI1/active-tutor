import React, { useState, useEffect, useRef } from 'react';

export default function ActivateButton({ onClick, loading }) {
  const [container, setContainer] = useState(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    // Find YouTube's info section below the video to inject our button
    const findTarget = () => {
      const targets = [
        '#above-the-fold #title',
        '#info-contents',
        '#above-the-fold',
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
      wrapper.id = 'hermex-activate-wrapper';
      wrapper.style.cssText = 'margin: 8px 0; pointer-events: auto;';
      target.parentNode.insertBefore(wrapper, target.nextSibling);
      setContainer(wrapper);
    }

    return () => {
      const wrapper = document.getElementById('hermex-activate-wrapper');
      wrapper?.remove();
    };
  }, []);

  useEffect(() => {
    if (container && buttonRef.current) {
      container.appendChild(buttonRef.current);
    }
  }, [container]);

  return (
    <div ref={buttonRef} style={{ pointerEvents: 'auto' }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#0f766e',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => { if (!loading) e.target.style.backgroundColor = '#115e59'; }}
        onMouseOut={(e) => { e.target.style.backgroundColor = '#0f766e'; }}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block', width: '14px', height: '14px',
              border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
              borderRadius: '50%', animation: 'hermex-spin 0.6s linear infinite',
            }} />
            Creating Session...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Start Hermex Session
          </>
        )}
      </button>
      <style>{`
        @keyframes hermex-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
