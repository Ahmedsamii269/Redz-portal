import React from 'react';
import { Volume2, ExternalLink } from 'lucide-react';

interface VocarooPlayerProps {
  url: string;
  label?: string;
  language?: string;
}

export const VocarooPlayer: React.FC<VocarooPlayerProps> = ({ url, label, language }) => {
  if (!url) return null;

  const match = url.match(/(?:vocaroo\.com\/|voca\.ro\/)([a-zA-Z0-9]+)/);
  const vocarooId = match ? match[1] : null;

  return (
    <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 flex flex-col gap-1.5 text-xs shadow-xs">
      <div className="flex items-center justify-between text-slate-700 dark:text-slate-200 font-semibold">
        <span className="flex items-center gap-1.5 text-[#D93A30] dark:text-red-400">
          <Volume2 className="w-3.5 h-3.5 text-[#D93A30]" />
          <span>{label || 'Voice Note'}</span>
          {language && (
            <span className="bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              {language}
            </span>
          )}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center gap-1 transition-colors"
          title="Open in Vocaroo"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {vocarooId ? (
        <iframe
          width="100%"
          height="60"
          src={`https://vocaroo.com/embed/${vocarooId}?autoplay=0`}
          frameBorder="0"
          title={`Vocaroo player ${vocarooId}`}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black/40"
        />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-600 dark:text-sky-400 underline hover:opacity-80 truncate"
        >
          {url}
        </a>
      )}
    </div>
  );
};
