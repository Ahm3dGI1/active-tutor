import { FiCompass, FiRefreshCw } from 'react-icons/fi';

export default function SessionRecapPanel({ recap, generating, onGenerate }) {
  return (
    <div className="mt-5 bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-800">AI Session Recap + Next Actions</h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-700 text-white text-xs font-semibold hover:bg-primary-600 disabled:opacity-50"
        >
          <FiRefreshCw className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generating...' : recap ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {!recap ? (
        <div className="text-sm text-surface-500 bg-surface-50 border border-surface-200 rounded-lg p-4">
          Generate a recap to get a summary of this session, your weak areas, and concrete next actions.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface-50 border border-surface-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-surface-800 mb-1">{recap.title || 'AI Session Recap'}</p>
            <p className="text-sm text-surface-700 leading-relaxed">{recap.summary}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-red-700 mb-2">Weak Topics</p>
              {recap.weak_topics?.length > 0 ? (
                <ul className="space-y-1">
                  {recap.weak_topics.map((topic, idx) => (
                    <li key={idx} className="text-sm text-red-800">- {topic}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-700">No major weak topics detected.</p>
              )}
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-700 mb-2">Strengths</p>
              {recap.strengths?.length > 0 ? (
                <ul className="space-y-1">
                  {recap.strengths.map((topic, idx) => (
                    <li key={idx} className="text-sm text-emerald-800">- {topic}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-700">No strengths recorded yet.</p>
              )}
            </div>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wider font-semibold text-primary-700 mb-2 inline-flex items-center gap-1">
              <FiCompass /> Next Actions
            </p>
            {recap.next_actions?.length > 0 ? (
              <ol className="space-y-2 list-decimal pl-5">
                {recap.next_actions.map((action, idx) => (
                  <li key={idx} className="text-sm text-primary-900 leading-relaxed">{action}</li>
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
