import React, { useState } from 'react';
import { X, Send, Bell, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';

interface AnnouncementModalProps {
  onClose: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ onClose }) => {
  const { sendNotification, users } = useData();
  const { effectiveUser } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'role' | 'user'>('all');
  const [selectedRole, setSelectedRole] = useState<UserRole>('recruiter');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!title.trim() || !message.trim()) {
      showToast('Please enter both a title and message body.', 'warning');
      return;
    }
    if (targetAudience === 'user' && !selectedUserId) {
      showToast('Please select a team member recipient.', 'warning');
      return;
    }

    setSending(true);
    try {
      let targetUids: string[] | undefined = undefined;

      if (targetAudience === 'user' && selectedUserId) {
        targetUids = [selectedUserId];
      } else if (targetAudience === 'role') {
        targetUids = users.filter((u) => u.role === selectedRole).map((u) => u.id);
      }

      await sendNotification({
        title: title.trim(),
        message: message.trim(),
        type: 'announcement',
        targetUids,
        targetRole: targetAudience === 'role' ? selectedRole : 'all',
        createdBy: effectiveUser.id,
        createdByName: effectiveUser.name
      });

      showToast('Announcement sent to selected team members.', 'success');
      onClose();
    } catch (err: unknown) {
      showToast(getFriendlyErrorMessage(err, 'Failed to send announcement.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-[#D93A30]/15 border border-rose-200 dark:border-[#D93A30]/30 text-[#D93A30] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Broadcast Announcement</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">CEO agency-wide or team notification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Target Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'role', 'user'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTargetAudience(type)}
                  className={`py-2 px-3 rounded-xl border capitalize font-semibold transition-all active:scale-[0.98] ${
                    targetAudience === type
                      ? 'border-[#D93A30] bg-[#D93A30] text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'Everyone' : type === 'role' ? 'By Role' : 'Specific User'}
                </button>
              ))}
            </div>
          </div>

          {targetAudience === 'role' && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Select Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className={inputCls}
              >
                <option value="recruiter">All Recruiters</option>
                <option value="leader">All Team Leaders</option>
                <option value="unit_manager">All Unit Managers</option>
                <option value="account_manager">All Account Managers</option>
              </select>
            </div>
          )}

          {targetAudience === 'user' && (
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Select User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={inputCls}
              >
                <option value="">Choose team member...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Title</label>
            <input
              type="text"
              required
              dir="auto"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Urgent: New TP French Account Open"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Message Body</label>
            <textarea
              rows={4}
              required
              dir="auto"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write announcement message..."
              className={inputCls}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 rounded-xl font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-red-600/20 transition-all"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Sending...' : 'Broadcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
