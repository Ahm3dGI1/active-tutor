import React, { useState, useEffect, useMemo } from 'react';
import { sendToBackground } from '../../shared/messaging.js';
import { MSG } from '../../shared/constants.js';

const MATERIAL_OPTIONS = [
  { value: 'summary', label: 'Smart Summary', icon: '📄' },
  { value: 'flashcards', label: 'Flashcards', icon: '🃏' },
  { value: 'quiz', label: 'Practice Quiz', icon: '❓' },
  { value: 'cheat_sheet', label: 'Cheat Sheet', icon: '📋' },
];

export default function MaterialsTab({ session }) {
  const [materials, setMaterials] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(['summary']);
  const [generating, setGenerating] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterials();
  }, [session.id]);

  const loadMaterials = async () => {
    try {
      const res = await sendToBackground(MSG.LIST_MATERIALS, { sessionId: session.id });
      if (res.error) throw new Error(res.error);
      setMaterials(res.materials || res || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
    setLoading(false);
  };

  const latestByType = useMemo(() => {
    const map = {};
    for (const m of materials) {
      if (!map[m.material_type]) map[m.material_type] = m;
    }
    return map;
  }, [materials]);

  const toggleType = (value) => {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await sendToBackground(MSG.GENERATE_MATERIALS, {
        sessionId: session.id,
        materialTypes: selectedTypes,
      });
      if (res.error) throw new Error(res.error);
      await loadMaterials();
    } catch (err) {
      console.error('Failed to generate materials:', err);
    }
    setGenerating(false);
  };

  const viewMaterial = async (material) => {
    try {
      const res = await sendToBackground(MSG.GET_MATERIAL, {
        sessionId: session.id,
        materialId: material.id,
      });
      if (res.error) throw new Error(res.error);
      setViewingMaterial(res.material || res);
    } catch (err) {
      console.error('Failed to load material:', err);
    }
  };

  if (viewingMaterial) {
    return <MaterialDetailView material={viewingMaterial} onBack={() => setViewingMaterial(null)} />;
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <h3 className="text-sm font-semibold text-surface-800">Generate Study Materials</h3>

      <div className="grid grid-cols-2 gap-2">
        {MATERIAL_OPTIONS.map((option) => {
          const existing = latestByType[option.value];
          const selected = selectedTypes.includes(option.value);

          if (existing) {
            return (
              <button
                key={option.value}
                onClick={() => viewMaterial(existing)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:border-primary-300 transition text-left"
              >
                <span>{option.icon}</span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          }

          return (
            <button
              key={option.value}
              onClick={() => toggleType(option.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition text-left ${
                selected
                  ? 'border-accent-500 bg-accent-50 text-accent-700'
                  : 'border-surface-200 bg-white text-surface-600 hover:border-accent-300'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                selected ? 'border-accent-600 bg-accent-500' : 'border-surface-300'
              }`}>
                {selected && <span className="w-1.5 h-1.5 rounded-sm bg-white"></span>}
              </span>
              <span>{option.icon}</span>
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || selectedTypes.length === 0}
        className="w-full bg-accent-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-600 transition disabled:opacity-50"
      >
        {generating ? 'Generating...' : 'Generate Selected'}
      </button>
    </div>
  );
}

// Inline material detail viewer
function MaterialDetailView({ material, onBack }) {
  const structured = useMemo(() => {
    try {
      return JSON.parse(material.content);
    } catch {
      return null;
    }
  }, [material.content]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-surface-100 flex items-center gap-2">
        <button onClick={onBack} className="text-surface-400 hover:text-surface-700 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p className="text-xs uppercase tracking-wider text-primary-700 font-semibold">
            {material.material_type?.replace('_', ' ')}
          </p>
          <p className="text-sm font-semibold text-surface-800 truncate">{material.title}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {structured ? (
          <StructuredContent data={structured} />
        ) : (
          <div className="text-sm text-surface-700 whitespace-pre-wrap">{material.content}</div>
        )}
      </div>
    </div>
  );
}

function StructuredContent({ data }) {
  if (data.type === 'summary') return <SummaryView data={data} />;
  if (data.type === 'flashcards') return <FlashcardsView data={data} />;
  if (data.type === 'quiz') return <QuizView data={data} />;
  if (data.type === 'cheat_sheet') return <CheatSheetView data={data} />;
  return <div className="text-sm text-surface-500">Unknown material type.</div>;
}

function SummaryView({ data }) {
  return (
    <div className="space-y-3">
      {data.overview && (
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-surface-500 mb-1">Overview</p>
          <p className="text-sm text-surface-700 leading-relaxed">{data.overview}</p>
        </div>
      )}
      {data.key_points?.length > 0 && (
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-surface-500 mb-2">Key Points</p>
          <ul className="space-y-1.5">
            {data.key_points.map((point, i) => (
              <li key={i} className="text-sm text-surface-700 flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.timeline?.length > 0 && (
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-surface-500 mb-2">Timeline</p>
          <div className="space-y-1.5">
            {data.timeline.map((item, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="bg-primary-50 text-primary-700 font-semibold px-1.5 py-0.5 rounded text-xs min-w-[44px] text-center">
                  {item.time}
                </span>
                <span className="text-surface-700">{item.point}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.review_questions?.length > 0 && (
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-surface-500 mb-2">Review Questions</p>
          <ol className="space-y-1.5 list-decimal pl-4">
            {data.review_questions.map((q, i) => (
              <li key={i} className="text-sm text-surface-700">{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function FlashcardsView({ data }) {
  const cards = data.cards || [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards.length) return <div className="text-sm text-surface-500">No flashcards available.</div>;

  const card = cards[index];

  return (
    <div className="space-y-3">
      <div className="bg-surface-50 rounded-lg p-4 min-h-[180px] flex flex-col justify-between">
        <div>
          <p className="text-xs font-semibold text-surface-400 uppercase mb-2">{flipped ? 'Back' : 'Front'}</p>
          <p className="text-sm font-medium text-surface-800 leading-relaxed">{flipped ? card.back : card.front}</p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-surface-400">{index + 1} / {cards.length}</p>
          <button
            onClick={() => setFlipped(!flipped)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 text-surface-600 hover:border-primary-300 transition"
          >
            Flip
          </button>
        </div>
      </div>
      <div className="flex justify-between">
        <button
          disabled={index === 0}
          onClick={() => { setIndex(index - 1); setFlipped(false); }}
          className="text-xs px-3 py-1.5 rounded-lg border border-surface-200 text-surface-600 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={index === cards.length - 1}
          onClick={() => { setIndex(index + 1); setFlipped(false); }}
          className="text-xs px-3 py-1.5 rounded-lg border border-surface-200 text-surface-600 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function QuizView({ data }) {
  const questions = data.questions || [];
  const [selected, setSelected] = useState({});
  const [checked, setChecked] = useState({});

  if (!questions.length) return <div className="text-sm text-surface-500">No quiz questions available.</div>;

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => {
        const sel = selected[qi];
        const chk = checked[qi];
        const isCorrect = chk && sel === q.correct_index;

        return (
          <div key={qi} className="bg-surface-50 rounded-lg p-3">
            <p className="text-sm font-semibold text-surface-800 mb-2">Q{qi + 1}. {q.question}</p>
            <div className="space-y-1.5">
              {(q.options || []).map((opt, oi) => {
                const picked = sel === oi;
                const showCorrect = chk && oi === q.correct_index;
                const showWrong = chk && picked && oi !== q.correct_index;

                return (
                  <button
                    key={oi}
                    disabled={chk}
                    onClick={() => setSelected({ ...selected, [qi]: oi })}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                      showCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : showWrong ? 'border-red-500 bg-red-50 text-red-800'
                      : picked ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-surface-200 bg-white text-surface-700 hover:border-primary-200'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="mt-2">
              {!chk ? (
                <button
                  disabled={sel === undefined}
                  onClick={() => setChecked({ ...checked, [qi]: true })}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary-700 text-white font-semibold disabled:opacity-50"
                >
                  Check Answer
                </button>
              ) : (
                <div className={`text-xs ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                  <p className="font-semibold">{isCorrect ? 'Correct!' : 'Incorrect'}</p>
                  {q.explanation && <p className="mt-1 text-surface-600">{q.explanation}</p>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheatSheetView({ data }) {
  return (
    <div className="space-y-3">
      {data.sections?.map((section, i) => (
        <div key={i} className="bg-surface-50 rounded-lg p-3">
          <p className="text-sm font-semibold text-surface-800 mb-2">{section.heading}</p>
          <ul className="space-y-1">
            {(section.bullets || []).map((item, j) => (
              <li key={j} className="text-sm text-surface-700 flex gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {data.formulas_or_rules?.length > 0 && (
        <div className="bg-surface-50 rounded-lg p-3">
          <p className="text-sm font-semibold text-surface-800 mb-2">Formulas / Rules</p>
          <ul className="space-y-1">
            {data.formulas_or_rules.map((item, i) => (
              <li key={i} className="text-sm text-surface-700">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
