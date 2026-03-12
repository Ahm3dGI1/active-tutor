import { useState } from 'react';
import { FiCheck, FiX, FiPlay } from 'react-icons/fi';

export default function CheckpointModal({ checkpoint, onSubmit, onResume }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const labels = ['A', 'B', 'C', 'D'];

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(checkpoint.id, selected);
      setResult(res);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm flex items-center justify-center z-30 rounded-lg">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-accent-100 text-accent-700 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">
            Checkpoint @ {formatTime(checkpoint.timestamp_seconds)}
          </span>
        </div>

        {/* Question */}
        <h3 className="text-lg font-semibold text-surface-900 mb-5 leading-snug">{checkpoint.question}</h3>

        {/* Options */}
        <div className="space-y-2.5 mb-6">
          {checkpoint.options.map((option, i) => {
            const label = labels[i];
            const isSelected = selected === label;
            const isCorrect = result && label === result.correct_option;
            const isWrong = result && isSelected && !result.correct;

            let style = 'border-surface-200 hover:border-primary-300 hover:bg-primary-50/50';
            if (result) {
              if (isCorrect) style = 'border-emerald-500 bg-emerald-50';
              else if (isWrong) style = 'border-red-400 bg-red-50';
              else style = 'border-surface-200 opacity-50';
            } else if (isSelected) {
              style = 'border-primary-500 bg-primary-50 ring-2 ring-primary-100';
            }

            return (
              <button
                key={label}
                disabled={!!result}
                onClick={() => setSelected(label)}
                className={`w-full text-left p-3.5 rounded-lg border-2 transition-all flex items-center gap-3 ${style}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isSelected && !result ? 'bg-primary-700 text-white' :
                  isCorrect ? 'bg-emerald-600 text-white' :
                  isWrong ? 'bg-red-500 text-white' :
                  'bg-surface-100 text-surface-600'
                }`}>
                  {result && isCorrect ? <FiCheck /> : result && isWrong ? <FiX /> : label}
                </span>
                <span className="text-sm text-surface-700">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {result && (
          <div className={`p-4 rounded-lg mb-4 ${result.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`font-semibold text-sm ${result.correct ? 'text-emerald-800' : 'text-red-800'}`}>
              {result.correct ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="text-sm text-surface-600 mt-1 leading-relaxed">{result.explanation}</p>
          </div>
        )}

        {/* Actions */}
        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="w-full bg-primary-700 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={onResume}
            className="w-full bg-accent-500 text-white py-3 rounded-lg font-semibold hover:bg-accent-600 transition-all flex items-center justify-center gap-2 shadow-sm shadow-accent-500/20"
          >
            <FiPlay /> Resume Video
          </button>
        )}
      </div>
    </div>
  );
}
