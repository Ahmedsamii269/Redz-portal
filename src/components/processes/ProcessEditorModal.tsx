import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Building, AlertTriangle, Loader2 } from 'lucide-react';
import { CompanyProcess } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface ProcessEditorModalProps {
  process: CompanyProcess | null;
  onClose: () => void;
}

export const ProcessEditorModal: React.FC<ProcessEditorModalProps> = ({ process, onClose }) => {
  const { saveProcess, settings } = useData();
  const { showToast } = useToast();
  const [company, setCompany] = useState<string>(process?.company || (settings?.companies[0] || ''));
  const [location, setLocation] = useState<string>(process?.location || '');
  const [interviewDays, setInterviewDays] = useState<string>(process?.interviewDays || '');
  const [requirements] = useState<string>(process?.requirements || '');
  const [processSteps, setProcessSteps] = useState<string[]>(process?.processSteps || ['']);
  const [extraNotes, setExtraNotes] = useState<string[]>(process?.extraNotes || ['']);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddStep = () => setProcessSteps([...processSteps, '']);
  const handleRemoveStep = (idx: number) => setProcessSteps(processSteps.filter((_, i) => i !== idx));
  const handleStepChange = (idx: number, val: string) => {
    const updated = [...processSteps];
    updated[idx] = val;
    setProcessSteps(updated);
  };

  const handleAddNote = () => setExtraNotes([...extraNotes, '']);
  const handleRemoveNote = (idx: number) => setExtraNotes(extraNotes.filter((_, i) => i !== idx));
  const handleNoteChange = (idx: number, val: string) => {
    const updated = [...extraNotes];
    updated[idx] = val;
    setExtraNotes(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);
    if (!company.trim()) {
      setErrorMsg('Company / Client Account Name is required.');
      return;
    }
    setSaving(true);
    try {
      await saveProcess({
        id: process?.id,
        company: company.trim(),
        location: location.trim(),
        interviewDays: interviewDays.trim(),
        requirements,
        processSteps: processSteps.filter((s) => s.trim().length > 0),
        extraNotes: extraNotes.filter((n) => n.trim().length > 0)
      });
      showToast(`Recruitment process for ${company.trim()} saved.`, 'success');
      onClose();
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err, 'Failed to save recruitment process.');
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {process ? `Edit Process: ${process.company}` : 'Add Company Recruitment Process'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step-by-step interview instructions for recruiters
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#D93A30]" /> Company / Client Account Name
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Teleperformance, TTEC, Dial Expert"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Interview Location &amp; Site
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. One Kattameya / Maadi Technology Park / Online MS Teams"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Interview Days &amp; Operating Hours
              </label>
              <input
                type="text"
                value={interviewDays}
                onChange={(e) => setInterviewDays(e.target.value)}
                placeholder="e.g. Sun-Thu 11:00 AM - 4:00 PM"
                className={inputCls}
              />
            </div>
          </div>

          {/* Process Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ordered Process &amp; Interview Steps
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-xs text-[#D93A30] hover:text-[#b82e25] flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {processSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs text-slate-400 font-mono tabular-nums">{idx + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`Step ${idx + 1} (e.g. Enter candidate profile, verify English voice note B2+...)`}
                    className={`flex-1 ${inputCls}`}
                  />
                  {processSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      title="Remove step"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Extra Notes & Quotas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Requirements, Daily Quotas &amp; Crucial Rules
              </label>
              <button
                type="button"
                onClick={handleAddNote}
                className="text-xs text-[#D93A30] hover:text-[#b82e25] flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Note
              </button>
            </div>
            <div className="space-y-2">
              {extraNotes.map((note, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    placeholder="e.g. Daily quota: Max 3 candidates, graduates only, max age 45, rotational shifts..."
                    className={`flex-1 ${inputCls}`}
                  />
                  {extraNotes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveNote(idx)}
                      title="Remove note"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 mt-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-red-600/20 transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
