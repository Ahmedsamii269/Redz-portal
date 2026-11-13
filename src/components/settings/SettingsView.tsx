import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Share2,
  MessageSquare,
  ShieldAlert,
  X,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmationTemplate } from '../../types';
import { EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateGeneralSettings,
    confirmationTemplates,
    saveConfirmationTemplate,
    deleteConfirmationTemplate,
    triggerSeed,
    clearAllCandidates
  } = useData();
  const { activeRole } = useAuth();
  const { showToast, confirmAction } = useToast();

  const isCeo = activeRole === 'ceo';

  const [copyFooter, setCopyFooter] = useState<string>(settings?.brand?.copyFooter || '');
  const [vocarooInstructions, setVocarooInstructions] = useState<string>(settings?.vocarooInstructions || '');
  const [websiteLink, setWebsiteLink] = useState<string>(settings?.websiteLink || '');
  const [companies, setCompanies] = useState<string[]>(settings?.companies || []);
  const [newCompanyInput, setNewCompanyInput] = useState<string>('');

  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [savingTpl, setSavingTpl] = useState<boolean>(false);
  const [deletingTplId, setDeletingTplId] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setCopyFooter(settings.brand?.copyFooter || '');
      setVocarooInstructions(settings.vocarooInstructions || '');
      setWebsiteLink(settings.websiteLink || '');
      setCompanies(settings.companies || []);
    }
  }, [settings]);

  const handleClearSampleData = async () => {
    if (clearing) return;
    const confirmed = await confirmAction({
      title: 'Clear All Candidates & Notifications',
      message: 'Are you sure you want to permanently delete all candidate records and notifications to start fresh?',
      confirmLabel: 'Clear All Data',
      dangerous: true
    });
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await clearAllCandidates();
      setSeedNotice(res.message);
      showToast(res.message, res.success ? 'success' : 'error');
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to clear candidate data.'), 'error');
    } finally {
      setClearing(false);
    }
  };

  const [editingTemplate, setEditingTemplate] = useState<ConfirmationTemplate | null>(null);
  const [tplCompany, setTplCompany] = useState<string>('');
  const [tplVariant, setTplVariant] = useState<string>('English');
  const [tplText, setTplText] = useState<string>('');
  const [showTplModal, setShowTplModal] = useState<boolean>(false);

  if (!isCeo) {
    return (
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <EmptyState
          icon={ShieldAlert}
          title="Restricted Access"
          description="Only the CEO can configure agency settings, client lists, and system templates."
        />
      </div>
    );
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true);
    try {
      await updateGeneralSettings({
        brand: {
          copyFooter,
          facebook: settings?.brand?.facebook || '',
          linkedin: settings?.brand?.linkedin || '',
          phonePlaceholder: '{{MY_PHONE}}'
        },
        vocarooInstructions: vocarooInstructions.trim(),
        websiteLink: websiteLink.trim(),
        companies
      });
      showToast('Agency settings saved successfully.', 'success');
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to save agency settings.'), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddCompany = () => {
    const trimmed = newCompanyInput.trim();
    if (trimmed && !companies.includes(trimmed)) {
      setCompanies([...companies, trimmed]);
      setNewCompanyInput('');
    }
  };

  const handleRemoveCompany = (c: string) => {
    setCompanies(companies.filter((item) => item !== c));
  };

  const handleTriggerSeed = async () => {
    if (seeding) return;
    const confirmed = await confirmAction({
      title: 'Re-seed Core Agency Templates',
      message: 'Reload agency job offers, commission rules, processes, and WhatsApp templates from system defaults?',
      confirmLabel: 'Re-seed Data',
      dangerous: false
    });
    if (!confirmed) return;

    setSeeding(true);
    try {
      const res = await triggerSeed(true);
      setSeedNotice(res.message);
      showToast(res.message, res.success ? 'success' : 'error');
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Database re-seed failed.'), 'error');
    } finally {
      setSeeding(false);
    }
  };

  const openTemplateEdit = (tpl: ConfirmationTemplate) => {
    setEditingTemplate(tpl);
    setTplCompany(tpl.company);
    setTplVariant(tpl.variant);
    setTplText(tpl.text);
    setShowTplModal(true);
  };

  const openTemplateCreate = () => {
    setEditingTemplate(null);
    setTplCompany(companies[0] || 'TTEC');
    setTplVariant('English');
    setTplText('');
    setShowTplModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingTpl) return;
    if (!tplCompany.trim() || !tplVariant.trim() || !tplText.trim()) {
      showToast('Please fill out company, variant, and template text.', 'warning');
      return;
    }
    setSavingTpl(true);
    try {
      await saveConfirmationTemplate({
        id: editingTemplate?.id,
        company: tplCompany.trim(),
        variant: tplVariant.trim(),
        text: tplText,
        usesPlaceholders: true
      });
      showToast(`WhatsApp template for ${tplCompany.trim()} saved.`, 'success');
      setShowTplModal(false);
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to save WhatsApp template.'), 'error');
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = async (tpl: ConfirmationTemplate) => {
    const confirmed = await confirmAction({
      title: 'Delete WhatsApp Template',
      message: `Delete the confirmation template for ${tpl.company} (${tpl.variant})?`,
      confirmLabel: 'Delete Template',
      dangerous: true
    });
    if (!confirmed) return;

    setDeletingTplId(tpl.id);
    try {
      await deleteConfirmationTemplate(tpl.id);
      showToast('Template deleted.', 'info');
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to delete template.'), 'error');
    } finally {
      setDeletingTplId(null);
    }
  };

  const inputCls =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-[#D93A30]" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Agency Core Configuration
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            System templates, client companies list, recruitment rules, and database seeding
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleClearSampleData}
            disabled={clearing}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <Trash2 className={`w-4 h-4 ${clearing ? 'animate-spin' : ''}`} />
            {clearing ? 'Clearing...' : 'Clear All Candidates'}
          </button>

          <button
            onClick={handleTriggerSeed}
            disabled={seeding}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <RotateCcw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
            {seeding ? 'Seeding...' : 'Reload / Re-seed Data'}
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{seedNotice}</span>
        </div>
      )}

      {/* General Form */}
      <form
        onSubmit={handleSaveGeneral}
        className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs"
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3.5 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#D93A30]" />
          Offer Copy Footer &amp; Agency Links
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Global Social Media Follow Footer (Appended to all copied job offers)
          </label>
          <textarea
            rows={4}
            dir="auto"
            value={copyFooter}
            onChange={(e) => setCopyFooter(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Official Website Link
            </label>
            <input
              type="url"
              value={websiteLink}
              onChange={(e) => setWebsiteLink(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Vocaroo Application Instructions
            </label>
            <input
              type="text"
              value={vocarooInstructions}
              onChange={(e) => setVocarooInstructions(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Companies list */}
        <div className="space-y-2.5 pt-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Active Client Companies (<span className="tabular-nums">{companies.length}</span>)
          </label>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <span
                key={c}
                className="bg-slate-100 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-2"
              >
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCompany(c)}
                  title={`Remove ${c}`}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newCompanyInput}
              onChange={(e) => setNewCompanyInput(e.target.value)}
              placeholder="Add client company name..."
              className="bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white flex-1 max-w-sm focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15"
            />
            <button
              type="button"
              onClick={handleAddCompany}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white transition-colors active:scale-[0.98]"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={savingSettings}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] flex items-center gap-2 shadow-sm shadow-red-600/20 disabled:opacity-50 transition-all"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* WhatsApp Confirmation Templates Section */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              WhatsApp Confirmation Templates (<span className="tabular-nums">{confirmationTemplates.length}</span>)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pre-approved messages dispatched to candidates when scheduled for an interview
            </p>
          </div>

          <button
            onClick={openTemplateCreate}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-xs active:scale-[0.98] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Template
          </button>
        </div>

        {confirmationTemplates.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No WhatsApp Templates Saved"
            description="Create pre-formatted interview confirmation messages per client account."
            actionLabel="Add Template"
            onAction={openTemplateCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {confirmationTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-slate-50/70 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/70 rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>{tpl.company}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                      {tpl.variant}
                    </span>
                  </h4>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openTemplateEdit(tpl)}
                      title="Edit Template"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={deletingTplId === tpl.id}
                      onClick={() => handleDeleteTemplate(tpl)}
                      title="Delete Template"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingTplId === tpl.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  dir="auto"
                  className="bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 p-3 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed"
                >
                  {tpl.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTplModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTemplate ? 'Edit WhatsApp Template' : 'New WhatsApp Template'}
              </h3>
              <button
                onClick={() => setShowTplModal(false)}
                title="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Company</label>
                  <input
                    type="text"
                    required
                    value={tplCompany}
                    onChange={(e) => setTplCompany(e.target.value)}
                    placeholder="e.g. Teleperformance"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Variant / Language
                  </label>
                  <input
                    type="text"
                    required
                    value={tplVariant}
                    onChange={(e) => setTplVariant(e.target.value)}
                    placeholder="e.g. English / French"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Template Text (Use [Candidate Name] and [Day])
                </label>
                <textarea
                  rows={8}
                  required
                  dir="auto"
                  value={tplText}
                  onChange={(e) => setTplText(e.target.value)}
                  className={`${inputCls} font-mono leading-relaxed`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTplModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTpl}
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-red-600/20 transition-all flex items-center gap-2"
                >
                  {savingTpl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {savingTpl ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
