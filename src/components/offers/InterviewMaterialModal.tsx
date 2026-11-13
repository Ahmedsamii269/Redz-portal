import React, { useState } from 'react';
import { X, BookOpen, Copy, Check, Building } from 'lucide-react';
import { JobOffer } from '../../types';

interface InterviewMaterialModalProps {
  offer: JobOffer | null;
  onClose: () => void;
}

export const InterviewMaterialModal: React.FC<InterviewMaterialModalProps> = ({ offer, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!offer) return null;

  const content = offer.interviewMaterial || 'No specific interview questions provided for this position.';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Interview Material &amp; Questions</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                  {offer.language}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                  <Building className="w-3.5 h-3.5 text-[#D93A30]" /> {offer.company}
                </span>
                <span>•</span>
                <span>{offer.location || 'Cairo'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notes banner if any */}
        {offer.materialNote && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 px-6 py-2.5 text-xs text-amber-800 dark:text-amber-300 font-medium">
            ⚠️ {offer.materialNote}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Preparation Guide for Candidates &amp; Interviewers
            </span>
            <button
              onClick={handleCopy}
              className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors active:scale-[0.98]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Material'}
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
