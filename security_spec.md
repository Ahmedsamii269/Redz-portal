# Security Specification for Redz Recruitment Agency

## 1. Data Invariants
1. Only authenticated users with valid roles ('ceo', 'account_manager', 'unit_manager', 'leader', 'recruiter') can interact with the system.
2. The CEO (identified by email `ahmedsamii269@gmail.com` or role `ceo`) has full administrative permissions over users, settings, offers, processes, confirmation templates, commission rules, and candidates.
3. Candidate records created by recruiters must record the recruiter's UID, and their assigned Leader and Unit Manager.
4. Only CEO and Account Managers can review voice notes and transition statuses to Accepted/Rejected Voice Note and subsequent stages.
5. Critical financial fields (commission cascade calculations) can only be marked as collected or paid by CEO.
6. User profile updates by non-admin users must preserve immutable security fields (`role`, `disabled`, `leaderId`, `unitManagerId`).
7. Offers cannot contain the prohibited terms 'MOSLA Pioneers' or 'Career Core'.

## 2. The Dirty Dozen Payloads (Designed to test boundaries)
1. Unauthenticated write to `/candidates/cand1`: Expected `PERMISSION_DENIED`.
2. Recruiter attempting to self-promote to `role: 'ceo'`: Expected `PERMISSION_DENIED`.
3. Recruiter attempting to update candidate status directly to `Start Training`: Expected `PERMISSION_DENIED`.
4. Tampering with candidate's `createdBy` to impersonate another recruiter: Expected `PERMISSION_DENIED`.
5. Non-CEO user attempting to modify global commission rules: Expected `PERMISSION_DENIED`.
6. Non-CEO user attempting to delete another user profile: Expected `PERMISSION_DENIED`.
7. Non-CEO user attempting to modify agency branding or system settings: Expected `PERMISSION_DENIED`.
8. Updating candidate with invalid string length > 256 for name: Expected `PERMISSION_DENIED`.
9. Document ID injection with invalid path characters or huge buffer: Expected `PERMISSION_DENIED`.
10. Attempting to wipe `createdAt` timestamp on an existing candidate: Expected `PERMISSION_DENIED`.
11. Reading another team's candidates when scoped strictly (unless CEO / Account Manager): Expected `PERMISSION_DENIED`.
12. Creating candidate without required fields (`fullName`, `phone`, `company`, `vocarooUrl`): Expected `PERMISSION_DENIED`.
