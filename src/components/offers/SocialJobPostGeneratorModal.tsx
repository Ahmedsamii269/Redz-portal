import React, { useState } from 'react';
import { Copy, Check, Sparkles, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

interface SocialJobPostGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SocialJobPostGeneratorModal: React.FC<SocialJobPostGeneratorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { offers } = useData();
  const { effectiveUser } = useAuth();

  const [selectedOfferId, setSelectedOfferId] = useState<string>(offers[0]?.id || '');
  const [platform, setPlatform] = useState<'facebook' | 'linkedin' | 'whatsapp'>('facebook');
  const [includeSalary, setIncludeSalary] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentOffer = offers.find((o) => o.id === selectedOfferId) || offers[0];
  const userPhone = effectiveUser.phone || '010XXXXXXXX';

  const generateContent = () => {
    if (!currentOffer) return 'No job offer selected.';

    const company = currentOffer.company;
    const lang = currentOffer.language;
    const location = currentOffer.location;

    if (platform === 'whatsapp') {
      return `🔴 *URGENT HIRING | REDZ RECRUITMENT AGENCY* 🔴
✨ *Position:* ${lang} Customer Service / Account Advisor
🏢 *Account:* ${company} (${location})
💼 *Requirements:* Fluency in ${lang} & Grad / Undergrad accepted!
${includeSalary ? `💰 *Net Package:* Competitive Net Salary + KPI Bonuses\n` : ''}
📍 *Work Location:* ${location} (Transportation Provided)
🎧 *Voice Note Screening:* Send your 1-minute intro English audio to get scheduled!

📲 *Apply directly via WhatsApp:*
wa.me/${userPhone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi, I'm applying for the ${lang} Account at ${company}`)}
👤 Recruiter: *${effectiveUser.name}* (Redz Agency)`;
    }

    if (platform === 'linkedin') {
      return `🚀 [HIRING ALERT] ${lang} Customer Operations Specialists Wanted!

Redz Recruitment Agency is currently partnering with top-tier BPO providers in Egypt (${company}) to hire exceptional ${lang}-speaking talent.

📌 Job Details:
• Language Track: ${lang} (B2+ / C1 level)
• Location: ${location}
• Account: ${company}
${includeSalary ? `• Package: Up to competitive BPO market rates + Monthly KPIs\n` : ''}• Perks: Social & Medical Insurance + Door-to-Door Transportation

Ready to take your career to the next level?
👉 Send your CV or reach out via WhatsApp at: ${userPhone}
Or drop a comment with your email and our recruitment team will reach out.

#Hiring #Recruitment #${lang}Jobs #BPO #CustomerService #RedzAgency #EgyptJobs`;
    }

    return `🔴 IMMEDIATE HIRING OPPORTUNITY | REDZ RECRUITMENT AGENCY 🔴
Urgent openings for Top-Tier BPO & Customer Operations Accounts in Egypt (${company})!

🌟 Highlights & Details:
🗣️ Language Track: Fluent ${lang}
📍 Location: ${location} (Transportation Provided)
${includeSalary ? `💵 Compensation: Competitive Base Salary + Monthly Performance Bonuses\n` : ''}🎓 Education: Graduates & Gap-year Students Accepted
✅ Comprehensive Medical & Social Insurance from Day 1

How to Apply Directly & Quickly:
1️⃣ Send your 1-minute audio introduction in ${lang} via WhatsApp:
📲 ${userPhone}
2️⃣ Get your interview scheduled immediately and tracked by: ${effectiveUser.name} (Redz Agency)

#Hiring #EgyptJobs #CustomerService #RedzRecruitment #BPOJobs`;
  };

  const postText = generateContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-modal-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0F1420]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-[#D93A30]/15 border border-rose-200 dark:border-[#D93A30]/30 flex items-center justify-center text-[#D93A30]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Social Media Job Post Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate high-converting hiring copy for Facebook, LinkedIn &amp; WhatsApp
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Target Job Offer
              </label>
              <select
                value={selectedOfferId}
                onChange={(e) => setSelectedOfferId(e.target.value)}
                className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15"
              >
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.company} — {o.language} ({o.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                Target Channel
              </label>
              <div className="flex items-center gap-2">
                {(['facebook', 'linkedin', 'whatsapp'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border active:scale-[0.98] ${
                      platform === p
                        ? 'bg-[#D93A30] text-white border-[#D93A30] shadow-xs'
                        : 'bg-slate-50 dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#1B2234] p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70">
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300 font-medium">Recruiter WhatsApp link:</span>
              <span className="font-mono text-[#D93A30] font-bold tabular-nums">{userPhone}</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={includeSalary}
                onChange={(e) => setIncludeSalary(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-[#D93A30] focus:ring-[#D93A30]"
              />
              <span>Include Salary Package</span>
            </label>
          </div>

          {/* Preview Box */}
          <div>
            <div className="text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center justify-between">
              <span>Post Content Preview</span>
              <span className="text-[11px] text-slate-400 font-normal">Ready to paste</span>
            </div>
            <textarea
              readOnly
              value={postText}
              rows={9}
              className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-slate-800 dark:text-slate-200 font-sans text-xs leading-relaxed focus:outline-none select-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] flex items-center gap-2 shadow-sm shadow-red-600/20 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Social Post'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
