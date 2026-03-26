import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiLayers, FiHelpCircle, FiClipboard, FiExternalLink } from 'react-icons/fi';

const MATERIAL_OPTIONS = [
  { value: 'summary', label: 'Smart Summary', icon: FiFileText },
  { value: 'flashcards', label: 'Flashcards', icon: FiLayers },
  { value: 'quiz', label: 'Practice Quiz', icon: FiHelpCircle },
  { value: 'cheat_sheet', label: 'Cheat Sheet', icon: FiClipboard },
];

export default function StudyMaterialsPanel({
  sessionId,
  generatedStudyMaterials,
  generatingStudyMaterial,
  onGenerateStudyMaterial,
}) {
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState(['summary']);

  const latestByType = useMemo(() => {
    const map = {};
    for (const material of generatedStudyMaterials || []) {
      if (!map[material.material_type]) {
        map[material.material_type] = material;
      }
    }
    return map;
  }, [generatedStudyMaterials]);

  const toggleMaterialType = (value) => {
    setSelectedMaterialTypes((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  };

  return (
    <div className="mt-5 bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-800">Study Materials</h3>
        <Link to={`/session/${sessionId}/materials`} className="text-xs font-semibold text-primary-700 hover:text-primary-600">
          View All
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mb-3">
        {MATERIAL_OPTIONS.map((option) => {
          const Icon = option.icon;
          const existing = latestByType[option.value];
          const selected = selectedMaterialTypes.includes(option.value);

          if (existing?.id) {
            return (
              <Link
                key={option.value}
                to={`/session/${sessionId}/materials/${existing.id}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:border-primary-300 transition"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="text-base" />
                  {option.label}
                </span>
                <FiExternalLink className="text-sm" />
              </Link>
            );
          }

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleMaterialType(option.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                selected
                  ? 'border-accent-500 bg-accent-50 text-accent-700'
                  : 'border-surface-200 bg-white text-surface-600 hover:border-accent-300'
              }`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? 'border-accent-600 bg-accent-500' : 'border-surface-300'}`}>
                {selected && <span className="w-2 h-2 rounded-sm bg-white"></span>}
              </span>
              <Icon className="text-base" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onGenerateStudyMaterial(selectedMaterialTypes)}
        disabled={generatingStudyMaterial || selectedMaterialTypes.length === 0}
        className="w-full bg-accent-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-600 transition disabled:opacity-50"
      >
        {generatingStudyMaterial ? 'Generating...' : 'Generate Selected'}
      </button>

      {selectedMaterialTypes.length === 0 && (
        <p className="text-xs text-amber-700 mt-2">Select at least one material to generate.</p>
      )}
    </div>
  );
}
