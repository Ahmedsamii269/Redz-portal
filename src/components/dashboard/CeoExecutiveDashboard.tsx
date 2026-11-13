import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Building,
  Send,
  MessageSquare,
  Sparkles,
  Award,
  ChevronRight,
  Eye,
  AlertOctagon,
  Activity,
  Flame,
  Search,
  FileText,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Download,
  Users,
  CheckCircle2,
  UserPlus,
  Clock,
  Filter,
  Briefcase,
  Trophy,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { AnnouncementModal } from '../notifications/AnnouncementModal';
import { EmptyState } from '../common/UIStates';
import { getRoleBadgeClasses } from '../../lib/statusStyles';
import { safeParseDate } from '../../lib/dateUtils';

interface CeoExecutiveDashboardProps {
  onNavigateToCandidates: (filterStatus?: string) => void;
  onNavigateToTab: (tab: string) => void;
}

type DateRangePreset = 'all' | 'today' | 'week' | 'month';

const INTERVIEW_ACTIVE_STATUSES = new Set([
  'Accepted Voice Note',
  'Interview Scheduled',
  'Interview Rescheduled',
  'Accepted Interview'
]);

const HIRED_STATUSES = new Set([
  'Accepted Interview',
  'Start Training',
  'Commission Done'
]);

const REJECTED_DROPOFF_STATUSES = new Set([
  'Rejected Voice Note',
  'Rejected Interview',
  'Dropped or Left Training'
]);

const SCREENED_PLUS_STATUSES = new Set([
  'Accepted Voice Note',
  'Interview Scheduled',
  'Interview Rescheduled',
  'Accepted Interview',
  'Rejected Interview',
  'Start Training',
  'Dropped or Left Training',
  'Commission Done'
]);

const INTERVIEW_REACHED_STATUSES = new Set([
  'Interview Scheduled',
  'Interview Rescheduled',
  'Accepted Interview',
  'Rejected Interview',
  'Start Training',
  'Dropped or Left Training',
  'Commission Done'
]);

const TRAINING_HIRED_STATUSES = new Set([
  'Start Training',
  'Commission Done'
]);

export const CeoExecutiveDashboard: React.FC<CeoExecutiveDashboardProps> = ({
  onNavigateToCandidates,
  onNavigateToTab
}) => {
  const { candidates, allCandidates, users, onlineUsers, presenceList, commissionRules, processes } = useData();
  const { switchSimulatedUser } = useAuth();
  const { isCompactMode, isDark } = useTheme();
  const { showToast } = useToast();

  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'online' | 'active_today' | 'inactive_today'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.company) set.add(c.company);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [candidates]);

  const dateBoundaries = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayOfWeek = now.getDay(); // 0 = Sun
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return { startOfToday, startOfWeek, startOfMonth };
  }, [todayStr]);

  // Client-side filtered candidates (zero extra Firestore reads)
  const scopedCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (companyFilter !== 'all' && c.company !== companyFilter) return false;
      if (dateRange === 'all') return true;
      const d = safeParseDate(c.createdAt);
      if (!d) return false;
      const ts = d.getTime();
      if (dateRange === 'today') return ts >= dateBoundaries.startOfToday;
      if (dateRange === 'week') return ts >= dateBoundaries.startOfWeek;
      if (dateRange === 'month') return ts >= dateBoundaries.startOfMonth;
      return true;
    });
  }, [candidates, companyFilter, dateRange, dateBoundaries]);

  // CEO Candidate & Conversion KPI Strip
  const candidateKpis = useMemo(() => {
    const total = scopedCandidates.length;
    const activeInterview = scopedCandidates.filter((c) => INTERVIEW_ACTIVE_STATUSES.has(c.status)).length;
    const hired = scopedCandidates.filter((c) => HIRED_STATUSES.has(c.status)).length;
    const rejectedDropoff = scopedCandidates.filter((c) => REJECTED_DROPOFF_STATUSES.has(c.status)).length;

    const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;
    const dropoffRate = total > 0 ? Math.round((rejectedDropoff / total) * 100) : 0;

    // Always surface Today & This Week additions cleanly
    const addedToday = candidates.filter((c) => {
      if (companyFilter !== 'all' && c.company !== companyFilter) return false;
      const d = safeParseDate(c.createdAt);
      return d ? d.getTime() >= dateBoundaries.startOfToday : false;
    }).length;

    const addedThisWeek = candidates.filter((c) => {
      if (companyFilter !== 'all' && c.company !== companyFilter) return false;
      const d = safeParseDate(c.createdAt);
      return d ? d.getTime() >= dateBoundaries.startOfWeek : false;
    }).length;

    return {
      total,
      activeInterview,
      hired,
      rejectedDropoff,
      conversionRate,
      dropoffRate,
      addedToday,
      addedThisWeek
    };
  }, [scopedCandidates, candidates, companyFilter, dateBoundaries]);

  // Founder Insights 1: Stage-by-Stage Recruitment Funnel
  const recruitmentFunnel = useMemo(() => {
    const total = scopedCandidates.length;
    const newStage = total;
    const screened = scopedCandidates.filter((c) => SCREENED_PLUS_STATUSES.has(c.status)).length;
    const interviewed = scopedCandidates.filter((c) => INTERVIEW_REACHED_STATUSES.has(c.status)).length;
    const hired = scopedCandidates.filter((c) => TRAINING_HIRED_STATUSES.has(c.status)).length;

    return [
      {
        id: 'new',
        label: '1. Total Pipeline Intake',
        subLabel: 'All logged applicants',
        count: newStage,
        pctOfTotal: total > 0 ? 100 : 0,
        stepRate: null as number | null,
        barColor: 'bg-slate-700 dark:bg-slate-400',
        filterStatus: undefined
      },
      {
        id: 'screened',
        label: '2. Screened / Voice Approved',
        subLabel: 'Passed English / language check',
        count: screened,
        pctOfTotal: total > 0 ? Math.round((screened / total) * 100) : 0,
        stepRate: newStage > 0 ? Math.round((screened / newStage) * 100) : 0,
        barColor: 'bg-sky-500',
        filterStatus: 'Accepted Voice Note'
      },
      {
        id: 'interview',
        label: '3. Reached Interview',
        subLabel: 'Scheduled or completed interview',
        count: interviewed,
        pctOfTotal: total > 0 ? Math.round((interviewed / total) * 100) : 0,
        stepRate: screened > 0 ? Math.round((interviewed / screened) * 100) : 0,
        barColor: 'bg-amber-500',
        filterStatus: 'Interview Scheduled'
      },
      {
        id: 'hired',
        label: '4. Hired / Started Training',
        subLabel: 'Training started & commission done',
        count: hired,
        pctOfTotal: total > 0 ? Math.round((hired / total) * 100) : 0,
        stepRate: interviewed > 0 ? Math.round((hired / interviewed) * 100) : 0,
        barColor: 'bg-emerald-500',
        filterStatus: 'Start Training'
      }
    ];
  }, [scopedCandidates]);

  // Founder Insights 2: HR Team Productivity Leaderboard (Scoped to Date & Company Filter)
  const hrLeaderboard = useMemo(() => {
    const teamUsers = users.filter((u) => ['recruiter', 'leader', 'unit_manager', 'account_manager', 'ceo'].includes(u.role));
    const map: Record<string, { id: string; name: string; role: string; added: number; hired: number }> = {};

    teamUsers.forEach((u) => {
      map[u.id] = { id: u.id, name: u.name, role: u.role, added: 0, hired: 0 };
    });

    scopedCandidates.forEach((c) => {
      const uid = c.createdBy;
      if (!uid) return;
      if (!map[uid]) {
        map[uid] = { id: uid, name: c.createdByName || 'Recruiter', role: 'recruiter', added: 0, hired: 0 };
      }
      map[uid].added += 1;
      if (HIRED_STATUSES.has(c.status)) {
        map[uid].hired += 1;
      }
    });

    const ranked = Object.values(map)
      .filter((r) => r.added > 0 || r.hired > 0)
      .sort((a, b) => b.hired - a.hired || b.added - a.added)
      .slice(0, 7);

    const maxAdded = Math.max(1, ...ranked.map((r) => r.added));
    return { ranked, maxAdded };
  }, [users, scopedCandidates]);

  // Founder Insights 3: Role / Account Demand (By Client Company & Language Track)
  const demandBreakdown = useMemo(() => {
    const companyCounts: Record<string, { total: number; hired: number }> = {};
    const languageCounts: Record<string, number> = {};

    scopedCandidates.forEach((c) => {
      const comp = c.company || 'Unassigned';
      if (!companyCounts[comp]) companyCounts[comp] = { total: 0, hired: 0 };
      companyCounts[comp].total += 1;
      if (HIRED_STATUSES.has(c.status)) companyCounts[comp].hired += 1;

      const lang = (c.language || 'English').trim();
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    const companies = Object.entries(companyCounts)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const languages = Object.entries(languageCounts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const maxCompany = Math.max(1, ...companies.map((c) => c.total));
    const maxLanguage = Math.max(1, ...languages.map((l) => l.total));

    return { companies, languages, maxCompany, maxLanguage };
  }, [scopedCandidates]);

  // Financial Metrics (respecting dateRange & companyFilter)
  const financeMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalRecruiterPaid = 0;
    let totalRecruiterPayable = 0;
    let totalAgencyNetProfit = 0;
    let forecastedRevenue = 0;
    let forecastedAgencyProfit = 0;

    scopedCandidates.forEach((c) => {
      if (c.commissionCalculated) {
        const ext = c.commissionCalculated.externalAmount || 0;
        const rec = c.commissionCalculated.recruiterAmount || 0;
        const leader = c.commissionCalculated.leaderAmount || 0;
        const unit = c.commissionCalculated.unitAmount || 0;
        const agencyNet = ext - (rec + leader + unit);

        if (c.status === 'Commission Done' || (c.commissionCalculated.clientCollected && c.commissionCalculated.recruiterPaid)) {
          totalInvoiced += ext;
          if (c.commissionCalculated.clientCollected) {
            totalCollected += ext;
            totalAgencyNetProfit += agencyNet;
          }
          if (c.commissionCalculated.recruiterPaid) {
            totalRecruiterPaid += rec;
          } else {
            totalRecruiterPayable += rec;
          }
        } else if (c.status === 'Start Training') {
          forecastedRevenue += ext * 0.9;
          forecastedAgencyProfit += agencyNet * 0.9;
        }
      }
    });

    const pendingClientCollection = totalInvoiced - totalCollected;

    return {
      totalInvoiced,
      totalCollected,
      pendingClientCollection,
      totalRecruiterPaid,
      totalRecruiterPayable,
      totalAgencyNetProfit,
      forecastedRevenue,
      forecastedAgencyProfit
    };
  }, [scopedCandidates]);

  const todayCandidates = useMemo(() => {
    return allCandidates.filter((c) => !c.deleted && c.createdAt && c.createdAt.split('T')[0] === todayStr);
  }, [allCandidates, todayStr]);

  const todayAcceptedVoices = useMemo(() => {
    return todayCandidates.filter((c) =>
      ['Accepted Voice Note', 'Interview Scheduled', 'Accepted Interview', 'Start Training', 'Commission Done'].includes(c.status)
    );
  }, [todayCandidates]);

  const trainingMetrics = useMemo(() => {
    const inTraining = scopedCandidates.filter((c) => c.status === 'Start Training').length;
    const droppedTraining = scopedCandidates.filter((c) => c.status === 'Dropped or Left Training').length;
    const completedTraining = scopedCandidates.filter((c) => c.status === 'Commission Done').length;
    const totalTrainingEnrolled = inTraining + droppedTraining + completedTraining;
    const dropoutRate = totalTrainingEnrolled > 0
      ? Math.round((droppedTraining / totalTrainingEnrolled) * 100)
      : 0;

    return {
      inTraining,
      droppedTraining,
      completedTraining,
      totalTrainingEnrolled,
      dropoutRate
    };
  }, [scopedCandidates]);

  const recruitersList = useMemo(() => {
    const list = users.filter((u) => u.role === 'recruiter' || u.role === 'leader' || u.role === 'unit_manager');

    return list.map((user) => {
      const presence = presenceList.find((p) => p.userId === user.id);
      const isOnline = onlineUsers.some((p) => p.userId === user.id);

      const userTodayCandidates = todayCandidates.filter((c) => c.createdBy === user.id);
      const userTodayVoices = userTodayCandidates.filter((c) =>
        ['Accepted Voice Note', 'Interview Scheduled', 'Accepted Interview', 'Start Training', 'Commission Done'].includes(c.status)
      );

      const now = new Date();
      const userMonthCandidates = candidates.filter((c) => {
        if (c.createdBy !== user.id || !c.createdAt) return false;
        const d = safeParseDate(c.createdAt);
        return d ? d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() : false;
      });

      const earnedCommission = candidates
        .filter((c) => c.createdBy === user.id && c.commissionCalculated?.recruiterPaid)
        .reduce((sum, c) => sum + (c.commissionCalculated?.recruiterAmount || 0), 0);

      const candidateTarget = 5;
      const voiceTarget = 3;

      const hasActivityToday = userTodayCandidates.length > 0;
      const reachedCandidateTarget = userTodayCandidates.length >= candidateTarget;
      const reachedVoiceTarget = userTodayVoices.length >= voiceTarget;

      return {
        user,
        presence,
        isOnline,
        todayCount: userTodayCandidates.length,
        todayVoicesCount: userTodayVoices.length,
        candidateTarget,
        voiceTarget,
        monthCount: userMonthCandidates.length,
        earnedCommission,
        hasActivityToday,
        reachedCandidateTarget,
        reachedVoiceTarget,
        lastActive: presence?.lastActive || user.createdAt || ''
      };
    });
  }, [users, presenceList, onlineUsers, todayCandidates, candidates]);

  const filteredRecruiters = useMemo(() => {
    return recruitersList.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = item.user.name.toLowerCase().includes(q);
        const matchEmail = item.user.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }

      if (teamStatusFilter === 'online') return item.isOnline;
      if (teamStatusFilter === 'active_today') return item.hasActivityToday;
      if (teamStatusFilter === 'inactive_today') return !item.hasActivityToday;
      return true;
    });
  }, [recruitersList, teamStatusFilter, searchQuery]);

  const companyPerformance = useMemo(() => {
    const compMap: Record<string, { totalPlaced: number; totalRevenue: number; recruiterPayout: number; agencyNet: number }> = {};

    scopedCandidates.forEach((c) => {
      if (!c.company) return;
      if (!compMap[c.company]) {
        compMap[c.company] = { totalPlaced: 0, totalRevenue: 0, recruiterPayout: 0, agencyNet: 0 };
      }

      compMap[c.company].totalPlaced += 1;

      if (c.commissionCalculated) {
        const ext = c.commissionCalculated.externalAmount || 0;
        const rec = c.commissionCalculated.recruiterAmount || 0;
        const leader = c.commissionCalculated.leaderAmount || 0;
        const unit = c.commissionCalculated.unitAmount || 0;
        const net = ext - (rec + leader + unit);

        compMap[c.company].totalRevenue += ext;
        compMap[c.company].recruiterPayout += rec;
        compMap[c.company].agencyNet += net;
      }
    });

    return Object.entries(compMap)
      .map(([company, data]) => ({ company, ...data }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalPlaced - a.totalPlaced);
  }, [scopedCandidates]);

  const chartDataDaily = useMemo(() => {
    const last7Days = [...Array(7)]
      .map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      })
      .reverse();

    return last7Days.map((date) => {
      const dayCandidates = candidates.filter((c) => {
        if (companyFilter !== 'all' && c.company !== companyFilter) return false;
        return c.createdAt?.split('T')[0] === date;
      });
      const parsedDay = safeParseDate(`${date}T12:00:00`);
      return {
        name: parsedDay ? format(parsedDay, 'EEE') : date,
        count: dayCandidates.length,
        voices: dayCandidates.filter((c) => SCREENED_PLUS_STATUSES.has(c.status)).length
      };
    });
  }, [candidates, companyFilter]);

  const chartDataStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    scopedCandidates.forEach((c) => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [scopedCandidates]);

  const COLORS = ['#D93A30', '#0284C7', '#10B981', '#F59E0B', '#7C3AED', '#EC4899', '#64748B'];

  const handleExportData = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      founder: 'Ahmed Samii',
      agency: 'Redz Recruitment Agency',
      metrics: {
        totalCandidates: candidates.length,
        totalUsers: users.length,
        finance: financeMetrics
      },
      candidates,
      users,
      processes,
      commissionRules
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redz-agency-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Agency JSON backup downloaded.', 'success');
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text('REDZ RECRUITMENT AGENCY - EXECUTIVE REPORT', 14, 20);

      doc.setFontSize(11);
      doc.text('Founder & CEO: Ahmed Samii (ahmedsamii269@gmail.com)', 14, 28);
      doc.text(`Date: ${todayStr} | Scope: ${dateRange.toUpperCase()} (${companyFilter})`, 14, 35);

      doc.line(14, 40, 196, 40);

      doc.setFontSize(14);
      doc.text('Executive Candidate KPIs:', 14, 50);

      doc.setFontSize(11);
      doc.text(`- Total Candidates Pipeline: ${candidateKpis.total}`, 18, 59);
      doc.text(`- Active / In-Interview: ${candidateKpis.activeInterview}`, 18, 67);
      doc.text(`- Hired / Accepted: ${candidateKpis.hired} (${candidateKpis.conversionRate}% conversion)`, 18, 75);
      doc.text(`- Rejected / Drop-off: ${candidateKpis.rejectedDropoff} (${candidateKpis.dropoffRate}% rate)`, 18, 83);

      doc.setFontSize(14);
      doc.text('Financial Summary:', 14, 97);

      doc.setFontSize(11);
      doc.text(`- Gross Client Billings: ${financeMetrics.totalInvoiced.toLocaleString()} EGP`, 18, 106);
      doc.text(`- Total Collected: ${financeMetrics.totalCollected.toLocaleString()} EGP`, 18, 114);
      doc.text(`- Redz Net Profit: ${financeMetrics.totalAgencyNetProfit.toLocaleString()} EGP`, 18, 122);
      doc.text(`- Recruiter Commissions Paid: ${financeMetrics.totalRecruiterPaid.toLocaleString()} EGP`, 18, 130);

      doc.save(`redz-executive-report-${todayStr}.pdf`);
      showToast('Executive PDF report downloaded to your device.', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Could not generate PDF report. Please try again.', 'error');
    }
  };

  const chartGridColor = isDark ? '#1E293B' : '#E2E8F0';
  const chartTickColor = isDark ? '#94A3B8' : '#64748B';
  const chartTooltipStyle = {
    backgroundColor: isDark ? '#131826' : '#FFFFFF',
    border: `1px solid ${isDark ? '#252E42' : '#E2E8F0'}`,
    borderRadius: '12px',
    fontSize: '12px',
    color: isDark ? '#F8FAFC' : '#0F172A',
    boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.1)'
  };

  const dateFilterOptions: { id: DateRangePreset; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' }
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* CEO Executive Header + Instant Client-Side Filter Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#D93A30]/8 dark:bg-[#D93A30]/12 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-[#D93A30] dark:text-red-400 border border-red-200 dark:border-red-800/70 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Executive Command Center
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 px-2.5 py-0.5 rounded-full tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{onlineUsers.length || 1} Active Team</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Founder Analytics • Ahmed Samii
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Live agency pipeline conversion, recruiter output leaderboard, client demand, and revenue overview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowAnnouncementModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#D93A30] text-white hover:bg-[#b82e25] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" /> Broadcast
            </button>
            <button
              type="button"
              onClick={handleExportData}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
              title="Download agency JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-sky-500" /> JSON Backup
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-[#1B2234] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.98] whitespace-nowrap"
              title="Export Executive PDF Report"
            >
              <FileText className="w-3.5 h-3.5 text-[#D93A30]" /> PDF Report
            </button>
          </div>
        </div>

        {/* Instant Client-Side Date-Range & Account Filter Strip */}
        <div className="relative z-10 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#D93A30]" /> Range:
            </span>
            <div className="flex flex-wrap items-center bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
              {dateFilterOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateRange(opt.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateRange === opt.id
                      ? 'bg-[#D93A30] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full sm:w-48 bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#D93A30]"
                aria-label="Filter analytics by company"
              >
                <option value="all">All Client Companies</option>
                {availableCompanies.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>
            {(dateRange !== 'all' || companyFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setDateRange('all');
                  setCompanyFilter('all');
                }}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-[#D93A30] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 hover:bg-red-100 cursor-pointer whitespace-nowrap"
              >
                Reset Scope
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CEO Candidate & Conversion KPI Strip (5 Cards, Client-Side Computed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => onNavigateToCandidates(undefined)}
          className="text-left bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Total Pipeline</span>
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1B2234] text-slate-700 dark:text-slate-300">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {candidateKpis.total.toLocaleString()}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>View Full Pipeline</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToCandidates('Interview Scheduled')}
          className="text-left bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Active / Interview</span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono tabular-nums">
            {candidateKpis.activeInterview.toLocaleString()}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Share of Pipeline:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
              {candidateKpis.total > 0 ? Math.round((candidateKpis.activeInterview / candidateKpis.total) * 100) : 0}%
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToCandidates('Start Training')}
          className="text-left bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Hired / Accepted</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {candidateKpis.hired.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums">
              {candidateKpis.conversionRate}% Conv
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Accepted + Training + Done</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToCandidates('Rejected Interview')}
          className="text-left bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:border-rose-300 dark:hover:border-rose-800 transition-all shadow-xs cursor-pointer"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Rejected / Drop-off</span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {candidateKpis.dropoffRate}%
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              ({candidateKpis.rejectedDropoff})
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Voice + Int + Training Drop</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
        </button>

        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">New Additions</span>
            <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-[#D93A30] dark:text-red-400">
              <UserPlus className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {candidateKpis.addedToday}
            </span>
            <span className="text-[11px] font-bold text-[#D93A30] dark:text-red-400">Today</span>
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>This Week:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              +{candidateKpis.addedThisWeek} candidates
            </span>
          </div>
        </div>
      </div>

      {/* Founder Performance Insights (Funnel + HR Team Leaderboard + Role/Account Demand) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Recruitment Funnel */}
        <div className="min-w-0 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#D93A30]" /> Recruitment Funnel
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stage conversion from intake to training hire
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Click stage</span>
          </div>

          <div className="space-y-3.5">
            {recruitmentFunnel.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => onNavigateToCandidates(stage.filterStatus)}
                className="w-full text-left group cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#D93A30] transition-colors truncate">
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{stage.subLabel}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <span className="font-extrabold text-slate-900 dark:text-white">{stage.count}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5">
                      ({stage.pctOfTotal}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-[#1B2234] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${stage.barColor}`}
                    style={{ width: `${Math.max(stage.count > 0 ? 4 : 0, stage.pctOfTotal)}%` }}
                  />
                </div>
                {stage.stepRate !== null && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right font-mono tabular-nums">
                    Step pass rate: <strong className="text-slate-700 dark:text-slate-200">{stage.stepRate}%</strong>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. HR Team Productivity Leaderboard */}
        <div className="min-w-0 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> HR Team Leaderboard
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Added volume vs hired / closed placements
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('leaderboard')}
              className="text-[11px] font-bold text-[#D93A30] hover:underline cursor-pointer whitespace-nowrap"
            >
              Full Rankings
            </button>
          </div>

          <div className="space-y-3">
            {hrLeaderboard.ranked.map((member, idx) => {
              const addedPct = Math.round((member.added / hrLeaderboard.maxAdded) * 100);
              const hiredPct = Math.round((member.hired / hrLeaderboard.maxAdded) * 100);
              return (
                <div key={member.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-md text-[10px] font-extrabold flex items-center justify-center shrink-0 tabular-nums ${
                          idx === 0
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-[#1B2234] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white truncate" dir="auto">
                        {member.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] tabular-nums">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">{member.added} added</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{member.hired} hired</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1B2234] rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-slate-300 dark:bg-slate-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(member.added > 0 ? 4 : 0, addedPct)}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 absolute inset-y-0 left-0"
                      style={{ width: `${Math.max(member.hired > 0 ? 4 : 0, hiredPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {hrLeaderboard.ranked.length === 0 && (
              <EmptyState
                icon={Users}
                title="No team submissions in scope"
                description="Try switching the date range or company filter above."
              />
            )}
          </div>
        </div>

        {/* 3. Role & Account Demand */}
        <div className="min-w-0 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-violet-500" /> Role &amp; Account Demand
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Candidate volume across client accounts &amp; tracks
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('offers')}
              className="text-[11px] font-bold text-[#D93A30] hover:underline cursor-pointer whitespace-nowrap"
            >
              View Offers
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Top Client Accounts
              </div>
              {demandBreakdown.companies.map((comp) => (
                <div key={comp.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{comp.name}</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 shrink-0 tabular-nums">
                      <strong>{comp.total}</strong> <span className="text-emerald-600 dark:text-emerald-400">({comp.hired} hired)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1B2234] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D93A30] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, Math.round((comp.total / demandBreakdown.maxCompany) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
              {demandBreakdown.companies.length === 0 && (
                <div className="text-xs text-slate-400 py-2">No client volume in current filter.</div>
              )}
            </div>

            {demandBreakdown.languages.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Language Track Mix
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {demandBreakdown.languages.map((lang) => (
                    <span
                      key={lang.name}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums"
                    >
                      <span>{lang.name}</span>
                      <span className="font-mono font-extrabold text-[#D93A30]">{lang.total}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Health Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Gross Billings</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {financeMetrics.totalInvoiced.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-semibold">EGP</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Collected:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">{financeMetrics.totalCollected.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Net Profit</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {financeMetrics.totalAgencyNetProfit.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-semibold">EGP</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Pending Client:</span>
            <span className="text-slate-700 dark:text-slate-200 font-bold font-mono tabular-nums">{financeMetrics.pendingClientCollection.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Forecast</span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono tabular-nums">
            {financeMetrics.forecastedAgencyProfit.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-semibold">EGP</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>In Training Projection:</span>
            <span className="text-sky-600 dark:text-sky-400 font-bold font-mono tabular-nums">90%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Commissions</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {financeMetrics.totalRecruiterPaid.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-semibold">Paid</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>Payable:</span>
            <span className="text-slate-700 dark:text-slate-200 font-bold font-mono tabular-nums">{financeMetrics.totalRecruiterPayable.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-bold uppercase tracking-wider">Training Churn</span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-2 tabular-nums">
            <span>{trainingMetrics.dropoutRate}%</span>
            <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold">
              {trainingMetrics.droppedTraining} Dropped
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span>In Training:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono tabular-nums">{trainingMetrics.inTraining}</span>
          </div>
        </div>
      </div>

      {/* Today's Daily Target vs Goal Ribbon */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#D93A30]" /> Today&apos;s Agency Quota Velocity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Collective progress against daily targets: 5 candidates logged &amp; 3 voice notes approved per recruiter.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#1B2234] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold tabular-nums self-start sm:self-auto">
            Date: {todayStr}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
          <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200/80 dark:border-slate-700/70 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Candidates Logged Today</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {todayCandidates.length} <span className="text-slate-400 dark:text-slate-500">/ {recruitersList.length * 5} Target</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D93A30] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((todayCandidates.length / Math.max(1, recruitersList.length * 5)) * 100))}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Goal: 5 candidates / recruiter</span>
              <span className="text-[#D93A30] dark:text-red-400 font-bold tabular-nums">
                {Math.round((todayCandidates.length / Math.max(1, recruitersList.length * 5)) * 100)}% Fulfilled
              </span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200/80 dark:border-slate-700/70 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">Approved Voice Notes Today</span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {todayAcceptedVoices.length} <span className="text-slate-400 dark:text-slate-500">/ {recruitersList.length * 3} Target</span>
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((todayAcceptedVoices.length / Math.max(1, recruitersList.length * 3)) * 100))}%`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Goal: 3 accepted voices / recruiter</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold tabular-nums">
                {Math.round((todayAcceptedVoices.length / Math.max(1, recruitersList.length * 3)) * 100)}% Fulfilled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Growth & Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LineIcon className="w-4 h-4 text-[#D93A30]" /> Agency Recruitment Velocity
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Last 7 Days</span>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataDaily}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D93A30" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D93A30" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVoices" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                <XAxis dataKey="name" stroke={chartTickColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={chartTickColor} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="count" stroke="#D93A30" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Total Subs" />
                <Area type="monotone" dataKey="voices" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorVoices)" name="Voice Approved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-sky-500" /> Pipeline Status Distribution
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Scoped</span>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartDataStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartDataStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: chartTickColor }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recruiter Productivity Radar */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Team Productivity &amp; Activity Radar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Individual tracking of active online presence, daily submissions, and earned commissions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search recruiter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#D93A30] focus:ring-2 focus:ring-[#D93A30]/15"
              />
            </div>

            <div className="flex items-center overflow-x-auto scrollbar-none bg-slate-100 dark:bg-[#0B0F19] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1">
              <button
                type="button"
                onClick={() => setTeamStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  teamStatusFilter === 'all' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({recruitersList.length})
              </button>
              <button
                type="button"
                onClick={() => setTeamStatusFilter('online')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  teamStatusFilter === 'online' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online ({recruitersList.filter((r) => r.isOnline).length})
              </button>
              <button
                type="button"
                onClick={() => setTeamStatusFilter('inactive_today')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  teamStatusFilter === 'inactive_today' ? 'bg-white dark:bg-[#1B2234] text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertCircle className="w-3 h-3 text-rose-500" />
                Inactive ({recruitersList.filter((r) => !r.hasActivityToday).length})
              </button>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto max-h-[460px] border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F1420]/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider ${isCompactMode ? 'text-[9px]' : 'text-[11px]'} border-b border-slate-200 dark:border-slate-800`}>
              <tr>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>Team Member</th>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>Status</th>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>Daily (5)</th>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>Voice (3)</th>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>Month</th>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'}`}>Commission</th>
                <th className={`${isCompactMode ? 'py-2 px-3' : 'py-3 px-4'} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {filteredRecruiters.map((item) => {
                const { user, isOnline, todayCount, todayVoicesCount, monthCount, earnedCommission } = item;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/90 dark:hover:bg-[#1B2234]/70 transition-colors">
                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`rounded-xl bg-slate-100 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 shrink-0 ${isCompactMode ? 'w-6 h-6 text-[10px]' : 'w-8 h-8'}`}>
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div dir="auto" title={user.name} className={`font-bold text-slate-900 dark:text-white truncate max-w-[180px] ${isCompactMode ? 'text-[11px]' : 'text-xs'}`}>{user.name || 'Member'}</div>
                          {!isCompactMode && (
                            <span className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded-full border font-bold capitalize ${getRoleBadgeClasses(user.role)}`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Offline
                        </span>
                      )}
                    </td>

                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <div className={`${isCompactMode ? 'w-16' : 'w-28'} space-y-1`}>
                        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                          <span className={todayCount >= 5 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                            {todayCount}/5
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${todayCount >= 5 ? 'bg-emerald-500' : 'bg-[#D93A30]'}`}
                            style={{ width: `${Math.min(100, (todayCount / 5) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'}`}>
                      <div className={`${isCompactMode ? 'w-16' : 'w-28'} space-y-1`}>
                        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                          <span className={todayVoicesCount >= 3 ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                            {todayVoicesCount}/3
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${todayVoicesCount >= 3 ? 'bg-sky-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, (todayVoicesCount / 3) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums`}>
                      {monthCount} <span className="text-[10px] font-sans font-normal text-slate-400">cands</span>
                    </td>

                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums`}>
                      {earnedCommission.toLocaleString()} <span className="text-[10px] font-sans font-normal text-slate-400">EGP</span>
                    </td>

                    <td className={`${isCompactMode ? 'py-2 px-3' : 'py-3.5 px-4'} text-right`}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            switchSimulatedUser(user);
                            onNavigateToTab('dashboard');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-rose-950/50 text-[#D93A30] dark:text-rose-300 hover:bg-red-100 dark:hover:bg-rose-900 border border-red-200 dark:border-rose-800/70 font-bold inline-flex items-center gap-1 transition-colors text-[10px] cursor-pointer whitespace-nowrap"
                          title="God Mode: View dashboard as this user"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Login As</span>
                        </button>
                        {user.phone && (
                          <a
                            href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800/70 font-bold inline-flex items-center gap-1 transition-colors text-[10px] whitespace-nowrap"
                            title="Open WhatsApp chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WA</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecruiters.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Users}
                      title="No recruiters match filter"
                      description="Try clearing your search or switching team status tabs."
                      action={
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setTeamStatusFilter('all');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (<768px) */}
        <div className="md:hidden space-y-3">
          {filteredRecruiters.map((item) => {
            const { user, isOnline, todayCount, todayVoicesCount, monthCount, earnedCommission } = item;
            return (
              <div
                key={user.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B2234] border border-slate-200 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 shrink-0">
                      {(user.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div dir="auto" className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {user.name || 'Member'}
                      </div>
                      <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded-full border font-bold capitalize ${getRoleBadgeClasses(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isOnline
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                  <div className="bg-white dark:bg-[#131826] p-2 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-slate-400 text-[10px] font-sans block">Daily / Voice</span>
                    <strong className="text-slate-900 dark:text-white">{todayCount}/5</strong> •{' '}
                    <strong className="text-sky-600 dark:text-sky-400">{todayVoicesCount}/3</strong>
                  </div>
                  <div className="bg-white dark:bg-[#131826] p-2 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-slate-400 text-[10px] font-sans block">Month / Paid</span>
                    <strong className="text-slate-900 dark:text-white">{monthCount}</strong> •{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">{earnedCommission.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      switchSimulatedUser(user);
                      onNavigateToTab('dashboard');
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-50 dark:bg-rose-950/50 text-[#D93A30] dark:text-rose-300 border border-red-200 dark:border-rose-800/70 font-bold text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Login As
                  </button>
                  {user.phone && (
                    <a
                      href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 font-bold text-[11px] inline-flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRecruiters.length === 0 && (
            <EmptyState
              icon={Users}
              title="No recruiters match filter"
              description="Try clearing your search or switching team status tabs."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTeamStatusFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                >
                  Reset Filters
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Client Accounts & Company Profitability Matrix */}
      <div className="bg-white dark:bg-[#131826] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-violet-500" /> Client Accounts &amp; Company Revenue Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Agency margin generated per client company across the active filter scope.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('processes')}
            className="text-xs text-[#D93A30] hover:underline flex items-center gap-1 font-bold cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            Manage Processes <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {companyPerformance.map((comp) => (
            <div
              key={comp.company}
              className="bg-slate-50 dark:bg-[#1B2234] border border-slate-200/80 dark:border-slate-700/70 p-4 rounded-xl space-y-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{comp.company}</span>
                <span className="text-[11px] font-mono font-bold bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full tabular-nums shrink-0">
                  {comp.totalPlaced} candidates
                </span>
              </div>

              <div className="space-y-1.5 text-xs border-t border-slate-200/80 dark:border-slate-700/70 pt-2.5 font-mono tabular-nums">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Client Billings:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{comp.totalRevenue.toLocaleString()} EGP</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Recruiter Split:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{comp.recruiterPayout.toLocaleString()} EGP</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/70 dark:border-slate-700/60 pt-1.5">
                  <span className="text-[#D93A30] dark:text-red-400 font-bold">Redz Net Profit:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{comp.agencyNet.toLocaleString()} EGP</span>
                </div>
              </div>
            </div>
          ))}

          {companyPerformance.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Building}
                title="No company performance data in scope"
                description="Once candidates are logged against client processes, profitability metrics will appear here."
              />
            </div>
          )}
        </div>
      </div>

      {showAnnouncementModal && (
        <AnnouncementModal onClose={() => setShowAnnouncementModal(false)} />
      )}
    </div>
  );
};
