import React from 'react';
import { LayoutDashboard, UserCheck, Trophy, User, PlusCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface MobileQuickBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileQuickBar: React.FC<MobileQuickBarProps> = ({ activeTab, onTabChange }) => {
  const { candidates } = useData();

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my_candidates', label: 'My Candidates', icon: UserCheck, badge: candidates.length },
    { id: 'application', label: 'New Form', icon: PlusCircle, highlight: true },
    { id: 'leaderboard', label: 'Rankings', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#131826]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center px-3 py-2 rounded-2xl bg-[#D93A30] text-white shadow-md -mt-4 transition-transform active:scale-95 cursor-pointer"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap">{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center px-2 py-1.5 rounded-xl transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#D93A30] font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 whitespace-nowrap">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-50 dark:bg-rose-950 text-[#D93A30] dark:text-rose-300 border border-red-200 dark:border-rose-800 text-[8px] font-bold flex items-center justify-center tabular-nums">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
