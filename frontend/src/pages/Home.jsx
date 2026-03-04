import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createSession } from '../api/api';
import { FiPlay, FiMessageCircle, FiCheckCircle, FiArrowRight, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await createSession(url.trim());
      toast.success('Session created! Let\'s learn!');
      navigate(`/session/${res.data.session.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create session');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <section className="relative bg-navy-900 overflow-hidden">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        {/* Gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-600/20 rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-4 py-24 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-primary-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
              <FiZap className="text-accent-400" /> AI-powered active learning
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
              Turn YouTube Into Your<br />
              <span className="text-gradient">Personal Classroom</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Paste any video URL. Our AI creates checkpoint quizzes at key moments and gives you a personal tutor that knows the entire transcript.
            </p>

            {/* URL Input */}
            <form onSubmit={handleStart} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a YouTube URL..."
                  className="flex-1 px-5 py-4 rounded-xl bg-white text-surface-800 text-base placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-400 shadow-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!url.trim() || loading}
                  className="bg-accent-500 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-accent-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiPlay /> Start Learning
                    </>
                  )}
                </button>
              </div>
              {loading && (
                <p className="text-stone-500 text-sm mt-4">
                  Fetching transcript and generating checkpoints... this may take 15-30 seconds.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface-50">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-wider text-center mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center text-surface-900 mb-16">Three steps to smarter learning</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: FiPlay, color: 'primary', label: '01', title: 'Paste a YouTube URL', desc: 'Enter any video with captions. We extract and analyze the full transcript automatically.' },
              { icon: FiCheckCircle, color: 'emerald', label: '02', title: 'Answer Checkpoints', desc: 'AI generates quizzes at key moments. The video pauses so you can test your understanding.' },
              { icon: FiMessageCircle, color: 'accent', label: '03', title: 'Chat with AI Tutor', desc: 'Ask questions anytime. The tutor knows the full transcript and adapts to your progress.' },
            ].map(({ icon: Icon, color, label, title, desc }) => (
              <div key={label} className="group bg-white border border-surface-200 rounded-xl p-6 card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    color === 'primary' ? 'bg-primary-100 text-primary-700' :
                    color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-accent-100 text-accent-700'
                  }`}>
                    <Icon className="text-lg" />
                  </div>
                  <span className="text-xs font-bold text-surface-300 uppercase tracking-wider">{label}</span>
                </div>
                <h3 className="text-base font-semibold text-surface-800 mb-2">{title}</h3>
                <p className="text-surface-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-20 bg-white border-t border-surface-100">
          <div className="max-w-2xl mx-auto text-center px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-surface-900 mb-3">Ready to learn smarter?</h2>
            <p className="text-surface-500 mb-8">Create a free account to save your progress and revisit sessions.</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-600 transition-all shadow-lg shadow-primary-700/20"
            >
              Get Started Free <FiArrowRight />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-navy-900 py-8 text-center text-sm text-stone-500">
        <p>LearnTube &mdash; Transform passive watching into active learning.</p>
      </footer>
    </div>
  );
}
