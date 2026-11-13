import React, { useMemo } from 'react';
import {
  Wallet,
  Clock,
  CheckCircle,
  Calendar,
  Building,
  DollarSign
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { EmptyState, TableSkeleton } from '../common/UIStates';
import { formatSafeDate, getSafeTimestamp } from '../../lib/dateUtils';

export const WalletView: React.FC = () => {
  const { candidates, dataLoading } = useData();
  const { effectiveUser } = useAuth();
  const { isCompactMode } = useTheme();

  const myCommissions = useMemo(() => {
    return candidates
      .filter(c => c.createdBy === effectiveUser.id && c.commissionCalculated)
      .sort((a, b) => getSafeTimestamp(b.createdAt) - getSafeTimestamp(a.createdAt));
  }, [candidates, effectiveUser.id]);

  const stats = useMemo(() => {
    const earned = myCommissions
      .filter(c => c.commissionCalculated?.recruiterPaid)
      .reduce((acc, c) => acc + (c.commissionCalculated?.recruiterAmount || 0), 0);

    const pending = myCommissions
      .filter(c => !c.commissionCalculated?.recruiterPaid)
      .reduce((acc, c) => acc + (c.commissionCalculated?.recruiterAmount || 0), 0);

    return { earned, pending, count: myCommissions.length };
  }, [myCommissions]);

  return (
    <div className="space-y-6">
      {/* Wallet Header */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
              <Wallet className="w-6 h-6 text-[#D93A30]" />
              <span>Personal Wallet</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track your earned commissions and pending payouts in real-time.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 px-3.5 sm:px-4 py-3 rounded-xl sm:min-w-[150px]">
              <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
                Total Earned
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {stats.earned.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase">EGP</span>
              </div>
            </div>
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 px-3.5 sm:px-4 py-3 rounded-xl sm:min-w-[150px]">
              <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">
                Pending Payout
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {stats.pending.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase">EGP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Details Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              InstaPay Handle
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 font-mono">
              {effectiveUser.instaPay || 'Not Set'}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Mobile Wallet
            </span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 font-mono tabular-nums">
              {effectiveUser.mobileWallet || 'Not Set'}
            </span>
          </div>
        </div>
      </div>

      {/* Commission History Table */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0F1420]">
          <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Payout History &amp; Pipeline
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Showing {myCommissions.length} records
          </span>
        </div>

        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
              <tr
                className={`text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider ${
                  isCompactMode ? 'text-[9px]' : 'text-[11px]'
                }`}
              >
                <th className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-3.5'}`}>Candidate</th>
                <th className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-3.5'}`}>Company</th>
                <th className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-3.5'}`}>Status</th>
                <th className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-3.5'} text-right`}>Amount</th>
                <th className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-3.5'}`}>Due Date</th>
                <th className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-3.5'}`}>Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dataLoading && myCommissions.length === 0 ? (
                <TableSkeleton rows={5} cols={6} />
              ) : myCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Wallet}
                      title="No Commissions Calculated Yet"
                      description="Your earned and pending commission records appear automatically once a candidate starts training."
                    />
                  </td>
                </tr>
              ) : (
                myCommissions.map((c) => {
                  const calc = c.commissionCalculated!;
                  const isPaid = calc.recruiterPaid;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/50 transition-colors group">
                      <td className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-4'}`}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-600 dark:text-slate-300 group-hover:border-[#D93A30]/40 group-hover:text-[#D93A30] transition-colors shrink-0 ${
                              isCompactMode ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
                            }`}
                          >
                            {(c.fullName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]" dir="auto" title={c.fullName}>
                              {c.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                              {c.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-4'}`}>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                          <Building className="w-3.5 h-3.5 text-[#D93A30]" />
                          <span>{c.company}</span>
                        </div>
                      </td>
                      <td className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-4'}`}>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getCandidateStatusBadgeClasses(
                            c.status
                          )}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-4'} text-right`}>
                        <div className="font-black text-slate-900 dark:text-white font-mono tabular-nums">
                          {calc.recruiterAmount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">EGP</div>
                      </td>
                      <td className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-4'}`}>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 tabular-nums">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatSafeDate(calc.dueDate, 'N/A')}</span>
                        </div>
                      </td>
                      <td className={`${isCompactMode ? 'px-3 py-2.5' : 'px-5 py-4'}`}>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[10px] uppercase whitespace-nowrap">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold text-[10px] uppercase whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
