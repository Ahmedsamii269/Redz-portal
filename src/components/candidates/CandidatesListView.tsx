import React, { useEffect, useState } from 'react';
import {
  Search,
  Phone,
  Calendar,
  Building,
  Clock,
  CheckCircle,
  MessageSquare,
  History,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Award,
  Star,
  Copy,
  Mic,
  DollarSign,
  Users2,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Candidate, CandidateStatus } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { WaveformAudioPlayer } from '../common/WaveformAudioPlayer';
import { NationalIdBadge } from '../common/NationalIdBadge';
import { WhatsAppModal } from './WhatsAppModal';
import { StatusChangeModal } from './StatusChangeModal';
import { AuditLogModal } from './AuditLogModal';
import { CandidateDrawer } from './CandidateDrawer';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { TableSkeleton, EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { getSafeTimestamp } from '../../lib/dateUtils';

interface CandidatesListViewProps {
  initialStatusFilter?: string;
}

export const CandidatesListView: React.FC<CandidatesListViewProps> = ({ initialStatusFilter }) => {
  const { candidates, deleteCandidate, dataLoading } = useData();
  const { effectiveUser, activeRole } = useAuth();
  const { showToast, confirmAction } = useToast();
  const { isCompactMode } = useTheme();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'All');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [languageFilter, setLanguageFilter] = useState<string>('All');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const [activeWaCandidate, setActiveWaCandidate] = useState<Candidate | null>(null);
  const [activeStatusCandidate, setActiveStatusCandidate] = useState<Candidate | null>(null);
  const [historyCandidate, setHistoryCandidate] = useState<Candidate | null>(null);
  const [drawerCandidate, setDrawerCandidate] = useState<Candidate | null>(null);

  const isCeo = activeRole === 'ceo';
  const isAccountManager = activeRole === 'account_manager';
  const canManageStatus = isCeo || isAccountManager;

  const scopedCandidates = candidates.filter((c) => {
    if (isCeo || isAccountManager) return true;
    if (activeRole === 'unit_manager') {
      return c.unitManagerId === effectiveUser.id || c.createdBy === effectiveUser.id;
    }
    if (activeRole === 'leader') {
      return c.leaderId === effectiveUser.id || c.createdBy === effectiveUser.id;
    }
    return c.createdBy === effectiveUser.id;
  });

  const filteredCandidates = scopedCandidates.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (companyFilter !== 'All' && c.company !== companyFilter) return false;
    if (languageFilter !== 'All' && (c.language || 'English') !== languageFilter) return false;
    if (recruiterFilter !== 'All' && (c.createdByName || c.createdBy) !== recruiterFilter) return false;
    if (dateFilter) {
      const cDate = c.createdAt ? c.createdAt.split('T')[0] : '';
      const iDate = c.interviewDate || '';
      const tDate = c.trainingStartDate || '';
      if (cDate !== dateFilter && iDate !== dateFilter && tDate !== dateFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.fullName || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q) || (c.phone2 && c.phone2.includes(q));
      const matchComp = (c.company || '').toLowerCase().includes(q);
      const matchRecruiter = (c.createdByName || '').toLowerCase().includes(q);
      const matchId = (c.idNumber || '').includes(q);
      if (!matchName && !matchPhone && !matchComp && !matchRecruiter && !matchId) return false;
    }
    return true;
  });

  const companies = ['All', ...Array.from(new Set(candidates.map((c) => c.company).filter(Boolean)))];
  const languages = ['All', ...Array.from(new Set(candidates.map((c) => c.language || 'English').filter(Boolean)))];
  const recruiters = ['All', ...Array.from(new Set(candidates.map((c) => c.createdByName || c.createdBy).filter(Boolean)))];

  const hasActiveFilters =
    statusFilter !== 'All' ||
    companyFilter !== 'All' ||
    languageFilter !== 'All' ||
    recruiterFilter !== 'All' ||
    dateFilter !== '' ||
    searchQuery.trim() !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setCompanyFilter('All');
    setLanguageFilter('All');
    setRecruiterFilter('All');
    setDateFilter('');
  };

  const getStatusIcon = (status: CandidateStatus) => {
    switch (status) {
      case 'New': return <Mic className="w-3 h-3 shrink-0" />;
      case 'Accepted Voice Note': return <CheckCircle className="w-3 h-3 shrink-0" />;
      case 'Interview Scheduled': return <Calendar className="w-3 h-3 shrink-0" />;
      case 'Accepted Interview': return <Star className="w-3 h-3 shrink-0" />;
      case 'Start Training': return <Award className="w-3 h-3 shrink-0" />;
      case 'Commission Done': return <DollarSign className="w-3 h-3 shrink-0" />;
      default: return <Clock className="w-3 h-3 shrink-0" />;
    }
  };

  const isStale = (updatedAt?: string) => {
    const lastUpdate = getSafeTimestamp(updatedAt);
    if (!lastUpdate) return false;
    const fortyEightHours = 48 * 60 * 60 * 1000;
    return (Date.now() - lastUpdate) > fortyEightHours;
  };

  const handleExportCSV = () => {
    const esc = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Full Name',
      'Phone',
      'Secondary Phone',
      'National ID',
      'Company',
      'Language',
      'Status',
      'Created By',
      'Leader',
      'Unit Manager',
      'Created Date',
      'Interview Date',
      'Training Start Date'
    ];
    const rows = filteredCandidates.map((c) => [
      esc(c.fullName),
      esc(c.phone),
      esc(c.phone2),
      esc(c.idNumber),
      esc(c.company),
      esc(c.language || 'English'),
      esc(c.status),
      esc(c.createdByName),
      esc(c.leaderName),
      esc(c.unitManagerName),
      esc(c.createdAt?.split('T')[0]),
      esc(c.interviewDate),
      esc(c.trainingStartDate)
    ]);

    const csvString = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `redz_candidates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const compactRow = isCompactMode || density === 'compact';

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
            <span>Candidates Pipeline</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/70 text-[#D93A30] dark:text-red-400 font-bold tabular-nums">
              {filteredCandidates.length} of {scopedCandidates.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hierarchy Scope: <strong className="text-slate-900 dark:text-white">{effectiveUser.role.toUpperCase()}</strong> ({effectiveUser.name})
            {canManageStatus && <span className="text-emerald-600 dark:text-emerald-400 ml-2 font-semibold">• Authorized to update pipeline stages</span>}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setDensity('comfortable')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                density === 'comfortable'
                  ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                density === 'compact'
                  ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Compact
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Suite */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-[#131826] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, phone, national ID, company, recruiter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
        >
          <option value="All">All Statuses</option>
          <option value="New">New</option>
          <option value="Accepted Voice Note">Accepted Voice Note</option>
          <option value="Rejected Voice Note">Rejected Voice Note</option>
          <option value="Interview Scheduled">Interview Scheduled</option>
          <option value="Interview Rescheduled">Interview Rescheduled</option>
          <option value="Accepted Interview">Accepted Interview</option>
          <option value="Rejected Interview">Rejected Interview</option>
          <option value="Start Training">Start Training</option>
          <option value="Dropped or Left Training">Dropped / Left Training</option>
          <option value="Commission Done">Commission Done</option>
        </select>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
        >
          {companies.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>
          ))}
        </select>

        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
        >
          {languages.map((l) => (
            <option key={l} value={l}>{l === 'All' ? 'All Languages' : l}</option>
          ))}
        </select>

        {isCeo && (
          <select
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            className="w-full sm:w-auto sm:max-w-[170px] bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30] truncate"
          >
            {recruiters.map((r) => (
              <option key={r} value={r}>{r === 'All' ? 'All Recruiters' : r}</option>
            ))}
          </select>
        )}

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-[#D93A30] shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none tabular-nums"
              title="Filter by Date"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-[10px] ml-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded font-bold cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs font-bold text-[#D93A30] hover:underline px-2 py-1 cursor-pointer whitespace-nowrap"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs w-full">
        {dataLoading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : (
          <>
            {/* Desktop & Tablet Table */}
            <div className="hidden md:block overflow-x-auto max-h-[680px] w-full">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Candidate &amp; ID</th>
                  <th className="py-3.5 px-4">Account &amp; Language</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Voice Note</th>
                  <th className="py-3.5 px-4">Schedule / Training</th>
                  <th className="py-3.5 px-4">Submitted By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredCandidates.map((candidate) => {
                  const isWhatsAppEligible = [
                    'Accepted Voice Note',
                    'Interview Scheduled',
                    'Interview Rescheduled',
                    'Accepted Interview'
                  ].includes(candidate.status);

                  const stale = isStale(candidate.updatedAt || candidate.createdAt);

                  return (
                    <tr
                      key={candidate.id}
                      onClick={() => setDrawerCandidate(candidate)}
                      className={`cursor-pointer transition-colors ${
                        stale
                          ? 'bg-rose-50/40 dark:bg-rose-950/15 hover:bg-rose-50/80 dark:hover:bg-rose-950/25'
                          : 'hover:bg-slate-50/90 dark:hover:bg-[#1B2234]/70'
                      }`}
                    >
                      {/* Candidate Name, ID Badge & Contact */}
                      <td className={`px-4 ${compactRow ? 'py-2' : 'py-3.5'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            dir="auto"
                            title={candidate.fullName}
                            className={`font-bold text-slate-900 dark:text-white truncate max-w-[200px] ${compactRow ? 'text-xs' : 'text-sm'}`}
                          >
                            {candidate.fullName}
                          </div>
                          {stale && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                              title="No status update for over 48 hours"
                            >
                              <AlertTriangle className="w-3 h-3" /> Stale &gt;48h
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-0.5 ${compactRow ? 'text-[10px]' : 'text-xs'}`}>
                          <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="font-mono tabular-nums">{candidate.phone}</span>
                        </div>
                        {!compactRow && (
                          <div className="mt-1.5">
                            <NationalIdBadge idNumber={candidate.idNumber} age={candidate.age} />
                          </div>
                        )}
                      </td>

                      {/* Company & Language */}
                      <td className={`px-4 ${compactRow ? 'py-2' : 'py-3.5'}`}>
                        <div className={`font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 ${compactRow ? 'text-[11px]' : 'text-xs'}`}>
                          <Building className="w-3.5 h-3.5 text-[#D93A30] shrink-0" />
                          {candidate.company}
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/70 font-semibold inline-block mt-1">
                          {candidate.language || 'English'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className={`px-4 ${compactRow ? 'py-2' : 'py-3.5'}`}>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold border whitespace-nowrap ${
                            compactRow ? 'text-[10px]' : 'text-[11px]'
                          } ${getCandidateStatusBadgeClasses(candidate.status)}`}
                        >
                          {getStatusIcon(candidate.status)}
                          {candidate.status}
                        </span>
                      </td>

                      {/* Waveform Voice Note */}
                      <td className={`px-4 min-w-[200px] ${compactRow ? 'py-2' : 'py-3.5'}`} onClick={(e) => e.stopPropagation()}>
                        <WaveformAudioPlayer
                          url={candidate.vocarooUrl}
                          title="Audio"
                          compact
                        />
                      </td>

                      {/* Schedule / Training */}
                      <td className={`px-4 ${compactRow ? 'py-2' : 'py-3.5'}`}>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                          {candidate.interviewDate || candidate.trainingStartDate || (
                            <span className="text-slate-400 dark:text-slate-500 font-sans">Not Scheduled</span>
                          )}
                        </div>
                      </td>

                      {/* Submitted By */}
                      <td className={`px-4 ${compactRow ? 'py-2' : 'py-3.5'}`}>
                        <div dir="auto" title={candidate.createdByName || 'Recruiter'} className="text-xs text-slate-700 dark:text-slate-200 font-semibold truncate max-w-[140px]">
                          {candidate.createdByName || 'Recruiter'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className={`px-4 text-right ${compactRow ? 'py-2' : 'py-3.5'}`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isWhatsAppEligible && canManageStatus && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveWaCandidate(candidate);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                              title="Send WhatsApp Company Interview Confirmation"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManageStatus && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStatusCandidate(candidate);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800/70 text-[#D93A30] dark:text-rose-300 hover:bg-[#D93A30] hover:text-white transition-all cursor-pointer whitespace-nowrap"
                              title="Change Candidate Status Stage"
                            >
                              Stage
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const summary = `📌 CANDIDATE PROFILE SUMMARY
• Full Name: ${candidate.fullName}
• Mobile: ${candidate.phone} ${candidate.phone2 ? `/ ${candidate.phone2}` : ''}
• National ID: ${candidate.idNumber || 'N/A'}
• Company & Account: ${candidate.company} (${candidate.language || 'English'})
• Education: ${candidate.graduateStatus}
• Location: ${candidate.area}
• Voice Note: ${candidate.vocarooUrl}
${candidate.interviewDate ? `• Scheduled Interview: ${candidate.interviewDate} ${candidate.interviewTime || ''}` : ''}
• Recruiter: ${candidate.createdByName} (Redz Agency)`;
                              navigator.clipboard.writeText(summary).then(
                                () => showToast(`Credentials for ${candidate.fullName} copied to clipboard.`, 'success'),
                                () => showToast('Could not access clipboard. Please copy manually.', 'error')
                              );
                            }}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Copy Candidate Summary for Client"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryCandidate(candidate);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View Traceability Audit Log"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {isCeo && (
                            <button
                              disabled={deletingId === candidate.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirmAction({
                                  title: 'Move Candidate to Trash',
                                  message: `Move candidate "${candidate.fullName}" to the Trash Bin? You can restore them later from All Data.`,
                                  confirmLabel: 'Move to Trash',
                                  dangerous: true
                                });
                                if (!ok) return;
                                setDeletingId(candidate.id);
                                  try {
                                    await deleteCandidate(candidate.id);
                                    showToast(`${candidate.fullName} moved to Trash Bin.`, 'info');
                                  } catch (err: any) {
                                    showToast(getFriendlyErrorMessage(err, 'Failed to delete candidate.'), 'error');
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Move Candidate to Trash (CEO Only)"
                              >
                                {deletingId === candidate.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={Users2}
                        title="No candidates match these filters"
                        description="Try adjusting your search query, status stage, or date filter."
                        action={
                          hasActiveFilters ? (
                            <button
                              onClick={resetFilters}
                              className="px-4 py-2 rounded-xl bg-[#D93A30] hover:bg-[#b82e25] text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              Reset Filters
                            </button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCandidates.map((candidate) => {
              const isWhatsAppEligible = [
                'Accepted Voice Note',
                'Interview Scheduled',
                'Interview Rescheduled',
                'Accepted Interview'
              ].includes(candidate.status);
              const stale = isStale(candidate.updatedAt || candidate.createdAt);

              return (
                <div
                  key={candidate.id}
                  onClick={() => setDrawerCandidate(candidate)}
                  className={`p-4 space-y-3 cursor-pointer transition-colors ${
                    stale
                      ? 'bg-rose-50/40 dark:bg-rose-950/15'
                      : 'hover:bg-slate-50/90 dark:hover:bg-[#1B2234]/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span dir="auto" className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {candidate.fullName}
                        </span>
                        {stale && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-2.5 h-2.5" /> &gt;48h
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                        <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{candidate.phone}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border text-[10px] whitespace-nowrap shrink-0 ${getCandidateStatusBadgeClasses(
                        candidate.status
                      )}`}
                    >
                      {getStatusIcon(candidate.status)}
                      {candidate.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                      <Building className="w-3 h-3 text-[#D93A30]" />
                      {candidate.company} ({candidate.language || 'English'})
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                      By {candidate.createdByName || 'Recruiter'}
                    </span>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <WaveformAudioPlayer url={candidate.vocarooUrl} title="Voice Note" compact />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <NationalIdBadge idNumber={candidate.idNumber} age={candidate.age} />
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {isWhatsAppEligible && canManageStatus && (
                        <button
                          onClick={() => setActiveWaCandidate(candidate)}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 cursor-pointer"
                          title="Send WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canManageStatus && (
                        <button
                          onClick={() => setActiveStatusCandidate(candidate)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800/70 text-[#D93A30] dark:text-rose-300 cursor-pointer"
                        >
                          Stage
                        </button>
                      )}
                      <button
                        onClick={() => setHistoryCandidate(candidate)}
                        className="p-1.5 rounded-lg text-slate-500 bg-slate-100 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 cursor-pointer"
                        title="History"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {isCeo && (
                        <button
                          disabled={deletingId === candidate.id}
                          onClick={async () => {
                            const ok = await confirmAction({
                              title: 'Move Candidate to Trash',
                              message: `Move candidate "${candidate.fullName}" to the Trash Bin?`,
                              confirmLabel: 'Move to Trash',
                              dangerous: true
                            });
                            if (!ok) return;
                            setDeletingId(candidate.id);
                            try {
                              await deleteCandidate(candidate.id);
                              showToast(`${candidate.fullName} moved to Trash Bin.`, 'info');
                            } catch (err: any) {
                              showToast(getFriendlyErrorMessage(err, 'Failed to delete candidate.'), 'error');
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 cursor-pointer disabled:opacity-50"
                          title="Move to Trash"
                        >
                          {deletingId === candidate.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCandidates.length === 0 && (
              <EmptyState
                icon={Users2}
                title="No candidates match these filters"
                description="Try adjusting your search query, status stage, or date filter."
                action={
                  hasActiveFilters ? (
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-xl bg-[#D93A30] hover:bg-[#b82e25] text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  ) : undefined
                }
              />
            )}
          </div>
          </>
        )}
      </div>

      {/* Modals */}
      {activeWaCandidate && (
        <WhatsAppModal candidate={activeWaCandidate} onClose={() => setActiveWaCandidate(null)} />
      )}

      {activeStatusCandidate && (
        <StatusChangeModal candidate={activeStatusCandidate} onClose={() => setActiveStatusCandidate(null)} />
      )}

      {historyCandidate && (
        <AuditLogModal
          isOpen={!!historyCandidate}
          candidate={historyCandidate}
          onClose={() => setHistoryCandidate(null)}
        />
      )}

      {drawerCandidate && (
        <CandidateDrawer
          candidate={drawerCandidate}
          onClose={() => setDrawerCandidate(null)}
          onOpenWhatsApp={(cand) => setActiveWaCandidate(cand)}
        />
      )}
    </div>
  );
};
