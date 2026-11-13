import React, { useState } from 'react';
import { X, AlertTriangle, Check, ShieldAlert, Sparkles, Building, Globe, MapPin, Calendar, Loader2 } from 'lucide-react';
import { JobOffer, UserRole } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface OfferEditorModalProps {
  offer: JobOffer | null;
  onClose: () => void;
}

export const OfferEditorModal: React.FC<OfferEditorModalProps> = ({ offer, onClose }) => {
  const { saveOffer, settings, confirmationTemplates, saveConfirmationTemplate } = useData();
  const { showToast } = useToast();
  const [company, setCompany] = useState<string>(offer?.company || (settings?.companies[0] || 'TTEC'));
  const [language, setLanguage] = useState<string>(offer?.language || 'English');
  const [location, setLocation] = useState<string>(offer?.location || 'Maadi, Cairo');
  const [offerText, setOfferText] = useState<string>(offer?.offerText || '');
  const [interviewDays, setInterviewDays] = useState<string>(offer?.interviewDays || 'Monday to Friday\n11:00 AM - 3:00 PM');
  const [interviewMaterial, setInterviewMaterial] = useState<string>(offer?.interviewMaterial || '');
  const [candidateAutoReply, setCandidateAutoReply] = useState<string>(offer?.candidateAutoReply || '');
  const [active, setActive] = useState<boolean>(offer?.active ?? true);
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>(offer?.allowedRoles || []);

  // WhatsApp Confirmation Sync
  const existingTpl = confirmationTemplates.find(t => t.company === company && t.variant === language);
  const [confirmationMessage, setConfirmationMessage] = useState<string>(existingTpl?.text || '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Check for forbidden keywords in real-time
  const forbiddenRegex = /(mosla\s*pioneers|career\s*core)/gi;
  const hasForbiddenNames = forbiddenRegex.test(offerText) || forbiddenRegex.test(interviewMaterial);

  const insertVariable = (varName: string) => {
    setOfferText(prev => prev + `\n📲 Contact us via WhatsApp: ${varName}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrorMsg(null);

    if (!location.trim() || !offerText.trim()) {
      setErrorMsg('Please fill in Location and Offer Post Text.');
      return;
    }

    if (hasForbiddenNames) {
      setErrorMsg('CRITICAL VIOLATION: Offer text cannot contain "MOSLA Pioneers" or "Career Core". Please remove these partner names before saving.');
      return;
    }

    setSaving(true);
    try {
      if (confirmationMessage.trim()) {
        await saveConfirmationTemplate({
          id: existingTpl?.id,
          company,
          variant: language,
          text: confirmationMessage.trim(),
          usesPlaceholders: true
        });
      }

      const result = await saveOffer({
        id: offer?.id,
        company,
        language,
        location,
        offerText,
        copyText: offerText,
        interviewDays,
        interviewMaterial,
        candidateAutoReply,
        confirmationMessage: confirmationMessage.trim(),
        active,
        allowedRoles
      });

      if (result.success) {
        showToast(offer ? `Offer for ${company} updated.` : `New ${company} offer published.`, 'success');
        onClose();
      } else {
        const msg = result.error || 'Failed to save offer.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err, 'Unexpected network error while saving offer.');
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
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {offer ? 'Edit Job Offer' : 'Create New Job Offer'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Agency vacancies for social media recruitment and candidate sourcing
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

        {/* Security Warning if forbidden keywords found */}
        {hasForbiddenNames && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 px-6 py-3 flex items-center gap-3 text-xs text-rose-800 dark:text-rose-200">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <strong>Security Policy Block:</strong> Partner agency names (MOSLA Pioneers / Career Core) are strictly forbidden in public job offers. They are permitted ONLY in WhatsApp confirmation messages.
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#D93A30]" /> Company
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputCls}
              >
                {(settings?.companies || ['TTEC', 'Teleperformance', 'eClerx', 'Alorica', 'Dial Expert', 'Total Trip']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" /> Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputCls}
              >
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="Dutch">Dutch</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Portuguese">Portuguese</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Location / Area
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Maadi, Cairo"
                className={inputCls}
              />
            </div>
          </div>

          {/* Offer text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Offer Post Text (Social Media Copy)
              </label>
              <button
                type="button"
                onClick={() => insertVariable('{{MY_PHONE}}')}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 dark:bg-indigo-600 hover:bg-slate-700 dark:hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors active:scale-[0.98]"
                title="Insert logged-in recruiter personal WhatsApp phone variable"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                Insert {'{{MY_PHONE}}'}
              </button>
            </div>
            <textarea
              dir="auto"
              rows={8}
              required
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
              placeholder="Paste full job description, salary, shifts, and requirements..."
              className={`w-full bg-slate-50 dark:bg-[#0B0F19] border rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none transition-all ${
                hasForbiddenNames
                  ? 'border-rose-500 ring-2 ring-rose-500/25'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15'
              }`}
            />
          </div>

          {/* Interview days & hours */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" /> Interview Schedule Days &amp; Times
            </label>
            <input
              type="text"
              value={interviewDays}
              onChange={(e) => setInterviewDays(e.target.value)}
              placeholder="e.g. Monday to Friday 11:00 AM - 3:00 PM"
              className={inputCls}
            />
          </div>

          {/* Interview Material */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Interview Questions &amp; Guide (Internal Material for Recruiters/Candidates)
            </label>
            <textarea
              rows={5}
              value={interviewMaterial}
              onChange={(e) => setInterviewMaterial(e.target.value)}
              placeholder="Common interview questions, sample answers, and behavioral prompts..."
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
            />
          </div>

          {/* Auto reply */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Candidate Auto-Reply Instructions (Optional)
            </label>
            <input
              type="text"
              value={candidateAutoReply}
              onChange={(e) => setCandidateAutoReply(e.target.value)}
              placeholder="e.g. Someone from our team will contact you one day before your interview..."
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="offer-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-[#D93A30] focus:ring-[#D93A30]"
            />
            <label htmlFor="offer-active" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
              Active Offer (Visible to Recruiters)
            </label>
          </div>

          {/* Role-Based Visibility */}
          <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/70 p-4 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Restrict Visibility to Roles</label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">If none selected, all roles can see this offer.</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {(['unit_manager', 'leader', 'recruiter'] as UserRole[]).map((role) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={allowedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAllowedRoles([...allowedRoles, role]);
                      } else {
                        setAllowedRoles(allowedRoles.filter(r => r !== role));
                      }
                    }}
                    className="rounded border-slate-300 dark:border-slate-700 text-[#D93A30] focus:ring-[#D93A30]"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white capitalize">
                    {role.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* WhatsApp Confirmation Message Sync */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 p-5 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                WhatsApp Confirmation Message (Auto-Sync)
              </label>
              <div className="flex gap-1.5">
                {['[Candidate Name]', '[Day]', '[Time]'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setConfirmationMessage(prev => prev + ' ' + tag)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              This message automatically appears in the WhatsApp modal when the CEO or Account Manager accepts a voice note for this company.
            </p>
            <textarea
              rows={5}
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
              placeholder="Enter the WhatsApp confirmation message to be sent to candidates..."
              className="w-full bg-white dark:bg-[#0B0F19] border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
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
              disabled={saving || hasForbiddenNames}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all shadow-sm shadow-red-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
