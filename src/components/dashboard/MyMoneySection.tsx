import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Building,
  CheckCircle,
  Copy,
  Check,
  Wallet,
  ShieldAlert,
  AlertOctagon,
  Bell,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { computeTermsDueAlerts } from '../../lib/termsDueAlerts';
import { EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { safeParseDate } from '../../lib/dateUtils';

export const MyMoneySection: React.FC = () => {
  const { candidates, commissionRules, users, toggleClientCollected, toggleRecruiterPaid } = useData();
  const { activeRole } = useAuth();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<'this_month' | 'all_time' | 'upcoming'>('this_month');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (activeRole !== 'ceo') return null;

  const trainingCandidates = candidates.filter(
    (c) => (c.status === 'Start Training' || c.status === 'Commission Done') && c.commissionCalculated
  );

  const now = new Date();

  let totalExternalRevenue = 0;
  let totalCeoNetEarned = 0;
  let totalOwedToTeam = 0;
  let totalPaidToTeam = 0;
  let overdueCollectionCount = 0;

  trainingCandidates.forEach((c) => {
    const calc = c.commissionCalculated!;
    totalExternalRevenue += calc.externalAmount || 0;
    totalCeoNetEarned += calc.ceoAmount || 0;

    const teamTotal = (calc.recruiterAmount || 0) + (calc.leaderAmount || 0) + (calc.unitAmount || 0);
    if (calc.recruiterPaid) {
      totalPaidToTeam += teamTotal;
    } else {
      totalOwedToTeam += teamTotal;
    }

    const due = safeParseDate(calc.dueDate);
    if (!calc.clientCollected && due && due < now) {
      overdueCollectionCount++;
    }
  });

  const termsSummary = computeTermsDueAlerts(candidates);
  const tpNeedsDecision = commissionRules.some((r) => r.needsDecision);

  const handleCopyPaymentInfo = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedKey(key);
        showToast('Payment detail copied to clipboard.', 'success');
        setTimeout(() => setCopiedKey(null), 2000);
      },
      () => showToast('Could not copy payment details.', 'error')
    );
  };

  const handleToggleCollected = async (candidateId: string) => {
    if (processingId) return;
    setProcessingId(candidateId);
    try {
      await toggleClientCollected(candidateId);
      showToast('Client collection status updated.', 'success');
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to update collection status.'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleTogglePaid = async (candidateId: string) => {
    if (processingId) return;
    setProcessingId(candidateId);
    try {
      await toggleRecruiterPaid(candidateId);
      showToast('Team payout status updated.', 'success');
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to update team payout.'), 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div id="my-money-engine" className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/70 flex items-center justify-center text-[#D93A30] dark:text-red-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>MY MONEY ENGINE</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#D93A30] dark:text-red-400 border border-red-200 dark:border-red-800 font-bold uppercase tracking-wider">
                CEO Financials
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time external receivables, cascade team splits, collection due dates, and payout disbursements
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {(['this_month', 'upcoming', 'all_time'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                period === p
                  ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Terms Due & Collection Alert System */}
      {(termsSummary.overdueCount > 0 || termsSummary.dueSoonCount > 0 || termsSummary.payoutReadyCount > 0) && (
        <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/70 pb-3">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-[#D93A30]" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Terms Due &amp; Collection Alerts</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold uppercase">
                    Invoice Alerts
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automated tracking of client payment deadlines (30/45 days) and cascade team payouts
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
              {termsSummary.overdueCount > 0 && (
                <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                  {termsSummary.overdueCount} Overdue ({termsSummary.overdueAmountEGP.toLocaleString()} EGP)
                </span>
              )}
              {termsSummary.dueSoonCount > 0 && (
                <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  {termsSummary.dueSoonCount} Due within 3 Days
                </span>
              )}
              {termsSummary.payoutReadyCount > 0 && (
                <span className="bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-violet-500" />
                  {termsSummary.payoutReadyCount} Ready for Team Payout
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {termsSummary.alerts
              .filter((a) => a.urgencyLevel !== 'normal')
              .map((alert) => (
                <div
                  key={alert.candidateId}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all bg-white dark:bg-[#131826] ${
                    alert.urgencyLevel === 'critical'
                      ? 'border-rose-200 dark:border-rose-800/80'
                      : alert.urgencyLevel === 'warning'
                      ? 'border-amber-200 dark:border-amber-800/80'
                      : 'border-violet-200 dark:border-violet-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{alert.candidateName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{alert.company}</span>
                        <span>•</span>
                        <span>{alert.termsDays}d Term</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono border tabular-nums ${
                        alert.urgencyLevel === 'critical'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700'
                          : alert.urgencyLevel === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                          : 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700'
                      }`}
                    >
                      {alert.urgencyLevel === 'critical'
                        ? `${Math.abs(alert.daysRemaining)}d OVERDUE`
                        : alert.urgencyLevel === 'warning'
                        ? `Due in ${alert.daysRemaining}d`
                        : 'Collected'}
                    </span>
                  </div>

                  <div className="text-xs bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-lg flex items-center justify-between font-mono tabular-nums">
                    <span className="text-slate-500 dark:text-slate-400">Receivable:</span>
                    <strong className="text-slate-900 dark:text-white">{alert.externalAmount.toLocaleString()} EGP</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {!alert.readyForPayout && (
                      <button
                        disabled={processingId === alert.candidateId}
                        onClick={() => handleToggleCollected(alert.candidateId)}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        {processingId === alert.candidateId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Mark Client Paid
                      </button>
                    )}
                    {alert.readyForPayout && (
                      <button
                        disabled={processingId === alert.candidateId}
                        onClick={() => handleTogglePaid(alert.candidateId)}
                        className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-violet-600 hover:bg-violet-700 text-white transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                      >
                        {processingId === alert.candidateId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                        Disburse to Team
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TP Decision warning if active */}
      {tpNeedsDecision && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-slate-900 dark:text-white block font-bold">Action Required: Teleperformance (TP) Rate Rule Assignment</strong>
            <p className="leading-relaxed">
              Teleperformance has two site rules: English site (3000 EGP) and Languages (French/other at 4000 EGP / 4500 EGP). You can review or adjust in the Commissions tab.
            </p>
          </div>
        </div>
      )}

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>CEO Net Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalCeoNetEarned.toLocaleString()} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">EGP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Net retained after subtracting team cascade payouts
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Total External Billing</span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Building className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalExternalRevenue.toLocaleString()} <span className="text-xs font-bold text-sky-600 dark:text-sky-400">EGP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Gross paid by client companies (TTEC, TP, eClerx, etc.)
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Team Payouts Owed</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {totalOwedToTeam.toLocaleString()} <span className="text-xs font-bold text-slate-400">EGP</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Recruiter + Leader + Unit shares awaiting disbursement
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Overdue Collections</span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {overdueCollectionCount} <span className="text-xs font-bold text-slate-400">Candidates</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Terms ended (30/45 days) &amp; client payment pending
          </p>
        </div>
      </div>

      {/* Executive Financial Cascade Flow Visualization */}
      <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/70 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#D93A30]" /> Financial Cascade &amp; Margin Analysis by Client
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gross billing vs CEO retained net vs team distributed shares</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D93A30]" /> CEO Net
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" /> Team
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Gross
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-white dark:bg-[#131826] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Volume Invoiced</div>
            <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {totalExternalRevenue.toLocaleString()} EGP
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-full" />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between tabular-nums">
              <span>Client receivables</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">100%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131826] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">CEO Retained Margin</div>
            <div className="text-xl font-extrabold font-mono text-[#D93A30] tabular-nums">
              {totalCeoNetEarned.toLocaleString()} EGP
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D93A30] rounded-full"
                style={{
                  width: `${totalExternalRevenue > 0 ? Math.round((totalCeoNetEarned / totalExternalRevenue) * 100) : 0}%`
                }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between tabular-nums">
              <span>Agency net profit</span>
              <span className="text-[#D93A30] dark:text-red-400 font-bold">
                {totalExternalRevenue > 0 ? Math.round((totalCeoNetEarned / totalExternalRevenue) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131826] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Team Commission Pool</div>
            <div className="text-xl font-extrabold font-mono text-sky-600 dark:text-sky-400 tabular-nums">
              {(totalOwedToTeam + totalPaidToTeam).toLocaleString()} EGP
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full"
                style={{
                  width: `${
                    totalExternalRevenue > 0
                      ? Math.round(((totalOwedToTeam + totalPaidToTeam) / totalExternalRevenue) * 100)
                      : 0
                  }%`
                }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between tabular-nums">
              <span>Recruiters, Leaders, Units</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">
                {totalExternalRevenue > 0
                  ? Math.round(((totalOwedToTeam + totalPaidToTeam) / totalExternalRevenue) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Commission Tracking List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 tabular-nums">
            <Clock className="w-4 h-4 text-[#D93A30]" />
            Active Training Candidates &amp; Financial Cascade Ledger ({trainingCandidates.length})
          </h3>
        </div>

        <div className="space-y-3">
          {trainingCandidates.map((cand) => {
            const calc = cand.commissionCalculated!;
            const dueDate = safeParseDate(calc.dueDate) || now;
            const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysRemaining < 0 && !calc.clientCollected;
            const creatorUser = users.find((u) => u.id === cand.createdBy);

            return (
              <div
                key={cand.id}
                className="bg-slate-50/70 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/70 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span dir="auto" title={cand.fullName} className="font-extrabold text-base text-slate-900 dark:text-white truncate max-w-[240px]">{cand.fullName}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#D93A30] dark:text-red-400 border border-red-200 dark:border-red-800/70">
                        {cand.company} ({cand.language || 'English'})
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold tabular-nums">
                        {calc.termsDays} Days Term
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
                      <span>Started: <strong className="text-slate-800 dark:text-slate-200">{cand.trainingStartDate}</strong></span>
                      <span>•</span>
                      <span>Due: <strong className={isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>{calc.dueDate}</strong></span>
                      <span>•</span>
                      <span className={daysRemaining > 0 ? 'text-sky-600 dark:text-sky-400 font-semibold' : isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : isOverdue ? `${Math.abs(daysRemaining)} days OVERDUE` : 'Due today'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={processingId === cand.id}
                      onClick={() => handleToggleCollected(cand.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] whitespace-nowrap border ${
                        calc.clientCollected
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                      }`}
                    >
                      {processingId === cand.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      {calc.clientCollected ? 'Client Paid (Collected)' : 'Mark Client Paid'}
                    </button>

                    <button
                      disabled={processingId === cand.id}
                      onClick={() => handleTogglePaid(cand.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] whitespace-nowrap ${
                        calc.recruiterPaid
                          ? 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700'
                          : 'bg-[#D93A30] text-white hover:bg-[#b82e25] shadow-xs'
                      }`}
                    >
                      {processingId === cand.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                      {calc.recruiterPaid ? 'Commission Done (Team Paid)' : 'Mark Team Paid'}
                    </button>
                  </div>
                </div>

                {/* Cascade Financial Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white dark:bg-[#131826] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs tabular-nums">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block">External Amount</span>
                    <strong className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{calc.externalAmount} EGP</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block truncate">Recruiter ({cand.createdByName})</span>
                    <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{calc.recruiterAmount} EGP</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block truncate">Leader ({cand.leaderName || 'None'})</span>
                    <strong className="text-sm font-extrabold text-sky-600 dark:text-sky-400 font-mono">{calc.leaderAmount} EGP</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block truncate">Unit ({cand.unitManagerName || 'None'})</span>
                    <strong className="text-sm font-extrabold text-violet-600 dark:text-violet-400 font-mono">{calc.unitAmount} EGP</strong>
                  </div>

                  <div className="bg-red-50/70 dark:bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50">
                    <span className="text-[10px] text-[#D93A30] dark:text-red-400 uppercase font-bold block">CEO Net Profit</span>
                    <strong className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{calc.ceoAmount} EGP</strong>
                  </div>
                </div>

                {/* Recruiter Payout Info */}
                {creatorUser && (
                  <div className="flex flex-wrap items-center justify-between text-xs bg-white dark:bg-[#0B0F19] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 gap-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <span>Recruiter Payout Destination:</span>
                      {creatorUser.instaPay && (
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <span className="text-violet-600 dark:text-violet-400 font-bold">InstaPay:</span>
                          <span className="font-mono">{creatorUser.instaPay}</span>
                          <button
                            onClick={() => handleCopyPaymentInfo(creatorUser.instaPay!, `insta-${cand.id}`)}
                            className="p-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title="Copy InstaPay"
                          >
                            {copiedKey === `insta-${cand.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {creatorUser.mobileWallet && (
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Wallet:</span>
                          <span className="font-mono tabular-nums">{creatorUser.mobileWallet}</span>
                          <button
                            onClick={() => handleCopyPaymentInfo(creatorUser.mobileWallet!, `wallet-${cand.id}`)}
                            className="p-1 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title="Copy Wallet Number"
                          >
                            {copiedKey === `wallet-${cand.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Auto-loaded from {creatorUser.name}&apos;s profile
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {trainingCandidates.length === 0 && (
            <EmptyState
              icon={Wallet}
              title="No active training candidates yet"
              description='Mark a candidate as "Start Training" in the pipeline to activate their financial cascade.'
            />
          )}
        </div>
      </div>
    </div>
  );
};
