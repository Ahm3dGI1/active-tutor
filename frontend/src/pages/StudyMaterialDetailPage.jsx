import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiRotateCw, FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getSession, getStudyMaterial } from '../api/api';

function parseStructuredContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function FallbackTextMaterial({ content }) {
  const sections = useMemo(() => {
    return content.split(/\n\s*\n/g).map((part) => part.trim()).filter(Boolean);
  }, [content]);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx} className="bg-white border border-surface-200 rounded-xl p-5">
          <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">{section}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryMaterial({ data }) {
  return (
    <div className="space-y-4">
      {data.overview && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Overview</h2>
          <p className="text-sm text-surface-700 leading-relaxed">{data.overview}</p>
        </div>
      )}

      {Array.isArray(data.key_points) && data.key_points.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Key Points</h2>
          <ul className="space-y-2">
            {data.key_points.map((point, idx) => (
              <li key={idx} className="text-sm text-surface-700 flex gap-2 leading-relaxed">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(data.timeline) && data.timeline.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Timeline</h2>
          <div className="space-y-2">
            {data.timeline.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <span className="inline-flex px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-semibold min-w-[52px] justify-center">
                  {item.time}
                </span>
                <p className="text-surface-700 leading-relaxed">{item.point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(data.review_questions) && data.review_questions.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Review Questions</h2>
          <ol className="space-y-2 list-decimal pl-5">
            {data.review_questions.map((q, idx) => (
              <li key={idx} className="text-sm text-surface-700 leading-relaxed">{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function FlashcardsMaterial({ data }) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return <div className="bg-white border border-surface-200 rounded-xl p-5 text-sm text-surface-500">No flashcards available.</div>;
  }

  const card = cards[index];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-surface-200 rounded-xl p-6 min-h-[260px] flex flex-col justify-between">
        <div>
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">{flipped ? 'Back' : 'Front'}</p>
          <p className="text-lg font-medium text-surface-900 leading-relaxed whitespace-pre-wrap">
            {flipped ? card.back : card.front}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-surface-400">Card {index + 1} of {cards.length}</p>
          <button
            type="button"
            onClick={() => setFlipped((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 text-sm text-surface-700 hover:border-primary-300"
          >
            <FiRotateCw /> Flip
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => {
            setIndex((prev) => Math.max(0, prev - 1));
            setFlipped(false);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 text-sm text-surface-700 disabled:opacity-40"
        >
          <FiChevronLeft /> Previous
        </button>
        <button
          type="button"
          disabled={index === cards.length - 1}
          onClick={() => {
            setIndex((prev) => Math.min(cards.length - 1, prev + 1));
            setFlipped(false);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 text-sm text-surface-700 disabled:opacity-40"
        >
          Next <FiChevronRight />
        </button>
      </div>
    </div>
  );
}

function QuizMaterial({ data }) {
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const [selectedByQuestion, setSelectedByQuestion] = useState({});
  const [checkedByQuestion, setCheckedByQuestion] = useState({});

  if (questions.length === 0) {
    return <div className="bg-white border border-surface-200 rounded-xl p-5 text-sm text-surface-500">No quiz questions available.</div>;
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qIdx) => {
        const selected = selectedByQuestion[qIdx];
        const checked = checkedByQuestion[qIdx];
        const isCorrect = checked && selected === q.correct_index;

        return (
          <div key={qIdx} className="bg-white border border-surface-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-surface-800 mb-3">Q{qIdx + 1}. {q.question}</p>
            <div className="space-y-2">
              {(q.options || []).map((option, optIdx) => {
                const picked = selected === optIdx;
                const shouldShowCorrect = checked && optIdx === q.correct_index;
                const shouldShowWrong = checked && picked && optIdx !== q.correct_index;

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={checked}
                    onClick={() => setSelectedByQuestion((prev) => ({ ...prev, [qIdx]: optIdx }))}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                      shouldShowCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : shouldShowWrong
                          ? 'border-red-500 bg-red-50 text-red-800'
                          : picked
                            ? 'border-primary-500 bg-primary-50 text-primary-800'
                            : 'border-surface-200 bg-white text-surface-700 hover:border-primary-200'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              {!checked ? (
                <button
                  type="button"
                  disabled={selected === undefined}
                  onClick={() => setCheckedByQuestion((prev) => ({ ...prev, [qIdx]: true }))}
                  className="inline-flex px-3 py-2 rounded-lg bg-primary-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Check Answer
                </button>
              ) : (
                <div className={`text-sm flex items-start gap-2 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isCorrect ? <FiCheckCircle className="mt-0.5" /> : <FiXCircle className="mt-0.5" />}
                  <div>
                    <p className="font-semibold">{isCorrect ? 'Correct' : 'Not quite'}</p>
                    {q.explanation && <p className="mt-1 text-surface-700">{q.explanation}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheatSheetMaterial({ data }) {
  return (
    <div className="space-y-4">
      {Array.isArray(data.sections) && data.sections.map((section, idx) => (
        <div key={idx} className="bg-white border border-surface-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">{section.heading}</h2>
          <ul className="space-y-2">
            {(section.bullets || []).map((item, itemIdx) => (
              <li key={itemIdx} className="text-sm text-surface-700 flex gap-2 leading-relaxed">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {Array.isArray(data.formulas_or_rules) && data.formulas_or_rules.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-3">Formulas / Rules</h2>
          <ul className="space-y-2">
            {data.formulas_or_rules.map((item, idx) => (
              <li key={idx} className="text-sm text-surface-700 leading-relaxed">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VisualMaterial({ material }) {
  const structured = useMemo(() => parseStructuredContent(material.content), [material.content]);

  if (!structured || !structured.type) {
    return <FallbackTextMaterial content={material.content} />;
  }

  if (structured.type === 'summary') {
    return <SummaryMaterial data={structured} />;
  }
  if (structured.type === 'flashcards') {
    return <FlashcardsMaterial data={structured} />;
  }
  if (structured.type === 'quiz') {
    return <QuizMaterial data={structured} />;
  }
  if (structured.type === 'cheat_sheet') {
    return <CheatSheetMaterial data={structured} />;
  }

  return <FallbackTextMaterial content={material.content} />;
}

export default function StudyMaterialDetailPage() {
  const { id, materialId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sessionRes, materialRes] = await Promise.all([
          getSession(id),
          getStudyMaterial(id, materialId),
        ]);
        setSession(sessionRes.data.session);
        setMaterial(materialRes.data.material);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load material');
        navigate(`/session/${id}/materials`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, materialId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  if (!material) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/session/${id}/materials`)}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-700"
        >
          <FiArrowLeft /> All Materials
        </button>
        <span className="text-surface-300">/</span>
        <Link to={`/session/${id}`} className="text-sm text-surface-500 hover:text-primary-700">
          Back To Session
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-primary-700 font-semibold mb-2">{material.material_type.replace('_', ' ')}</p>
        <h1 className="text-2xl font-bold text-surface-900">{material.title}</h1>
        <p className="text-sm text-surface-500 mt-1">{session?.video_title}</p>
      </div>

      <VisualMaterial material={material} />
    </div>
  );
}
