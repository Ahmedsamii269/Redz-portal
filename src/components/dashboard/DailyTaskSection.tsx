import React, { useMemo } from 'react';
import {
  Clock,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  UserCheck,
  Building
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { isToday, format } from 'date-fns';
import { EmptyState } from '../common/UIStates';
import { getSafeTimestamp, safeParseDate } from '../../lib/dateUtils';

export const DailyTaskSection: React.FC = () => {
  const { candidates } = useData();
  const { effectiveUser, activeRole } = useAuth();

  const isManagement = activeRole === 'ceo' || activeRole === 'account_manager';

  const myTasks = useMemo(() => {
    const todaysInterviews = candidates.filter(c => {
      const isMine = isManagement || c.createdBy === effectiveUser.id || c.leaderId === effectiveUser.id || c.unitManagerId === effectiveUser.id;
      if (!isMine) return false;

      const interviewDateObj = safeParseDate(c.interviewDate);
      return Boolean(interviewDateObj && isToday(interviewDateObj) && ['Interview Scheduled', 'Interview Rescheduled'].includes(c.status));
    });

    const fortyEightHours = 48 * 60 * 60 * 1000;
    const staleCandidates = candidates.filter(c => {
      const isMine = isManagement || c.createdBy === effectiveUser.id;
      if (!isMine) return false;

      const lastUpdate = getSafeTimestamp(c.updatedAt || c.createdAt);
      if (!lastUpdate) return false;
      return (Date.now() - lastUpdate) > fortyEightHours && !['Commission Done', 'Dropped or Left Training', 'Rejected Interview', 'Rejected Voice Note'].includes(c.status);
    });

    return {
      interviews: todaysInterviews,
      stale: staleCandidates
    };
  }, [candidates, effectiveUser.id, isManagement]);

  const getWhatsAppHref = (phone: string, text: string) => {
    let clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('01')) clean = '20' + clean.slice(1);
    if (clean.startsWith('+')) clean = clean.slice(1);
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  if (myTasks.interviews.length === 0 && myTasks.stale.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Today's Interviews Follow-up */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </span>
            Today&apos;s Interviews Follow-up
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold tabular-nums">
            {myTasks.interviews.length} Tasks
          </span>
        </div>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
          {myTasks.interviews.map(c => (
            <div key={c.id} className="bg-slate-50/80 dark:bg-[#1B2234] border border-slate-200/70 dark:border-slate-700/60 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
              <div className="min-w-0">
                <div dir="auto" title={c.fullName} className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.fullName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 tabular-nums">
                  <Building className="w-3 h-3 shrink-0" />
                  <span>{c.company}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{c.interviewTime || 'Scheduled'}</span>
                </div>
              </div>
              <a
                href={getWhatsAppHref(c.phone, `Hello ${c.fullName}, just following up on your interview with ${c.company} today. How did it go?`)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-600 hover:text-white transition-all shrink-0"
                title="Follow up on WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
            </div>
          ))}
          {myTasks.interviews.length === 0 && (
            <EmptyState icon={UserCheck} title="No interviews today" description="Your today follow-up list is empty." />
          )}
        </div>
      </div>

      {/* Stale Pipelines (>48h) */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
            Stale Pipelines (Need Follow-up)
          </h3>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold tabular-nums">
            {myTasks.stale.length} Stuck
          </span>
        </div>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
          {myTasks.stale.map(c => (
            <div key={c.id} className="bg-slate-50/80 dark:bg-[#1B2234] border border-slate-200/70 dark:border-slate-700/60 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-amber-300 dark:hover:border-amber-700 transition-all">
              <div className="min-w-0">
                <div dir="auto" title={c.fullName} className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.fullName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 tabular-nums">
                  <span className="text-amber-700 dark:text-amber-400 font-bold">{c.status}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span>
                    Updated {(() => {
                      const d = safeParseDate(c.updatedAt || c.createdAt);
                      return d ? format(d, 'MMM dd') : '—';
                    })()}
                  </span>
                </div>
              </div>
              <a
                href={getWhatsAppHref(c.phone, `Hello ${c.fullName}, I'm checking in on your application for ${c.company}. Any updates?`)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/70 hover:bg-amber-500 hover:text-white transition-all shrink-0"
                title="Follow up on WhatsApp"
              >
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
          {myTasks.stale.length === 0 && (
            <EmptyState icon={AlertTriangle} title="No stale pipelines" description="All candidates are moving on schedule." />
          )}
        </div>
      </div>
    </div>
  );
};
