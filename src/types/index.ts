export type UserRole = 'ceo' | 'account_manager' | 'unit_manager' | 'leader' | 'recruiter';

export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  lastActive: string; // ISO date string
  activeTab?: string;
  isOnline: boolean;
  photoUrl?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: UserRole;
  leaderId?: string;
  leaderName?: string;
  unitManagerId?: string;
  unitManagerName?: string;
  phone?: string; // WhatsApp number used for {{MY_PHONE}}
  instaPay?: string;
  mobileWallet?: string;
  facebook?: string;
  linkedin?: string;
  photoUrl?: string;
  disabled?: boolean;
  temporaryPassword?: string;
  createdAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginDevice?: string;
}

export type CandidateStatus =
  | 'New'
  | 'Accepted Voice Note'
  | 'Rejected Voice Note'
  | 'Interview Scheduled'
  | 'Interview Rescheduled'
  | 'Accepted Interview'
  | 'Rejected Interview'
  | 'Start Training'
  | 'Dropped or Left Training'
  | 'Commission Done'
  | string; // Allow custom statuses

export interface VoiceEvaluation {
  pronunciation: number; // 1 to 5
  fluency: number; // 1 to 5
  grammar: number; // 1 to 5
  confidence: number; // 1 to 5
  overallLevel: 'B1' | 'B2' | 'B2+' | 'C1' | 'C2';
  evaluatorNote?: string;
  evaluatedAt: string;
  evaluatedBy: string;
  evaluatedByName: string;
}

export interface StatusHistoryEntry {
  status: CandidateStatus;
  changedBy: string;
  changedByName: string;
  timestamp: string;
  note?: string;
}

export interface CommissionCalculation {
  ruleTrack: string;
  termsDays: number;
  externalAmount: number;
  recruiterAmount: number;
  leaderAmount: number;
  unitAmount: number;
  ceoAmount: number;
  dueDate: string; // ISO date string
  clientCollected: boolean;
  recruiterPaid: boolean;
  leaderPaid?: boolean;
  unitPaid?: boolean;
  paidAt?: string;
  collectedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'create' | 'update' | 'delete' | 'archive' | 'restore' | 'login' | 'commission_edit';
  entityType: 'candidate' | 'user' | 'offer' | 'commission' | 'setting';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  phone: string;
  phone2?: string;
  email?: string;
  graduateStatus: 'Graduate' | 'Not graduate' | 'Student';
  idNumber?: string;
  hasExperience: boolean;
  experienceDuration?: string;
  experienceTypes: string[];
  area: string;
  company: string;
  offerId?: string;
  language?: string;
  vocarooUrl: string;
  vocarooUrl2?: string;
  vocarooLanguage2?: string;
  interviewDate?: string;
  interviewTime?: string;
  status: CandidateStatus;
  statusHistory: StatusHistoryEntry[];
  createdBy: string;
  createdByName: string;
  leaderId?: string;
  leaderName?: string;
  unitManagerId?: string;
  unitManagerName?: string;
  age?: number;
  trainingStartDate?: string;
  commissionCalculated?: CommissionCalculation;
  voiceEvaluation?: VoiceEvaluation;
  confirmationSent?: boolean;
  archived?: boolean;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface JobOffer {
  id: string;
  language: string; // 'English' | 'French' | 'Spanish' | 'Dutch' | 'German'
  company: string;
  location: string;
  offerText: string;
  copyText?: string;
  confirmationMessage?: string;
  interviewMaterial?: string;
  candidateAutoReply?: string | null;
  interviewDays?: string | null;
  active: boolean;
  allowedRoles?: UserRole[];
  note?: string;
  materialNote?: string;
}

export interface CompanyProcess {
  id: string;
  company: string;
  processSteps: string[];
  extraNotes: string[];
  location?: string;
  interviewDays?: string;
  requirements?: string;
}

export interface CascadeDetails {
  ifSubmittedByRecruiter?: {
    recruiter: number;
    leader: number;
    unit: number;
    ceo: number;
  };
  ifSubmittedByLeader?: {
    leader: number;
    unit: number;
    ceo: number;
  };
  ifSubmittedByUnitManager?: {
    unit: number;
    ceo: number;
  };
  ifSubmittedByCEO?: {
    ceo: number;
  };
  note?: string;
}

export interface CommissionRule {
  id: string;
  track: string;
  companiesOrAccounts: string[];
  termsDays: number;
  externalAmount: number;
  recruiter: number;
  leader: number;
  unit: number;
  ceoShownInSheet?: number;
  cascade?: CascadeDetails;
  note?: string;
  needsDecision?: boolean;
}

export interface ConfirmationTemplate {
  id: string;
  company: string;
  variant: string;
  text: string;
  usesPlaceholders: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'candidate' | 'interview' | 'commission' | 'announcement' | 'status';
  targetUids?: string[]; // If undefined/empty, broadcast to all
  targetRole?: UserRole | 'all';
  createdBy?: string;
  createdByName?: string;
  candidateId?: string;
  createdAt: string;
  readBy?: string[];
}

export interface SystemBrandSettings {
  copyFooter: string;
  facebook: string;
  linkedin: string;
  phonePlaceholder: string;
}

export interface SystemSettings {
  id: string;
  brand: SystemBrandSettings;
  statuses: CandidateStatus[];
  customStatuses?: string[];
  companies: string[];
  vocarooInstructions: string;
  websiteLink: string;
  globalBroadcast?: {
    message: string;
    active: boolean;
    updatedAt: string;
    updatedBy: string;
  };
  seeded: boolean;
}
