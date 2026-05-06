import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Users, CheckSquare, MessageSquare, Sparkles, FileText,
  ChevronLeft, ChevronRight, LogOut, Sun, Moon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../common/Avatar';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/team',      icon: Users,          label: 'Team'      },
  { to: '/tasks',     icon: CheckSquare,    label: 'Tasks'     },
  { to: '/chat',      icon: MessageSquare,  label: 'Chat'      },
  { to: '/ai',        icon: Sparkles,       label: 'AI Tools'  },
  { to: '/documents', icon: FileText,       label: 'Documents' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = async () => {
    try {
      await logout();
      void navigate('/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <aside
      data-testid="sidebar"
      className={clsx(
        'relative flex flex-col h-full transition-all duration-300 z-20',
        'glass-subtle border-r border-white/8',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ── Brand ── */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-white/8',
        collapsed && 'justify-center'
      )}>
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white font-black text-base tracking-tighter">T</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-white text-sm tracking-wide">TMS</p>
            <p className="text-xs text-gray-500">Team Management</p>
          </div>
        )}
      </div>

      {/* ── Welcome card (expanded only) ── */}
      {!collapsed && user && (
        <div className="mx-3 mt-4 p-3 glass rounded-2xl">
          <div className="flex items-center gap-2.5">
            <Avatar src={user.avatarUrl} name={user.name} size="sm" status={user.availabilityStatus} />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">{getGreeting()},</p>
              <p className="text-sm font-semibold text-white truncate">
                {user.name.split(' ')[0]} 👋
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 py-4 space-y-0.5 px-2 mt-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`nav-item-${label.toLowerCase().replace(' ', '-')}`}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-white/12 text-white border border-white/15 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/6'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={17}
                  className={clsx(
                    'flex-shrink-0 transition-transform group-hover:scale-110',
                    isActive && 'text-white'
                  )}
                />
                {!collapsed && <span className="font-medium">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom actions ── */}
      <div className="px-2 pb-4 space-y-1 border-t border-white/8 pt-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/6 transition-all',
            collapsed && 'justify-center'
          )}
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={17} className="flex-shrink-0" />
            : <Moon size={17} className="flex-shrink-0" />
          }
          {!collapsed && <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={() => void handleLogout()}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/6 transition-all',
            collapsed && 'justify-center'
          )}
          aria-label="Logout"
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          data-testid="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/6 transition-all',
            collapsed && 'justify-center'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span className="font-medium text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
