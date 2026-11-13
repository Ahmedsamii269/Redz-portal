import { Candidate } from '../types';

export interface TermsDueAlertItem {
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  company: string;
  language: string;
  recruiterName: string;
  recruiterId: string;
  externalAmount: number;
  ceoAmount: number;
  recruiterAmount: number;
  leaderAmount: number;
  unitAmount: number;
  termsDays: number;
  startDate: string;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  readyForPayout: boolean;
  urgencyLevel: 'critical' | 'warning' | 'payout_ready' | 'normal';
}

export interface TermsAlertSummary {
  overdueCount: number;
  overdueAmountEGP: number;
  dueSoonCount: number;
  dueSoonAmountEGP: number;
  payoutReadyCount: number;
  payoutReadyAmountEGP: number;
  totalReceivablesEGP: number;
  alerts: TermsDueAlertItem[];
}

export function computeTermsDueAlerts(candidates: Candidate[]): TermsAlertSummary {
  const now = new Date();
  const alerts: TermsDueAlertItem[] = [];

  let overdueCount = 0;
  let overdueAmountEGP = 0;
  let dueSoonCount = 0;
  let dueSoonAmountEGP = 0;
  let payoutReadyCount = 0;
  let payoutReadyAmountEGP = 0;
  let totalReceivablesEGP = 0;

  // Scan candidates in Start Training or Commission Done
  candidates.forEach((cand) => {
    if (
      (cand.status === 'Start Training' || cand.status === 'Commission Done') &&
      cand.commissionCalculated
    ) {
      const calc = cand.commissionCalculated;
      const dueDate = new Date(calc.dueDate || Date.now());
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysRemaining < 0 && !calc.clientCollected;
      const isDueSoon = daysRemaining >= 0 && daysRemaining <= 3 && !calc.clientCollected;
      const readyForPayout = Boolean(calc.clientCollected && !calc.recruiterPaid);

      totalReceivablesEGP += calc.externalAmount || 0;

      let urgencyLevel: 'critical' | 'warning' | 'payout_ready' | 'normal' = 'normal';
      if (isOverdue) {
        urgencyLevel = 'critical';
        overdueCount++;
        overdueAmountEGP += calc.externalAmount || 0;
      } else if (isDueSoon) {
        urgencyLevel = 'warning';
        dueSoonCount++;
        dueSoonAmountEGP += calc.externalAmount || 0;
      } else if (readyForPayout) {
        urgencyLevel = 'payout_ready';
        payoutReadyCount++;
        payoutReadyAmountEGP += (calc.recruiterAmount || 0) + (calc.leaderAmount || 0) + (calc.unitAmount || 0);
      }

      alerts.push({
        candidateId: cand.id,
        candidateName: cand.fullName,
        candidatePhone: cand.phone,
        company: cand.company,
        language: cand.language || 'English',
        recruiterName: cand.createdByName || 'Recruiter',
        recruiterId: cand.createdBy,
        externalAmount: calc.externalAmount || 0,
        ceoAmount: calc.ceoAmount || 0,
        recruiterAmount: calc.recruiterAmount || 0,
        leaderAmount: calc.leaderAmount || 0,
        unitAmount: calc.unitAmount || 0,
        termsDays: calc.termsDays || 30,
        startDate: cand.trainingStartDate || cand.createdAt,
        dueDate: calc.dueDate,
        daysRemaining,
        isOverdue,
        isDueSoon,
        readyForPayout,
        urgencyLevel
      });
    }
  });

  // Sort: Critical overdue first, then due soon, then payout ready, then upcoming
  const urgencyWeight = { critical: 4, warning: 3, payout_ready: 2, normal: 1 };
  alerts.sort((a, b) => {
    const diff = urgencyWeight[b.urgencyLevel] - urgencyWeight[a.urgencyLevel];
    if (diff !== 0) return diff;
    return a.daysRemaining - b.daysRemaining;
  });

  return {
    overdueCount,
    overdueAmountEGP,
    dueSoonCount,
    dueSoonAmountEGP,
    payoutReadyCount,
    payoutReadyAmountEGP,
    totalReceivablesEGP,
    alerts
  };
}
