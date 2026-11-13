import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Navbar } from './components/layout/Navbar';
import { NavigationTabs } from './components/layout/NavigationTabs';
import { DashboardView } from './components/dashboard/DashboardView';
import { OffersView } from './components/offers/OffersView';
import { ProcessesView } from './components/processes/ProcessesView';
import { CommissionsView } from './components/commissions/CommissionsView';
import { ApplicationFormView } from './components/candidates/ApplicationFormView';
import { CandidatesListView } from './components/candidates/CandidatesListView';
import { MyCandidatesView } from './components/candidates/MyCandidatesView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { ProfileView } from './components/profile/ProfileView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { CeoExecutiveDashboard } from './components/dashboard/CeoExecutiveDashboard';
import { MobileQuickBar } from './components/common/MobileQuickBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginView } from './components/auth/LoginView';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AllDataView } from './components/candidates/AllDataView';
import { TopBroadcastBanner } from './components/layout/TopBroadcastBanner';
import { WalletView } from './components/profile/WalletView';
import { CalendarView } from './components/dashboard/CalendarView';
import { useSoundNotifications } from './hooks/useSoundNotifications';
import { Lock, LogOut, ShieldAlert } from 'lucide-react';

const VALID_TABS = new Set([
  'dashboard',
  'ceo_command',
  'offers',
  'processes',
  'commissions',
  'application',
  'my_candidates',
  'wallet',
  'calendar',
  'candidates',
  'all_data',
  'leaderboard',
  'profile',
  'notifications',
  'users',
  'settings'
]);

const getInitialTab = (): string => {
  if (typeof window === 'undefined') return 'dashboard';
  const hashTab = window.location.hash.replace(/^#/, '');
  return VALID_TABS.has(hashTab) ? hashTab : 'dashboard';
};

function AppContent() {
  const { loading: authLoading, currentUser, userProfile, activeRole, logout } = useAuth();
  const { updateUserPresence } = useData();
  const { isZenMode } = useTheme();
  useSoundNotifications();
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [candidateFilterStatus, setCandidateFilterStatus] = useState<string | undefined>(undefined);
  const [targetProcessCompany, setTargetProcessCompany] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => {
      const nextTab = window.location.hash.replace(/^#/, '');
      if (VALID_TABS.has(nextTab)) {
        setActiveTab(nextTab);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && VALID_TABS.has(activeTab)) {
      const currentHash = window.location.hash.replace(/^#/, '');
      if (currentHash !== activeTab) {
        if (!currentHash) {
          window.history.replaceState(null, '', `#${activeTab}`);
        } else {
          window.history.pushState(null, '', `#${activeTab}`);
        }
      }
    }
    if (currentUser?.uid) {
      updateUserPresence(activeTab);
    }
  }, [activeTab, currentUser?.uid]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center text-slate-900 dark:text-slate-100 space-y-5 px-4">
        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#131826] p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center">
          <img src="/logo.png" alt="Redz" className="w-full h-full object-contain" />
        </div>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">REDZ RECRUITMENT</h2>
            <span className="w-2 h-2 rounded-full bg-[#D93A30]" />
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-700 border-t-[#D93A30] rounded-full animate-spin" />
            <span>Initializing workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  const isRealCeo =
    userProfile?.role === 'ceo' ||
    currentUser.email?.toLowerCase() === 'ahmedsamii269@gmail.com';

  if (userProfile?.disabled && !isRealCeo) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] flex items-center justify-center p-4 text-slate-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-[#131826] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center space-y-4 shadow-lg animate-modal-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Account Access Suspended</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your Redz Recruitment workspace account has been temporarily disabled by management. Please contact your Team Leader or Founder & CEO if you need access restored.
          </p>
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-[#D93A30] hover:bg-[#b82e25] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xs cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isCeo = activeRole === 'ceo';
  const isManagement = activeRole === 'ceo' || activeRole === 'account_manager';

  const navigateToCandidatesWithFilter = (status?: string) => {
    setCandidateFilterStatus(status);
    setActiveTab(isManagement ? 'candidates' : 'my_candidates');
  };

  const navigateToProcessWithCompany = (company: string) => {
    setTargetProcessCompany(company);
    setActiveTab('processes');
  };

  const renderUnauthorized = () => (
    <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center max-w-md mx-auto my-12 space-y-4 shadow-xs animate-modal-in">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Restricted Section</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Your current role does not have access to this workspace view.</p>
      </div>
      <button
        onClick={() => setActiveTab('dashboard')}
        className="px-4 py-2.5 rounded-xl bg-[#D93A30] hover:bg-[#b82e25] text-white text-xs font-bold transition-all active:scale-[0.98] shadow-xs cursor-pointer whitespace-nowrap"
      >
        Return to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#D93A30] selection:text-white transition-colors duration-200">
      {/* Unified Sticky Top Shell */}
      <div className="sticky top-0 z-40 w-full">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        {!isZenMode && <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />}
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 w-full min-w-0 mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 ${isZenMode ? 'max-w-full' : 'max-w-[1600px]'}`}>
        {!isZenMode && <TopBroadcastBanner />}

        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToCandidates={navigateToCandidatesWithFilter}
          />
        )}

        {activeTab === 'ceo_command' && (
          isCeo ? (
            <CeoExecutiveDashboard
              onNavigateToCandidates={navigateToCandidatesWithFilter}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          ) : renderUnauthorized()
        )}

        {activeTab === 'offers' && (
          <OffersView
            onNavigateToProcess={navigateToProcessWithCompany}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'processes' && (
          <ProcessesView initialCompanyFilter={targetProcessCompany} />
        )}

        {activeTab === 'commissions' && <CommissionsView />}

        {activeTab === 'application' && (
          <ApplicationFormView onSuccessNavigate={() => setActiveTab(isManagement ? 'candidates' : 'my_candidates')} />
        )}

        {activeTab === 'my_candidates' && <MyCandidatesView />}

        {activeTab === 'wallet' && <WalletView />}

        {activeTab === 'calendar' && <CalendarView />}

        {activeTab === 'candidates' && (
          isManagement ? (
            <CandidatesListView initialStatusFilter={candidateFilterStatus} />
          ) : renderUnauthorized()
        )}

        {activeTab === 'all_data' && (
          isManagement ? <AllDataView /> : renderUnauthorized()
        )}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'profile' && <ProfileView />}

        {activeTab === 'notifications' && <NotificationsView />}

        {activeTab === 'users' && (isCeo ? <UsersView /> : renderUnauthorized())}

        {activeTab === 'settings' && (isCeo ? <SettingsView /> : renderUnauthorized())}
      </main>

      {/* Footer */}
      {!isZenMode && (
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131826] py-5 text-xs text-slate-500 dark:text-slate-400 pb-20 md:pb-5">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">REDZ Recruitment Agency</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Hiring • Talent • Careers</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#D93A30] transition-colors font-medium"
              >
                Facebook
              </a>
              <a
                href="https://www.linkedin.com/company/redz-recruitment1/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#D93A30] transition-colors font-medium"
              >
                LinkedIn
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Built for Ahmed Samii</span>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Bottom Navigation Quick Bar */}
      {!isZenMode && <MobileQuickBar activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <AppContent />
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
