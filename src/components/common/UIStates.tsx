import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 6
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((__, cIdx) => (
            <td key={cIdx} className="px-4 py-4">
              <div
                className={`h-3.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 ${
                  cIdx === 0 ? 'w-36' : cIdx === cols - 1 ? 'w-20 ml-auto' : 'w-24'
                }`}
              />
              {cIdx === 0 && (
                <div className="h-2.5 w-24 rounded-md bg-slate-100 dark:bg-slate-800/60 mt-2" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/70 rounded-md" />
            </div>
            <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/70 rounded" />
            <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const KpiGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 animate-pulse shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/70 rounded" />
        </div>
      ))}
    </div>
  );
};

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : (
        actionLabel &&
        onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#D93A30] hover:bg-[#b82e25] text-white transition-all shadow-xs active:scale-[0.98]"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
};
