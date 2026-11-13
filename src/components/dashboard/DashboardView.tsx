import React, { useState } from 'react';
import {
  Users,
  Mic,
  Calendar,
  CheckCircle,
  Award,
  ArrowRight,
  MessageSquare,
  Radio,
  ChevronRight,
  AlertOctagon,
  Maximize2,
  Minimize2,
  Kanban,
  FileSpreadsheet,
  Share2,
  RefreshCw,
  CalendarX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { MyMoneySection } from './MyMoneySection';
import { Candidate, CandidateStatus } from '../../types';
import { computeTermsDueAlerts } from '../../lib/termsDueAlerts';
import { WaveformAudioPlayer } from '../common/WaveformAudioPlayer';
import { NationalIdBadge } from '../common/NationalIdBadge';
import { SocialJobPostGeneratorModal } from '../offers/SocialJobPostGeneratorModal';
import { TalentPoolModal } from '../candidates/TalentPoolModal';
import { AuditLogModal } from '../candidates/AuditLogModal';
import { RecruiterTargetSection } from './RecruiterTargetSection';
import { DailyTaskSection } from './DailyTaskSection';
import { KpiGridSkeleton, EmptyState } from '../common/UIStates';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { getSafeTimestamp } from '../../lib/dateUtils';

interface DashboardViewProps {
  onNavigateToCandidates: (filterStatus?: string) => void;
  onNavigateToWhatsApp?: (candidate: Candidate) => void;
}

const KANBAN_STAGES: Array<{ id: CandidateStatus; label: string; dot: string; headerTint: string }> = [
  { id: 'New', label: 'New Voice Notes', dot: 'bg-sky-500', headerTint: 'text-sky-700 dark:text-sky-300' },
  { id: 'Accepted Voice Note', label: 'Voice Approved', dot: 'bg-cyan-500', headerTint: 'text-cyan-700 dark:text-cyan-300' },
  { id: 'Interview Scheduled', label: 'Interviews Scheduled', dot: 'bg-amber-500', headerTint: 'text-amber-700 dark:text-amber-300' },
  { id: 'Accepted Interview', label: 'Passed Interviews', dot: 'bg-emerald-500', headerTint: 'text-emerald-700 dark:text-emerald-300' },
  { id: 'Start Training', label: 'In Training', dot: 'bg-[#D93A30]', headerTint: 'text-[#D93A30] dark:text-red-400' },
  { id: 'Dropped or Left Training', label: 'Left Training', dot: 'bg-orange-500', headerTint: 'text-orange-700 dark:text-orange-300' },
  { id: 'Commission Done', label: 'Commission Done', dot: 'bg-violet-500', headerTint: 'text-violet-700 dark:text-violet-300' }
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToCandidates
}) => {
  const { candidates, updateCandidateStatus, dataLoading } = useData();
  const { effectiveUser, activeRole } = useAuth();
  const { isZenMode, toggleZenMode } = useTheme();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'standard' | 'kanban'>('standard');
  const [activityFilter, setActivityFilter] = useState<'all' | 'voice' | 'interviews' | 'trainings'>('all');
  const [dashboardDateFilter, setDashboardDateFilter] = useState<string>('');
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);

  const [showSocialModal, setShowSocialModal] = useState<boolean>(false);
  const [showTalentPoolModal, setShowTalentPoolModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  const isCeo = activeRole === 'ceo';
  const isAccountManager = activeRole === 'account_manager';
  const canManageStatus = isCeo || isAccountManager;
  const canSeeMoney = isCeo;

  const termsSummary = isCeo ? computeTermsDueAlerts(candidates) : null;

  const baseScoped = candidates.filter((c) => {
    if (isCeo || isAccountManager) return true;
    if (activeRole === 'unit_manager') {
      return c.unitManagerId === effectiveUser.id || c.createdBy === effectiveUser.id;
    }
    if (activeRole === 'leader') {
      return c.leaderId === effectiveUser.id || c.createdBy === effectiveUser.id;
    }
    return c.createdBy === effectiveUser.id;
  });

  const scopedCandidates = baseScoped.filter((c) => {
    if (!dashboardDateFilter) return true;
    const cDate = c.createdAt ? c.createdAt.split('T')[0] : '';
    const iDate = c.interviewDate || '';
    const tDate = c.trainingStartDate || '';
    return cDate === dashboardDateFilter || iDate === dashboardDateFilter || tDate === dashboardDateFilter;
  });

  const totalCandidates = scopedCandidates.length;
  const newVoiceNotes = scopedCandidates.filter((c) => c.status === 'New');
  const acceptedVoiceNotes = scopedCandidates.filter((c) =>
    ['Accepted Voice Note', 'Interview Scheduled', 'Interview Rescheduled', 'Accepted Interview', 'Start Training', 'Commission Done'].includes(c.status)
  );
  const scheduledInterviews = scopedCandidates.filter((c) =>
    ['Interview Scheduled', 'Interview Rescheduled'].includes(c.status)
  );
  const passedInterviews = scopedCandidates.filter((c) =>
    ['Accepted Interview', 'Start Training', 'Commission Done'].includes(c.status)
  );
  const activeTrainings = scopedCandidates.filter((c) =>
    ['Start Training', 'Commission Done'].includes(c.status)
  );
  const commissionsDone = scopedCandidates.filter((c) => c.status === 'Commission Done');

  const vnAcceptedRate = totalCandidates > 0 ? Math.round((acceptedVoiceNotes.length / totalCandidates) * 100) : 0;
  const interviewPassRate = (scheduledInterviews.length + passedInterviews.length) > 0
    ? Math.round((passedInterviews.length / (scheduledInterviews.length + passedInterviews.length)) * 100)
    : 0;

  const upcomingInterviews = scopedCandidates
    .filter((c) => (c.status === 'Interview Scheduled' || c.status === 'Interview Rescheduled') && c.interviewDate)
    .sort((a, b) => getSafeTimestamp(a.interviewDate) - getSafeTimestamp(b.interviewDate))
    .slice(0, 4);

  const rawEvents: Array<{
    id: string;
    candidateName: string;
    candidatePhone: string;
    company: string;
    language: string;
    status: CandidateStatus;
    changedBy: string;
    timestamp: string;
    vocarooUrl?: string;
  }> = [];

  scopedCandidates.forEach((cand) => {
    if (cand.statusHistory && cand.statusHistory.length > 0) {
      cand.statusHistory.forEach((h, idx) => {
        rawEvents.push({
          id: `${cand.id}-${idx}`,
          candidateName: cand.fullName,
          candidatePhone: cand.phone,
          company: cand.company,
          language: cand.language || 'English',
          status: h.status,
          changedBy: h.changedByName || 'Team Member',
          timestamp: h.timestamp,
          vocarooUrl: cand.vocarooUrl
        });
      });
    } else {
      rawEvents.push({
        id: `${cand.id}-created`,
        candidateName: cand.fullName,
        candidatePhone: cand.phone,
        company: cand.company,
        language: cand.language || 'English',
        status: cand.status,
        changedBy: cand.createdByName || 'Recruiter',
        timestamp: cand.createdAt,
        vocarooUrl: cand.vocarooUrl
      });
    }
  });

  const liveEvents = rawEvents
    .sort((a, b) => getSafeTimestamp(b.timestamp) - getSafeTimestamp(a.timestamp))
    .filter((e) => {
      if (activityFilter === 'voice') return ['New', 'Accepted Voice Note', 'Rejected Voice Note'].includes(e.status);
      if (activityFilter === 'interviews') return ['Interview Scheduled', 'Interview Rescheduled', 'Accepted Interview', 'Rejected Interview'].includes(e.status);
      if (activityFilter === 'trainings') return ['Start Training', 'Commission Done'].includes(e.status);
      return true;
    })
    .slice(0, 7);

  const handleDragStart = (candidateId: string) => {
    setDraggedCandidateId(candidateId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (newStatus: CandidateStatus) => {
    if (!canManageStatus || !draggedCandidateId) return;
    const targetId = draggedCandidateId;
    setDraggedCandidateId(null);
    try {
      await updateCandidateStatus(targetId, newStatus, {
        note: `Moved via Kanban board to ${newStatus}`
      });
      showToast(`Candidate moved to "${newStatus}".`, 'success');
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to update candidate stage.'), 'error');
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const ts = getSafeTimestamp(timestamp);
    if (!ts) return '—';
    const diffMs = Math.max(0, Date.now() - ts);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getWhatsAppHref = (phone: string, text: string) => {
    let clean = phone.replace(/[^\d+]/g, '');
    if (clean.startsWith('01')) clean = '20' + clean.slice(1);
    if (clean.startsWith('+')) clean = clean.slice(1);
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className={`space-y-6 ${isZenMode ? 'max-w-full px-2' : ''}`}>
      {/* 1. Modern Crisp SaaS Hero Command Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs"
      >
        {/* Subtle corner accent wash */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#D93A30]/8 dark:bg-[#D93A30]/12 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/70 text-[11px] font-bold uppercase tracking-wider text-[#D93A30] dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-[#D93A30]" />
                Live Command Center
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-[#1B2234] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {dashboardDateFilter && (
                <span className="text-xs text-amber-800 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/70 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 tabular-nums">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Filtered: {dashboardDateFilter}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Redz Recruitment Agency
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              High-velocity BPO candidate funnel, automated Egyptian National ID verification, and instant WhatsApp interview dispatching.
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: Standard vs Kanban */}
            <div className="flex items-center bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('standard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'standard'
                    ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#D93A30]" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Kanban className="w-3.5 h-3.5 text-[#D93A30]" />
                <span>Kanban Board</span>
              </button>
            </div>

            <button
              onClick={() => setShowSocialModal(true)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#1B2234] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
              title="Generate Facebook / LinkedIn / WhatsApp hiring posts"
            >
              <Share2 className="w-3.5 h-3.5 text-pink-500" />
              <span className="hidden sm:inline">Post Generator</span>
            </button>

            <button
              onClick={() => setShowTalentPoolModal(true)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#1B2234] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
              title="Recycle rejected candidates into sister accounts"
            >
              <RefreshCw className="w-3.5 h-3.5 text-violet-500" />
              <span className="hidden sm:inline">Talent Pool</span>
            </button>

            <button
              onClick={() => setShowAuditModal(true)}
              className="px-3 py-2 rounded-xl bg-white dark:bg-[#1B2234] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
              title="View system action audit trail"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Audit Log</span>
            </button>

            <button
              onClick={toggleZenMode}
              className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${
                isZenMode
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-[#1B2234] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isZenMode ? 'Exit Zen Focus Mode' : 'Enter Zen Focus Mode'}
            >
              {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Date Filter & Fast Counters Bar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-[#D93A30]" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Date Filter:</span>
            <input
              type="date"
              value={dashboardDateFilter}
              onChange={(e) => setDashboardDateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none font-mono font-bold cursor-pointer tabular-nums"
            />
            {dashboardDateFilter && (
              <button
                onClick={() => setDashboardDateFilter('')}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-bold transition-colors ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              New Voices: <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{newVoiceNotes.length}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Scheduled: <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{scheduledInterviews.length}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D93A30]" />
              In Training: <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{activeTrainings.length}</strong>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Terms Due Alert Banner for CEO */}
      {isCeo && termsSummary && (termsSummary.overdueCount > 0 || termsSummary.dueSoonCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex flex-wrap items-center gap-2">
                <span className="tabular-nums">
                  Terms Due Notice: {termsSummary.overdueCount} Overdue Collections ({termsSummary.overdueAmountEGP.toLocaleString()} EGP)
                </span>
                {termsSummary.dueSoonCount > 0 && (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold text-xs tabular-nums">
                    • {termsSummary.dueSoonCount} due within 3 days
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Client collection terms (30/45 days) require invoicing or team payout disbursement.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const el = document.getElementById('my-money-engine');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-xl bg-[#D93A30] hover:bg-[#b82e25] text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <span>Review Financials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* VIEW MODE: Standard vs Kanban Board */}
      {dataLoading && viewMode === 'standard' ? (
        <KpiGridSkeleton count={4} />
      ) : viewMode === 'kanban' ? (
        <div className="space-y-4 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Kanban className="w-4 h-4 text-[#D93A30]" />
              Live Recruitment Pipeline Kanban
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {canManageStatus ? 'Drag candidate cards to transition stages seamlessly' : 'Real-time view of candidate stages'}
            </p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 max-w-full">
            {KANBAN_STAGES.map((stage) => {
              const columnCandidates = scopedCandidates.filter((c) => c.status === stage.id);

              return (
                <div
                  key={stage.id}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(stage.id)}
                  className="min-w-[260px] flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#131826]/80 p-3.5 flex flex-col min-h-[500px] transition-all"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dot}`} />
                      <span className={`text-xs font-bold truncate ${stage.headerTint}`}>
                        {stage.label}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 tabular-nums">
                      {columnCandidates.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                    {columnCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        draggable={canManageStatus}
                        onDragStart={() => canManageStatus && handleDragStart(cand.id)}
                        className={`bg-white dark:bg-[#1B2234] hover:shadow-md border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2.5 shadow-xs transition-all group ${
                          canManageStatus ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong dir="auto" title={cand.fullName} className="text-xs font-bold text-slate-900 dark:text-white truncate">{cand.fullName}</strong>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold shrink-0">
                            {cand.company}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono tabular-nums">{cand.phone}</span>
                          <span className="text-sky-600 dark:text-sky-400 font-semibold">{cand.language || 'English'}</span>
                        </div>

                        {cand.vocarooUrl && (
                          <WaveformAudioPlayer
                            url={cand.vocarooUrl}
                            title={`${(cand.fullName || 'Candidate').split(' ')[0]}'s Voice`}
                            compact
                          />
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <NationalIdBadge idNumber={cand.idNumber} age={cand.age} />
                          <a
                            href={getWhatsAppHref(
                              cand.phone,
                              `Hello ${cand.fullName}, this is Redz Recruitment regarding your application for ${cand.company}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </a>
                        </div>
                      </div>
                    ))}

                    {columnCandidates.length === 0 && (
                      <div className="h-28 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {canManageStatus ? 'Drop candidate here' : 'No candidates in stage'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* 3. High-Impact SaaS KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Pipeline */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => onNavigateToCandidates()}
              className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-[#D93A30]/40 hover:shadow-md transition-all shadow-xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-3">
                <span>Total Submissions</span>
                <span className="p-2 rounded-xl bg-slate-100 dark:bg-[#1B2234] text-slate-600 dark:text-slate-300 group-hover:bg-[#D93A30] group-hover:text-white transition-colors">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {totalCandidates}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span>All registered candidates</span>
              </div>
            </motion.div>

            {/* Voice Approval Rate */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => onNavigateToCandidates('Accepted Voice Note')}
              className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-sky-400/50 hover:shadow-md transition-all shadow-xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-3">
                <span>Voice Qualified</span>
                <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <Mic className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {acceptedVoiceNotes.length}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-sky-600 dark:text-sky-400 mt-2 font-semibold tabular-nums">
                <span className="font-bold">{vnAcceptedRate}%</span> qualification rate
              </div>
            </motion.div>

            {/* Passed Interviews */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => onNavigateToCandidates('Accepted Interview')}
              className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-emerald-400/50 hover:shadow-md transition-all shadow-xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-3">
                <span>Passed Interviews</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {passedInterviews.length}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-semibold tabular-nums">
                <span className="font-bold">{interviewPassRate}%</span> win through rate
              </div>
            </motion.div>

            {/* In Training */}
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => onNavigateToCandidates('Start Training')}
              className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl cursor-pointer hover:border-[#D93A30]/50 hover:shadow-md transition-all shadow-xs group"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-3">
                <span>In Training</span>
                <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#D93A30] dark:text-red-400 group-hover:bg-[#D93A30] group-hover:text-white transition-colors">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {activeTrainings.length}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#D93A30] dark:text-red-400 mt-2 font-semibold tabular-nums">
                <span>{commissionsDone.length} Commissions Done</span>
              </div>
            </motion.div>
          </div>

          {/* 4. Two-Column Live Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Live Agency Activity Stream (7 cols) */}
            <div className="lg:col-span-7 min-w-0 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/70 flex items-center justify-center text-[#D93A30] dark:text-red-400">
                      <Radio className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Live Agency Activity Stream
                    </h3>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] max-w-full">
                    {(['all', 'voice', 'interviews', 'trainings'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActivityFilter(filter)}
                        className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer whitespace-nowrap ${
                          activityFilter === filter
                            ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white font-bold shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity Rows */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {liveEvents.map((evt) => (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="bg-slate-50/80 dark:bg-[#1B2234] border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-[#D93A30]/15 border border-red-200 dark:border-[#D93A30]/30 flex items-center justify-center text-[#D93A30] dark:text-red-400 shrink-0 font-extrabold">
                            {(evt.candidateName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong dir="auto" title={evt.candidateName} className="text-slate-900 dark:text-white truncate max-w-[200px]">{evt.candidateName}</strong>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                                {evt.company} ({evt.language})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                              <span>Moved to</span>
                              <span className={`px-2 py-0.2 rounded-full border text-[10px] font-bold ${getCandidateStatusBadgeClasses(evt.status)}`}>
                                {evt.status}
                              </span>
                              <span>by {evt.changedBy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-medium block tabular-nums">
                            {formatRelativeTime(evt.timestamp)}
                          </span>
                          {evt.vocarooUrl && (
                            <a
                              href={evt.vocarooUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center justify-end gap-1 mt-0.5 font-bold"
                            >
                              <Mic className="w-3 h-3" /> Audio
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {liveEvents.length === 0 && (
                    <EmptyState
                      icon={Radio}
                      title="No recent activity"
                      description="No status updates matched the selected filter or date."
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Upcoming Interviews Dispatcher (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/70 flex items-center justify-center text-violet-600 dark:text-violet-400">
                      <Calendar className="w-4 h-4" />
                    </span>
                    Upcoming Interviews
                  </h3>
                  <span className="text-[11px] text-violet-700 dark:text-violet-300 font-mono font-bold bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-800/70 tabular-nums">
                    {upcomingInterviews.length} Scheduled
                  </span>
                </div>

                <div className="space-y-3">
                  {upcomingInterviews.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-50/80 dark:bg-[#1B2234] border border-slate-200/70 dark:border-slate-700/60 p-3.5 rounded-xl space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span dir="auto" title={c.fullName} className="font-bold text-slate-900 dark:text-white text-xs truncate">{c.fullName}</span>
                        <span className="text-[11px] font-mono font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800/70 tabular-nums shrink-0">
                          {c.interviewDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                        <span className="truncate font-medium">{c.company} • {c.interviewTime || '11 AM - 3 PM'}</span>
                        <a
                          href={getWhatsAppHref(
                            c.phone,
                            `Hello ${c.fullName}, this is from Redz Recruitment regarding your interview with ${c.company} on ${c.interviewDate}. Please be ready on time!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/70 transition-colors shrink-0"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}

                  {upcomingInterviews.length === 0 && (
                    <EmptyState
                      icon={CalendarX}
                      title="Interview queue is clear"
                      description="No interviews scheduled in the upcoming queue."
                    />
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigateToCandidates('Interview Scheduled')}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] mt-4"
              >
                <span>View Full Interview Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5. Daily Task List & Follow-ups */}
          <DailyTaskSection />

          {/* 6. Recruiter Target & Quota Tracking */}
          <RecruiterTargetSection />
        </>
      )}

      {/* 7. CEO Financials ("My Money" Engine) */}
      {canSeeMoney && <MyMoneySection />}

      {/* Modals */}
      <SocialJobPostGeneratorModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
      />

      <TalentPoolModal
        isOpen={showTalentPoolModal}
        onClose={() => setShowTalentPoolModal(false)}
        onReEngageCandidate={() => {
          onNavigateToCandidates('New');
          setShowTalentPoolModal(false);
        }}
      />

      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
};
