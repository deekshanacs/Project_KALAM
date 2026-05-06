import { useState, useEffect, useRef } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { StatusBadge } from '../common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { updateStatusApi, getUsersApi } from '../../api/users.api';
import { AvailabilityStatus } from '@tms/shared';
import type { User } from '@tms/shared';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: AvailabilityStatus.AVAILABLE, label: 'Available', dot: 'bg-emerald-400' },
  { value: AvailabilityStatus.IN_CALL,   label: 'In Call',   dot: 'bg-blue-400'    },
  { value: AvailabilityStatus.AWAY,      label: 'Away',      dot: 'bg-amber-400'   },
  { value: AvailabilityStatus.OFFLINE,   label: 'Offline',   dot: 'bg-gray-500'    },
];

export function Topbar() {
  const { user, logout: _logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // ── Search state ──
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load users once for search
  useEffect(() => {
    getUsersApi().then(setAllUsers).catch(() => undefined);
  }, []);

  // Filter on query change — starts-with match on name or email
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    const q = query.toLowerCase().trim();
    const results = allUsers.filter(
      (u) =>
        u.name.toLowerCase().startsWith(q) ||
        u.name.toLowerCase().split(' ').some((part) => part.startsWith(q)) ||
        u.email.toLowerCase().startsWith(q)
    );
    setSearchResults(results);
    setShowResults(true);
  }, [query, allUsers]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusChange = async (status: AvailabilityStatus) => {
    if (!user) return;
    try {
      await updateStatusApi(user.id, status);
      // Update local auth state by refreshing
      setShowStatusMenu(false);
      toast.success(`Status set to ${status.toLowerCase().replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <header
      data-testid="topbar"
      className="flex items-center justify-between px-6 py-3 z-10 glass-subtle border-b border-white/8"
    >
      {/* ── Search ── */}
      <div ref={searchRef} className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          data-testid="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team members…"
          className="pl-9 pr-8 py-2 glass rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 w-64 transition-all"
          aria-label="Search team members"
          onFocus={() => query && setShowResults(true)}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setShowResults(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={13} />
          </button>
        )}

        {/* Search results dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 mt-2 w-72 glass-strong rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
            {searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500">No results for "{query}"</p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setQuery('');
                    setShowResults(false);
                    void navigate('/team');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/8 transition-colors text-left"
                >
                  <Avatar src={u.avatarUrl} name={u.name} size="sm" status={u.availabilityStatus} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          data-testid="notification-bell"
          className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/6"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-white/80 rounded-full text-xs text-black font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User + status */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu((s) => !s)}
              className="flex items-center gap-2.5 px-3 py-1.5 glass rounded-xl hover:bg-white/10 transition-all"
              aria-label="Change availability status"
            >
              <Avatar src={user.avatarUrl} name={user.name} size="sm" status={user.availabilityStatus} />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white leading-tight">{user.name}</p>
                <StatusBadge status={user.availabilityStatus} />
              </div>
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 glass-strong rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                <p className="px-4 py-1.5 text-xs text-gray-500 uppercase tracking-widest">Set Status</p>
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => void handleStatusChange(opt.value)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                    {opt.label}
                    {user.availabilityStatus === opt.value && (
                      <span className="ml-auto text-xs text-gray-500">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
