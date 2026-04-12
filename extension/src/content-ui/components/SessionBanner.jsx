import React, { useState, useEffect, useRef } from 'react';

export default function SessionBanner({ session, checkpoints }) {
  const [container, setContainer] = useState(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    const target = document.querySelector('#hermex-activate-wrapper');
    if (target) {
      setContainer(target);
    } else {
      // Create wrapper if activate button was removed
      const targets = ['#above-the-fold #title', '#info-contents', '#above-the-fold'];
      for (const selector of targets) {
        const el = document.querySelector(selector);
        if (el) {
          const wrapper = document.createElement('div');
          wrapper.id = 'hermex-session-banner-wrapper';
          wrapper.style.cssText = 'margin: 8px 0; pointer-events: auto;';
          el.parentNode.insertBefore(wrapper, el.nextSibling);
          setContainer(wrapper);
          break;
        }
      }
    }

    return () => {
      document.getElementById('hermex-session-banner-wrapper')?.remove();
    };
  }, []);

  useEffect(() => {
    if (container && bannerRef.current) {
      container.innerHTML = '';
      container.appendChild(bannerRef.current);
    }
  }, [container]);

  const answered = checkpoints?.filter((cp) => cp.user_answer !== null) || [];
  const correct = checkpoints?.filter((cp) => cp.user_answer === cp.correct_option) || [];
  const total = checkpoints?.length || 0;

  return (
    <div ref={bannerRef} style={{ pointerEvents: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '8px 16px', backgroundColor: '#f0fdfa',
        border: '1px solid #ccfbf1', borderRadius: '8px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: '8px', height: '8px', backgroundColor: '#10b981',
          borderRadius: '50%', flexShrink: 0,
        }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f766e' }}>
          Hermex Session Active
        </span>
        <span style={{ fontSize: '12px', color: '#78716c' }}>
          {answered.length}/{total} checkpoints
        </span>
        {answered.length > 0 && (
          <span style={{
            fontSize: '12px', fontWeight: '600',
            color: correct.length === answered.length ? '#059669' : '#f97316',
          }}>
            {correct.length}/{answered.length} correct
          </span>
        )}
      </div>
    </div>
  );
}
