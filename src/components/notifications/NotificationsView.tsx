import React, { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AnnouncementModal } from './AnnouncementModal';
import { EmptyState } from '../common/UIStates';
import { safeParseDate } from '../../lib/dateUtils';

export const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead } = useData();
  const { effectiveUser, activeRole } = useAuth();
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);

  const isCeo = activeRole === 'ceo';

  const userNotifications = notifications.filter((n) => {
    if (!n.targetUids || n.targetUids.length === 0) return true;
    if (n.targetUids.includes(effectiveUser.id)) return true;
    if (n.targetRole && (n.targetRole === 'all' || n.targetRole === effectiveUser.role)) return true;
    return false;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#D93A30]" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Notifications &amp; Activity Feed
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time stage transitions, candidate submissions, and agency announcements
          </p>
        </div>

        {isCeo && (
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-red-600/20 shrink-0 whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            Send Announcement
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {userNotifications.map((notif) => {
          const isRead = notif.readBy && notif.readBy.includes(effectiveUser.id);

          return (
            <div
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                isRead
                  ? 'bg-slate-50/70 dark:bg-[#0F1420] border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400'
                  : 'bg-white dark:bg-[#131826] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  notif.type === 'commission'
                    ? 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                    : notif.type === 'announcement'
                    ? 'bg-rose-50 dark:bg-[#D93A30]/15 text-[#D93A30] border border-rose-200 dark:border-[#D93A30]/30'
                    : notif.type === 'candidate'
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                    : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                }`}
              >
                <Bell className="w-4 h-4" />
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" dir="auto">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0 font-mono tabular-nums">
                    {(() => {
                      const d = safeParseDate(notif.createdAt);
                      return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    })()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed" dir="auto">
                  {notif.message}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span>
                    Type: <strong className="text-slate-700 dark:text-slate-300 capitalize">{notif.type}</strong>
                  </span>
                  {notif.createdByName && (
                    <span>
                      • By: <strong className="text-slate-700 dark:text-slate-300">{notif.createdByName}</strong>
                    </span>
                  )}
                  {!isRead && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 text-[#D93A30] dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-bold text-[10px]">
                      New
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {userNotifications.length === 0 && (
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <EmptyState
              icon={Bell}
              title="No Notifications Yet"
              description="Stage updates, candidate alerts, and agency-wide announcements will appear right here."
            />
          </div>
        )}
      </div>

      {showBroadcastModal && <AnnouncementModal onClose={() => setShowBroadcastModal(false)} />}
    </div>
  );
};
