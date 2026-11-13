import React, { useState, useEffect } from 'react';
import {
  Phone,
  Wallet,
  CreditCard,
  Globe,
  Share2,
  CheckCircle,
  AlertCircle,
  Save,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getRoleBadgeClasses } from '../../lib/statusStyles';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

export const ProfileView: React.FC = () => {
  const { effectiveUser, updateProfileData } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState<string>(effectiveUser.name || '');
  const [phone, setPhone] = useState<string>(effectiveUser.phone || '');
  const [instaPay, setInstaPay] = useState<string>(effectiveUser.instaPay || '');
  const [mobileWallet, setMobileWallet] = useState<string>(effectiveUser.mobileWallet || '');
  const [facebook, setFacebook] = useState<string>(effectiveUser.facebook || '');
  const [linkedin, setLinkedin] = useState<string>(effectiveUser.linkedin || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(effectiveUser.name || '');
    setPhone(effectiveUser.phone || '');
    setInstaPay(effectiveUser.instaPay || '');
    setMobileWallet(effectiveUser.mobileWallet || '');
    setFacebook(effectiveUser.facebook || '');
    setLinkedin(effectiveUser.linkedin || '');
  }, [
    effectiveUser.id,
    effectiveUser.name,
    effectiveUser.phone,
    effectiveUser.instaPay,
    effectiveUser.mobileWallet,
    effectiveUser.facebook,
    effectiveUser.linkedin
  ]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedFb = facebook.trim();
    const trimmedLi = linkedin.trim();

    if (trimmedName.length < 2) {
      const msg = 'Please enter a valid full name (at least 2 characters).';
      setErrorMsg(msg);
      showToast(msg, 'warning');
      return;
    }

    if (trimmedPhone.replace(/\D/g, '').length < 8) {
      const msg = 'Please enter a valid WhatsApp phone number (at least 8 digits).';
      setErrorMsg(msg);
      showToast(msg, 'warning');
      return;
    }

    if (trimmedFb && !/^https?:\/\//i.test(trimmedFb)) {
      const msg = 'Facebook URL must start with http:// or https://.';
      setErrorMsg(msg);
      showToast(msg, 'warning');
      return;
    }

    if (trimmedLi && !/^https?:\/\//i.test(trimmedLi)) {
      const msg = 'LinkedIn URL must start with http:// or https://.';
      setErrorMsg(msg);
      showToast(msg, 'warning');
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    try {
      await updateProfileData({
        name: trimmedName,
        phone: trimmedPhone,
        instaPay: instaPay.trim(),
        mobileWallet: mobileWallet.trim(),
        facebook: trimmedFb,
        linkedin: trimmedLi
      });
      setSavedSuccess(true);
      showToast('Profile details saved successfully.', 'success');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Failed to save profile changes.');
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex items-center gap-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#D93A30] to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-md shrink-0">
          {(name || effectiveUser.email || 'U').trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 dark:text-white truncate" dir="auto" title={name}>
            {name || 'Team Member'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getRoleBadgeClasses(
                effectiveUser.role
              )}`}
            >
              {effectiveUser.role.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{effectiveUser.email}</span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Profile updated successfully! Offer copy links will now use your updated WhatsApp number.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs"
      >
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D93A30]" />
            Personal Contact &amp; Commission Payout Details
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Your phone number is injected automatically into all job offers when you copy them to social media.
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
          <input
            type="text"
            required
            dir="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Phone (WhatsApp) */}
        <div className="bg-slate-50 dark:bg-[#1B2234] p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-emerald-500" />
            WhatsApp Phone Number (Required for Offer Copying)
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Replaces{' '}
            <code className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[#D93A30] font-mono">
              {'{{MY_PHONE}}'}
            </code>{' '}
            in every job vacancy you copy.
          </p>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +201012345678 or 01012345678"
            className={`${inputCls} font-mono tabular-nums`}
          />
        </div>

        {/* Payout Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-purple-500" />
              InstaPay Handle / Number
            </label>
            <input
              type="text"
              value={instaPay}
              onChange={(e) => setInstaPay(e.target.value)}
              placeholder="e.g. username@instapay"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
              Mobile Wallet (Vodafone/Orange Cash)
            </label>
            <input
              type="tel"
              value={mobileWallet}
              onChange={(e) => setMobileWallet(e.target.value)}
              placeholder="e.g. 01012345678"
              className={`${inputCls} font-mono tabular-nums`}
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              Facebook Profile URL (Recruitment Posts)
            </label>
            <input
              type="url"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className={inputCls}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-red-600/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Profile Details'}
          </button>
        </div>
      </form>
    </div>
  );
};
