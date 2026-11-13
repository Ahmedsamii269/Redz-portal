import React, { useState } from 'react';
import {
  UserPlus,
  Phone,
  Mail,
  GraduationCap,
  CreditCard,
  MapPin,
  Building,
  Mic,
  Calendar,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Info,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { checkCandidateEligibility, extractDataFromNationalId } from '../../lib/eligibilityChecker';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface ApplicationFormViewProps {
  onSuccessNavigate?: () => void;
}

const COMMON_EXPERIENCE_TYPES = [
  'Customer Service (CS)',
  'Outbound Sales',
  'Inbound Sales',
  'Technical Support',
  'Telesales / Cold Calling',
  'Moderation / Chat Support',
  'Travel / Reservations'
];

export const ApplicationFormView: React.FC<ApplicationFormViewProps> = ({ onSuccessNavigate }) => {
  const { settings, addCandidate, offers, candidates } = useData();
  const { effectiveUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [phone2, setPhone2] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [graduateStatus, setGraduateStatus] = useState<'Graduate' | 'Not graduate' | 'Student'>('Graduate');
  const [idNumber, setIdNumber] = useState<string>('');
  const [hasExperience, setHasExperience] = useState<boolean>(false);
  const [experienceDuration, setExperienceDuration] = useState<string>('');
  const [selectedExpTypes, setSelectedExpTypes] = useState<string[]>([]);
  const [customExpType, setCustomExpType] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [company, setCompany] = useState<string>(settings?.companies[0] || 'TTEC');
  const [language, setLanguage] = useState<string>('English');
  const [vocarooUrl, setVocarooUrl] = useState<string>('');
  const [hasSecondVoiceNote, setHasSecondVoiceNote] = useState<boolean>(false);
  const [vocarooUrl2, setVocarooUrl2] = useState<string>('');
  const [vocarooLanguage2, setVocarooLanguage2] = useState<string>('French');
  const [interviewDate, setInterviewDate] = useState<string>('');
  const [interviewTime, setInterviewTime] = useState<string>('11:00 AM - 3:00 PM');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  React.useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('redz_app_form_draft');
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d.fullName) setFullName(d.fullName);
        if (d.phone) setPhone(d.phone);
        if (d.phone2) setPhone2(d.phone2);
        if (d.email) setEmail(d.email);
        if (d.graduateStatus) setGraduateStatus(d.graduateStatus);
        if (d.idNumber) setIdNumber(d.idNumber);
        if (d.hasExperience !== undefined) setHasExperience(d.hasExperience);
        if (d.experienceDuration) setExperienceDuration(d.experienceDuration);
        if (d.selectedExpTypes) setSelectedExpTypes(d.selectedExpTypes);
        if (d.area) setArea(d.area);
        if (d.company) setCompany(d.company);
        if (d.language) setLanguage(d.language);
        if (d.vocarooUrl) setVocarooUrl(d.vocarooUrl);
        if (d.hasSecondVoiceNote !== undefined) setHasSecondVoiceNote(d.hasSecondVoiceNote);
        if (d.vocarooUrl2) setVocarooUrl2(d.vocarooUrl2);
        if (d.vocarooLanguage2) setVocarooLanguage2(d.vocarooLanguage2);
        if (d.interviewDate) setInterviewDate(d.interviewDate);
        if (d.interviewTime) setInterviewTime(d.interviewTime);
        setDraftRestored(true);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  React.useEffect(() => {
    if (fullName || phone || vocarooUrl || idNumber || area) {
      const draft = {
        fullName,
        phone,
        phone2,
        email,
        graduateStatus,
        idNumber,
        hasExperience,
        experienceDuration,
        selectedExpTypes,
        area,
        company,
        language,
        vocarooUrl,
        hasSecondVoiceNote,
        vocarooUrl2,
        vocarooLanguage2,
        interviewDate,
        interviewTime
      };
      try {
        localStorage.setItem('redz_app_form_draft', JSON.stringify(draft));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [
    fullName,
    phone,
    phone2,
    email,
    graduateStatus,
    idNumber,
    hasExperience,
    experienceDuration,
    selectedExpTypes,
    area,
    company,
    language,
    vocarooUrl,
    hasSecondVoiceNote,
    vocarooUrl2,
    vocarooLanguage2,
    interviewDate,
    interviewTime
  ]);

  const clearDraft = () => {
    try {
      localStorage.removeItem('redz_app_form_draft');
    } catch {
      // Ignore storage errors
    }
    setFullName('');
    setPhone('');
    setPhone2('');
    setEmail('');
    setIdNumber('');
    setHasExperience(false);
    setExperienceDuration('');
    setSelectedExpTypes([]);
    setArea('');
    setVocarooUrl('');
    setHasSecondVoiceNote(false);
    setVocarooUrl2('');
    setDraftRestored(false);
  };

  const matchedOffer = offers.find((o) => o.company.toLowerCase() === company.toLowerCase() && o.language.toLowerCase() === language.toLowerCase());

  const cleanPhone = phone.trim().replace(/[^\d]/g, '');
  const cleanId = idNumber.trim();
  const duplicateCandidate = candidates.find((c) => {
    if (cleanPhone && cleanPhone.length >= 10) {
      const existingPhone = c.phone.replace(/[^\d]/g, '');
      if (existingPhone.includes(cleanPhone) || cleanPhone.includes(existingPhone)) return true;
    }
    if (cleanId && cleanId.length === 14 && c.idNumber && c.idNumber.trim() === cleanId) {
      return true;
    }
    return false;
  });

  const idData = extractDataFromNationalId(idNumber);
  const eligibility = checkCandidateEligibility({
    company,
    language,
    graduateStatus,
    hasExperience,
    experienceDuration,
    experienceTypes: selectedExpTypes,
    area,
    idNumber
  });

  const handleToggleExpType = (t: string) => {
    if (selectedExpTypes.includes(t)) {
      setSelectedExpTypes(selectedExpTypes.filter((x) => x !== t));
    } else {
      setSelectedExpTypes([...selectedExpTypes, t]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSuccessMessage(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const trimmedArea = area.trim();
    const trimmedVocaroo = vocarooUrl.trim();
    const trimmedVocaroo2 = vocarooUrl2.trim();

    if (trimmedName.length < 2) {
      setErrorMsg('Please enter the candidate full name (at least 2 characters).');
      return;
    }
    if (trimmedPhone.replace(/[^\d]/g, '').length < 8) {
      setErrorMsg('Please enter a valid primary phone number (at least 8 digits).');
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address or leave it blank.');
      return;
    }
    if (!trimmedArea) {
      setErrorMsg('Please enter the candidate residential area / governorate.');
      return;
    }
    if (!trimmedVocaroo || !/^https?:\/\//i.test(trimmedVocaroo)) {
      setErrorMsg('Please enter a valid Vocaroo link starting with https:// or http://.');
      return;
    }
    if (hasSecondVoiceNote && trimmedVocaroo2 && !/^https?:\/\//i.test(trimmedVocaroo2)) {
      setErrorMsg('Second voice note link must start with https:// or http://.');
      return;
    }

    setSubmitting(true);
    try {
      const allTypes = [...selectedExpTypes];
      if (customExpType.trim()) allTypes.push(customExpType.trim());

      const result = await addCandidate({
        fullName: fullName.trim(),
        phone: phone.trim(),
        phone2: phone2.trim() || undefined,
        email: email.trim() || undefined,
        graduateStatus,
        idNumber: idNumber.trim() || undefined,
        hasExperience,
        experienceDuration: hasExperience ? experienceDuration : undefined,
        experienceTypes: hasExperience ? allTypes : [],
        area: area.trim(),
        company,
        language,
        offerId: matchedOffer?.id,
        vocarooUrl: vocarooUrl.trim(),
        vocarooUrl2: hasSecondVoiceNote ? vocarooUrl2.trim() : undefined,
        vocarooLanguage2: hasSecondVoiceNote ? vocarooLanguage2 : undefined,
        interviewDate: interviewDate || undefined,
        interviewTime: interviewTime || undefined,
        age: idData.age,
        createdBy: effectiveUser.id,
        createdByName: effectiveUser.name,
        leaderId: effectiveUser.leaderId,
        leaderName: effectiveUser.leaderName,
        unitManagerId: effectiveUser.unitManagerId,
        unitManagerName: effectiveUser.unitManagerName
      });

      if (result.success) {
        setSuccessMessage(`Candidate "${fullName}" registered successfully with eligibility verification!`);
        showToast(`Candidate "${fullName}" registered successfully.`, 'success');
        try {
          localStorage.removeItem('redz_app_form_draft');
        } catch {
          // Ignore storage errors
        }
        setFullName('');
        setPhone('');
        setPhone2('');
        setEmail('');
        setIdNumber('');
        setHasExperience(false);
        setExperienceDuration('');
        setSelectedExpTypes([]);
        setCustomExpType('');
        setArea('');
        setVocarooUrl('');
        setVocarooUrl2('');
        setHasSecondVoiceNote(false);
        setInterviewDate('');
        setDraftRestored(false);

        setTimeout(() => {
          if (onSuccessNavigate) onSuccessNavigate();
        }, 1200);
      } else {
        const msg = result.error || 'Failed to save candidate.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      console.error('Failed to submit candidate:', err);
      const msg = getFriendlyErrorMessage(err, 'Failed to save candidate. Please verify your input.');
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#D93A30]" />
            <span>New Candidate Registration Form</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Submitting as: <strong className="text-slate-900 dark:text-white">{effectiveUser.name}</strong> ({effectiveUser.role.toUpperCase()})
            {effectiveUser.leaderName && ` • Leader: ${effectiveUser.leaderName}`}
            {effectiveUser.unitManagerName && ` • Unit: ${effectiveUser.unitManagerName}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {draftRestored && (
            <button
              type="button"
              onClick={clearDraft}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Draft
            </button>
          )}
          <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#1B2234] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-medium">
            <span className="text-[#D93A30] dark:text-red-400 font-bold">Initial Stage:</span> New Candidate
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Non-blocking duplicate warning alert */}
      {duplicateCandidate && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3 shadow-xs animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-300">
              Duplicate Candidate Notice
            </div>
            <p className="leading-relaxed">
              This candidate (<strong>{duplicateCandidate.fullName}</strong>) is already recorded in the system for <strong>{duplicateCandidate.company}</strong> under status <strong>&ldquo;{duplicateCandidate.status}&rdquo;</strong> by recruiter <strong>{duplicateCandidate.createdByName}</strong>.
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
              Informational notice only — you may proceed if submitting for a different account.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Candidate Personal Info */}
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <span className="w-6 h-6 rounded-full bg-red-50 dark:bg-[#D93A30]/20 text-[#D93A30] border border-red-200 dark:border-[#D93A30]/30 flex items-center justify-center text-xs font-bold">1</span>
            Personal &amp; Contact Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-[#D93A30]">*</span>
              </label>
              <input
                type="text"
                dir="auto"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ahmed Mohamed Hassan"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" /> Primary Phone (WhatsApp) <span className="text-[#D93A30]">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 01012345678"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Secondary Phone (Optional)
              </label>
              <input
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="e.g. 01123456789"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-500" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. candidate@gmail.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-500" /> Education Status
              </label>
              <select
                value={graduateStatus}
                onChange={(e) => setGraduateStatus(e.target.value as any)}
                className={inputClass}
              >
                <option value="Graduate">Graduate</option>
                <option value="Student">Student / Undergrad</option>
                <option value="Not graduate">Not Graduate / Dropped out</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-violet-500" /> National ID Number
                </span>
                {idData.age && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 font-mono tabular-nums">
                    Age: {idData.age} Years
                  </span>
                )}
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="14-digit Egyptian National ID"
                className={inputClass}
              />
              {idData.age ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold tabular-nums">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Auto-verified: Born {idData.birthDateStr} ({idData.age} years old)</span>
                </div>
              ) : idNumber.trim().length > 0 && idNumber.trim().length !== 14 ? (
                <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
                  {idNumber.trim().length}/14 digits
                </span>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D93A30]" /> Residential Area / Governorate <span className="text-[#D93A30]">*</span>
              </label>
              <input
                type="text"
                dir="auto"
                required
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Nasr City, Cairo / 6th of October / Giza"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Experience */}
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <span className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-xs font-bold">2</span>
            Work Experience &amp; Background
          </h3>

          <div className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Has Prior Experience?</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium cursor-pointer">
                <input
                  type="radio"
                  name="experience"
                  checked={hasExperience}
                  onChange={() => setHasExperience(true)}
                  className="accent-[#D93A30]"
                />
                Yes (Experienced)
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium cursor-pointer">
                <input
                  type="radio"
                  name="experience"
                  checked={!hasExperience}
                  onChange={() => setHasExperience(false)}
                  className="accent-[#D93A30]"
                />
                No / Fresh
              </label>
            </div>
          </div>

          {hasExperience && (
            <div className="space-y-4 pt-2 bg-slate-50 dark:bg-[#1B2234] p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Duration of Experience
                </label>
                <input
                  type="text"
                  value={experienceDuration}
                  onChange={(e) => setExperienceDuration(e.target.value)}
                  placeholder="e.g. 1.5 years / 6 months"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Experience Types (Select all that apply):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {COMMON_EXPERIENCE_TYPES.map((t) => {
                    const checked = selectedExpTypes.includes(t);
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-white font-semibold'
                            : 'bg-white dark:bg-[#0B0F19] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleExpType(t)}
                          className="rounded accent-sky-600"
                        />
                        <span className="truncate">{t}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Other Experience Type</label>
                <input
                  type="text"
                  value={customExpType}
                  onChange={(e) => setCustomExpType(e.target.value)}
                  placeholder="e.g. Quality Assurance / Team Leader"
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Company & Voice Notes */}
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <span className="w-6 h-6 rounded-full bg-red-50 dark:bg-[#D93A30]/20 text-[#D93A30] border border-red-200 dark:border-[#D93A30]/30 flex items-center justify-center text-xs font-bold">3</span>
            Target Vacancy &amp; Vocaroo Voice Notes
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#D93A30]" /> Company Applying For <span className="text-[#D93A30]">*</span>
              </label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
              >
                {(settings?.companies || ['TTEC', 'Teleperformance', 'eClerx', 'Alorica', 'Dial Expert', 'Total Trip']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Position Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
              >
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="Dutch">Dutch</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-[#D93A30]" /> Primary Vocaroo Voice Note Link <span className="text-[#D93A30]">*</span>
            </label>
            <input
              type="url"
              required
              value={vocarooUrl}
              onChange={(e) => setVocarooUrl(e.target.value)}
              placeholder="e.g. https://vocaroo.com/1xxxxxxxxx or https://voca.ro/1xxxxxxxxx"
              className={`w-full bg-white dark:bg-[#0B0F19] border rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                vocarooUrl.trim().length > 0 && !(vocarooUrl.includes('vocaroo.com') || vocarooUrl.includes('voca.ro'))
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : vocarooUrl.trim().length > 0
                  ? 'border-emerald-500 focus:ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:border-[#D93A30] focus:ring-[#D93A30]/15'
              }`}
            />

            {vocarooUrl.trim().length > 0 && (
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                {vocarooUrl.includes('vocaroo.com') || vocarooUrl.includes('voca.ro') ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Valid Vocaroo link detected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Warning: Link does not appear to be a valid vocaroo.com URL.</span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 p-3.5 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {settings?.vocarooInstructions ||
                    'Please record a 1-minute voice note introducing yourself in English (or the requested language) on Vocaroo (https://vocaroo.com), copy the link, and paste it here.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-700/70 pt-2 gap-2">
                <span>Direct link: <a href="https://vocaroo.com" target="_blank" rel="noreferrer" className="text-sky-600 dark:text-sky-400 font-semibold underline">vocaroo.com</a></span>
                <span className="flex items-center gap-1">
                  Agency Portal:
                  <a href={settings?.websiteLink || 'https://redz-recruitment.com'} target="_blank" rel="noreferrer" className="text-[#D93A30] dark:text-red-400 hover:underline flex items-center gap-1 font-semibold">
                    {settings?.websiteLink || 'redz-recruitment.com'} <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            {!hasSecondVoiceNote ? (
              <button
                type="button"
                onClick={() => setHasSecondVoiceNote(true)}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                + Add Second Vocaroo Voice Note (Bilingual / Multilingual Candidates)
              </button>
            ) : (
              <div className="bg-slate-50 dark:bg-[#1B2234] p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-sky-500" /> Second Voice Note (Language Assessment)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasSecondVoiceNote(false);
                      setVocarooUrl2('');
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Language</label>
                    <select
                      value={vocarooLanguage2}
                      onChange={(e) => setVocarooLanguage2(e.target.value)}
                      className={inputClass}
                    >
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="Dutch">Dutch</option>
                      <option value="Italian">Italian</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Vocaroo URL</label>
                    <input
                      type="url"
                      value={vocarooUrl2}
                      onChange={(e) => setVocarooUrl2(e.target.value)}
                      placeholder="https://vocaroo.com/..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Desired Interview Date */}
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <span className="w-6 h-6 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center text-xs font-bold">4</span>
            Interview Window &amp; Availability
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-500" /> Proposed Interview Date
              </label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Available Interview Time Window</label>
              <input
                type="text"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                placeholder="e.g. 11:00 AM - 3:00 PM"
                className={inputClass}
              />
            </div>
          </div>

          {matchedOffer?.interviewDays && (
            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 p-3 rounded-xl text-xs text-violet-800 dark:text-violet-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span><strong>{company} Interview Schedule:</strong> {matchedOffer.interviewDays}</span>
            </div>
          )}
        </div>

        {/* Section 5: Real-Time Eligibility Pre-Screening Card */}
        <div
          className={`p-5 rounded-2xl border transition-all shadow-xs ${
            eligibility.isEligible
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                eligibility.isEligible
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700'
                  : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700'
              }`}
            >
              {eligibility.isEligible ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <strong
                  className={`font-extrabold text-sm tracking-tight ${
                    eligibility.isEligible ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {eligibility.isEligible
                    ? `Eligibility Passed: 100% Qualified for ${company}`
                    : `Eligibility Alert: ${eligibility.warnings.length} Requirement Check(s) for ${company}`}
                </strong>
                {idData.age && (
                  <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0B0F19] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 w-fit tabular-nums">
                    Verified Age: {idData.age}
                  </span>
                )}
              </div>

              {!eligibility.isEligible ? (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-amber-700 dark:text-amber-200 font-semibold">
                    Please review client requirements before submitting to prevent candidate rejection:
                  </div>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-200 text-xs">
                    {eligibility.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 bg-white/80 dark:bg-black/25 p-2 rounded-lg border border-amber-200 dark:border-amber-800/40">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-emerald-700 dark:text-emerald-300/90 text-xs leading-relaxed">
                  Candidate satisfies all criteria for <strong>{company}</strong> ({language}): graduate qualification, age limits, and prerequisite experience verified.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#D93A30] hover:bg-[#b82e25] text-white shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {submitting ? 'Registering Candidate...' : 'Submit Candidate Application'}
          </button>
        </div>
      </form>
    </div>
  );
};
