import React, { useState } from 'react';
import {
  Copy,
  Check,
  Plus,
  BookOpen,
  ArrowRight,
  Search,
  Building,
  MapPin,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  Globe,
  Sparkles,
  Briefcase,
  Loader2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { JobOffer, UserRole } from '../../types';
import { InterviewMaterialModal } from './InterviewMaterialModal';
import { OfferEditorModal } from './OfferEditorModal';
import { CardGridSkeleton, EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface OffersViewProps {
  onNavigateToProcess?: (company: string) => void;
  onNavigateToProfile?: () => void;
}

export const OffersView: React.FC<OffersViewProps> = ({ onNavigateToProcess, onNavigateToProfile }) => {
  const { offers, settings, deleteOffer, dataLoading } = useData();
  const { effectiveUser, activeRole } = useAuth();
  const { showToast, confirmAction } = useToast();

  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMaterialOffer, setActiveMaterialOffer] = useState<JobOffer | null>(null);
  const [editingOffer, setEditingOffer] = useState<JobOffer | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null);
  const [showPhonePrompt, setShowPhonePrompt] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isCeo = activeRole === 'ceo';

  // Extract unique languages & companies
  const languages = ['All', ...Array.from(new Set(offers.map((o) => o.language).filter(Boolean)))];
  const companies = ['All', ...Array.from(new Set(offers.map((o) => o.company).filter(Boolean)))];

  // Filtering
  const filteredOffers = offers.filter((o) => {
    const isAdmin = activeRole === 'ceo' || activeRole === 'account_manager';

    if (!isAdmin) {
      if (!o.active) return false;

      if (o.allowedRoles && o.allowedRoles.length > 0) {
        if (!o.allowedRoles.includes(activeRole as UserRole)) return false;
      }
    }

    if (selectedLanguage !== 'All' && o.language !== selectedLanguage) return false;
    if (selectedCompany !== 'All' && o.company !== selectedCompany) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchComp = (o.company || '').toLowerCase().includes(q);
      const matchLoc = (o.location || '').toLowerCase().includes(q);
      const matchText = (o.offerText || '').toLowerCase().includes(q);
      const matchLang = (o.language || '').toLowerCase().includes(q);
      if (!matchComp && !matchLoc && !matchText && !matchLang) return false;
    }
    return true;
  });

  const handleCopyOffer = (offer: JobOffer) => {
    const userPhone = effectiveUser.phone?.trim();
    if (!userPhone) {
      setShowPhonePrompt(true);
      return;
    }

    let rawText = offer.offerText || '';
    rawText = rawText.replace(/\{\{MY_PHONE\}\}/g, userPhone);

    // Safety net: strip forbidden partner names if accidentally present
    rawText = rawText.replace(/mosla\s*pioneers/gi, 'Redz Recruitment');
    rawText = rawText.replace(/career\s*core/gi, 'Redz Recruitment');

    const footer =
      settings?.brand?.copyFooter ||
      `🔔 Follow us for more job offers:\n📘 Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr\n💼 LinkedIn: https://www.linkedin.com/company/redz-recruitment1/`;
    const fullTextToCopy = `${rawText}\n\n${footer}`;

    navigator.clipboard
      .writeText(fullTextToCopy)
      .then(() => {
        setCopiedOfferId(offer.id);
        showToast(`Offer for ${offer.company} copied to clipboard.`, 'success');
        setTimeout(() => setCopiedOfferId(null), 2500);
      })
      .catch(() => {
        showToast('Unable to copy to clipboard. Please copy manually.', 'error');
      });
  };

  const handleDeleteOffer = async (offer: JobOffer) => {
    const confirmed = await confirmAction({
      title: 'Delete Job Offer',
      message: `Are you sure you want to delete the ${offer.language} offer for ${offer.company}?`,
      confirmLabel: 'Delete Offer',
      dangerous: true
    });
    if (!confirmed) return;

    setDeletingId(offer.id);
    try {
      await deleteOffer(offer.id);
      showToast(`Offer for ${offer.company} deleted.`, 'info');
    } catch (err: any) {
      showToast(getFriendlyErrorMessage(err, 'Failed to delete offer.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const hasActiveFilters =
    selectedLanguage !== 'All' || selectedCompany !== 'All' || searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5 tracking-tight">
            <span>Job Vacancies &amp; Social Offers</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-[#D93A30] dark:text-rose-300 font-bold tabular-nums">
              {filteredOffers.length} available
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Click <strong className="text-slate-900 dark:text-white font-bold">COPY OFFER POST</strong> to copy the vacancy with your phone number (
            <span className="text-[#D93A30] font-semibold font-mono tabular-nums">
              {effectiveUser.phone || 'No phone set yet'}
            </span>
            ).
            {isCeo && (
              <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                ★ Editing an offer also syncs its company WhatsApp confirmation message.
              </span>
            )}
          </p>
        </div>

        {isCeo && (
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-red-600/20 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add New Offer
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#131826] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[210px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search company, location, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
          />
        </div>

        {/* Language Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
          <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0 mr-0.5" />
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.98] ${
                selectedLanguage === lang
                  ? 'bg-[#D93A30] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Company Dropdown */}
        <div className="flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
          >
            {companies.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Companies' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading / Grid / Empty States */}
      {dataLoading && offers.length === 0 ? (
        <CardGridSkeleton count={6} />
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <EmptyState
            icon={Briefcase}
            title="No Job Offers Found"
            description="No active job vacancies match your selected language, company, or search keywords."
            actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
            onAction={
              hasActiveFilters
                ? () => {
                    setSelectedLanguage('All');
                    setSelectedCompany('All');
                    setSearchQuery('');
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOffers.map((offer) => {
            const isCopied = copiedOfferId === offer.id;
            const displayPhone = effectiveUser.phone || '{{YOUR_PHONE}}';
            const renderedPreview = (offer.offerText || '').replace(/\{\{MY_PHONE\}\}/g, displayPhone);

            return (
              <div
                key={offer.id}
                className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-xs group"
              >
                {/* Card Header */}
                <div className="p-5 pb-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0F1420]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#D93A30] transition-colors truncate">
                          {offer.company}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                          {offer.language}
                        </span>
                        {!offer.active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{offer.location || 'Cairo'}</span>
                      </div>
                    </div>

                    {isCeo && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingOffer(offer)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Offer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer)}
                          disabled={deletingId === offer.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                          title="Delete Offer"
                        >
                          {deletingId === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {offer.interviewDays && (
                    <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1B2234] px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/70">
                      <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 font-medium">{offer.interviewDays}</span>
                    </div>
                  )}
                </div>

                {/* Offer Text Preview */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div dir="auto" className="bg-slate-50 dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-text">
                    {renderedPreview}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1B2234] px-2.5 py-2 rounded-lg border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D93A30] shrink-0" />
                    <span>Copies with your phone &amp; Redz Facebook/LinkedIn follow footer</span>
                  </div>
                </div>

                {/* Buttons row */}
                <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0F1420] flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setActiveMaterialOffer(offer)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-[0.98]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      Material
                    </button>
                    <button
                      onClick={() => onNavigateToProcess && onNavigateToProcess(offer.company)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-[0.98]"
                    >
                      <span>Process</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#D93A30]" />
                    </button>
                  </div>

                  {/* Primary Copy CTA */}
                  <button
                    onClick={() => handleCopyOffer(offer)}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-[#D93A30] hover:bg-[#b82e25] text-white shadow-red-600/20'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        COPIED TO CLIPBOARD!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        COPY OFFER POST
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phone prompt modal */}
      {showPhonePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-modal-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Your Phone Number First</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Before copying job offers, save your WhatsApp phone number in your profile so candidates can reach you directly.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowPhonePrompt(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPhonePrompt(false);
                  if (onNavigateToProfile) onNavigateToProfile();
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all shadow-sm"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InterviewMaterialModal
        offer={activeMaterialOffer}
        onClose={() => setActiveMaterialOffer(null)}
      />

      {(editingOffer || isCreatingNew) && (
        <OfferEditorModal
          offer={editingOffer}
          onClose={() => {
            setEditingOffer(null);
            setIsCreatingNew(false);
          }}
        />
      )}
    </div>
  );
};
