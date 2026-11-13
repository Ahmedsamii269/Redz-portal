import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Mail, Lock, Loader2, Sun, Moon, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { getFriendlyErrorMessage } from '../../lib/firestoreErrors';
import { GoogleSignInButton } from './GoogleSignInButton';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPasswordEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both your email/username and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      if (isRegistering) {
        await signUpWithEmail(trimmedEmail, password);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err, `Failed to ${isRegistering ? 'register' : 'sign in'}.`));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err, 'Google sign-in failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email or username first to reset password.');
      return;
    }
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await resetPasswordEmail(trimmedEmail);
      setInfoMessage('Password reset link sent to your email address! Please check your inbox.');
    } catch (err: unknown) {
      setError(getFriendlyErrorMessage(err, 'Failed to send password reset email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Subtle architectural background wash */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#D93A30]/8 dark:bg-[#D93A30]/12 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-300/30 dark:bg-slate-800/30 blur-3xl" />
      </div>

      {/* Theme switch in top right */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
        <span>{isDark ? 'Light' : 'Dark'}</span>
      </button>

      <div className="relative z-10 w-full max-w-[420px] animate-modal-in">
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-7 sm:p-8 rounded-2xl shadow-lg space-y-6">
          {/* Header & Brand */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-[#1B2234] p-2.5 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center mx-auto">
              <img
                src="/logo.png"
                alt="Redz"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-[10px] font-bold text-[#D93A30] dark:text-red-400 uppercase tracking-wider mb-1.5">
                <ShieldCheck className="w-3 h-3" /> Talent Operations Portal
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                REDZ RECRUITMENT
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isRegistering ? 'Activate your pre-authorized agency account' : 'Sign in to access your recruitment workspace'}
              </p>
            </div>
          </div>

          {/* Mode Switch */}
          <div className="flex bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); setInfoMessage(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isRegistering
                  ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(null); setInfoMessage(null); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isRegistering
                  ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium rounded-xl text-center leading-relaxed animate-fade-in">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-xl text-center leading-relaxed animate-fade-in">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username or email@company.com"
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                {!isRegistering && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[11px] text-[#D93A30] hover:text-[#b82e25] dark:text-red-400 dark:hover:text-red-300 font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center bg-slate-50 dark:bg-[#1B2234] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
                Use the email address pre-authorized by Redz Management.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {!isRegistering && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-white dark:bg-[#131826] px-2.5 text-slate-400 dark:text-slate-500 font-bold">
                    Or continue with
                  </span>
                </div>
              </div>

              <GoogleSignInButton
                onClick={handleGoogleLogin}
                loading={loading}
                label="Sign in with Google"
                className="w-full"
              />
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4">
          Redz Recruitment Agency • Secure Enterprise Access
        </p>
      </div>
    </div>
  );
};
