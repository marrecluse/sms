// frontend/src/components/shared/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, LogOut, X, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar({ navItems, mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const roleColor = {
    admin:     'bg-red-600',
    teacher:   'bg-emerald-600',
    student:   'bg-blue-600',
    librarian: 'bg-purple-600',
  }[user?.role] || 'bg-blue-600';

  const profilePath = `/${user?.role}/profile`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">

      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">Read Smart</p>
          <p className="text-slate-400 text-xs truncate">SMS Portal</p>
        </div>
        {mobileOpen !== undefined && (
          <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User info — clickable → profile */}
      <NavLink to={profilePath} onClick={onClose}
        className={({ isActive }) =>
          `px-4 py-4 border-b border-slate-700 flex items-center gap-3 transition-colors ${
            isActive ? 'bg-slate-700' : 'hover:bg-slate-800'
          }`
        }
      >
        {user?.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={user?.name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-slate-600"
          />
        ) : (
          <div className={`w-10 h-10 ${roleColor} rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold`}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
        </div>
        <UserCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === `/${user?.role}` || to.endsWith('/admin') || to.endsWith('/teacher') || to.endsWith('/student')}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-900/40 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-60 z-50">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
