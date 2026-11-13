import { CommissionRule, UserProfile, CommissionCalculation } from '../types';

export function findMatchingCommissionRule(
  rules: CommissionRule[],
  company: string,
  language: string = 'English'
): CommissionRule | undefined {
  const isLanguageTrack = language && language.toLowerCase() !== 'english';
  const cleanCompany = company.trim().toLowerCase();

  // Try matching with track consideration first
  const rule = rules.find(r => {
    const trackMatch = isLanguageTrack
      ? r.track.toLowerCase().includes('language')
      : r.track.toLowerCase().includes('english') || !r.track.toLowerCase().includes('language');

    const companyMatch = r.companiesOrAccounts.some(acc => {
      const cleanAcc = acc.toLowerCase();
      return cleanAcc.includes(cleanCompany) || cleanCompany.includes(cleanAcc);
    });

    return trackMatch && companyMatch;
  });

  if (rule) return rule;

  // Fallback to company match in any track
  return rules.find(r =>
    r.companiesOrAccounts.some(acc => {
      const cleanAcc = acc.toLowerCase();
      return cleanAcc.includes(cleanCompany) || cleanCompany.includes(cleanAcc);
    })
  );
}

export function calculateCascadePayout(
  rule: CommissionRule,
  creator: UserProfile | { role: string; leaderId?: string; unitManagerId?: string },
  trainingStartDate: string
): CommissionCalculation {
  const external = Number(rule.externalAmount) || 0;
  const rRate = Number(rule.recruiter) || 0;
  const lRate = Number(rule.leader) || 0;
  const uRate = Number(rule.unit) || 0;
  const termsDays = Number(rule.termsDays) || 30;

  // Calculate due date
  const start = new Date(trainingStartDate || Date.now());
  const dueDateObj = new Date(start.getTime() + termsDays * 24 * 60 * 60 * 1000);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  let recruiterAmount = 0;
  let leaderAmount = 0;
  let unitAmount = 0;
  let ceoAmount = 0;

  const role = creator.role || 'recruiter';
  const hasLeader = Boolean(creator.leaderId);
  const hasUnit = Boolean(creator.unitManagerId);

  if (role === 'ceo') {
    // Submitted by CEO: CEO absorbs entire external amount
    recruiterAmount = 0;
    leaderAmount = 0;
    unitAmount = 0;
    ceoAmount = external;
  } else if (role === 'unit_manager') {
    // Submitted by Unit Manager: unit gets `unit`, CEO gets external - unit
    recruiterAmount = 0;
    leaderAmount = 0;
    unitAmount = uRate;
    ceoAmount = Math.max(0, external - unitAmount);
  } else if (role === 'leader') {
    // Submitted by Leader: leader gets `leader`, unit gets `unit - leader` (if exists), CEO gets rest
    recruiterAmount = 0;
    leaderAmount = lRate;
    unitAmount = hasUnit ? Math.max(0, uRate - lRate) : 0;
    ceoAmount = Math.max(0, external - (leaderAmount + unitAmount));
  } else {
    // Submitted by Recruiter (default)
    recruiterAmount = rRate;

    if (hasLeader && hasUnit) {
      leaderAmount = Math.max(0, lRate - rRate);
      unitAmount = Math.max(0, uRate - lRate);
      ceoAmount = Math.max(0, external - uRate);
    } else if (hasLeader && !hasUnit) {
      leaderAmount = Math.max(0, lRate - rRate);
      unitAmount = 0;
      ceoAmount = Math.max(0, external - lRate);
    } else {
      // Directly under CEO (no leader, no unit)
      leaderAmount = 0;
      unitAmount = 0;
      ceoAmount = Math.max(0, external - rRate);
    }
  }

  return {
    ruleTrack: rule.track,
    termsDays,
    externalAmount: external,
    recruiterAmount,
    leaderAmount,
    unitAmount,
    ceoAmount,
    dueDate,
    clientCollected: false,
    recruiterPaid: false,
    leaderPaid: false,
    unitPaid: false
  };
}
