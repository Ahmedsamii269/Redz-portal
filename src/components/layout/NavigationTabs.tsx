import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  GitPullRequest,
  DollarSign,
  UserPlus,
  Users2,
  Trophy,
  User,
  Bell,
  Users,
  Settings,
  ShieldCheck,
  UserCheck,
  Database,
  Wallet,
  CalendarDays,
  ChevronDown,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, onTabChange }) => {
  const { activeRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCeo = activeRole === 'ceo';
  const isAccountManager = activeRole === 'account_manager';
  const isManagement = isCeo || isAccountManager;

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my_candidates', label: 'My Candidates', icon: UserCheck },
    { id: 'wallet', label: 'My Wallet', icon: Wallet },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    ...(isManagement
      ? [
          { id: 'candidates', label: 'Pipeline', icon: Users2 },
          { id: 'all_data', label: 'All Data', icon: Database }
        ]
      : []),
    ...(isCeo ? [{ id: 'ceo_command', label: 'CEO Command', icon: ShieldCheck }] : []),
    { id: 'offers', label: 'Offers', icon: Briefcase },
    { id: 'processes', label: 'Processes', icon: GitPullRequest },
    { id: 'commissions', label: 'Comms', icon: DollarSign },
    { id: 'application', label: 'Form', icon: UserPlus },
    { id: 'leaderboard', label: 'Rankings', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Updates', icon: Bell },
    ...(isCeo ? [{ id: 'users', label: 'Team', icon: Users }] : []),
    ...(isCeo ? [{ id: 'settings', label: 'Settings', icon: Settings }] : [])
  ];

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

  const currentTabObj = allTabs.find((t) => t.id === activeTab) || allTabs[0];
  const CurrentIcon = currentTabObj.icon;

  return (
    <nav className="bg-white dark:bg-[#131826] border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        {/* Desktop & Tablet: Single-line horizontally scrollable tabs with full visible labels */}
        <div className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#D93A30] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1B2234]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile (<768px): Active View Switcher Bar + Collapsible All-Views Drawer */}
        <div className="md:hidden py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#D93A30]/10 text-[#D93A30] flex items-center justify-center shrink-0">
                <CurrentIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                {currentTabObj.label}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                mobileMenuOpen
                  ? 'bg-[#D93A30] text-white border-[#D93A30]'
                  : 'bg-slate-50 dark:bg-[#1B2234] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <span>All Views</span>
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-1.5 pb-1 animate-fade-in">
              {allTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onTabChange(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#D93A30] text-white shadow-xs'
                        : 'bg-slate-50 dark:bg-[#1B2234] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
