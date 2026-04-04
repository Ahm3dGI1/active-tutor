import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, createSession, deleteSession } from '../api/api';
import { FiPlay, FiTrash2, FiClock, FiCheckCircle, FiVideo } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await listSessions();
      setSessions(res.data.sessions);
    } catch (err) {
      toast.error('Failed to load sessions');
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setCreating(true);
    try {
      const res = await createSession(url.trim());
      toast.success('Session created!');
      navigate(`/session/${res.data.session.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create session');
    }
    setCreating(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Session deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (iso) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* New Session */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-8">
        <h2 className="text-base font-semibold text-surface-900 mb-4">Start a New Session</h2>
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube URL..."
            className="flex-1 px-4 py-3 border border-surface-200 rounded-lg bg-surface-50 focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition"
            disabled={creating}
          />
          <button
            type="submit"
            disabled={!url.trim() || creating}
            className="bg-accent-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-accent-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm shadow-accent-500/20"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                Processing...
              </>
            ) : (
              <>
                <FiPlay /> Start Learning
              </>
            )}
          </button>
        </form>
        {creating && (
          <p className="text-surface-400 text-xs mt-3">Fetching transcript and generating quizzes... this may take 15-30 seconds.</p>
        )}
      </div>

      {/* Sessions List */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-surface-900">Your Sessions</h2>
        {sessions.length > 0 && (
          <span className="text-xs text-surface-400 font-medium">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-surface-400">
          <FiVideo className="mx-auto text-4xl mb-3 text-surface-300" />
          <p className="text-lg font-medium text-surface-500">No sessions yet</p>
          <p className="text-sm mt-1">Paste a YouTube URL above to get started!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl border border-surface-200 overflow-hidden group card-hover"
            >
              {/* Thumbnail */}
              <div
                className="relative h-36 bg-surface-100 cursor-pointer"
                onClick={() => navigate(`/session/${session.id}`)}
              >
                <img
                  src={`https://img.youtube.com/vi/${session.video_id}/mqdefault.jpg`}
                  alt={session.video_title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                    <FiPlay className="text-surface-800 text-sm ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3
                  className="font-semibold text-sm text-surface-800 truncate cursor-pointer hover:text-primary-700 transition"
                  onClick={() => navigate(`/session/${session.id}`)}
                  title={session.video_title}
                >
                  {session.video_title || 'Untitled Video'}
                </h3>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-surface-400">
                    <span className="flex items-center gap-1"><FiClock /> {formatDate(session.created_at)}</span>
                    <span className="flex items-center gap-1">
                      <FiCheckCircle className={session.score.correct > 0 ? 'text-emerald-500' : ''} />
                      {session.score.correct}/{session.score.total}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                    className="text-surface-300 hover:text-red-500 transition p-1"
                    title="Delete session"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
