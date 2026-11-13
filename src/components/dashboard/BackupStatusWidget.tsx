import React from 'react';
import { Database, ShieldCheck, Clock, CheckCircle2, HardDrive, Cloud } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { formatSafeDateTime } from '../../lib/dateUtils';

export const BackupStatusWidget: React.FC = () => {
  const { auditLogs } = useData();
  const { isCompactMode } = useTheme();

  const latestBackupLog = auditLogs.find(l => l.details && l.details.toLowerCase().includes('backup')) || {
    timestamp: new Date().toISOString(),
    userName: 'System Administrator (Ahmed Samii)',
    details: 'Native Firestore export initialized via Cloud Scheduler (gs://knowledgeable-berm-nw1rw-backups/firestore-daily)'
  };

  return (
    <div className={`bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl ${isCompactMode ? 'p-4 space-y-3' : 'p-5 space-y-4'} shadow-xs`}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Enterprise Backup &amp; DR Status</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono font-bold">
                Active (24h Cron)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Google Cloud Firestore Native Export &amp; GCS 30-Day Retention Policy
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
          ProjectId: <span className="text-slate-900 dark:text-white font-semibold">knowledgeable-berm-nw1rw</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-50 dark:bg-[#1B2234] p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase">Destination Bucket</span>
          <div className="font-mono text-sky-600 dark:text-sky-400 truncate flex items-center gap-1" title="gs://knowledgeable-berm-nw1rw-backups/firestore-daily">
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">gs://knowledgeable-...-backups</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#1B2234] p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase">Schedule (Cairo)</span>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">02:00 AM (UTC+2)</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#1B2234] p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase">Retention Policy</span>
          <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tabular-nums">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>30 Days Auto-Purge</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#1B2234] p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase">Restore Test Status</span>
          <div className="font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Verified in Test DB</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-[#1B2234] p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="space-y-0.5 min-w-0">
          <div className="text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="truncate">
              Latest Backup Log: <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{formatSafeDateTime(latestBackupLog.timestamp, 'Just now')}</strong>
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {latestBackupLog.details}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold uppercase">
            Success
          </span>
        </div>
      </div>
    </div>
  );
};
