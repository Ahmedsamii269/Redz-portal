import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstalled, install, isInstallable } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] shrink-0 cursor-pointer whitespace-nowrap"
        title="Install Redz Recruitment App on your phone or desktop"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-xs animate-modal-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                Install Redz Mobile App
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 py-1 text-slate-600 dark:text-slate-300">
              <p className="font-medium">
                To add this app to your phone or computer home screen:
              </p>

              <div className="bg-slate-50 dark:bg-[#1B2234] p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white">For iPhone / Safari (iOS):</div>
                <div>1. Tap the <strong className="text-slate-900 dark:text-white">Share</strong> button at the bottom toolbar.</div>
                <div>2. Scroll down and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.</div>
              </div>

              <div className="bg-slate-50 dark:bg-[#1B2234] p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white">For Android / Chrome:</div>
                <div>1. Tap your browser menu <strong className="text-slate-900 dark:text-white">(3 dots)</strong> in the top right.</div>
                <div>2. Tap <strong className="text-slate-900 dark:text-white">Install App</strong> or <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.</div>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full rounded-xl bg-[#D93A30] py-2.5 text-xs font-bold text-white hover:bg-[#b82e25] transition-all active:scale-[0.98] shadow-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
