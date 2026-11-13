import React from 'react';
import { UserProfile } from '../../types';
import { User, Users, Shield } from 'lucide-react';
import { getRoleBadgeClasses } from '../../lib/statusStyles';

interface TeamTreeProps {
  users: UserProfile[];
}

export const TeamTree: React.FC<TeamTreeProps> = ({ users }) => {
  const ceo = users.find(u => u.role === 'ceo');
  const accountManagers = users.filter(u => u.role === 'account_manager');

  const renderNode = (user: UserProfile, level: number = 0) => {
    const subordinates = users.filter(u =>
      (user.role === 'ceo' && !u.unitManagerId && !u.leaderId && u.role !== 'ceo') ||
      (user.role === 'unit_manager' && u.unitManagerId === user.id && !u.leaderId) ||
      (user.role === 'leader' && u.leaderId === user.id)
    );

    const nodeCardStyle =
      user.role === 'ceo'
        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70'
        : user.role === 'unit_manager'
        ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50'
        : user.role === 'leader'
        ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50'
        : 'bg-slate-50 dark:bg-[#1B2234] border-slate-200 dark:border-slate-700/70';

    const avatarStyle =
      user.role === 'ceo'
        ? 'bg-[#D93A30] text-white'
        : user.role === 'unit_manager'
        ? 'bg-purple-600 text-white'
        : user.role === 'leader'
        ? 'bg-blue-600 text-white'
        : 'bg-slate-600 dark:bg-slate-700 text-white';

    return (
      <div key={user.id} className="space-y-2">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${nodeCardStyle}`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${avatarStyle}`}>
            {user.role === 'ceo' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{user.name}</div>
            <span
              className={`inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${getRoleBadgeClasses(
                user.role
              )}`}
            >
              {user.role.replace('_', ' ')}
            </span>
          </div>
          {subordinates.length > 0 && (
            <div className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold tabular-nums whitespace-nowrap">
              {subordinates.length} Directs
            </div>
          )}
        </div>
        {subordinates.length > 0 && (
          <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-4 py-1">
            {subordinates.map(sub => renderNode(sub, 0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Users className="w-5 h-5 text-[#D93A30]" />
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Agency Organization Tree
        </h3>
      </div>

      <div className="space-y-4">
        {ceo && renderNode(ceo)}

        {accountManagers.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              Account Management (Ops)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accountManagers.map(am => (
                <div
                  key={am.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-amber-50/70 dark:bg-amber-950/15 border-amber-200 dark:border-amber-800/40"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{am.name}</div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 uppercase tracking-tight font-bold">
                      Account Manager
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
