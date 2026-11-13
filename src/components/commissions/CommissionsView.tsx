import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Download,
  Building,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  Layers,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CommissionRule } from '../../types';
import { TableSkeleton, EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

export const CommissionsView: React.FC = () => {
  const { commissionRules, saveCommissionRule, deleteCommissionRule, dataLoading } = useData();
  const { activeRole } = useAuth();
  const { showToast, confirmAction } = useToast();

  const isCeo = activeRole === 'ceo';
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [saving, setSaving] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states for adding/editing rule
  const [track, setTrack] = useState<string>('CS English');
  const [companiesStr, setCompaniesStr] = useState<string>('');
  const [termsDays, setTermsDays] = useState<number>(30);
  const [externalAmount, setExternalAmount] = useState<number>(3000);
  const [recruiter, setRecruiter] = useState<number>(1300);
  const [leader, setLeader] = useState<number>(1700);
  const [unit, setUnit] = useState<number>(2000);
  const [note, setNote] = useState<string>('');

  const openEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setTrack(rule.track);
    setCompaniesStr(rule.companiesOrAccounts.join(', '));
    setTermsDays(rule.termsDays);
    setExternalAmount(rule.externalAmount);
    setRecruiter(rule.recruiter);
    setLeader(rule.leader);
    setUnit(rule.unit);
    setNote(rule.note || '');
    setIsCreating(true);
  };

  const openCreate = () => {
    setEditingRule(null);
    setTrack('CS English');
    setCompaniesStr('');
    setTermsDays(30);
    setExternalAmount(3000);
    setRecruiter(1300);
    setLeader(1700);
    setUnit(2000);
    setNote('');
    setIsCreating(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const companies = companiesStr
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (companies.length === 0) {
      showToast('Please enter at least one company or account name.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await saveCommissionRule({
        id: editingRule?.id,
        track,
        companiesOrAccounts: companies,
        termsDays: Number(termsDays),
        externalAmount: Number(externalAmount),
        recruiter: Number(recruiter),
        leader: Number(leader),
        unit: Number(unit),
        ceoShownInSheet: Math.max(0, externalAmount - unit),
        note: note.trim()
      });
      showToast(editingRule ? 'Commission rule updated.' : 'New commission rule saved.', 'success');
      setIsCreating(false);
      setEditingRule(null);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to save commission rule.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (rule: CommissionRule) => {
    const confirmed = await confirmAction({
      title: 'Delete Commission Rule',
      message: `Delete the "${rule.track}" rate card (${rule.companiesOrAccounts.join(', ')})?`,
      confirmLabel: 'Delete Rule',
      dangerous: true
    });
    if (!confirmed) return;

    setDeletingId(rule.id);
    try {
      await deleteCommissionRule(rule.id);
      showToast('Commission rule deleted.', 'info');
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to delete commission rule.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'Track',
      'Companies / Accounts',
      'Terms (Days)',
      'External Billing (EGP)',
      'Recruiter Rate',
      'Leader Rate',
      'Unit Rate',
      'CEO Net',
      'Notes'
    ];
    const rows = commissionRules.map((r) => [
      esc(r.track),
      esc(r.companiesOrAccounts.join('; ')),
      r.termsDays,
      r.externalAmount,
      r.recruiter,
      r.leader,
      r.unit,
      r.externalAmount - r.unit,
      esc(r.note || '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `redz_commissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const groupedRules = useMemo(() => {
    const groups: Record<string, CommissionRule[]> = {};
    commissionRules.forEach(rule => {
      rule.companiesOrAccounts.forEach(company => {
        if (!groups[company]) groups[company] = [];
        groups[company].push(rule);
      });
    });
    return groups;
  }, [commissionRules]);

  const sortedCompanies = useMemo(() => Object.keys(groupedRules).sort(), [groupedRules]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            <span>Commission Cascade &amp; Rate Cards</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official agency payouts, client billing terms, and profit distribution rules per account.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grouped')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grouped'
                  ? 'bg-[#D93A30] text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grouped by Company"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-[#D93A30] text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-emerald-500" /> Export CSV
          </button>

          {isCeo && (
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-red-600/20"
            >
              <Plus className="w-4 h-4" /> Add Rate Rule
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {dataLoading && commissionRules.length === 0 ? (
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody>
                <TableSkeleton rows={5} cols={5} />
              </tbody>
            </table>
          </div>
        </div>
      ) : commissionRules.length === 0 ? (
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <EmptyState
            icon={DollarSign}
            title="No Commission Rate Cards Configured"
            description="Define your client commission rules and payout cascades to automate recruiter earnings."
            actionLabel={isCeo ? 'Define Rate Rule' : undefined}
            onAction={isCeo ? openCreate : undefined}
          />
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="grid grid-cols-1 gap-6">
          {sortedCompanies.map(company => (
            <div
              key={company}
              className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
            >
              <div className="px-6 py-4 bg-slate-50/70 dark:bg-[#0F1420] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {company}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">
                        Commission Matrix
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="text-[11px] text-[#D93A30] font-bold tabular-nums">
                        {groupedRules[company].length} Active Tracks
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
                    <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-6">Hiring Track</th>
                      <th className="py-3 px-6 text-center">Terms</th>
                      <th className="py-3 px-6">Cascade Breakdown (EGP)</th>
                      {isCeo && <th className="py-3 px-6 text-right">CEO Net Profit</th>}
                      {isCeo && <th className="py-3 px-6 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {groupedRules[company].map((rule) => {
                      const ceoProfit = Math.max(0, rule.externalAmount - rule.unit);
                      const leaderMargin = Math.max(0, rule.leader - rule.recruiter);
                      const unitMargin = Math.max(0, rule.unit - rule.leader);

                      return (
                        <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{rule.track}</div>
                            {isCeo && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                                Client: {rule.externalAmount.toLocaleString()} EGP
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30 text-[10px] tabular-nums whitespace-nowrap">
                              {rule.termsDays} DAYS
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2.5">
                              {/* Recruiter */}
                              <div className="flex flex-col items-center">
                                <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 mb-1">REC</div>
                                <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs tabular-nums">
                                  {rule.recruiter.toLocaleString()}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mt-4 shrink-0" />
                              {/* Leader */}
                              <div className="flex flex-col items-center">
                                <div className="text-[9px] font-black text-blue-600 dark:text-blue-400 mb-1 tabular-nums">
                                  LD (+{leaderMargin})
                                </div>
                                <div className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs tabular-nums">
                                  {rule.leader.toLocaleString()}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mt-4 shrink-0" />
                              {/* Unit */}
                              <div className="flex flex-col items-center">
                                <div className="text-[9px] font-black text-purple-600 dark:text-purple-400 mb-1 tabular-nums">
                                  UM (+{unitMargin})
                                </div>
                                <div className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs tabular-nums">
                                  {rule.unit.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          {isCeo && (
                            <td className="py-4 px-6 text-right">
                              <div className="text-sm font-black text-[#D93A30] font-mono tabular-nums">
                                {ceoProfit.toLocaleString()} <span className="text-[10px] font-sans ml-0.5">EGP</span>
                              </div>
                            </td>
                          )}
                          {isCeo && (
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEdit(rule)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  title="Edit Rule"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  disabled={deletingId === rule.id}
                                  onClick={() => handleDeleteRule(rule)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                                  title="Delete Rule"
                                >
                                  {deletingId === rule.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
                <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Track &amp; Accounts</th>
                  <th className="py-3.5 px-6 text-center">Terms</th>
                  {isCeo && <th className="py-3.5 px-6">External (Client)</th>}
                  <th className="py-3.5 px-6">Cascade (R-L-U)</th>
                  {isCeo && <th className="py-3.5 px-6 text-right">CEO Profit</th>}
                  {isCeo && <th className="py-3.5 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {commissionRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{rule.track}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {rule.companiesOrAccounts.map((acc, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] border border-slate-200 dark:border-slate-700 uppercase font-bold"
                          >
                            {acc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30 tabular-nums">
                        {rule.termsDays}d
                      </span>
                    </td>
                    {isCeo && (
                      <td className="py-4 px-6 font-black text-slate-900 dark:text-white font-mono tabular-nums">
                        {rule.externalAmount.toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-400 font-sans ml-0.5">EGP</span>
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold tabular-nums">
                        <span className="text-emerald-600 dark:text-emerald-400">{rule.recruiter}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        <span className="text-blue-600 dark:text-blue-400">{rule.leader}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                        <span className="text-purple-600 dark:text-purple-400">{rule.unit}</span>
                      </div>
                    </td>
                    {isCeo && (
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-black text-[#D93A30] font-mono tabular-nums">
                          {(rule.externalAmount - rule.unit).toLocaleString()}{' '}
                          <span className="text-[10px] font-sans ml-0.5">EGP</span>
                        </span>
                      </td>
                    )}
                    {isCeo && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(rule)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={deletingId === rule.id}
                            onClick={() => handleDeleteRule(rule)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                            title="Delete Rule"
                          >
                            {deletingId === rule.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl animate-modal-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-[#D93A30]/15 border border-rose-200 dark:border-[#D93A30]/30 flex items-center justify-center text-[#D93A30]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {editingRule ? 'Edit Cascade Logic' : 'Define New Rate Card'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure financial distribution for client accounts.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    Hiring Track
                  </label>
                  <select
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 outline-none transition-all"
                  >
                    <option value="CS English">CS English</option>
                    <option value="CS Languages">CS Languages</option>
                    <option value="Sales/Telemarketing">Sales/Telemarketing</option>
                    <option value="Back Office">Back Office</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    Client Term (Days)
                  </label>
                  <input
                    type="number"
                    required
                    value={termsDays}
                    onChange={(e) => setTermsDays(Number(e.target.value))}
                    className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono tabular-nums focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Applicable Accounts (Comma Separated)
                </label>
                <input
                  type="text"
                  required
                  value={companiesStr}
                  onChange={(e) => setCompaniesStr(e.target.value)}
                  placeholder="e.g. Teleperformance, TTEC, Concentrix"
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 outline-none transition-all"
                />
              </div>

              <div className="p-5 bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/70 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-slate-900 dark:text-white">Financial Matrix (EGP)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                      Client Billing (Total)
                    </label>
                    <input
                      type="number"
                      required
                      value={externalAmount}
                      onChange={(e) => setExternalAmount(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm font-mono tabular-nums focus:border-[#D93A30] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                      Recruiter Rate
                    </label>
                    <input
                      type="number"
                      required
                      value={recruiter}
                      onChange={(e) => setRecruiter(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm font-mono tabular-nums focus:border-[#D93A30] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                      Leader Cumulative
                    </label>
                    <input
                      type="number"
                      required
                      value={leader}
                      onChange={(e) => setLeader(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm font-mono tabular-nums focus:border-[#D93A30] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                      Unit Cumulative
                    </label>
                    <input
                      type="number"
                      required
                      value={unit}
                      onChange={(e) => setUnit(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-black text-sm font-mono tabular-nums focus:border-[#D93A30] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  Internal Notes
                </label>
                <input
                  type="text"
                  dir="auto"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional conditions or CEO approvals..."
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] shadow-sm shadow-red-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Confirm & Save Logic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
