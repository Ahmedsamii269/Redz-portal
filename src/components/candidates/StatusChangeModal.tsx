import React, { useState } from 'react';
import { X, CheckCircle2, Calendar, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Candidate, CandidateStatus } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface StatusChangeModalProps {
  candidate: Candidate | null;
  onClose: () => void;
}

const ALL_STATUSES: { status: CandidateStatus; desc: string }[] = [
  { status: 'New', desc: 'Newly submitted candidate awaiting screening' },
  { status: 'Accepted Voice Note', desc: 'Voice note approved for interview qualification' },
  { status: 'Rejected Voice Note', desc: 'Voice note did not meet language or quality criteria' },
  { status: 'Interview Scheduled', desc: 'Interview date booked with company' },
  { status: 'Interview Rescheduled', desc: 'Interview time moved to an alternate slot' },
  { status: 'Accepted Interview', desc: 'Candidate passed client interview successfully' },
  { status: 'Rejected Interview', desc: 'Candidate did not pass client interview' },
  { status: 'Start Training', desc: 'First training day attended (triggers commission cascade)' },
  { status: 'Dropped or Left Training', desc: 'Candidate left or dropped out of client training (freezes commission)' },
  { status: 'Commission Done', desc: 'Commission received from client and paid to team' }
];

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ candidate, onClose }) => {
  const { updateCandidateStatus } = useData();
  const { activeRole } = useAuth();
  const { showToast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<CandidateStatus>(candidate?.status || 'New');
  const [interviewDate, setInterviewDate] = useState<string>(candidate?.interviewDate || '');
  const [interviewTime, setInterviewTime] = useState<string>(candidate?.interviewTime || '11:00 AM - 3:00 PM');
  const [trainingStartDate, setTrainingStartDate] = useState<string>(
    candidate?.trainingStartDate || new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const canManageStatus = activeRole === 'ceo' || activeRole === 'account_manager';

  if (!candidate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!canManageStatus) {
      showToast('Access Restricted: Only CEO or Account Manager can change candidate stages.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await updateCandidateStatus(candidate.id, selectedStatus, {
        interviewDate: (selectedStatus.includes('Interview Scheduled') || selectedStatus.includes('Interview Rescheduled')) ? interviewDate : undefined,
        interviewTime: (selectedStatus.includes('Interview Scheduled') || selectedStatus.includes('Interview Rescheduled')) ? interviewTime : undefined,
        trainingStartDate: selectedStatus === 'Start Training' ? trainingStartDate : undefined,
        note: note.trim() || undefined
      });

      if (selectedStatus === 'Commission Done') {
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      }

      showToast(`${candidate.fullName} updated to "${selectedStatus}".`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to change status:', err);
      showToast(getFriendlyErrorMessage(err, 'Failed to update candidate status. Check your connection.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Update Candidate Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Candidate: <span className="text-slate-900 dark:text-white font-semibold">{candidate.fullName}</span> ({candidate.company})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Select New Status</label>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {ALL_STATUSES.map(({ status, desc }) => {
                const isSelected = selectedStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#D93A30] bg-red-50/70 dark:bg-red-950/30 text-slate-900 dark:text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1B2234] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-[#D93A30] bg-[#D93A30]' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold">{status}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {(selectedStatus === 'Interview Scheduled' || selectedStatus === 'Interview Rescheduled') && (
            <div className="bg-sky-50/60 dark:bg-[#1B2234] p-4 rounded-xl border border-sky-200 dark:border-sky-800/60 space-y-3">
              <h4 className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Interview Appointment Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Interview Date</label>
                  <input
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Time Slot Window</label>
                  <input
                    type="text"
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    placeholder="e.g. 11:00 AM - 3:00 PM"
                    className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedStatus === 'Start Training' && (
            <div className="bg-emerald-50/60 dark:bg-[#1B2234] p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <h4 className="text-xs font-bold">First Training Day (Clock Starts)</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Picking this date automatically initializes the commission cascade rules and calculates the payout due date based on company terms (30 or 45 days).
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">First Training Day</label>
                <input
                  type="date"
                  required
                  value={trainingStartDate}
                  onChange={(e) => setTrainingStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Log Note (Optional)
            </label>
            <input
              type="text"
              dir="auto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Passed English screening with C1 score"
              className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]"
            />
          </div>

          {!canManageStatus && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>Only the Founder &amp; CEO or Account Manager are authorized to change candidate stages.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canManageStatus}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] transition-all active:scale-[0.98] shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Updating...' : 'Save New Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
