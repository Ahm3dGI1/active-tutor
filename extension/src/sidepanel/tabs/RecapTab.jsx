import React, { useState, useEffect } from 'react';
import { sendToBackground } from '../../shared/messaging.js';
import { MSG } from '../../shared/constants.js';

export default function RecapTab({ session }) {
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadRecap();
  }, [session.id]);

  const loadRecap = async () => {
    try {
      const res = await sendToBackground(MSG.GET_RECAP, { sessionId: session.id });
      if (res && !res.error) {
        setRecap(res.recap || res);
      }
    } catch {
      // No recap yet
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await sendToBackground(MSG.GENERATE_RECAP, { sessionId: session.id });
      if (res.error) throw new Error(res.error);
      setRecap(res.recap || res);
    } catch (err) {
      console.error('Failed to generate recap:', err);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-800">Session Recap</h3>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 text-white text-xs font-semibold hover:bg-primary-600 disabled:opacity-50 transition"
        >
          {generating ? (
            <>
              <span className="animate-spin inline-block w-3 h-3 border border-white/30 border-t-white rounded-full"></span>
              Generating...
            </>
          ) : (
            recap ? 'Regenerate' : 'Generate'
          )}
        </button>
      </div>

      {!recap ? (
        <div className="text-sm text-surface-500 bg-surface-50 border border-surface-200 rounded-lg p-4">
          Generate a recap to get a summary of this session, your weak areas, and concrete next actions.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-surface-50 border border-surface-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-surface-500 mb-1">{recap.title || 'Session Summary'}</p>
            <p className="text-sm text-surface-700 leading-relaxed">{recap.summary}</p>
          </div>

          {/* Weak Topics */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-red-700 mb-1.5">Weak Topics</p>
            {recap.weak_topics?.length > 0 ? (
              <ul className="space-y-1">
                {recap.weak_topics.map((topic, i) => (
                  <li key={i} className="text-sm text-red-800">- {topic}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-700">No major weak topics detected.</p>
            )}
          </div>

          {/* Strengths */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-emerald-700 mb-1.5">Strengths</p>
            {recap.strengths?.length > 0 ? (
              <ul className="space-y-1">
                {recap.strengths.map((topic, i) => (
                  <li key={i} className="text-sm text-emerald-800">- {topic}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-700">No strengths recorded yet.</p>
            )}
          </div>

          {/* Next Actions */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
            <p className="text-xs uppercase tracking-wider font-semibold text-primary-700 mb-1.5">Next Actions</p>
            {recap.next_actions?.length > 0 ? (
              <ol className="space-y-1.5 list-decimal pl-4">
                {recap.next_actions.map((action, i) => (
                  <li key={i} className="text-sm text-primary-900 leading-relaxed">{action}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-primary-700">No action items generated yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
