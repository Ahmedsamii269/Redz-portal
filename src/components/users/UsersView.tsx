import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Eye,
  ArrowLeft,
  Clock,
  ShieldAlert,
  X,
  Loader2,
  EyeOff
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { UserProfile, UserRole } from '../../types';
import { getRoleBadgeClasses } from '../../lib/statusStyles';
import { TableSkeleton, EmptyState } from '../common/UIStates';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { formatSafeDateTime } from '../../lib/dateUtils';

export const UsersView: React.FC = () => {
  const { users, saveUser, onlineUsers, dataLoading } = useData();
  const { activeRole, switchSimulatedUser, simulatedUser, resetToRealUser } = useAuth();
  const { isCompactMode } = useTheme();
  const { showToast } = useToast();

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('recruiter');
  const [leaderId, setLeaderId] = useState<string>('');
  const [unitManagerId, setUnitManagerId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [instaPay, setInstaPay] = useState<string>('');
  const [mobileWallet, setMobileWallet] = useState<string>('');
  const [temporaryPassword, setTemporaryPassword] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (activeRole !== 'ceo') {
    return (
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <EmptyState
          icon={ShieldAlert}
          title="Restricted Access"
          description="Only the CEO can manage agency users, access roles, and team hierarchy."
        />
      </div>
    );
  }

  const availableLeaders = users.filter((u) => u.role === 'leader' || u.role === 'ceo');
  const availableUnitManagers = users.filter((u) => u.role === 'unit_manager' || u.role === 'ceo');

  const openEdit = (u: UserProfile) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setUsername(u.username || '');
    setPassword('');
    setRole(u.role);
    setLeaderId(u.leaderId || '');
    setUnitManagerId(u.unitManagerId || '');
    setPhone(u.phone || '');
    setInstaPay(u.instaPay || '');
    setMobileWallet(u.mobileWallet || '');
    setTemporaryPassword(u.temporaryPassword || '');
    setDisabled(u.disabled || false);
    setSaveError(null);
    setIsCreating(true);
  };

  const openCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setRole('recruiter');
    setLeaderId('');
    setUnitManagerId('');
    setPhone('');
    setInstaPay('');
    setMobileWallet('');
    setTemporaryPassword('');
    setDisabled(false);
    setSaveError(null);
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const rawEmail = email.trim();
    const trimmedUsername = username.trim().replace(/\s+/g, '_');
    const trimmedPassword = password.trim();

    if (trimmedName.length < 2) {
      setSaveError('Please enter a valid full name (at least 2 characters).');
      return;
    }

    if (!rawEmail && !trimmedUsername) {
      setSaveError('Please enter an Email address or a Username.');
      return;
    }

    if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      setSaveError('Please enter a valid email address (or leave Email blank to create a username-only login).');
      return;
    }

    const effectiveEmail = rawEmail || `${trimmedUsername.toLowerCase()}@redz-agency.com`;

    if (!editingUser && effectiveEmail.endsWith('@redz-agency.com') && trimmedPassword.length < 6) {
      setSaveError('Please set a password (at least 6 characters) for username-only accounts.');
      return;
    }

    if (trimmedPassword.length > 0 && trimmedPassword.length < 6) {
      setSaveError('Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const selectedLeader = users.find((u) => u.id === leaderId);
    const selectedUnit = users.find((u) => u.id === unitManagerId);

    let createdAuthUid: string | undefined;
    let passwordAlreadyExistsWarning = false;

    if (trimmedPassword.length > 0) {
      try {
        const { initializeApp, getApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword, signOut, inMemoryPersistence, setPersistence } = await import('firebase/auth');
        const config = (await import('../../../firebase-applet-config.json')).default;

        let secondaryApp;
        try {
          secondaryApp = getApp('Secondary');
        } catch {
          secondaryApp = initializeApp(config, 'Secondary');
        }

        const secondaryAuth = getAuth(secondaryApp);
        await setPersistence(secondaryAuth, inMemoryPersistence);

        try {
          const cred = await createUserWithEmailAndPassword(secondaryAuth, effectiveEmail, trimmedPassword);
          createdAuthUid = cred.user.uid;
          await signOut(secondaryAuth).catch(() => {});
        } catch (authErr: any) {
          if (authErr?.code === 'auth/email-already-in-use') {
            passwordAlreadyExistsWarning = true;
          } else {
            throw authErr;
          }
        }
      } catch (err: unknown) {
        const msg = getFriendlyErrorMessage(err, 'Failed to create login credentials.');
        setSaveError(msg);
        showToast(msg, 'error');
        setSaving(false);
        return;
      }
    }

    try {
      const userData = {
        id: editingUser?.id || createdAuthUid || undefined,
        name: trimmedName,
        email: effectiveEmail,
        username: trimmedUsername || undefined,
        role,
        leaderId: leaderId || undefined,
        leaderName: selectedLeader?.name,
        unitManagerId: unitManagerId || undefined,
        unitManagerName: selectedUnit?.name,
        phone: phone.trim() || undefined,
        instaPay: instaPay.trim() || undefined,
        mobileWallet: mobileWallet.trim() || undefined,
        disabled,
        temporaryPassword: temporaryPassword.trim() || undefined,
        createdAt: editingUser?.createdAt || new Date().toISOString()
      };

      const res = await saveUser(userData);
      if (res.success) {
        if (passwordAlreadyExistsWarning) {
          showToast(
            `Saved ${trimmedName}, but an auth login already existed for ${effectiveEmail}. If they forgot their password, ask them to click "Forgot password?" on login.`,
            'warning'
          );
        } else {
          showToast(editingUser ? `Updated user ${trimmedName}.` : `Created user ${trimmedName} — ready to sign in!`, 'success');
        }
        setIsCreating(false);
        setEditingUser(null);
      } else {
        const msg = res.error || 'Failed to save user.';
        setSaveError(msg);
        showToast(msg, 'error');
      }
    } catch (err: unknown) {
      const msg = getFriendlyErrorMessage(err, 'Unexpected error saving user.');
      setSaveError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5 tracking-tight">
            <Users className="w-5 h-5 text-[#D93A30]" />
            <span>Agency User Management &amp; Hierarchy</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 tabular-nums">
              {users.length} members
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            Assign Team Leaders and Unit Managers. Unassigned team members report directly under CEO.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-red-600/20 shrink-0 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
              <tr
                className={`font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                  isCompactMode ? 'text-[9px]' : 'text-[11px]'
                }`}
              >
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>User</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>Role</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>Team Leader</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>Unit Manager</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>WhatsApp Phone</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>Payout Wallet / InstaPay</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>Status</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'}`}>Last Login / Security</th>
                <th className={`${isCompactMode ? 'py-2.5 px-3' : 'py-3.5 px-4'} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dataLoading && users.length === 0 ? (
                <TableSkeleton rows={6} cols={9} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={Users}
                      title="No Team Members Found"
                      description="Add recruiters, team leaders, and unit managers to build your Redz Recruitment hierarchy."
                      actionLabel="Add Team Member"
                      onAction={openCreate}
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1B2234]/50 transition-colors">
                    {/* User */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]" dir="auto" title={u.name}>
                        {u.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {u.email}{' '}
                        {u.username && (
                          <span className="text-cyan-600 dark:text-cyan-400 font-medium ml-1">
                            • @{u.username}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${getRoleBadgeClasses(
                          u.role
                        )}`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Leader */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} text-slate-700 dark:text-slate-300`}>
                      {u.leaderName || (u.role === 'ceo' ? '—' : <span className="text-slate-400 italic">Direct under CEO</span>)}
                    </td>

                    {/* Unit */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} text-slate-700 dark:text-slate-300`}>
                      {u.unitManagerName || (u.role === 'ceo' ? '—' : <span className="text-slate-400 italic">Direct under CEO</span>)}
                    </td>

                    {/* Phone */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} font-mono tabular-nums text-slate-700 dark:text-slate-300`}>
                      {u.phone || <span className="text-slate-400">—</span>}
                    </td>

                    {/* Payout */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} text-[11px]`}>
                      {u.instaPay && (
                        <div className="text-purple-600 dark:text-purple-400 font-mono">Insta: {u.instaPay}</div>
                      )}
                      {u.mobileWallet && (
                        <div className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                          Wallet: {u.mobileWallet}
                        </div>
                      )}
                      {!u.instaPay && !u.mobileWallet && <span className="text-slate-400">—</span>}
                    </td>

                    {/* Status */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <div className="flex flex-col gap-1">
                        {onlineUsers.some(p => p.userId === u.id) ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold w-fit whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold w-fit whitespace-nowrap">
                            Offline
                          </span>
                        )}
                        {u.disabled && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-bold w-fit whitespace-nowrap">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Security/Login info */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        {u.lastLoginAt ? (
                          <>
                            <div className="flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{formatSafeDateTime(u.lastLoginAt, 'Unknown')}</span>
                            </div>
                            <div className="font-mono text-slate-400 truncate max-w-[120px]">
                              {u.lastLoginDevice || 'Unknown Device'}
                            </div>
                          </>
                        ) : (
                          <span className="italic text-slate-400">Never logged in</span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} text-right`}>
                      <div className="flex items-center justify-end gap-1.5">
                        {simulatedUser && simulatedUser.id === u.id ? (
                          <button
                            onClick={resetToRealUser}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap active:scale-[0.98]"
                            title="Exit impersonation and return to CEO mode"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>Exit View</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => switchSimulatedUser(u)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-200 hover:text-white border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all whitespace-nowrap active:scale-[0.98]"
                            title={`Switch perspective and enter app as ${u.name}`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Enter View</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                          title="Edit user details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1420]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingUser ? `Edit User: ${editingUser.name}` : 'Create New Agency Team Member'}
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                title="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    dir="auto"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mostafa Ali"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Email <span className="text-[10px] font-normal text-slate-400">(optional if Username set)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. mostafa@redz.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. mostafa_ali"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Set Password <span className="text-[10px] font-normal text-slate-400">(min 6 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Min 6 characters'}
                      className={`${inputCls} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={inputCls}
                >
                  <option value="recruiter">Recruiter</option>
                  <option value="leader">Team Leader</option>
                  <option value="unit_manager">Unit Manager</option>
                  <option value="account_manager">Account Manager</option>
                  <option value="ceo">CEO (Founder &amp; CEO)</option>
                </select>
              </div>

              {/* Hierarchy Assigners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-[#1B2234] p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Team Leader</label>
                  <select
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">None (Direct under CEO)</option>
                    {availableLeaders.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Unit Manager</label>
                  <select
                    value={unitManagerId}
                    onChange={(e) => setUnitManagerId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">None (Direct under CEO)</option>
                    {availableUnitManagers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & Wallets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010..."
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">InstaPay</label>
                  <input
                    type="text"
                    value={instaPay}
                    onChange={(e) => setInstaPay(e.target.value)}
                    placeholder="handle"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Mobile Wallet</label>
                  <input
                    type="tel"
                    value={mobileWallet}
                    onChange={(e) => setMobileWallet(e.target.value)}
                    placeholder="010..."
                    className={`${inputCls} font-mono tabular-nums`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-disabled"
                  checked={disabled}
                  onChange={(e) => setDisabled(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-[#D93A30] focus:ring-[#D93A30]"
                />
                <label htmlFor="user-disabled" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Disable User Account
                </label>
              </div>

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {saveError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-red-600/20 transition-all"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
