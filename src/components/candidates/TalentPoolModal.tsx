import React, { useState } from 'react';
import {
  RefreshCw,
  Search,
  MessageSquare,
  ArrowRight,
  Sparkles,
  X,
  Archive,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Candidate } from '../../types';
import { NationalIdBadge } from '../common/NationalIdBadge';
import { EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface TalentPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReEngageCandidate?: (candidate: Candidate) => void;
}

export const TalentPoolModal: React.FC<TalentPoolModalProps> = ({
  isOpen,
  onClose,
  onReEngageCandidate
}) => {
  const { candidates, settings, updateCandidateStatus } = useData();
  const { activeRole } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [targetCompany, setTargetCompany] = useState<string>('All');
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  const canManageStatus = activeRole === 'ceo' || activeRole === 'account_manager';

  if (!isOpen) return null;

  const rejectedCandidates = candidates.filter((c) =>
    ['Rejected Voice Note', 'Rejected Interview'].includes(c.status)
  );

  const filtered = rejectedCandidates.filter((c) => {
    if (targetCompany !== 'All' && c.company !== targetCompany) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (c.fullName || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      const matchLang = (c.language || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchLang) return false;
    }
    return true;
  });

  const alternativeRecommendations: Record<string, string[]> = {
    'ttec': ['Teleperformance', 'Alorica', 'eClerx', 'Creative Basket'],
    'teleperformance': ['Alorica', 'LTS', 'Total Trip', 'Dial Expert'],
    'eclerx': ['TTEC', 'Teleperformance', 'Creative Basket'],
    'alorica': ['LTS', 'Total Trip', 'Dial Expert'],
    'total trip': ['LTS', 'Creative Basket', 'Dial Expert']
  };

  const getAlternativeAccounts = (currentCompany: string) => {
    const key = Object.keys(alternativeRecommendations).find((k) =>
      currentCompany.toLowerCase().includes(k)
    );
    return key ? alternativeRecommendations[key] : ['Teleperformance', 'Alorica', 'LTS'];
  };

  const handleRecycle = async (cand: Candidate, newCompany: string) => {
    if (!canManageStatus) return;
    setReassigningId(cand.id);
    try {
      await updateCandidateStatus(cand.id, 'New', {
        note: `Talent Pool Re-engagement: Re-assigned from ${cand.company} to ${newCompany}`
      });
      showToast(`${cand.fullName} re-assigned to ${newCompany}.`, 'success');
      if (onReEngageCandidate) {
        onReEngageCandidate(cand);
      }
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to re-assign candidate.'), 'error');
    } finally {
      setReassigningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-modal-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0F1420]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/20 border border-violet-200 dark:border-violet-500/40 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Smart Candidate Talent Pool</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-bold tabular-nums">
                  {rejectedCandidates.length} Available
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recycle candidates rejected by one client into compatible sister accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131826] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search talent by name, phone, language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">Original Account:</span>
            <select
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white font-medium focus:outline-none"
            >
              <option value="All">All Companies</option>
              {settings?.companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Candidate List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {filtered.map((cand) => {
            const suggested = getAlternativeAccounts(cand.company);
            const isReassigning = reassigningId === cand.id;

            return (
              <div
                key={cand.id}
                className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span dir="auto" title={cand.fullName} className="font-extrabold text-slate-900 dark:text-white text-sm truncate max-w-[240px]">{cand.fullName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold">
                      Rejected ({cand.company})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
                      {cand.language || 'English'}
                    </span>
                    <NationalIdBadge idNumber={cand.idNumber} age={cand.age} />
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2.5 tabular-nums">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{cand.phone}</span>
                    <span>•</span>
                    <span dir="auto">Area: {cand.area || 'Cairo'}</span>
                    <span>•</span>
                    <span>Status: {cand.graduateStatus}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] pt-0.5 flex-wrap">
                    <span className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Recommended Re-assignments:
                    </span>
                    {canManageStatus && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {suggested.map((comp) => (
                          <button
                            key={comp}
                            disabled={isReassigning}
                            onClick={() => handleRecycle(cand, comp)}
                            className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-600 hover:text-white border border-violet-200 dark:border-violet-700/60 text-violet-700 dark:text-violet-200 text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <span>Re-assign to {comp}</span>
                            {isReassigning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ArrowRight className="w-2.5 h-2.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${cand.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${cand.fullName}, this is Redz Recruitment Agency regarding exciting new openings that match your profile!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white transition-colors"
                    title="Send WhatsApp Re-engagement"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <EmptyState
              icon={Archive}
              title="No rejected talent matching filter"
              description="No rejected candidates match this search query or company filter."
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Re-assigning moves candidate status back to &ldquo;New&rdquo; for the selected partner company.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
