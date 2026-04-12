import React, { useState } from 'react';
import { sendToBackground } from '../../shared/messaging.js';
import { MSG } from '../../shared/constants.js';

export default function CheckpointOverlay({ checkpoint, sessionId, onResult, onResume }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const labels = ['A', 'B', 'C', 'D'];

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await sendToBackground(MSG.ANSWER_CHECKPOINT, {
        sessionId,
        checkpointId: checkpoint.id,
        answer: selected,
      });
      if (res.error) throw new Error(res.error);
      setResult(res);
      if (onResult) onResult(checkpoint.id, res);
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
    setSubmitting(false);
  };

  const overlayStyle = {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2001, borderRadius: '8px',
    pointerEvents: 'auto',
  };

  const cardStyle = {
    backgroundColor: 'white', borderRadius: '12px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    maxWidth: '520px', width: '90%', padding: '24px',
    fontFamily: 'Inter, system-ui, sans-serif',
    animation: 'hermex-fade-up 0.3s ease-out',
  };

  const getOptionStyle = (label) => {
    const isSelected = selected === label;
    const isCorrect = result && label === result.correct_option;
    const isWrong = result && isSelected && !result.correct;

    let bg = 'white';
    let border = '#e7e5e4';
    let labelBg = '#f5f5f4';
    let labelColor = '#57534e';

    if (result) {
      if (isCorrect) { bg = '#ecfdf5'; border = '#10b981'; labelBg = '#059669'; labelColor = 'white'; }
      else if (isWrong) { bg = '#fef2f2'; border = '#f87171'; labelBg = '#ef4444'; labelColor = 'white'; }
      else { bg = 'white'; border = '#e7e5e4'; }
    } else if (isSelected) {
      bg = '#f0fdfa'; border = '#0f766e'; labelBg = '#0f766e'; labelColor = 'white';
    }

    return { bg, border, labelBg, labelColor };
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            backgroundColor: '#fff7ed', color: '#c2410c',
            fontSize: '12px', fontWeight: '700', padding: '4px 12px',
            borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Checkpoint @ {formatTime(checkpoint.timestamp_seconds)}
          </span>
        </div>

        {/* Question */}
        <h3 style={{
          fontSize: '16px', fontWeight: '600', color: '#1c1917',
          marginBottom: '20px', lineHeight: '1.5',
        }}>
          {checkpoint.question}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {checkpoint.options.map((option, i) => {
            const label = labels[i];
            const s = getOptionStyle(label);
            return (
              <button
                key={label}
                disabled={!!result}
                onClick={() => setSelected(label)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px',
                  borderRadius: '8px', border: `2px solid ${s.border}`,
                  backgroundColor: s.bg, cursor: result ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  transition: 'all 0.15s', opacity: result && !s.bg.includes('fdf') && !s.bg.includes('f2f') && label !== selected ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '700', flexShrink: 0,
                  backgroundColor: s.labelBg, color: s.labelColor,
                }}>
                  {result && label === result.correct_option ? '\u2713' : result && label === selected && !result.correct ? '\u2717' : label}
                </span>
                <span style={{ fontSize: '14px', color: '#44403c' }}>{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {result && (
          <div style={{
            padding: '14px', borderRadius: '8px', marginBottom: '16px',
            backgroundColor: result.correct ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${result.correct ? '#a7f3d0' : '#fecaca'}`,
          }}>
            <p style={{
              fontWeight: '600', fontSize: '13px',
              color: result.correct ? '#065f46' : '#991b1b', marginBottom: '4px',
            }}>
              {result.correct ? 'Correct!' : 'Incorrect'}
            </p>
            <p style={{ fontSize: '13px', color: '#57534e', lineHeight: '1.5' }}>
              {result.explanation}
            </p>
          </div>
        )}

        {/* Actions */}
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              backgroundColor: !selected || submitting ? '#d6d3d1' : '#0f766e',
              color: 'white', border: 'none', fontSize: '14px', fontWeight: '600',
              cursor: !selected || submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={onResume}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              backgroundColor: '#f97316', color: 'white', border: 'none',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'inherit',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Resume Video
          </button>
        )}
      </div>

      <style>{`
        @keyframes hermex-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
