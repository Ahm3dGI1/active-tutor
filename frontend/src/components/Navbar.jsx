import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBookOpen, FiLogOut, FiUser, FiGrid, FiChevronDown, FiTarget } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-navy-900 sticky top-0 z-50 shadow-lg shadow-navy-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center group-hover:bg-primary-400 transition">
              <FiBookOpen className="text-white text-lg" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Hermex</span>
          </Link>

          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-1.5 text-stone-300 hover:text-primary-400 hover:bg-white/5 transition px-3 py-2 rounded-lg text-sm font-medium">
                  <FiGrid className="text-base" /> Dashboard
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 text-stone-300 hover:text-primary-400 hover:bg-white/5 transition px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    <FiUser className="text-base" /> {user.name}
                    <FiChevronDown className={`text-xs transition ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-navy-800 border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-stone-200 hover:bg-white/5"
                      >
                        <FiUser className="text-sm" /> Profile Settings
                      </Link>
                      <Link
                        to="/profile#learning-context"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-stone-200 hover:bg-white/5"
                      >
                        <FiTarget className="text-sm" /> Learning Context
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-300 hover:bg-white/5"
                      >
                        <FiLogOut className="text-sm" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-stone-300 hover:text-white transition text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/5">Log In</Link>
                <Link to="/register" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-500 transition text-sm font-semibold ml-1">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
