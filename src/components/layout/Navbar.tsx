import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle,
  LogOut,
  ChevronDown,
  Eye,
  ArrowLeft,
  UserCheck,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  SlidersHorizontal,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onTabChange }) => {
  const {
    currentUser,
    userProfile,
    effectiveUser,
    activeRole,
    simulatedUser,
    signInWithGoogle,
    logout,
    switchSimulatedUser,
    resetToRealUser
  } = useAuth();

  const { isDark, toggleTheme, uiScale, setUiScale, isCompactMode, toggleCompactMode } = useTheme();
  usePWAInstall();

  const {
    connectionStatus,
    unreadNotificationsCount,
    users,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    onlineUsers
  } = useData();

  const [openMenu, setOpenMenu] = useState<'role' | 'notif' | 'online' | 'workspace' | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const isRealCeo =
    userProfile?.role === 'ceo' ||
    currentUser?.email?.toLowerCase() === 'ahmedsamii269@gmail.com';

  const toggleMenu = (target: 'role' | 'notif' | 'online' | 'workspace') => {
    setOpenMenu((prev) => (prev === target ? null : target));
  };

  return (
    <header
      ref={navRef}
      className="bg-white/95 dark:bg-[#131826]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200"
    >
      {/* Active Impersonation Alert Banner (Single Source of Truth) */}
      {simulatedUser && isRealCeo && (
        <div className="bg-amber-50 dark:bg-amber-950/75 border-b border-amber-200 dark:border-amber-700/60 px-3 sm:px-6 py-1.5 text-xs flex items-center justify-between gap-2 font-medium text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate text-[11px]">
              <strong>God Mode:</strong> Viewing as <strong>{simulatedUser.name}</strong> ({simulatedUser.role.replace('_', ' ')})
            </span>
          </div>
          <button
            onClick={() => resetToRealUser()}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            <ArrowLeft className="w-3 h-3" /> <span className="hidden sm:inline">Return to CEO</span><span className="sm:hidden">Reset</span>
          </button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Left: Brand Lockup */}
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 group text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#1B2234] p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0 group-hover:border-[#D93A30]/40 transition-colors">
              <img
                src="/logo.png"
                alt="Redz Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">REDZ</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D93A30] text-white font-extrabold tracking-wide uppercase">
                  AGENCY
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5 tracking-wider uppercase font-semibold hidden sm:block">
                Recruitment & Hiring
              </p>
            </div>
          </button>

          {/* Right: Streamlined Action Strip (max 4–5 items) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Online Counter Pill (Desktop/Laptop only — also inside Workspace Menu on mobile) */}
            {isRealCeo && (
              <div className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => toggleMenu('online')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/60 transition-all text-xs font-bold cursor-pointer whitespace-nowrap"
                  title="Active team members on site"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] tabular-nums">{onlineUsers.length || 1} Online</span>
                </button>

                {openMenu === 'online' && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 text-xs space-y-2 animate-modal-in">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 px-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="tabular-nums">Active Team ({onlineUsers.length || 1})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Presence</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {onlineUsers.length > 0 ? (
                        onlineUsers.map((u) => (
                          <div
                            key={u.userId}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200/70 dark:border-slate-700/60"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-[#D93A30]/20 border border-red-200 dark:border-[#D93A30]/40 flex items-center justify-center text-[10px] font-bold text-[#D93A30] dark:text-red-400 shrink-0">
                                {(u.userName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                  <span className="truncate">{u.userName}</span>
                                  {u.userId === effectiveUser.id && (
                                    <span className="text-[9px] px-1 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold shrink-0">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate">
                                  {u.userRole.replace('_', ' ')} • {u.activeTab || 'Dashboard'}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Active</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-slate-400 text-[11px]">
                          You are currently the only active user online.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CEO Perspective / User Switcher */}
            {isRealCeo && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('role')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap ${
                    simulatedUser
                      ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 font-bold'
                      : 'bg-slate-50 dark:bg-[#1B2234] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                  title="CEO Perspective: Switch view to any agency member"
                >
                  <Eye className={`w-3.5 h-3.5 shrink-0 ${simulatedUser ? 'text-amber-600 dark:text-amber-400' : 'text-[#D93A30]'}`} />
                  <span className="capitalize truncate max-w-[60px] sm:max-w-[110px]" dir="auto">
                    {(effectiveUser.name || 'User').split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {openMenu === 'role' && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-2 max-h-96 overflow-y-auto animate-modal-in">
                    <div>
                      <div className="px-3 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Agency Accounts ({users.length})</span>
                        <UserCheck className="w-3.5 h-3.5 text-[#D93A30]" />
                      </div>
                      <div className="space-y-1 mt-1.5">
                        {users.map((u) => {
                          const isCurrent = effectiveUser.id === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                switchSimulatedUser(u);
                                setOpenMenu(null);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                                isCurrent
                                  ? 'bg-[#D93A30] text-white font-bold shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1B2234]'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold truncate text-xs flex items-center gap-1.5">
                                  <span className="truncate">{u.name}</span>
                                  {u.role === 'ceo' && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 ${
                                        isCurrent
                                          ? 'bg-white/20 text-white'
                                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      }`}
                                    >
                                      CEO
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                  <span className="capitalize font-semibold">{u.role.replace('_', ' ')}</span> • {u.email}
                                </div>
                              </div>
                              {isCurrent ? (
                                <CheckCircle className="w-4 h-4 shrink-0 text-white" />
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                                  <Eye className="w-3 h-3 text-[#D93A30]" /> View
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {users.length === 0 && (
                          <div className="text-slate-400 text-[11px] p-3 text-center">
                            No agency team members registered yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {simulatedUser && (
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            resetToRealUser();
                            setOpenMenu(null);
                          }}
                          className="w-full p-2.5 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-950/90 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Return to CEO Account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const willOpen = openMenu !== 'notif';
                  setOpenMenu(willOpen ? 'notif' : null);
                  if (willOpen && unreadNotificationsCount > 0) {
                    markAllNotificationsRead();
                  }
                }}
                className="relative p-2 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D93A30] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {openMenu === 'notif' && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 text-xs space-y-2 animate-modal-in">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 px-1">
                    <span className="font-bold text-slate-900 dark:text-white">Live Notifications</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        className="text-[10px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          onTabChange('notifications');
                        }}
                        className="text-[11px] font-bold text-[#D93A30] hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          setOpenMenu(null);
                          onTabChange('notifications');
                        }}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B2234] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors space-y-0.5 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white text-[11px] truncate">{n.title}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{n.message}</div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-5 text-slate-400 text-[11px]">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Consolidated Workspace Utilities Popover (Theme, UI Scale, Sync, Compact, PWA, Mobile Online List) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('workspace')}
                className="relative p-2 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Display, Theme & Workspace Controls"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span
                  className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
              </button>

              {openMenu === 'workspace' && (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 z-50 text-xs space-y-3 animate-modal-in">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white">Workspace Display</span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        connectionStatus === 'connected'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {connectionStatus === 'connected' ? 'Cloud Synced' : 'Offline'}
                    </span>
                  </div>

                  {/* Theme Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Appearance</span>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
                    </button>
                  </div>

                  {/* UI Scale Zoom */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Interface Zoom</span>
                    <div className="flex items-center bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setUiScale(Math.max(0.7, uiScale - 0.1))}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setUiScale(1)}
                        className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-10 text-center tabular-nums hover:text-[#D93A30] cursor-pointer"
                        title="Reset to 100%"
                      >
                        {Math.round(uiScale * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setUiScale(Math.min(1.2, uiScale + 0.1))}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Density Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Table Density</span>
                    <button
                      type="button"
                      onClick={toggleCompactMode}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                        isCompactMode
                          ? 'bg-[#D93A30]/10 border-[#D93A30]/30 text-[#D93A30]'
                          : 'bg-slate-50 dark:bg-[#1B2234] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {isCompactMode ? 'Compact ON' : 'Comfortable'}
                    </button>
                  </div>

                  {/* Mobile Active Users Shortcut (CEO) */}
                  {isRealCeo && (
                    <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 pt-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Active On Site
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {onlineUsers.length || 1} Online
                      </span>
                    </div>
                  )}

                  {/* PWA Install Button */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <PWAInstallButton />
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar + Sign Out */}
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onTabChange('profile')}
                  className="flex items-center gap-2 p-1 sm:pr-2.5 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title={`${effectiveUser.name || 'User'} (${activeRole.replace('_', ' ')}) — Open Profile`}
                >
                  <div className="w-6 h-6 rounded-lg bg-[#D93A30] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {(effectiveUser.name || effectiveUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden md:inline max-w-[90px] truncate" dir="auto">
                    {(effectiveUser.name || 'User').split(' ')[0]}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#D93A30] hover:bg-[#b82e25] text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Google Sign-In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
