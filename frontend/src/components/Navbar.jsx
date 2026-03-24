import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Menu, X, Database, FlaskConical } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setMobileOpen(false);
    }
  };

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary-700/10 text-primary-700'
        : 'text-slate-600 hover:text-primary-700 hover:bg-slate-100'
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gradient leading-tight">AmoebaDB</span>
              <span className="text-[10px] text-slate-400 font-medium -mt-0.5 tracking-wide">RELEASE 68</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/organisms" className={linkClass}>Organisms</NavLink>
            <NavLink to="/about" className={linkClass}>About</NavLink>
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search genes, proteins..."
                maxLength={500}
                className="pl-9 pr-4 py-2 w-64 text-sm bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
              />
            </div>
          </form>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/60 bg-white">
          <div className="px-4 py-3 space-y-2">
            <NavLink to="/" end className={linkClass} onClick={() => setMobileOpen(false)}>Home</NavLink>
            <NavLink to="/organisms" className={linkClass} onClick={() => setMobileOpen(false)}>Organisms</NavLink>
            <NavLink to="/about" className={linkClass} onClick={() => setMobileOpen(false)}>About</NavLink>
            <form onSubmit={handleSearch} className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search genes, proteins..."
                  maxLength={500}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition"
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
