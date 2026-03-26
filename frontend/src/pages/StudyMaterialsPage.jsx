import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiFileText, FiLayers, FiHelpCircle, FiClipboard } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getSession, listStudyMaterials } from '../api/api';

const iconByType = {
  summary: FiFileText,
  flashcards: FiLayers,
  quiz: FiHelpCircle,
  cheat_sheet: FiClipboard,
};

function parseStructuredContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getPreviewText(material) {
  const structured = parseStructuredContent(material.content);
  if (!structured) {
    return material.content;
  }

  if (structured.type === 'flashcards') {
    const count = Array.isArray(structured.cards) ? structured.cards.length : 0;
    return `${count} flashcards ready for active recall.`;
  }

  if (structured.type === 'quiz') {
    const count = Array.isArray(structured.questions) ? structured.questions.length : 0;
    return `${count} interactive quiz questions.`;
  }

  if (structured.type === 'summary') {
    const count = Array.isArray(structured.key_points) ? structured.key_points.length : 0;
    return `${count} key points with timeline and review prompts.`;
  }

  if (structured.type === 'cheat_sheet') {
    const count = Array.isArray(structured.sections) ? structured.sections.length : 0;
    return `${count} quick-reference sections.`;
  }

  return material.content;
}

export default function StudyMaterialsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sessionRes, materialsRes] = await Promise.all([
          getSession(id),
          listStudyMaterials(id),
        ]);
        setSession(sessionRes.data.session);
        setMaterials(materialsRes.data.materials || []);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to load materials');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(`/session/${id}`)}
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-primary-700"
        >
          <FiArrowLeft /> Back To Session
        </button>
      </div>

      <h1 className="text-2xl font-bold text-surface-900">Study Materials</h1>
      <p className="text-sm text-surface-500 mt-1 mb-6">{session?.video_title}</p>

      {materials.length === 0 ? (
        <div className="bg-white border border-surface-200 rounded-xl p-8 text-center text-surface-500">
          No materials generated yet. Generate them from the Study Materials panel inside the session.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {materials.map((material) => {
            const Icon = iconByType[material.material_type] || FiFileText;
            return (
              <Link
                key={material.id}
                to={`/session/${id}/materials/${material.id}`}
                className="bg-white border border-surface-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
                    <Icon />
                  </div>
                  <div>
                    <p className="font-semibold text-surface-800">{material.title}</p>
                    <p className="text-xs text-surface-400">{new Date(material.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-surface-600 line-clamp-4 whitespace-pre-wrap">
                  {getPreviewText(material)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
