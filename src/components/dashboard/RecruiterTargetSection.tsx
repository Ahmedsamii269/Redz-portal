import React, { useState } from 'react';
import {
  Target,
  Users,
  Flame,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { EmptyState } from '../common/UIStates';

export const RecruiterTargetSection: React.FC = () => {
  const { candidates, users } = useData();
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  const DAILY_SUBMISSIONS_TARGET = 5;
  const DAILY_ACCEPTED_VN_TARGET = 3;
  const MONTHLY_SUBMISSIONS_TARGET = DAILY_SUBMISSIONS_TARGET * 26;
  const MONTHLY_ACCEPTED_VN_TARGET = DAILY_ACCEPTED_VN_TARGET * 26;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  const recruiters = users.filter((u) => u.role === 'recruiter' || u.role === 'leader' || u.role === 'ceo');

  const recruiterStats = recruiters.map((rec) => {
    const userCandidates = candidates.filter((c) => c.createdBy === rec.id);

    const dailySubmissions = userCandidates.filter(
      (c) => c.createdAt && c.createdAt.startsWith(todayStr)
    ).length;

    const dailyAcceptedVn = userCandidates.filter((c) => {
      const isAcceptedStatus = [
        'Accepted Voice Note',
        'Interview Scheduled',
        'Interview Rescheduled',
        'Accepted Interview',
        'Start Training',
        'Commission Done'
      ].includes(c.status);

      if (!isAcceptedStatus) return false;

      const acceptedToday = c.statusHistory?.some(
        (h) =>
          h.timestamp.startsWith(todayStr) &&
          [
            'Accepted Voice Note',
            'Interview Scheduled',
            'Accepted Interview',
            'Start Training',
            'Commission Done'
          ].includes(h.status)
      );

      return acceptedToday || c.createdAt.startsWith(todayStr);
    }).length;

    const monthlySubmissions = userCandidates.filter(
      (c) => c.createdAt && c.createdAt.startsWith(currentMonthStr)
    ).length;

    const monthlyAcceptedVn = userCandidates.filter((c) => {
      const isAcceptedStatus = [
        'Accepted Voice Note',
        'Interview Scheduled',
        'Interview Rescheduled',
        'Accepted Interview',
        'Start Training',
        'Commission Done'
      ].includes(c.status);

      if (!isAcceptedStatus) return false;

      return (
        c.createdAt.startsWith(currentMonthStr) ||
        c.statusHistory?.some((h) => h.timestamp.startsWith(currentMonthStr))
      );
    }).length;

    const currentSubmissions = period === 'daily' ? dailySubmissions : monthlySubmissions;
    const currentAcceptedVn = period === 'daily' ? dailyAcceptedVn : monthlyAcceptedVn;
    const targetSubmissions = period === 'daily' ? DAILY_SUBMISSIONS_TARGET : MONTHLY_SUBMISSIONS_TARGET;
    const targetAcceptedVn = period === 'daily' ? DAILY_ACCEPTED_VN_TARGET : MONTHLY_ACCEPTED_VN_TARGET;

    const submissionPct = Math.min(100, Math.round((currentSubmissions / targetSubmissions) * 100));
    const acceptedVnPct = Math.min(100, Math.round((currentAcceptedVn / targetAcceptedVn) * 100));
    const overallScore = Math.round((submissionPct + acceptedVnPct) / 2);

    return {
      user: rec,
      currentSubmissions,
      currentAcceptedVn,
      targetSubmissions,
      targetAcceptedVn,
      submissionPct,
      acceptedVnPct,
      overallScore,
      isTargetMet: currentSubmissions >= targetSubmissions && currentAcceptedVn >= targetAcceptedVn
    };
  }).sort((a, b) => b.overallScore - a.overallScore);

  return (
    <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-[#D93A30]/20 border border-red-200 dark:border-[#D93A30]/40 flex items-center justify-center text-[#D93A30]">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Recruiter Daily &amp; Monthly Quota Targets</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#D93A30] dark:text-red-400 border border-red-200 dark:border-red-800 font-bold uppercase">
                KPI Engine
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target benchmark: <strong className="text-slate-900 dark:text-white">5 Submissions / Day</strong> &amp; <strong className="text-emerald-600 dark:text-emerald-400">3 Accepted Voice Notes / Day</strong> (Monthly: 130 / 78)
          </p>
        </div>

        {/* Period Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              period === 'daily'
                ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#D93A30]" />
            <span>Today&apos;s Quota</span>
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              period === 'monthly'
                ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#D93A30]" />
            <span>Monthly Total</span>
          </button>
        </div>
      </div>

      {/* Recruiter Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recruiterStats.map(({ user, currentSubmissions, currentAcceptedVn, targetSubmissions, targetAcceptedVn, submissionPct, acceptedVnPct, overallScore, isTargetMet }) => (
          <div
            key={user.id}
            className={`rounded-2xl p-4 space-y-3 border transition-all ${
              isTargetMet
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-700/60'
                : 'bg-slate-50/80 dark:bg-[#1B2234] border-slate-200/80 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#D93A30] to-slate-800 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-xs">
                  {(user.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" dir="auto" title={user.name}>
                    {user.name}
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {isTargetMet ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                  <CheckCircle className="w-3 h-3" /> Target Met
                </span>
              ) : (
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  {overallScore}% Quota
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                  <Users className="w-3 h-3 text-sky-500" /> Candidate Submissions
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  <strong className="text-slate-900 dark:text-white">{currentSubmissions}</strong> / {targetSubmissions}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    submissionPct >= 100
                      ? 'bg-emerald-500'
                      : 'bg-sky-500'
                  }`}
                  style={{ width: `${submissionPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-500" /> Accepted Voice Notes
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  <strong className="text-slate-900 dark:text-white">{currentAcceptedVn}</strong> / {targetAcceptedVn}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    acceptedVnPct >= 100
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${acceptedVnPct}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {recruiterStats.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Target}
              title="No recruiters configured yet"
              description="Recruiter daily quota cards will appear once team members are added."
            />
          </div>
        )}
      </div>
    </div>
  );
};
