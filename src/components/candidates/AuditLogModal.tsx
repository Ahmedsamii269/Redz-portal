import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Search,
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Candidate } from '../../types';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { EmptyState } from '../common/UIStates';
import { formatSafeDateTime, getSafeTimestamp } from '../../lib/dateUtils';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  candidate
}) => {
  const { candidates } = useData();
  const [searchTerm, setSearchTerm] = useState<string>('');

  const allEvents = React.useMemo(() => {
    const list: Array<{
      id: string;
      candidateId: string;
      candidateName: string;
      company: string;
      phone: string;
      status: string;
      changedBy: string;
      changedByName: string;
      timestamp: string;
      note?: string;
    }> = [];

    const targetList = candidate ? [candidate] : candidates;

    targetList.forEach((c) => {
      if (c.statusHistory && c.statusHistory.length > 0) {
        c.statusHistory.forEach((h, idx) => {
          list.push({
            id: `${c.id}-${idx}`,
            candidateId: c.id,
            candidateName: c.fullName,
            company: c.company,
            phone: c.phone,
            status: h.status,
            changedBy: h.changedBy,
            changedByName: h.changedByName || 'System / Team',
            timestamp: h.timestamp,
            note: h.note
          });
        });
      } else {
        list.push({
          id: `${c.id}-created`,
          candidateId: c.id,
          candidateName: c.fullName,
          company: c.company,
          phone: c.phone,
          status: c.status,
          changedBy: c.createdBy,
          changedByName: c.createdByName || 'Recruiter',
          timestamp: c.createdAt,
          note: 'Initial Registration'
        });
      }
    });

    return list.sort((a, b) => getSafeTimestamp(b.timestamp) - getSafeTimestamp(a.timestamp));
  }, [candidate, candidates]);

  if (!isOpen) return null;

  const filtered = allEvents.filter((e) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.candidateName.toLowerCase().includes(q) ||
      e.changedByName.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      e.phone.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-modal-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0F1420]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>{candidate ? `Audit Trail: ${candidate.fullName}` : 'Agency System Audit Log'}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold tabular-nums">
                  {filtered.length} Actions
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete traceability of status modifications, notes, and user timestamps
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

        {/* Search Bar if multi-candidate view */}
        {!candidate && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131826]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by user, candidate, status change or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}

        {/* Timeline Log List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-slate-900 dark:text-white text-xs truncate max-w-[180px]" dir="auto" title={item.candidateName}>
                      {item.candidateName}
                    </strong>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                      {item.company}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCandidateStatusBadgeClasses(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.note && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300" dir="auto">
                      &ldquo;{item.note}&rdquo;
                    </p>
                  )}
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap tabular-nums">
                    <span>Modified by: <span className="text-slate-800 dark:text-slate-200 font-semibold">{item.changedByName}</span></span>
                    <span>•</span>
                    <span className="font-mono">{formatSafeDateTime(item.timestamp, 'Unknown')}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  ID: {item.candidateId.slice(0, 10)}...
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No audit records found"
              description="No timeline entries match this search filter."
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
