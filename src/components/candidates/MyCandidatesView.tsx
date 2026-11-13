import React, { useState } from 'react';
import {
  Search,
  Phone,
  Building,
  MessageSquare,
  UserCheck,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Candidate } from '../../types';
import { WaveformAudioPlayer } from '../common/WaveformAudioPlayer';
import { NationalIdBadge } from '../common/NationalIdBadge';
import { WhatsAppModal } from './WhatsAppModal';
import { StatusChangeModal } from './StatusChangeModal';
import { AuditLogModal } from './AuditLogModal';
import { CandidateDrawer } from './CandidateDrawer';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { CardGridSkeleton, EmptyState } from '../common/UIStates';

const STATUS_GROUPS: { id: string; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'New', label: 'New' },
  { id: 'Accepted Voice Note', label: 'Voice Accepted' },
  { id: 'Interview Scheduled', label: 'Scheduled' },
  { id: 'Accepted Interview', label: 'Passed' },
  { id: 'Start Training', label: 'Training' },
  { id: 'Commission Done', label: 'Commission' },
  { id: 'Rejected Voice Note', label: 'Voice Rejected' },
  { id: 'Rejected Interview', label: 'Interview Rejected' }
];

export const MyCandidatesView: React.FC = () => {
  const { candidates, dataLoading } = useData();
  const { effectiveUser, activeRole } = useAuth();
  const { isCompactMode } = useTheme();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('All');

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
    if (activeTab !== 'All' && c.status !== activeTab) return false;
    if (companyFilter !== 'All' && c.company !== companyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.fullName || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      const matchComp = (c.company || '').toLowerCase().includes(q);
      const matchRecruiter = (c.createdByName || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchComp && !matchRecruiter) return false;
    }
    return true;
  });

  const companies = ['All', ...Array.from(new Set(scopedCandidates.map((c) => c.company).filter(Boolean)))];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
            <UserCheck className="w-6 h-6 text-[#D93A30]" />
            <span>My Candidates Board</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-[#D93A30] dark:text-red-400 font-bold tabular-nums">
              {filteredCandidates.length} Candidates
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organized pipeline view filtered by status, audio notes, and one-click WhatsApp dispatch
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15"
            />
          </div>

          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
          >
            {companies.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Filter Counters Ribbon */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 overflow-x-auto scrollbar-none shadow-xs">
        <div className="flex items-center gap-1.5 min-w-max">
          {STATUS_GROUPS.map((sg) => {
            const count = sg.id === 'All'
              ? scopedCandidates.length
              : scopedCandidates.filter((c) => c.status === sg.id).length;
            const isActive = activeTab === sg.id;

            return (
              <button
                key={sg.id}
                onClick={() => setActiveTab(sg.id)}
                className={`group relative flex flex-col items-center justify-center min-w-[96px] ${isCompactMode ? 'px-3 py-2' : 'px-4 py-2.5'} rounded-xl transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-red-50/80 dark:bg-[#1B2234] border-[#D93A30] shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-[#1B2234]/60'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 transition-colors whitespace-nowrap ${
                  isActive ? 'text-[#D93A30] dark:text-red-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                }`}>
                  {sg.label}
                </span>
                <span className={`font-extrabold font-mono tabular-nums transition-colors ${isCompactMode ? 'text-base' : 'text-lg'} ${
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-1 w-6 h-0.5 bg-[#D93A30] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Candidates Grid */}
      {dataLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => {
            const isWhatsAppEligible = [
              'Accepted Voice Note',
              'Interview Scheduled',
              'Interview Rescheduled',
              'Accepted Interview'
            ].includes(candidate.status);

            return (
              <div
                key={candidate.id}
                onClick={() => setDrawerCandidate(candidate)}
                className={`bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md ${isCompactMode ? 'p-4 space-y-2.5' : 'p-5 space-y-3.5'} rounded-2xl shadow-xs flex flex-col justify-between cursor-pointer transition-all group`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 dir="auto" title={candidate.fullName} className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-[#D93A30] transition-colors truncate">
                        {candidate.fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-mono tabular-nums">{candidate.phone}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getCandidateStatusBadgeClasses(candidate.status)}`}>
                      {candidate.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold min-w-0">
                      <Building className="w-3.5 h-3.5 text-[#D93A30] shrink-0" />
                      <span className="truncate">{candidate.company}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold shrink-0">
                        {candidate.language || 'English'}
                      </span>
                    </div>
                    <NationalIdBadge idNumber={candidate.idNumber} age={candidate.age} />
                  </div>
                </div>

                {candidate.vocarooUrl && (
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <WaveformAudioPlayer
                      url={candidate.vocarooUrl}
                      title={`${(candidate.fullName || 'Candidate').split(' ')[0]}'s Voice`}
                      compact
                    />
                    {candidate.vocarooUrl2 && (
                      <WaveformAudioPlayer
                        url={candidate.vocarooUrl2}
                        title="2nd Audio"
                        compact
                      />
                    )}
                  </div>
                )}

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <div dir="auto" className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    By: <strong className="text-slate-700 dark:text-slate-200">{candidate.createdByName || 'Recruiter'}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isWhatsAppEligible && canManageStatus && (
                      <button
                        onClick={() => setActiveWaCandidate(candidate)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                        title="Send WhatsApp Confirmation Message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    )}

                    {canManageStatus && (
                      <button
                        onClick={() => setActiveStatusCandidate(candidate)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800 text-[#D93A30] dark:text-rose-300 hover:bg-[#D93A30] hover:text-white transition-all cursor-pointer"
                        title="Change Candidate Status Stage"
                      >
                        Stage
                      </button>
                    )}

                    <button
                      onClick={() => setHistoryCandidate(candidate)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Audit Log"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!dataLoading && filteredCandidates.length === 0 && (
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <EmptyState
            icon={UserCheck}
            title={`No candidates in "${activeTab}"`}
            description="Adjust your search term, company filter, or switch status tabs."
            action={
              (activeTab !== 'All' || companyFilter !== 'All' || searchQuery) ? (
                <button
                  onClick={() => { setActiveTab('All'); setCompanyFilter('All'); setSearchQuery(''); }}
                  className="px-4 py-2 rounded-xl bg-[#D93A30] hover:bg-[#b82e25] text-white text-xs font-bold cursor-pointer"
                >
                  Show All Candidates
                </button>
              ) : undefined
            }
          />
        </div>
      )}

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
