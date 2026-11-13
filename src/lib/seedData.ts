import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import { CandidateStatus, JobOffer, CommissionRule, ConfirmationTemplate, CompanyProcess, SystemSettings } from '../types';

export const INITIAL_BRAND = {
  copyFooter: "🔔 Follow us for more job offers:\n📘 Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr\n💼 LinkedIn: https://www.linkedin.com/company/redz-recruitment1/",
  facebook: "https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr",
  linkedin: "https://www.linkedin.com/company/redz-recruitment1/",
  phonePlaceholder: "{{MY_PHONE}}"
};

export const INITIAL_STATUSES: CandidateStatus[] = [
  "New",
  "Accepted Voice Note",
  "Rejected Voice Note",
  "Interview Scheduled",
  "Interview Rescheduled",
  "Accepted Interview",
  "Rejected Interview",
  "Start Training",
  "Dropped or Left Training",
  "Commission Done"
];

export const INITIAL_COMPANIES = [
  "TTEC",
  "Teleperformance",
  "eClerx",
  "Alorica",
  "Dial Expert",
  "Global Results",
  "LPM",
  "LTS",
  "Creative Basket",
  "Total Trip",
  "CNX",
  "Sutherland",
  "VXI",
  "INtouchCX",
  "ABS"
];

export const INITIAL_VOCAROO_INSTRUCTIONS = 
  "Please record a 1-minute voice note introducing yourself in English (or the requested language) on Vocaroo (https://vocaroo.com), copy the link, and paste it here.";

export const INITIAL_WEBSITE_LINK = "https://redz-recruitment.com";

function isOfflineError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: string } | null)?.code?.toLowerCase() || '';
  return msg.includes('the client is offline') || msg.includes('unavailable') || code === 'unavailable';
}

// Raw seed data from redz-seed-data_bddcadbc.json
export async function seedFirestoreDatabase(force: boolean = false): Promise<{ success: boolean; message: string }> {
  let operation: OperationType = OperationType.GET;
  try {
    const generalDocRef = doc(db, 'settings', 'general');
    const existing = await getDoc(generalDocRef);
    if (existing.exists() && existing.data()?.seeded && !force) {
      return { success: true, message: 'Database already seeded' };
    }
    operation = OperationType.WRITE;

    // 1. Fetch JSON or use embedded seed
    const res = await fetch('/assets/aistudio/redz-seed-data_bddcadbc.json');
    if (!res.ok) {
      throw new Error(`Failed to fetch agency seed configuration (HTTP ${res.status})`);
    }
    const seedData = await res.json();

    const batch = writeBatch(db);

    // Seed General Settings
    const settingsData: SystemSettings = {
      id: 'general',
      brand: seedData.brand || INITIAL_BRAND,
      statuses: seedData.statuses || INITIAL_STATUSES,
      companies: INITIAL_COMPANIES,
      vocarooInstructions: INITIAL_VOCAROO_INSTRUCTIONS,
      websiteLink: INITIAL_WEBSITE_LINK,
      seeded: true
    };
    batch.set(generalDocRef, settingsData);

    // Seed Offers
    if (seedData.offers && Array.isArray(seedData.offers)) {
      for (const offer of seedData.offers) {
        const offerRef = doc(db, 'offers', offer.id);
        batch.set(offerRef, {
          id: offer.id,
          language: offer.language || 'English',
          company: offer.company,
          location: offer.location || '',
          offerText: offer.offerText,
          copyText: offer.copyText || offer.offerText,
          interviewMaterial: offer.interviewMaterial || '',
          candidateAutoReply: offer.candidateAutoReply || '',
          interviewDays: offer.interviewDays || '',
          active: offer.active ?? true,
          note: offer.note || '',
          materialNote: offer.materialNote || ''
        });
      }
    }

    // Seed Commission Rules
    if (seedData.commissionRules && Array.isArray(seedData.commissionRules)) {
      let idx = 1;
      for (const rule of seedData.commissionRules) {
        const ruleId = `rule-${rule.track.toLowerCase().replace(/\s+/g, '-')}-${idx++}`;
        const ruleRef = doc(db, 'commissionRules', ruleId);
        batch.set(ruleRef, {
          id: ruleId,
          track: rule.track,
          companiesOrAccounts: rule.companiesOrAccounts,
          termsDays: rule.termsDays,
          externalAmount: rule.externalAmount,
          recruiter: rule.recruiter,
          leader: rule.leader,
          unit: rule.unit,
          ceoShownInSheet: rule.ceoShownInSheet || 0,
          cascade: rule.cascade || {},
          note: rule.note || '',
          needsDecision: rule.note?.includes('Teleperformance') || rule.companiesOrAccounts.includes('TP language')
        });
      }
    }

    // Seed Confirmation Templates
    if (seedData.confirmationTemplates && Array.isArray(seedData.confirmationTemplates)) {
      let tidx = 1;
      for (const tpl of seedData.confirmationTemplates) {
        const tplId = `tpl-${tpl.company.toLowerCase().replace(/\s+/g, '-')}-${tpl.variant.toLowerCase()}-${tidx++}`;
        const tplRef = doc(db, 'confirmationTemplates', tplId);
        batch.set(tplRef, {
          id: tplId,
          company: tpl.company,
          variant: tpl.variant,
          text: tpl.text,
          usesPlaceholders: tpl.usesPlaceholders ?? true
        });
      }
    }

    // Seed Comprehensive Recruitment Processes for all client companies
    const CLIENT_COMPANY_PROCESSES = [
      {
        company: 'TTEC',
        location: 'Maadi Technology Park, Building 21',
        interviewDays: 'Monday to Friday, 11:00 AM – 4:00 PM',
        processSteps: [
          'Enter complete candidate information into the system, ensuring the Vocaroo English voice note link (B2+ / C1 level) is attached, along with any second language recordings.',
          'Schedule the on-site interview directly with the candidate for their chosen weekday.',
          'Send WhatsApp confirmation with interview location pin 24 hours prior; verify formal attire, original National ID, and graduation certificate.'
        ],
        extraNotes: [
          'Core Eligibility: Egyptian nationals only, university graduates only, finalized military status for males (completed or exempt), max age 45 years.',
          'Active Accounts: Customer Service English (CS English) plus multilingual sales in French, German, Spanish, Dutch, and Portuguese.',
          'Site Location: Maadi Technology Park, TTEC Building - https://maps.app.goo.gl/HBHLJSy4XxejTmXA8'
        ]
      },
      {
        company: 'Teleperformance English',
        location: 'One Kattameya Complex, Ring Road',
        interviewDays: 'Sunday to Thursday, 11:00 AM – 6:00 PM',
        processSteps: [
          'Record candidate profile into the database; Account Manager performs a double-check on language eligibility and voice note clarity.',
          'Schedule on-site interview at One Kattameya subject to strict daily quota (Max 3 Candidates per recruiter per day).',
          'Send approved confirmation message highlighting shift schedules and transport door-to-door boundaries.'
        ],
        extraNotes: [
          'Crucial Notice: The initial interview is conducted at One Kattameya, but physical work location post-training will be Nasr City or 6th of October.',
          'Requirements: Egyptian nationals, university graduates, max age 45, B2 minimum English, open to 24/7 rotational shifts.',
          'Benefits: Net salary up to 18,000 EGP, comprehensive medical & social insurance, dedicated door-to-door transport for female staff after 10 PM.'
        ]
      },
      {
        company: 'Teleperformance French',
        location: 'One Kattameya Complex, Ring Road',
        interviewDays: 'Sunday to Thursday, 10:00 AM – 5:00 PM',
        processSteps: [
          'Verify French voice note (minimum B2+ proficiency) evaluating pronunciation, syntax, and conversational fluency.',
          'Schedule on-site interview within the dedicated French account daily quota of 5 candidates.',
          'Coordinate with candidate for language battery and online computer assessments (SHL / Varient).'
        ],
        extraNotes: [
          'French accounts starting package from 33,500 EGP net salary plus performance bonuses and round-trip transport.',
          'Interview Headquarters: One Kattameya, Sunday to Thursday from 10:00 AM to 5:00 PM.'
        ]
      },
      {
        company: 'eClerx',
        location: 'Maadi Technology Park',
        interviewDays: 'Sunday to Thursday, 1:00 PM – 5:00 PM',
        processSteps: [
          'Log candidate profile and verify verifiable previous BPO / Call Center customer service experience.',
          'Book an on-site interview slot at Maadi Technology Park between 1:00 PM and 5:00 PM.',
          'Follow up on interview verdict with both candidate and Account Manager to register hiring or feedback.'
        ],
        extraNotes: [
          'Requirements: Graduates only, Egyptian nationals, B2 English with proven experience, finalized military status, max age 35.',
          'Work Schedule: Rotational night and overnight shifts with night differential allowance, family medical insurance, net salary up to 21,000 EGP.'
        ]
      },
      {
        company: 'Alorica',
        location: 'Fully Online (Microsoft Teams)',
        interviewDays: 'Monday to Friday',
        processSteps: [
          'Register candidate into the system within the daily screening quota of 5 candidates.',
          'Account Manager conducts preliminary verification and contacts candidate via WhatsApp to deliver Teams meeting credentials.',
          'Do NOT dispatch candidate to any physical office; interview is conducted 100% online via Microsoft Teams.'
        ],
        extraNotes: [
          'Account: US Airline Customer Service in Sheikh Zayed, fluent B2+ English, prior customer care experience, max age 40.',
          'Salary: Up to 21,000 EGP per month with fully paid training.'
        ]
      },
      {
        company: 'LTS',
        location: 'New Nozha, Cairo',
        interviewDays: 'Online screening followed by WhatsApp coordination',
        processSteps: [
          'Submit candidate profile under the daily allocation limit of 5 candidates.',
          'Candidates must NOT report to the physical office independently without prior appointment.',
          'Account Manager contacts the candidate via WhatsApp to schedule preliminary phone screening.'
        ],
        extraNotes: [
          'Accepts university graduates and undergrads, age 18 to 35, B2+ English for Outbound accounts and C1 for Inbound accounts.',
          'Compensation: 12,000 EGP base + 2,000 EGP KPIs; after 3-month probation, qualifies for 12,000 EGP bonus package reaching 15,000+ EGP monthly.'
        ]
      },
      {
        company: 'Total Trip',
        location: 'Sheraton Residences, Heliopolis (Apt 2, Bldg 6, Block 1183)',
        interviewDays: 'Wednesday, Thursday, and Friday from 2:00 PM to 3:00 PM',
        processSteps: [
          'Assess candidate voice note for Telesales persuasion, active listening, and conversational clarity in English.',
          'Schedule interview and supply candidate with exact Sheraton location pin and strict building entrance instructions.',
          'Confirm candidate attendance on the morning of the interview.'
        ],
        extraNotes: [
          'Crucial Building Rule: Entrance is strictly via the private ground-floor side door, NOT the main residential lobby and NOT Travco.',
          'Do NOT ring the residential intercom under any circumstance; ringing the intercom or entering from the wrong gate results in immediate candidate disqualification.',
          'Compensation: 20,000 EGP net fixed + uncapped commissions + daily cash spiffs.'
        ]
      },
      {
        company: 'Creative Basket',
        location: '2 Hafez Ramadan, Delta Buildings, Makram Ebeid, Nasr City',
        interviewDays: 'Tuesday and Wednesday from 2:00 PM to 5:00 PM',
        processSteps: [
          'Confirm candidate residence is within East Cairo (Nasr City, Madinaty, Rehab, Shorouk, Tagamoa).',
          'Direct candidate to Makram Ebeid office during scheduled slots, instructing them to state "Redz Recruitment Agency" upon arrival.',
          'Follow up on interview outcome to enroll candidate into onboarding.'
        ],
        extraNotes: [
          'Position: Travel Advisor (Reservations & Sales), minimum 3 months prior experience, B2+/C1 English.',
          'Salary: 13,000 to 16,000 EGP basic + sales commissions, with a maximum 5-day orientation.'
        ]
      },
      {
        company: 'LPM',
        location: '6th of October - Al-Motamayez District - Tourism Zone 6',
        interviewDays: 'Monday, Tuesday, and Wednesday from 7:30 PM to 9:30 PM',
        processSteps: [
          'Confirm candidate availability for fixed evening shift (3:15 PM to 12:30 AM midnight).',
          'Schedule interview in Al-Motamayez (Building 112, 3rd Floor, Apt 7), registering arrival under Redz Agency.',
          'Track training progression through onboarding completion.'
        ],
        extraNotes: [
          'Fixed evening shift with fixed weekend (Saturday & Sunday off), return transportation provided, net salary 20,000 EGP + commissions starting at 6,000 EGP.',
          'Meeting & transport pickup points: 6th of October, Sheikh Zayed, Haram, and Mohandessin.'
        ]
      },
      {
        company: 'Dial Expert',
        location: 'One Kattameya (Hybrid for Greater Cairo / Remote for other governorates)',
        interviewDays: 'Scheduled upon review of registration form by client',
        processSteps: [
          'Direct candidate to fill the Dial Expert application form and select "Redz" in the "How did you hear about us" field.',
          'Forward candidate full name and phone number to Account Manager to expedite review and lock interview slot.',
          'Confirm interview time with candidate immediately upon client invitation.'
        ],
        extraNotes: [
          'Role: US Financial Advisor (Closer), fluent B2+/C1 English, US evening shifts starting at 4:00 PM or 7:00 PM.',
          'Salary: 18,000 EGP net base + $20 USD commission per closed deal, fully paid training.'
        ]
      }
    ];

    let pidx = 1;
    for (const proc of CLIENT_COMPANY_PROCESSES) {
      const procId = `proc-${proc.company.toLowerCase().replace(/\s+/g, '-')}-${pidx++}`;
      const procRef = doc(db, 'processes', procId);
      batch.set(procRef, {
        id: procId,
        company: proc.company,
        location: proc.location,
        interviewDays: proc.interviewDays,
        processSteps: proc.processSteps,
        extraNotes: proc.extraNotes
      }, { merge: true });
    }

    // Create Initial CEO Profile
    const ceoRef = doc(db, 'users', 'ceo-admin-user');
    batch.set(ceoRef, {
      id: 'ceo-admin-user',
      email: 'ahmedsamii269@gmail.com',
      name: 'Ahmed Samii (CEO)',
      role: 'ceo',
      phone: '+201000000000',
      instaPay: 'ahmedsamii@instapay',
      mobileWallet: '01000000000',
      facebook: 'https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr',
      linkedin: 'https://www.linkedin.com/company/redz-recruitment1/',
      disabled: false,
      createdAt: new Date().toISOString()
    }, { merge: true });

    // Seed a welcome notification
    const notifRef = doc(db, 'notifications', 'notif-welcome');
    batch.set(notifRef, {
      id: 'notif-welcome',
      title: 'Welcome to Redz Recruitment Platform',
      message: 'Company offers, recruitment processes, and commission cascades are synchronized and ready for live operations.',
      type: 'announcement',
      createdAt: new Date().toISOString(),
      readBy: []
    });

    await batch.commit();
    return { success: true, message: 'Firestore successfully populated with production configuration!' };
  } catch (error) {
    if (!force && isOfflineError(error)) {
      console.warn('Firestore is offline; skipping automatic database seed.');
      return { success: false, message: 'Firestore is offline; automatic seed deferred.' };
    }
    handleFirestoreError(error, operation, 'settings/general');
  }
}
