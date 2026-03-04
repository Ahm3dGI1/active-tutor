import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/api';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md animate-fade-up">
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-surface-900 mb-1">Welcome back</h1>
            <p className="text-surface-500 text-sm">Log in to continue learning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 rounded-lg bg-surface-50 focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-surface-200 rounded-lg bg-surface-50 focus:bg-white focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm transition"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-700 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-700 font-semibold hover:text-primary-600">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
