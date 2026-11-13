import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, Calendar, Clock, UserCheck, Plus, Loader2 } from 'lucide-react';
import { Candidate } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { safeParseDate } from '../../lib/dateUtils';

interface WhatsAppModalProps {
  candidate: Candidate | null;
  onClose: () => void;
}

export function normalizeEgyptianPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('01')) {
    cleaned = '20' + cleaned.substring(1);
  } else if (!cleaned.startsWith('20') && cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ candidate, onClose }) => {
  const { confirmationTemplates, updateCandidate, saveConfirmationTemplate, offers } = useData();
  const { effectiveUser, activeRole } = useAuth();
  const { showToast } = useToast();
  const isCeo = activeRole === 'ceo';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dayString, setDayString] = useState<string>('');
  const [timeString, setTimeString] = useState<string>('');
  const [senderName, setSenderName] = useState<string>(effectiveUser.name.split(' ')[0] || 'Ahmed');
  const [messageBody, setMessageBody] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const [showTplEditor, setShowTplEditor] = useState<boolean>(false);
  const [tplCompany, setTplCompany] = useState<string>(candidate?.company || '');
  const [tplVariant, setTplVariant] = useState<string>(candidate?.language || 'English');
  const [tplText, setTplText] = useState<string>('');
  const [savingTpl, setSavingTpl] = useState<boolean>(false);

  useEffect(() => {
    if (candidate) {
      if (candidate.interviewDate) {
        const d = safeParseDate(candidate.interviewDate);
        if (d) {
          setDayString(
            d.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          );
        } else {
          setDayString(candidate.interviewDate);
        }
      } else {
        const tomorrow = new Date(Date.now() + 86400000);
        setDayString(
          tomorrow.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        );
      }
      if (candidate.interviewTime) {
        setTimeString(candidate.interviewTime);
      } else {
        setTimeString('11:00 AM - 3:00 PM');
      }

      const compLower = (candidate.company || '').toLowerCase();
      const langLower = (candidate.language || 'english').toLowerCase();

      const matchedOffer = offers.find(o =>
        o.company.toLowerCase() === compLower &&
        o.language.toLowerCase() === langLower &&
        o.confirmationMessage
      );

      if (matchedOffer?.confirmationMessage) {
        setMessageBody(matchedOffer.confirmationMessage);
        setSelectedTemplateId('from-offer');
      } else {
        const matched = confirmationTemplates.find((t) => {
          const tComp = t.company.toLowerCase();
          const tVar = t.variant.toLowerCase();
          return (tComp.includes(compLower) || compLower.includes(tComp)) &&
                 (tVar.includes(langLower) || langLower.includes(tVar) || tVar === 'english');
        }) || confirmationTemplates[0];

        if (matched) {
          setSelectedTemplateId(matched.id);
        }
      }
    }
  }, [candidate, confirmationTemplates, offers]);

  useEffect(() => {
    if (!candidate) return;
    let text = '';

    if (selectedTemplateId === 'from-offer') {
      const matchedOffer = offers.find(o =>
        o.company.toLowerCase() === candidate.company.toLowerCase() &&
        o.language.toLowerCase() === (candidate.language || 'english').toLowerCase()
      );
      text = matchedOffer?.confirmationMessage || '';
    } else {
      const tpl = confirmationTemplates.find((t) => t.id === selectedTemplateId);
      if (!tpl) {
        setMessageBody('');
        return;
      }
      text = tpl.text;
    }

    if (!text) return;

    text = text.replace(/\[Candidate Name\]/gi, candidate.fullName);
    text = text.replace(/\[Day\]/gi, dayString || '[Day]');
    text = text.replace(/\[Time\]/gi, timeString || '[Time]');
    text = text.replace(/\[Your Name\]/gi, senderName);
    text = text.replace(/This is Ahmed from/gi, `This is ${senderName} from`);

    setMessageBody(text);
  }, [selectedTemplateId, dayString, timeString, senderName, candidate, confirmationTemplates, offers]);

  const handleSaveNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCeo || savingTpl) return;
    setSavingTpl(true);
    try {
      const newId = `tpl_${Date.now()}`;
      await saveConfirmationTemplate({
        id: newId,
        company: tplCompany.trim(),
        variant: tplVariant.trim(),
        text: tplText.trim(),
        usesPlaceholders: true
      });
      setSelectedTemplateId(newId);
      setShowTplEditor(false);
      showToast('WhatsApp confirmation template saved.', 'success');
    } catch (err: any) {
      console.error('Failed to save template:', err);
      showToast(getFriendlyErrorMessage(err, 'Failed to save confirmation template.'), 'error');
    } finally {
      setSavingTpl(false);
    }
  };

  if (!candidate) return null;

  const normalizedPhone = normalizeEgyptianPhone(candidate.phone);
  const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageBody)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageBody).then(
      () => {
        setCopied(true);
        showToast('Message copied to clipboard.', 'success');
        setTimeout(() => setCopied(false), 2000);
      },
      () => showToast('Could not copy message to clipboard.', 'error')
    );
  };

  const handleSendWhatsApp = async () => {
    if (sending) return;
    setSending(true);
    try {
      await updateCandidate(candidate.id, {
        confirmationSent: true,
        interviewDate: dayString,
        interviewTime: timeString
      });
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`WhatsApp confirmation logged for ${candidate.fullName}.`, 'success');
      onClose();
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Could not update confirmation status.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#D93A30]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>WhatsApp Interview Confirmation</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                  +20 Egyptian Format
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                To: <span className="text-slate-900 dark:text-white font-semibold">{candidate.fullName}</span> ({candidate.phone})
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-[#1B2234] p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Company Template</label>
                {isCeo && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = confirmationTemplates.find((t) => t.id === selectedTemplateId);
                      if (cur) {
                        setTplCompany(cur.company);
                        setTplVariant(cur.variant);
                        setTplText(cur.text);
                      } else {
                        setTplCompany(candidate?.company || '');
                        setTplVariant(candidate?.language || 'English');
                        setTplText('');
                      }
                      setShowTplEditor(!showTplEditor);
                    }}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    {showTplEditor ? 'Hide Builder' : 'Create / Edit Template'}
                  </button>
                )}
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className={inputClass}
              >
                <option value="from-offer">★ Synced from Job Offer</option>
                {confirmationTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.company} ({t.variant})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#D93A30]" /> Interview Day / Date
              </label>
              <input
                type="text"
                value={dayString}
                onChange={(e) => setDayString(e.target.value)}
                placeholder="e.g. Wednesday, Nov 12, 2026"
                className={inputClass}
              />
            </div>

            {showTplEditor && isCeo && (
              <form onSubmit={handleSaveNewTemplate} className="col-span-1 sm:col-span-2 bg-white dark:bg-[#131826] p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-700 space-y-2.5 mt-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span>Create / Update Confirmation Template</span>
                  <span className="text-[10px] text-slate-400">Persists to Firestore</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 font-bold">Company Name</label>
                    <input
                      type="text"
                      required
                      value={tplCompany}
                      onChange={(e) => setTplCompany(e.target.value)}
                      placeholder="e.g. Teleperformance"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 font-bold">Variant / Language</label>
                    <input
                      type="text"
                      required
                      value={tplVariant}
                      onChange={(e) => setTplVariant(e.target.value)}
                      placeholder="e.g. English"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 font-bold">Template Message Text</label>
                  <textarea
                    rows={4}
                    required
                    value={tplText}
                    onChange={(e) => setTplText(e.target.value)}
                    placeholder="Use placeholders: [Candidate Name], [Day], [Time], [Your Name]..."
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTplEditor(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTpl}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {savingTpl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {savingTpl ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </form>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" /> Interview Time Window
              </label>
              <input
                type="text"
                value={timeString}
                onChange={(e) => setTimeString(e.target.value)}
                placeholder="e.g. 11:00 AM - 3:00 PM"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Sender / Recruiter Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Ahmed"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 gap-2">
            <span>WhatsApp Target: <strong className="font-mono tabular-nums">+{normalizedPhone}</strong></span>
            <span className="text-[11px] opacity-80">Normalized from {candidate.phone}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message Preview (Editable)</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea
              dir="auto"
              rows={9}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-[#D93A30]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Message
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={handleSendWhatsApp}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-slate-950 hover:bg-[#20ba59] transition-all active:scale-[0.98] flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
};
