import React, { useState, useEffect } from 'react';
import { X, Megaphone, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatSafeDate } from '../../lib/dateUtils';

export const TopBroadcastBanner: React.FC = () => {
  const { effectiveUser } = useAuth();
  const { settings } = useData();
  const [showGreeting, setShowGreeting] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (isDismissed) return null;

  const broadcast = settings?.globalBroadcast;
  const hasActiveBroadcast = broadcast?.active && broadcast?.message;

  if (!showGreeting && !hasActiveBroadcast) return null;

  return (
    <div className="w-full space-y-2.5 mb-5">
      {/* Dynamic Welcome Greeting */}
      {showGreeting && (
        <div className="bg-linear-to-r from-[#D93A30] to-[#B02920] text-white px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight truncate" dir="auto">
                Welcome back, {(effectiveUser.name || 'Team').split(' ')[0]}!
              </h3>
              <p className="text-[11px] text-white/85 font-medium truncate">
                Ready to review candidates and hit today&apos;s recruitment targets.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGreeting(false)}
            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss welcome banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global CEO Broadcast */}
      {hasActiveBroadcast && (
        <div className="bg-white dark:bg-[#131826] border border-red-200 dark:border-red-900/50 px-5 py-3.5 rounded-2xl shadow-xs flex items-start sm:items-center justify-between gap-4 relative overflow-hidden animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5 relative z-10 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-[#D93A30] dark:text-red-400 shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-[10px] font-bold text-[#D93A30] dark:text-red-400 uppercase tracking-wider">
                  Management Broadcast
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                  {formatSafeDate(broadcast.updatedAt, 'Today')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-semibold leading-snug" dir="auto">
                {broadcast.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
            aria-label="Dismiss broadcast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
