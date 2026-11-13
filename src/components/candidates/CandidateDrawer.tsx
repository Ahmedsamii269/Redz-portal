import React, { useState } from 'react';
import { X, Phone, Mail, MapPin, Calendar, MessageSquare, CalendarPlus, Loader2 } from 'lucide-react';
import { Candidate } from '../../types';
import { NationalIdBadge } from '../common/NationalIdBadge';
import { WaveformAudioPlayer } from '../common/WaveformAudioPlayer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCandidateStatusBadgeClasses } from '../../lib/statusStyles';
import { formatSafeDateTime } from '../../lib/dateUtils';
import { buildCandidateInterviewEvent, CalendarAuthError, createCalendarEvent } from '../../lib/googleCalendar';

interface CandidateDrawerProps {
  candidate: Candidate | null;
  onClose: () => void;
  onOpenWhatsApp?: (candidate: Candidate) => void;
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({ candidate, onClose, onOpenWhatsApp }) => {
  const { activeRole, googleAccessToken, connectGoogleCalendar, clearGoogleAccessToken } = useAuth();
  const { showToast, confirmAction } = useToast();
  const [syncingCal, setSyncingCal] = useState(false);
  const canManageStatus = activeRole === 'ceo' || activeRole === 'account_manager';

  if (!candidate) return null;

  const handleSyncToGoogleCalendar = async () => {
    if (!candidate.interviewDate || syncingCal) return;
    setSyncingCal(true);
    try {
      let token = googleAccessToken;
      if (!token) {
        token = await connectGoogleCalendar();
      }
      const confirmed = await confirmAction({
        title: 'Add Interview to Google Calendar?',
        message: `Create a Google Calendar event for ${candidate.fullName} (${candidate.company}) on ${candidate.interviewDate}${
          candidate.interviewTime ? ` (${candidate.interviewTime})` : ''
        }?`,
        confirmLabel: 'Add to Calendar'
      });
      if (!confirmed) return;

      await createCalendarEvent(token, 'primary', buildCandidateInterviewEvent(candidate));
      showToast(`Interview for ${candidate.fullName} added to Google Calendar.`, 'success');
    } catch (err: any) {
      if (err instanceof CalendarAuthError) {
        clearGoogleAccessToken();
        showToast('Google Calendar authorization expired. Please sign in with Google again.', 'warning');
      } else {
        showToast(err?.message || 'Could not add interview to Google Calendar.', 'error');
      }
    } finally {
      setSyncingCal(false);
    }
  };

  const isWhatsAppEligible = [
    'Accepted Voice Note',
    'Interview Scheduled',
    'Interview Rescheduled',
    'Accepted Interview'
  ].includes(candidate.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-[#D93A30]/20 border border-red-200 dark:border-[#D93A30]/40 flex items-center justify-center font-extrabold text-[#D93A30] dark:text-red-400 shrink-0">
              {(candidate.fullName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 dir="auto" title={candidate.fullName} className="text-base font-extrabold text-slate-900 dark:text-white truncate">{candidate.fullName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.company} • {candidate.language || 'English'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Status badge */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-xl gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold">Pipeline Status</span>
            <span className={`px-3 py-1 rounded-full border font-bold text-[11px] ${getCandidateStatusBadgeClasses(candidate.status)}`}>
              {candidate.status}
            </span>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5 bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 p-4 rounded-xl">
            <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] mb-2">Contact &amp; ID Info</h4>
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-mono font-bold tabular-nums">{candidate.phone}</span>
              {candidate.phone2 && <span className="text-slate-400 font-mono tabular-nums">/ {candidate.phone2}</span>}
            </div>
            {candidate.email && (
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Mail className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="truncate">{candidate.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <span dir="auto">Area: {candidate.area || '—'}</span>
            </div>
            <div className="pt-1">
              <NationalIdBadge idNumber={candidate.idNumber} age={candidate.age} />
            </div>
          </div>

          {/* Voice Notes Preview */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 p-4 rounded-xl">
            <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Voice Note Audio Sample</h4>
            <WaveformAudioPlayer url={candidate.vocarooUrl} label="Primary Voice Note" compact={false} />
            {candidate.vocarooUrl2 && (
              <WaveformAudioPlayer url={candidate.vocarooUrl2} label="2nd Language Voice Note" compact={false} />
            )}
          </div>

          {/* Candidate Timeline (Status History) */}
          <div className="space-y-4 bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 p-4 rounded-xl">
            <h4 className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#D93A30]" />
              Application Lifecycle Timeline
            </h4>
            <div className="space-y-3 relative before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-700">
              {candidate.statusHistory?.map((entry, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className={`absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1B2234] z-10 ${
                    idx === candidate.statusHistory!.length - 1 ? 'bg-[#D93A30]' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{entry.status}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      {formatSafeDateTime(entry.timestamp)} • {entry.changedByName}
                    </span>
                    {entry.note && (
                      <span dir="auto" className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 bg-white dark:bg-[#0B0F19] p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        {entry.note}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata & Submitter */}
          <div className="space-y-2 bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 p-4 rounded-xl text-slate-500 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Submitted By:</span>
              <span className="text-slate-900 dark:text-white font-semibold">{candidate.createdByName || 'Recruiter'}</span>
            </div>
            {candidate.leaderName && (
              <div className="flex justify-between">
                <span>Team Leader:</span>
                <span className="text-slate-900 dark:text-white font-semibold">{candidate.leaderName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Created Date:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">{candidate.createdAt?.split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isWhatsAppEligible && canManageStatus && onOpenWhatsApp && (
              <button
                onClick={() => {
                  onOpenWhatsApp(candidate);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-slate-950 hover:bg-[#20ba59] transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            )}
            {candidate.interviewDate && (
              <button
                type="button"
                disabled={syncingCal}
                onClick={handleSyncToGoogleCalendar}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/70 hover:bg-sky-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {syncingCal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
                <span>Sync Calendar</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
