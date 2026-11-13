import React, { useState, useEffect } from 'react';
import { Building, Plus, Edit2, Trash2, CheckCircle, AlertCircle, MapPin, Calendar, FileCheck, Search, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CompanyProcess } from '../../types';
import { ProcessEditorModal } from './ProcessEditorModal';
import { EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface ProcessesViewProps {
  initialCompanyFilter?: string;
}

export const ProcessesView: React.FC<ProcessesViewProps> = ({ initialCompanyFilter }) => {
  const { processes, deleteProcess, settings, dataLoading } = useData();
  const { activeRole } = useAuth();
  const { showToast, confirmAction } = useToast();
  const [selectedProcess, setSelectedProcess] = useState<CompanyProcess | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [editingProcess, setEditingProcess] = useState<CompanyProcess | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProcess(null);
  }, [initialCompanyFilter]);

  const canManageProcesses = activeRole === 'ceo';

  const filteredProcesses = processes.filter((p) =>
    (p.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSelected =
    selectedProcess ||
    (initialCompanyFilter ? processes.find((p) => p.company.toLowerCase().includes(initialCompanyFilter.toLowerCase())) : null) ||
    filteredProcesses[0] ||
    processes[0] ||
    null;

  const allCompanies = settings?.companies || [
    'TTEC',
    'Teleperformance',
    'eClerx',
    'Alorica',
    'Dial Expert',
    'Global Results',
    'LPM',
    'LTS',
    'Creative Basket',
    'Total Trip',
    'CNX',
    'Sutherland',
    'VXI',
    'INtouchCX',
    'ABS'
  ];

  const companiesWithProcesses = new Set(
    processes.map((p) => p.company.toLowerCase().trim())
  );

  const missingCompanies = allCompanies.filter(
    (c) =>
      !Array.from(companiesWithProcesses).some(
        (existing) => existing.includes(c.toLowerCase()) || c.toLowerCase().includes(existing)
      )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5 tracking-tight">
            <Building className="w-5 h-5 text-[#D93A30]" />
            <span>Company Recruitment Processes</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 text-[#D93A30] dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-bold">
              Recruitment &amp; Screening Guide
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Rules of engagement, daily quotas, interview sites, and detailed recruiter procedures per client company.
          </p>
        </div>

        {canManageProcesses && (
          <button
            onClick={() => {
              setEditingProcess(null);
              setIsCreating(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-red-600/20 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Company Process
          </button>
        )}
      </div>

      {/* Missing Companies Notification Bar (CEO Only) */}
      {canManageProcesses && missingCompanies.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Registered companies without detailed recruitment process steps ({missingCompanies.length}):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {missingCompanies.map((comp) => (
              <button
                key={comp}
                onClick={() => {
                  setEditingProcess({
                    id: '',
                    company: comp,
                    location: '',
                    interviewDays: '',
                    requirements: '',
                    processSteps: [''],
                    extraNotes: ['']
                  });
                  setIsCreating(true);
                }}
                className="text-[11px] font-semibold bg-white dark:bg-[#1B2234] text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                title={`Click to add process for ${comp}`}
              >
                <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                {comp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout: List of companies on left, details on right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Company Process Selector */}
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 h-fit shadow-xs">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Clients &amp; Companies (<span className="tabular-nums">{filteredProcesses.length}</span>)
            </h3>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company..."
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-8.5 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredProcesses.map((proc) => {
              const isSelected = activeSelected?.id === proc.id;
              return (
                <button
                  key={proc.id}
                  onClick={() => setSelectedProcess(proc)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'bg-[#D93A30] text-white shadow-sm shadow-red-600/20'
                      : 'bg-slate-50 dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#D93A30]'}`} />
                    <span className="truncate">{proc.company}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                      isSelected
                        ? 'bg-black/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {proc.processSteps?.length || 0} Steps
                  </span>
                </button>
              );
            })}

            {!dataLoading && filteredProcesses.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                No companies match "{searchQuery}".
              </p>
            )}
          </div>
        </div>

        {/* Process Detail View */}
        <div className="md:col-span-2 space-y-5">
          {dataLoading && processes.length === 0 ? (
            <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 animate-pulse shadow-xs">
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-4 w-72 bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
                ))}
              </div>
            </div>
          ) : activeSelected ? (
            <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {activeSelected.company}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mt-2">
                    {activeSelected.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D93A30]" />
                        <span>{activeSelected.location}</span>
                      </span>
                    )}
                    {activeSelected.interviewDays && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-500" />
                        <span>{activeSelected.interviewDays}</span>
                      </span>
                    )}
                  </div>
                </div>

                {canManageProcesses && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProcess(activeSelected)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-[0.98]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                      Edit Process
                    </button>
                    {activeRole === 'ceo' && (
                      <button
                        disabled={deletingId === activeSelected.id}
                        onClick={async () => {
                          const confirmed = await confirmAction({
                            title: 'Delete Recruitment Process',
                            message: `Delete the recruitment process guide for ${activeSelected.company}?`,
                            confirmLabel: 'Delete Process',
                            dangerous: true
                          });
                          if (!confirmed) return;
                          setDeletingId(activeSelected.id);
                          try {
                            await deleteProcess(activeSelected.id);
                            setSelectedProcess(null);
                            showToast(`Process for ${activeSelected.company} deleted.`, 'info');
                          } catch (err: any) {
                            showToast(getFriendlyErrorMessage(err, 'Failed to delete process.'), 'error');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        className="p-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Delete Process"
                      >
                        {deletingId === activeSelected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step-by-Step Flow */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Step-by-Step Interview &amp; Application Flow
                </h4>
                <div className="space-y-2.5">
                  {activeSelected.processSteps && activeSelected.processSteps.length > 0 ? (
                    activeSelected.processSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3.5 bg-slate-50 dark:bg-[#1B2234] border border-slate-200/80 dark:border-slate-700/70 p-4 rounded-xl"
                      >
                        <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-[#D93A30]/15 border border-rose-200 dark:border-[#D93A30]/30 flex items-center justify-center text-xs font-black text-[#D93A30] dark:text-rose-400 shrink-0 tabular-nums">
                          {idx + 1}
                        </span>
                        <p dir="auto" className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium pt-1">
                          {step}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No steps recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Quotas & Requirements Notes */}
              {activeSelected.extraNotes && activeSelected.extraNotes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-amber-500" />
                    Crucial Rules, Quotas &amp; Account Requirements
                  </h4>
                  <div className="space-y-3">
                    {activeSelected.extraNotes.map((note, idx) => (
                      <div
                        key={idx}
                        dir="auto"
                        className="bg-amber-50/50 dark:bg-[#0F1420] border border-amber-200/70 dark:border-slate-700/80 p-4 rounded-xl text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <EmptyState
                icon={Building}
                title="No Company Selected"
                description="Select a client company from the directory on the left to inspect its screening criteria and interview process."
              />
            </div>
          )}
        </div>
      </div>

      {(editingProcess || isCreating) && (
        <ProcessEditorModal
          process={editingProcess}
          onClose={() => {
            setEditingProcess(null);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
};
