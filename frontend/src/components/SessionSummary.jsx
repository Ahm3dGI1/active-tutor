import { FiCheck, FiX, FiAward, FiMessageCircle } from 'react-icons/fi';

export default function SessionSummary({
  checkpoints,
  onAskTutor,
}) {
  const answered = checkpoints.filter((c) => c.user_answer !== null);
  const correct = answered.filter((c) => c.user_answer === c.correct_option);
  const incorrect = answered.filter((c) => c.user_answer !== c.correct_option);
  const skipped = checkpoints.filter((c) => c.user_answer === null);
  const score = answered.length > 0 ? Math.round((correct.length / checkpoints.length) * 100) : 0;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6 max-w-md mx-auto animate-fade-up">
      {/* Score */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-surface-100 mb-4">
          <FiAward className={`text-2xl ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-accent-600' : 'text-red-500'}`} />
        </div>
        <h2 className="text-xl font-bold text-surface-900">Session Complete!</h2>
        <p className="text-4xl font-extrabold mt-3">
          <span className={score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-accent-600' : 'text-red-500'}>{correct.length}</span>
          <span className="text-surface-300 text-2xl font-bold"> / {checkpoints.length}</span>
        </p>
        <p className="text-surface-500 text-sm mt-1">checkpoints correct ({score}%)</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 mb-6">
        {correct.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
            <FiCheck /> {correct.length} correct
          </div>
        )}
        {incorrect.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
            <FiX /> {incorrect.length} incorrect
            <span className="text-xs text-red-500 ml-auto">
              at {incorrect.map((c) => formatTime(c.timestamp_seconds)).join(', ')}
            </span>
          </div>
        )}
        {skipped.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-surface-600 bg-surface-100 px-3 py-2 rounded-lg">
            {skipped.length} skipped
          </div>
        )}
      </div>

      {onAskTutor && (
        <button
          onClick={onAskTutor}
          className="w-full flex items-center justify-center gap-2 bg-primary-700 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all shadow-sm"
        >
          <FiMessageCircle /> Ask the Tutor Questions
        </button>
      )}
    </div>
  );
}
