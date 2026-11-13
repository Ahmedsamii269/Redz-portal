import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, testConnection } from '../lib/firebase';
import { getFriendlyErrorMessage, handleFirestoreError, OperationType, sanitizeFirestorePayload } from '../lib/firestoreErrors';
import { getSafeTimestamp } from '../lib/dateUtils';
import { useAuth } from './AuthContext';
import {
  Candidate,
  CandidateStatus,
  JobOffer,
  CompanyProcess,
  CommissionRule,
  ConfirmationTemplate,
  NotificationItem,
  SystemSettings,
  UserProfile,
  UserPresence,
  AuditLog
} from '../types';
import { findMatchingCommissionRule, calculateCascadePayout } from '../lib/commissionCalculator';
import { seedFirestoreDatabase, INITIAL_BRAND, INITIAL_STATUSES, INITIAL_COMPANIES, INITIAL_VOCAROO_INSTRUCTIONS, INITIAL_WEBSITE_LINK } from '../lib/seedData';

interface DataContextType {
  candidates: Candidate[];
  allCandidates: Candidate[]; // Including archived and deleted (for CEO)
  offers: JobOffer[];
  processes: CompanyProcess[];
  commissionRules: CommissionRule[];
  confirmationTemplates: ConfirmationTemplate[];
  users: UserProfile[];
  notifications: NotificationItem[];
  settings: SystemSettings | null;
  dataLoading: boolean;
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  unreadNotificationsCount: number;
  presenceList: UserPresence[];
  onlineUsers: UserPresence[];
  auditLogs: AuditLog[];
  // Actions
  addCandidate: (candidateData: Omit<Candidate, 'id' | 'status' | 'statusHistory' | 'createdAt'>) => Promise<{ success: boolean; id?: string; error?: string }>;
  updateCandidateStatus: (candidateId: string, newStatus: CandidateStatus, details?: { interviewDate?: string; interviewTime?: string; trainingStartDate?: string; note?: string }) => Promise<void>;
  updateCandidate: (candidateId: string, updates: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (candidateId: string, soft?: boolean) => Promise<void>;
  archiveCandidate: (candidateId: string) => Promise<void>;
  restoreCandidate: (candidateId: string) => Promise<void>;
  toggleClientCollected: (candidateId: string) => Promise<void>;
  toggleRecruiterPaid: (candidateId: string) => Promise<void>;
  // Offers
  saveOffer: (offer: Partial<JobOffer>) => Promise<{ success: boolean; error?: string }>;
  deleteOffer: (offerId: string) => Promise<void>;
  // Processes
  saveProcess: (process: Partial<CompanyProcess>) => Promise<void>;
  deleteProcess: (processId: string) => Promise<void>;
  // Commission Rules
  saveCommissionRule: (rule: Partial<CommissionRule>) => Promise<void>;
  deleteCommissionRule: (ruleId: string) => Promise<void>;
  // Confirmation Templates
  saveConfirmationTemplate: (template: Partial<ConfirmationTemplate>) => Promise<void>;
  deleteConfirmationTemplate: (templateId: string) => Promise<void>;
  // Users Management
  saveUser: (user: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  // Notifications & Presence
  sendNotification: (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateUserPresence: (activeTab?: string) => Promise<void>;
  // Audit Logging
  logAction: (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<void>;
  // Settings & Seeding
  updateGeneralSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  triggerSeed: (force?: boolean) => Promise<{ success: boolean; message: string }>;
  clearAllCandidates: () => Promise<{ success: boolean; message: string }>;
  checkConnectionNow: () => Promise<boolean>;
  lastSyncedAt: Date;
}

const stripUndefined = <T,>(value: T): T => sanitizeFirestorePayload(value);

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { effectiveUser, userProfile, currentUser } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [processes, setProcesses] = useState<CompanyProcess[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [confirmationTemplates, setConfirmationTemplates] = useState<ConfirmationTemplate[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [presenceList, setPresenceList] = useState<UserPresence[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  const isRealCeo =
    userProfile?.role === 'ceo' ||
    currentUser?.email?.toLowerCase() === 'ahmedsamii269@gmail.com';

  // Log an action to Firestore
  const logAction = async (logData: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
    if (!currentUser || !effectiveUser?.id) return;
    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fullLog: AuditLog = stripUndefined({
      ...logData,
      id: logId,
      userId: effectiveUser.id,
      userName: effectiveUser.name,
      userRole: effectiveUser.role,
      timestamp: new Date().toISOString()
    });
    try {
      await setDoc(doc(db, 'auditLogs', logId), fullLog);
    } catch (err) {
      console.warn('Could not save audit log:', err);
    }
  };

  // Verify connection initially and periodically while signed in
  const checkConn = async () => {
    if (!currentUser) return false;
    const ok = await testConnection();
    setConnectionStatus(ok ? 'connected' : 'offline');
    setLastSyncedAt(new Date());
    return ok;
  };

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const interval = setInterval(async () => {
      if (isMounted) await checkConn();
    }, 30000);

    checkConn();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.uid]);

  // Real-time listener: Settings
  useEffect(() => {
    if (!currentUser) {
      setSettings(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'settings', 'general'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as SystemSettings);
        } else {
          const fallback: SystemSettings = {
            id: 'general',
            brand: INITIAL_BRAND,
            statuses: INITIAL_STATUSES,
            companies: INITIAL_COMPANIES,
            vocarooInstructions: INITIAL_VOCAROO_INSTRUCTIONS,
            websiteLink: INITIAL_WEBSITE_LINK,
            seeded: false
          };
          setSettings(fallback);
          // Only Founder/CEO auto-seeds initial agency settings once server confirms document is missing
          if (isRealCeo && !snapshot.metadata.fromCache) {
            seedFirestoreDatabase(false).catch(() => {});
          }
        }
        setConnectionStatus('connected');
        setLastSyncedAt(new Date());
      },
      (error) => {
        console.warn('Settings listener issue:', error);
        setConnectionStatus('offline');
      }
    );
    return () => unsub();
  }, [currentUser?.uid, isRealCeo]);

  // Real-time listener: Candidates
  useEffect(() => {
    if (!currentUser) {
      setAllCandidates([]);
      setCandidates([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const q = query(collection(db, 'candidates'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Candidate[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Candidate));
        setAllCandidates(list);
        setCandidates(list.filter((c) => !c.deleted && !c.archived));
        setConnectionStatus('connected');
        setLastSyncedAt(new Date());
        setDataLoading(false);
      },
      (err) => {
        console.warn('Candidates listener error:', err);
        setConnectionStatus('offline');
        setDataLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Real-time listener: Audit Logs (CEO only)
  useEffect(() => {
    if (!currentUser || !isRealCeo) {
      setAuditLogs([]);
      return;
    }
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: AuditLog[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as AuditLog));
        setAuditLogs(list);
      },
      (err) => console.warn('Audit logs listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid, isRealCeo]);

  useEffect(() => {
    if (!currentUser) {
      setOffers([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'offers'),
      (snapshot) => {
        const list: JobOffer[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as JobOffer));
        setOffers(list);
      },
      (err) => console.warn('Offers listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) {
      setProcesses([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'processes'),
      (snapshot) => {
        const list: CompanyProcess[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as CompanyProcess));
        setProcesses(list);
      },
      (err) => console.warn('Processes listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) {
      setCommissionRules([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'commissionRules'),
      (snapshot) => {
        const list: CommissionRule[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as CommissionRule));
        setCommissionRules(list);
      },
      (err) => console.warn('Commission rules listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) {
      setConfirmationTemplates([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'confirmationTemplates'),
      (snapshot) => {
        const list: ConfirmationTemplate[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as ConfirmationTemplate));
        setConfirmationTemplates(list);
      },
      (err) => console.warn('Templates listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as UserProfile));
        setUsers(list);
      },
      (err) => console.warn('Users listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Backfill usernameDirectory for existing team profiles when CEO is signed in
  const syncedUsernamesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!currentUser || !isRealCeo || users.length === 0) return;
    users.forEach((u) => {
      const uname = u.username?.trim();
      const uemail = u.email?.trim();
      if (!uname || !uemail) return;
      const cacheKey = `${uname.toLowerCase()}|${uemail.toLowerCase()}`;
      if (syncedUsernamesRef.current.has(cacheKey)) return;
      syncedUsernamesRef.current.add(cacheKey);
      setDoc(
        doc(db, 'usernameDirectory', uname.toLowerCase()),
        {
          username: uname,
          email: uemail,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      ).catch(() => {
        syncedUsernamesRef.current.delete(cacheKey);
      });
    });
  }, [currentUser?.uid, isRealCeo, users]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: NotificationItem[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as NotificationItem));
        setNotifications(list);
      },
      (err) => console.warn('Notifications listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // Real-time listener: Presence (CEO only per Firestore rules)
  useEffect(() => {
    if (!currentUser || !isRealCeo) {
      setPresenceList([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'presence'),
      (snapshot) => {
        const list: UserPresence[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), userId: d.id } as UserPresence));
        setPresenceList(list);
      },
      (err) => console.warn('Presence listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.uid, isRealCeo]);

  // Update user presence (heartbeat written strictly to authenticated currentUser.uid)
  const updateUserPresence = async (activeTab?: string) => {
    if (!currentUser?.uid) return;
    const realProfile = userProfile || effectiveUser;
    const presenceRef = doc(db, 'presence', currentUser.uid);
    const presenceData = stripUndefined<UserPresence>({
      userId: currentUser.uid,
      userName: realProfile?.name || currentUser.displayName || 'Redz Member',
      userEmail: realProfile?.email || currentUser.email || '',
      userRole: realProfile?.role || 'recruiter',
      lastActive: new Date().toISOString(),
      isOnline: true,
      activeTab: activeTab || undefined,
      photoUrl: realProfile?.photoUrl
    });
    try {
      await setDoc(presenceRef, presenceData, { merge: true });
    } catch (err) {
      console.warn('Presence update failed:', err);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid) return;
    const interval = setInterval(() => updateUserPresence(), 60000);
    updateUserPresence();
    return () => clearInterval(interval);
  }, [currentUser?.uid, userProfile?.role, userProfile?.name]);

  // Add Candidate
  const addCandidate = async (
    candidateData: Omit<Candidate, 'id' | 'status' | 'statusHistory' | 'createdAt'>
  ): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!currentUser?.uid || !effectiveUser?.id) {
      return { success: false, error: 'You must be signed in to add a candidate.' };
    }

    const trimmedName = (candidateData.fullName || '').trim();
    const trimmedPhone = (candidateData.phone || '').trim();
    const trimmedVocaroo = (candidateData.vocarooUrl || '').trim();

    if (!trimmedName || !trimmedPhone || !trimmedVocaroo) {
      return { success: false, error: 'Full Name, Primary Phone, and Vocaroo URL are required.' };
    }

    const candidateId = `cand-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    const newCandidate: Candidate = stripUndefined({
      ...candidateData,
      fullName: trimmedName,
      phone: trimmedPhone,
      vocarooUrl: trimmedVocaroo,
      id: candidateId,
      status: 'New',
      statusHistory: [
        {
          status: 'New',
          changedBy: effectiveUser.id,
          changedByName: effectiveUser.name,
          timestamp: now,
          note: 'Candidate registered'
        }
      ],
      createdBy: effectiveUser.id,
      createdByName: effectiveUser.name,
      leaderId: candidateData.leaderId || effectiveUser.leaderId,
      leaderName: candidateData.leaderName || effectiveUser.leaderName,
      unitManagerId: candidateData.unitManagerId || effectiveUser.unitManagerId,
      unitManagerName: candidateData.unitManagerName || effectiveUser.unitManagerName,
      createdAt: now,
      archived: false,
      deleted: false
    });

    try {
      await setDoc(doc(db, 'candidates', candidateId), newCandidate);
      await logAction({
        action: 'create',
        entityType: 'candidate',
        entityId: candidateId,
        details: `Added new candidate: ${newCandidate.fullName} for ${newCandidate.company}`
      });
      return { success: true, id: candidateId };
    } catch (err: any) {
      console.error('addCandidate failed:', err);
      return { success: false, error: getFriendlyErrorMessage(err, 'Failed to save candidate.') };
    }
  };

  // Update Candidate Status
  const updateCandidateStatus = async (
    candidateId: string,
    newStatus: CandidateStatus,
    details?: { interviewDate?: string; interviewTime?: string; trainingStartDate?: string; note?: string }
  ) => {
    const candidate = allCandidates.find((c) => c.id === candidateId);
    if (!candidate) {
      throw new Error('Candidate record not found.');
    }

    const now = new Date().toISOString();
    const historyEntry = {
      status: newStatus,
      changedBy: effectiveUser.id,
      changedByName: effectiveUser.name,
      timestamp: now,
      note: details?.note || `Status changed to ${newStatus}`
    };

    const updates: Partial<Candidate> = {
      status: newStatus,
      statusHistory: [...(candidate.statusHistory || []), historyEntry],
      updatedAt: now
    };

    if (details?.interviewDate) updates.interviewDate = details.interviewDate;
    if (details?.interviewTime) updates.interviewTime = details.interviewTime;

    // Automatic Commission Calculation on Start Training
    if (newStatus === 'Start Training') {
      const trainingDate = details?.trainingStartDate || new Date().toISOString().split('T')[0];
      updates.trainingStartDate = trainingDate;

      const matchingRule = findMatchingCommissionRule(commissionRules, candidate.company, candidate.language);
      if (matchingRule) {
        const creatorProfile = users.find((u) => u.id === candidate.createdBy) || {
          role: 'recruiter',
          leaderId: candidate.leaderId,
          unitManagerId: candidate.unitManagerId
        };
        const calc = calculateCascadePayout(matchingRule, creatorProfile, trainingDate);
        updates.commissionCalculated = calc;
      }
    }

    try {
      const sanitized = stripUndefined(updates);
      await updateDoc(doc(db, 'candidates', candidateId), sanitized);
      await logAction({
        action: 'update',
        entityType: 'candidate',
        entityId: candidateId,
        details: `Updated status of ${candidate.fullName} to ${newStatus}`
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  const updateCandidate = async (candidateId: string, updates: Partial<Candidate>) => {
    try {
      const sanitized = stripUndefined({ ...updates, updatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'candidates', candidateId), sanitized);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  const deleteCandidate = async (candidateId: string, soft: boolean = true) => {
    try {
      if (soft) {
        await updateDoc(doc(db, 'candidates', candidateId), {
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: effectiveUser.id
        });
        await logAction({ action: 'delete', entityType: 'candidate', entityId: candidateId, details: 'Soft deleted candidate (moved to Trash)' });
      } else {
        await deleteDoc(doc(db, 'candidates', candidateId));
        await logAction({ action: 'delete', entityType: 'candidate', entityId: candidateId, details: 'Hard deleted candidate from system' });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `candidates/${candidateId}`);
    }
  };

  const archiveCandidate = async (candidateId: string) => {
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        archived: true,
        updatedAt: new Date().toISOString()
      });
      await logAction({ action: 'archive', entityType: 'candidate', entityId: candidateId, details: 'Archived candidate' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  const restoreCandidate = async (candidateId: string) => {
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        archived: false,
        deleted: false,
        updatedAt: new Date().toISOString()
      });
      await logAction({ action: 'restore', entityType: 'candidate', entityId: candidateId, details: 'Restored candidate from Archive/Trash' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  // Toggle Client Payment Collected
  const toggleClientCollected = async (candidateId: string) => {
    const candidate = allCandidates.find((c) => c.id === candidateId);
    if (!candidate || !candidate.commissionCalculated) {
      throw new Error('Candidate commission record not found.');
    }
    const current = candidate.commissionCalculated.clientCollected;
    const now = new Date().toISOString();

    const updatedCalc: any = {
      ...candidate.commissionCalculated,
      clientCollected: !current
    };

    if (!current) {
      updatedCalc.collectedAt = now;
    } else {
      delete updatedCalc.collectedAt;
    }

    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        commissionCalculated: stripUndefined(updatedCalc),
        updatedAt: now
      });
      await logAction({ action: 'update', entityType: 'commission', entityId: candidateId, details: `Toggled client collection to ${!current}` });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  // Toggle Team Commission Paid
  const toggleRecruiterPaid = async (candidateId: string) => {
    const candidate = allCandidates.find((c) => c.id === candidateId);
    if (!candidate || !candidate.commissionCalculated) {
      throw new Error('Candidate commission record not found.');
    }
    const current = candidate.commissionCalculated.recruiterPaid;
    const now = new Date().toISOString();

    const updatedCalc: any = {
      ...candidate.commissionCalculated,
      recruiterPaid: !current,
      leaderPaid: !current,
      unitPaid: !current
    };

    if (!current) {
      updatedCalc.paidAt = now;
    } else {
      delete updatedCalc.paidAt;
    }

    const newStatus: CandidateStatus = !current ? 'Commission Done' : 'Start Training';

    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        status: newStatus,
        commissionCalculated: stripUndefined(updatedCalc),
        updatedAt: now
      });
      await logAction({ action: 'update', entityType: 'commission', entityId: candidateId, details: `Toggled team payout to ${!current}` });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  // Offers with STRICT Anti-Forbidden-Names Guard
  const saveOffer = async (offer: Partial<JobOffer>): Promise<{ success: boolean; error?: string }> => {
    const textToCheck = `${offer.offerText || ''} ${offer.copyText || ''}`;
    const forbiddenPattern = /(mosla\s*pioneers|career\s*core)/i;

    if (forbiddenPattern.test(textToCheck)) {
      return {
        success: false,
        error: 'CRITICAL SECURITY VIOLATION: Offer text must NEVER contain the names "MOSLA Pioneers" or "Career Core". Please remove them.'
      };
    }

    const offerId = offer.id || `offer-${Date.now()}`;
    const sanitized = stripUndefined({ ...offer, id: offerId });
    try {
      await setDoc(doc(db, 'offers', offerId), sanitized, { merge: true });
      await logAction({ action: 'update', entityType: 'offer', entityId: offerId, details: `Saved job offer for ${offer.company}` });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: getFriendlyErrorMessage(err, 'Failed to save job offer.') };
    }
  };

  const deleteOffer = async (offerId: string) => {
    try {
      await deleteDoc(doc(db, 'offers', offerId));
      await logAction({ action: 'delete', entityType: 'offer', entityId: offerId, details: 'Deleted job offer' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `offers/${offerId}`);
    }
  };

  // Processes
  const saveProcess = async (process: Partial<CompanyProcess>) => {
    const processId = process.id || `proc-${Date.now()}`;
    const sanitized = stripUndefined({ ...process, id: processId });
    try {
      await setDoc(doc(db, 'processes', processId), sanitized, { merge: true });
      await logAction({ action: 'update', entityType: 'setting', entityId: processId, details: `Saved process for ${process.company}` });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `processes/${processId}`);
    }
  };

  const deleteProcess = async (processId: string) => {
    try {
      await deleteDoc(doc(db, 'processes', processId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `processes/${processId}`);
    }
  };

  // Commission Rules
  const saveCommissionRule = async (rule: Partial<CommissionRule>) => {
    const ruleId = rule.id || `rule-${Date.now()}`;
    const sanitized = stripUndefined({ ...rule, id: ruleId });
    try {
      await setDoc(doc(db, 'commissionRules', ruleId), sanitized, { merge: true });
      await logAction({ action: 'update', entityType: 'commission', entityId: ruleId, details: `Updated rate rule for ${rule.track}` });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `commissionRules/${ruleId}`);
    }
  };

  const deleteCommissionRule = async (ruleId: string) => {
    try {
      await deleteDoc(doc(db, 'commissionRules', ruleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `commissionRules/${ruleId}`);
    }
  };

  // Confirmation Templates
  const saveConfirmationTemplate = async (template: Partial<ConfirmationTemplate>) => {
    const templateId = template.id || `tpl-${Date.now()}`;
    const sanitized = stripUndefined({ ...template, id: templateId });
    try {
      await setDoc(doc(db, 'confirmationTemplates', templateId), sanitized, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `confirmationTemplates/${templateId}`);
    }
  };

  const deleteConfirmationTemplate = async (templateId: string) => {
    try {
      await deleteDoc(doc(db, 'confirmationTemplates', templateId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `confirmationTemplates/${templateId}`);
    }
  };

  // Users
  const saveUser = async (user: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    const userId = user.id || `user-${Date.now()}`;
    const sanitized = stripUndefined({ ...user, id: userId });
    try {
      await setDoc(doc(db, 'users', userId), sanitized, { merge: true });
      const uname = sanitized.username?.trim();
      const uemail = sanitized.email?.trim();
      if (uname && uemail) {
        await setDoc(
          doc(db, 'usernameDirectory', uname.toLowerCase()),
          {
            username: uname,
            email: uemail,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        ).catch((dirErr) => {
          console.warn('Could not update usernameDirectory:', dirErr);
        });
      }
      await logAction({ action: 'update', entityType: 'user', entityId: userId, details: `Updated profile for ${user.name}` });
      return { success: true };
    } catch (err: any) {
      console.error('Save user failed:', err);
      return { success: false, error: getFriendlyErrorMessage(err, 'Failed to save user profile.') };
    }
  };

  // Notifications
  const sendNotification = async (notif: Omit<NotificationItem, 'id' | 'createdAt' | 'readBy'>) => {
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const fullNotif: NotificationItem = stripUndefined({
      ...notif,
      id: notifId,
      createdAt: new Date().toISOString(),
      readBy: []
    });
    try {
      await setDoc(doc(db, 'notifications', notifId), fullNotif);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
    }
  };

  const markNotificationRead = async (notifId: string) => {
    const notif = notifications.find((n) => n.id === notifId);
    if (!notif || !effectiveUser?.id) return;
    const currentReadBy = notif.readBy || [];
    if (!currentReadBy.includes(effectiveUser.id)) {
      try {
        await updateDoc(doc(db, 'notifications', notifId), { readBy: [...currentReadBy, effectiveUser.id] });
      } catch (err) {
        console.warn('Could not mark notification read:', err);
      }
    }
  };

  const markAllNotificationsRead = async () => {
    if (!effectiveUser?.id) return;
    const allIds = new Set(notifications.map((n) => n.id));
    setDismissedNotifIds(allIds);
    const unread = notifications.filter((n) => !n.readBy || !n.readBy.includes(effectiveUser.id));
    if (unread.length === 0) return;
    try {
      const batchPromises = unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { readBy: [...(n.readBy || []), effectiveUser.id] }));
      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Could not batch mark notifications read:', err);
    }
  };

  // General Settings
  const updateGeneralSettings = async (newSettings: Partial<SystemSettings>) => {
    const sanitized = stripUndefined(newSettings);
    try {
      await setDoc(doc(db, 'settings', 'general'), sanitized, { merge: true });
      await logAction({ action: 'update', entityType: 'setting', entityId: 'general', details: 'Updated agency-wide system settings' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/general');
    }
  };

  const triggerSeed = async (force: boolean = true) => {
    return await seedFirestoreDatabase(force);
  };

  const clearAllCandidates = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const refs = [
        ...allCandidates.map((c) => doc(db, 'candidates', c.id)),
        ...notifications.map((n) => doc(db, 'notifications', n.id))
      ];
      for (let i = 0; i < refs.length; i += 450) {
        const chunk = refs.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
      }
      return { success: true, message: 'All candidates and notifications cleared successfully.' };
    } catch (err) {
      console.error('Error clearing data:', err);
      return { success: false, message: getFriendlyErrorMessage(err, 'Failed to clear data. Verify CEO permissions.') };
    }
  };

  const unreadNotificationsCount = notifications.filter(
    (n) => (!n.readBy || !n.readBy.includes(effectiveUser.id)) && !dismissedNotifIds.has(n.id)
  ).length;

  const nowVal = Date.now();
  const onlineUsers = presenceList.filter((p) => {
    if (!p.lastActive) return false;
    const ts = getSafeTimestamp(p.lastActive);
    if (!ts) return false;
    return p.isOnline && (nowVal - ts) < 2.0 * 60 * 1000;
  });

  return (
    <DataContext.Provider
      value={{
        candidates,
        allCandidates,
        offers,
        processes,
        commissionRules,
        confirmationTemplates,
        users,
        notifications,
        settings,
        dataLoading,
        connectionStatus,
        unreadNotificationsCount,
        presenceList,
        onlineUsers,
        auditLogs,
        addCandidate,
        updateCandidateStatus,
        updateCandidate,
        deleteCandidate,
        archiveCandidate,
        restoreCandidate,
        toggleClientCollected,
        toggleRecruiterPaid,
        saveOffer,
        deleteOffer,
        saveProcess,
        deleteProcess,
        saveCommissionRule,
        deleteCommissionRule,
        saveConfirmationTemplate,
        deleteConfirmationTemplate,
        saveUser,
        sendNotification,
        markNotificationRead,
        markAllNotificationsRead,
        updateUserPresence,
        logAction,
        updateGeneralSettings,
        triggerSeed,
        clearAllCandidates,
        checkConnectionNow: checkConn,
        lastSyncedAt
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
