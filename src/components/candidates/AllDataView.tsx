import React, { useState, useMemo } from 'react';
import {
  Database,
  Trash2,
  Archive,
  Search,
  Trash,
  RotateCcw,
  FileSpreadsheet,
  History,
  Building,
  Calendar,
  GraduationCap,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { formatSafeDate, formatSafeDateTime } from '../../lib/dateUtils';

export const AllDataView: React.FC = () => {
  const { allCandidates, auditLogs, restoreCandidate, deleteCandidate } = useData();
  const { activeRole } = useAuth();
  const { isCompactMode } = useTheme();
  const { showToast, confirmAction } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'archive' | 'trash' | 'logs'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [gradFilter, setGradFilter] = useState('All');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const companies = ['All', ...Array.from(new Set(allCandidates.map(c => c.company).filter(Boolean)))];
  const areas = ['All', ...Array.from(new Set(allCandidates.map(c => c.area).filter(Boolean)))];

  const filteredCandidates = useMemo(() => {
    return allCandidates.filter(c => {
      if (activeTab === 'archive' && !c.archived) return false;
      if (activeTab === 'trash' && !c.deleted) return false;
      if (activeTab === 'all' && (c.deleted || c.archived)) return false;

      if (companyFilter !== 'All' && c.company !== companyFilter) return false;
      if (areaFilter !== 'All' && c.area !== areaFilter) return false;
      if (gradFilter !== 'All' && c.graduateStatus !== gradFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (c.fullName || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.idNumber || '').includes(q) ||
          (c.area || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCandidates, activeTab, companyFilter, areaFilter, gradFilter, searchQuery]);

  if (activeRole !== 'ceo' && activeRole !== 'account_manager') {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 max-w-md mx-auto my-8 space-y-2 shadow-xs">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm font-bold text-slate-900 dark:text-white">Access Denied</p>
        <p className="text-xs">Executive permission required to view master repository.</p>
      </div>
    );
  }

  const handleExportCSV = () => {
    const esc = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['Full Name', 'Phone', 'Company', 'Area', 'Education', 'Status', 'Submitted By', 'Created At'];
    const rows = filteredCandidates.map(c => [
      esc(c.fullName),
      esc(c.phone),
      esc(c.company),
      esc(c.area),
      esc(c.graduateStatus),
      esc(c.status),
      esc(c.createdByName),
      esc(c.createdAt)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `redz_data_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-[#D93A30]" />
            <span>Agency Data Master Repository</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive oversight of all candidates, historical archives, and the system audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab !== 'logs' && (
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Export Data
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-full w-fit overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'all' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-[#D93A30]" /> All Active
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'archive' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4 text-amber-500" /> Archive
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'trash' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-500" /> Trash Bin
        </button>
        {activeRole === 'ceo' && (
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'logs' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4 text-sky-500" /> Audit Logs
          </button>
        )}
      </div>

      {activeTab === 'logs' ? (
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="hidden md:block overflow-x-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className={`sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800 ${isCompactMode ? 'text-[9px]' : 'text-[11px]'}`}>
                <tr>
                  <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Timestamp</th>
                  <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>User</th>
                  <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Action</th>
                  <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Target Entity</th>
                  <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/60 transition-colors">
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'} font-mono text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap`}>
                      {formatSafeDateTime(log.timestamp)}
                    </td>
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                      <div className="font-bold text-slate-900 dark:text-white">{log.userName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{log.userRole.replace('_', ' ')}</div>
                    </td>
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                        log.action === 'delete'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                          : log.action === 'create'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'} text-slate-700 dark:text-slate-200 font-semibold capitalize`}>{log.entityType}</td>
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'} text-slate-500 dark:text-slate-400`}>{log.details}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState icon={History} title="No audit logs yet" description="System action history will appear here automatically." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{log.userName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border shrink-0 ${
                      log.action === 'delete'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                        : log.action === 'create'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                    }`}
                  >
                    {log.action}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">{log.details}</div>
                <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {formatSafeDateTime(log.timestamp)} • {log.entityType}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <EmptyState icon={History} title="No audit logs yet" description="System action history will appear here automatically." />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-[#131826] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, ID, area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30]"
              />
            </div>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
            >
              {companies.map(c => <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>)}
            </select>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
            >
              {areas.map(a => <option key={a} value={a}>{a === 'All' ? 'All Areas' : a}</option>)}
            </select>
            <select
              value={gradFilter}
              onChange={e => setGradFilter(e.target.value)}
              className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-[#D93A30]"
            >
              <option value="All">All Education</option>
              <option value="Graduate">Graduate</option>
              <option value="Not graduate">Not graduate</option>
              <option value="Student">Student</option>
            </select>
          </div>

          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="hidden md:block overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className={`sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 uppercase font-bold border-b border-slate-200 dark:border-slate-800 ${isCompactMode ? 'text-[9px]' : 'text-[11px]'}`}>
                  <tr>
                    <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Candidate</th>
                    <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Company &amp; Language</th>
                    <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Location &amp; Education</th>
                    <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Status</th>
                    <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>Submitted By</th>
                    <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCandidates.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/60 transition-colors">
                      <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                        <div dir="auto" title={c.fullName} className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{c.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{c.phone}</div>
                      </td>
                      <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold">
                          <Building className="w-3.5 h-3.5 text-[#D93A30] shrink-0" />
                          <span className="truncate max-w-[140px]">{c.company}</span>
                        </div>
                        <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">{c.language || 'English'}</div>
                      </td>
                      <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                          <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span dir="auto" title={c.area} className="truncate max-w-[140px]">{c.area || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <GraduationCap className="w-3 h-3 shrink-0" />
                          {c.graduateStatus}
                        </div>
                      </td>
                      <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getCandidateStatusBadgeClasses(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>
                        <div dir="auto" className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[140px]">{c.createdByName || 'Recruiter'}</div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">{formatSafeDate(c.createdAt)}</div>
                      </td>
                      <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {(c.deleted || c.archived) ? (
                            <button
                              disabled={processingId === c.id}
                              onClick={async () => {
                                setProcessingId(c.id);
                                  try {
                                    await restoreCandidate(c.id);
                                    showToast(`${c.fullName} restored to active pipeline.`, 'success');
                                  } catch (err: any) {
                                    showToast(getFriendlyErrorMessage(err, 'Failed to restore candidate.'), 'error');
                                  } finally {
                                    setProcessingId(null);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                                title="Restore Candidate"
                              >
                                {processingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <button
                                disabled={processingId === c.id}
                                onClick={async () => {
                                  setProcessingId(c.id);
                                  try {
                                    await deleteCandidate(c.id, true);
                                    showToast(`${c.fullName} moved to Trash Bin.`, 'info');
                                  } catch (err: any) {
                                    showToast(getFriendlyErrorMessage(err, 'Failed to move candidate to Trash.'), 'error');
                                  } finally {
                                    setProcessingId(null);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                                title="Move to Trash"
                              >
                                {processingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {activeRole === 'ceo' && c.deleted && (
                              <button
                                disabled={processingId === c.id}
                                onClick={async () => {
                                  const ok = await confirmAction({
                                    title: 'Permanently Delete Candidate',
                                    message: `Permanently delete "${c.fullName}" from Firestore? This cannot be undone.`,
                                    confirmLabel: 'Delete Permanently',
                                    dangerous: true
                                  });
                                  if (!ok) return;
                                  setProcessingId(c.id);
                                  try {
                                    await deleteCandidate(c.id, false);
                                    showToast(`${c.fullName} permanently deleted.`, 'success');
                                  } catch (err: any) {
                                    showToast(getFriendlyErrorMessage(err, 'Permanent deletion failed.'), 'error');
                                  } finally {
                                    setProcessingId(null);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-600/20 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                                title="Delete Permanently"
                              >
                                {processingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              </table>
            </div>

            {/* Mobile Card List (<768px) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCandidates.map((c) => (
                <div key={c.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div dir="auto" className="font-bold text-slate-900 dark:text-white truncate">{c.fullName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">{c.phone}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${getCandidateStatusBadgeClasses(c.status)}`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span>{c.company} ({c.language || 'English'})</span>
                    <span className="text-slate-400">{c.area || '—'} • {c.graduateStatus}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                      {c.createdByName || 'Recruiter'} • {formatSafeDate(c.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(c.deleted || c.archived) ? (
                        <button
                          disabled={processingId === c.id}
                          onClick={async () => {
                            setProcessingId(c.id);
                            try {
                              await restoreCandidate(c.id);
                              showToast(`${c.fullName} restored to active pipeline.`, 'success');
                            } catch (err: any) {
                              showToast(getFriendlyErrorMessage(err, 'Failed to restore candidate.'), 'error');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 cursor-pointer disabled:opacity-50"
                          title="Restore Candidate"
                        >
                          {processingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <button
                          disabled={processingId === c.id}
                          onClick={async () => {
                            setProcessingId(c.id);
                            try {
                              await deleteCandidate(c.id, true);
                              showToast(`${c.fullName} moved to Trash Bin.`, 'info');
                            } catch (err: any) {
                              showToast(getFriendlyErrorMessage(err, 'Failed to move candidate to Trash.'), 'error');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 cursor-pointer disabled:opacity-50"
                          title="Move to Trash"
                        >
                          {processingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {activeRole === 'ceo' && c.deleted && (
                        <button
                          disabled={processingId === c.id}
                          onClick={async () => {
                            const ok = await confirmAction({
                              title: 'Permanently Delete Candidate',
                              message: `Permanently delete "${c.fullName}" from Firestore? This cannot be undone.`,
                              confirmLabel: 'Delete Permanently',
                              dangerous: true
                            });
                            if (!ok) return;
                            setProcessingId(c.id);
                            try {
                              await deleteCandidate(c.id, false);
                              showToast(`${c.fullName} permanently deleted.`, 'success');
                            } catch (err: any) {
                              showToast(getFriendlyErrorMessage(err, 'Permanent deletion failed.'), 'error');
                            } finally {
                              setProcessingId(null);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-600/20 text-rose-700 dark:text-rose-400 cursor-pointer disabled:opacity-50"
                          title="Delete Permanently"
                        >
                          {processingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCandidates.length === 0 && (
              <EmptyState
                icon={Database}
                title="No records found"
                description="No candidates match the active tab or filter criteria."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
