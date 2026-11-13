# Build: "Redz" Recruitment Agency Web App (Dashboard + Website)

Build a full, production-ready, responsive web app for my recruitment agency **Redz**. I am the Founder & CEO. The logo (attached file `redz-logo-cropped.png`) must be part of the design (header, login page, favicon, loading screen), not just a picture. Brand palette taken from the logo: bright red (~#D93A30), deep red (~#9E2828), navy-violet blue (~#404B78), charcoal (~#2F3239), white/light gray (~#DFE0E2). Default to a polished dark theme (charcoal background) that matches the logo, with red as the primary accent and blue as the secondary accent; the light theme should show the logo on a dark rounded badge because the logo artwork has a dark background. Use the "R" symbol part of the logo as the favicon and app icon. Use a modern, clean, professional UI. Interface language: English (labels), with RTL-safe support for Arabic text inside content.

## 1. Tech & Data (CRITICAL)
- Use **Firebase**: Authentication (email/password), **Cloud Firestore** (real-time), Cloud Messaging / in-app notifications.
- All data must live in Firestore and sync **in real time** (`onSnapshot`) so any change by anyone shows instantly for everyone who is allowed to see it. **No data may be lost**: no localStorage-only data, no mock data. Add proper Firestore security rules matching the permissions below.
- Show a **"Cloud Synced (Firestore)"** indicator in the header confirming live connection status (green = connected, red = offline).
- Everything below that I (CEO) can manage must be editable from the UI, no code changes needed.

## 2. Roles & Hierarchy
Roles: **CEO (me)**, **Account Manager**, **Unit Manager**, **Leader**, **Recruiter**.

Hierarchy: Recruiter → Leader → Unit Manager → CEO.
- When I create a Recruiter user I must choose his **Leader** and his **Unit Manager**.
- Any user I don't assign a Leader/Unit to is placed **directly under me (CEO)**.
- **Leader** sees only his team (his recruiters and their candidates/stats).
- **Unit Manager** sees his whole unit: his leaders, their recruiters, and all related candidates/stats.
- **Recruiter** sees only what is assigned to him: Offers, Processes, his own candidates, the application form, his profile, notifications, leaderboard.
- **Account Manager**: sees ALL data (all candidates, all companies), can listen to voice notes, accept/reject them, change any candidate status, schedule interviews, and send WhatsApp confirmations. No user management, no editing offers/commissions settings.
- **CEO (me)**: full access to everything: add/edit/delete users, offers, processes, commissions, confirmation templates, statuses, settings.

## 3. Tabs / Pages
1. **Dashboard** (CEO: everything; Unit Manager / Leader / Recruiter: same layout scoped to their own team/data; Account Manager: all candidates/statuses but NO money widgets). Make it a world-class analytics dashboard: dark/light mode, KPI cards with trend arrows vs previous period, animated charts (use Recharts or Chart.js), global filters (period: today / week / month / custom range, company, language, recruiter, leader, unit), click-through from any chart/card to the underlying candidate list, and export to Excel/PDF. Include:
   - **KPI cards**: total candidates, voice notes accepted %, rejected %, interviews scheduled, interview accepted %, trainings started, commissions done, active recruiters.
   - **Funnel chart**: New → Accepted Voice Note → Interview Scheduled → Accepted Interview → Start Training → Commission Done, with conversion % between each step.
   - **Line chart**: candidates and trainings per day/week/month.
   - **Bar/donut charts**: candidates by company, by language, by status, by recruiter / leader / unit (top 10).
   - **Rejections breakdown** (voice note vs interview) per company.
   - **Heatmap or bar**: busiest interview days.
   - **Leaderboard widgets** (Top 3 recruiters/leaders/units this month, with photo).
   - **"My Money" section (CEO only)**, see section 5-B below: earned, expected, and when it will be collected, with charts (monthly bar chart of earnings, timeline of upcoming collections, earnings per company, earnings per team level).
   - **Pending actions panel**: voice notes waiting for review, interviews today/tomorrow missing a WhatsApp confirmation, trainings starting soon, commissions due to collect, commissions owed to recruiters.
2. **Offers**: cards of job offers (per company). Each card has a big **COPY** button under it that copies the offer text to the clipboard so recruiters can paste it on social media. CEO can add/edit/delete offers (company, title, text, active/inactive). Each offer has a button/link to open that company's **Process**.
   - **Follow-us footer under every offer**: every offer card shows this footer under the text, and the COPY button copies `offer text + blank line + footer` in one go (footer is a global setting editable by CEO in Settings):
     ```
     🔔 Follow us for more job offers:
     📘 Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr
     💼 LinkedIn: https://www.linkedin.com/company/redz-recruitment1/
     ```
   - **Personal contact number inside every offer**: offers contain the placeholder `{{MY_PHONE}}` (see the line "📲 Contact us via WhatsApp: {{MY_PHONE}}"). On display and on COPY, replace it with the phone number saved in the **logged-in user's profile** (works for Recruiter, Leader, Unit Manager, Account Manager and CEO), so every user copies the offer with his own number. If his profile has no phone number yet, show a prompt to add it before copying. Add a required `phone (WhatsApp)` field to the Profile page. The offer editor must keep `{{MY_PHONE}}` as an insertable variable button.
   - Each offer card is grouped/filterable by language (English, French, Spanish, Dutch, German) and company, and also shows: location, interview days, a "Process" button, and a "Interview Material" button (questions) for staff.
   - **Offer text must NEVER contain the names "MOSLA Pioneers" or "Career Core"** (any capitalization/spelling variant). These names are allowed ONLY inside WhatsApp confirmation templates (section 6), never in offers.
   - Enforce it in the app: when the CEO saves an offer, if the text contains either name, block the save and highlight the offending text with a warning. The COPY button must also strip these names (and show a warning) as a safety net, so recruiters can never copy an offer containing them.
3. **Processes**: one page per company (also reachable from a button under each offer) showing: process steps, interview days/times, location, requirements, documents, training details, notes. CEO has a rich-text editor to write/edit each company's process and add new companies.
4. **Commissions** (CEO full access; Account Manager read-only on candidates' commission status): loads the rate card in section 5-B (editable by CEO: add/edit/delete rows, terms days, amounts). Views: per company, per period (day / week / month / custom range chosen by me), per recruiter/leader/unit, with table + charts + export. Also supports CSV/Excel import of future commission files.
5. **Application Form** (new candidate): see section 4.
6. **My Candidates**: list of candidates each user submitted, with live status, company, dates, search and filters. Users see only their allowed scope (see roles).
7. **Leaderboard**: monthly ranking visible to everyone, showing photo + name: **TOP Recruiters**, **TOP Leaders**, **TOP Units**, ranked by number of voice notes **accepted** in the month. Highlight Top 1 for each.
8. **Profile**: photo, name, **InstaPay** number/handle, **mobile wallet** number (where commission is received), email, **Facebook link** (where he posts from), **LinkedIn link**. Editable by the user.
9. **Notifications**: bell icon with unread count + page. See section 7.
10. **Users** (CEO only): add/edit/disable users, assign role, Leader, Unit Manager.
11. **Settings** (CEO only): statuses list, companies, WhatsApp confirmation templates, Vocaroo instruction text, website link.

## 4. Candidate Application Form
Fields:
- Full name
- Phone number
- Phone number 2 (**optional**)
- Email
- Graduate or not (Graduate / Not graduate / Student)
- ID number
- Experience: yes/no, **duration**, and **type** (Customer Service, Sales, Technical Support, etc.; allow multiple + other)
- Area / where he lives
- Company applying for (dropdown from companies list)
- **Vocaroo voice note link** (required): below the field show a short instruction on how to record on Vocaroo and paste the link, plus the Redz website link (both editable by CEO in Settings).
- **Second Vocaroo link** (**optional**): for candidates applying with another language (French, Spanish, German, Dutch, etc.), with a language selector.
- **Calendar** to select the interview date (and show the company's available interview time window).

On submit: save to Firestore with `createdBy` (recruiter), his leader and unit auto-attached, status = "New", then trigger notifications.

## 5. Candidate Statuses (flow)
1. New (submitted)
2. Accepted Voice Note
3. Rejected Voice Note
4. Interview Scheduled (calendar to pick the date; editable)
5. Interview Rescheduled (calendar to pick the new date)
6. Accepted Interview
7. Rejected Interview
8. Start Training (calendar to pick the **first training day**)
9. Commission Done (set by me when I pay the recruiter his commission after the training period)

Rules:
- Only **CEO and Account Manager** can listen to the voice note and mark it Accepted/Rejected, and change statuses afterwards.
- Keep a **status history log** (who changed what and when) on every candidate.
- When status = **Start Training** with a date, the system automatically calculates the commission and its due date using that company's commission rules (amount + days after training start), and feeds the Commissions tab and Dashboard ("this month we achieved X commissions worth Y, collectable on ...").

### 5-B. Commission & "My Money" engine (CEO)
Seed data is in the attached `redz-seed-data.json` (key `commissionRules`). Each rule has: track (CS English / CS Languages), companies/accounts covered, `termsDays` (30 or 45), `externalAmount` (what the client company pays Redz per trained candidate; in the commission file this is the column named "CEO" / "UM"), and the rate card per role: recruiter, leader, unit.

**How it is calculated (build exactly like this, but keep all numbers editable):**
- The clock starts on the **Start Training date** of the candidate (the first training day I pick on the calendar). `dueDate = trainingStartDate + termsDays`.
- Each candidate gets its commission rule from his company/account (+ language). If the company/account matches no rule, flag it in the dashboard "Needs rule" widget.
- Payout is a **cascade** over the REAL chain of the person who submitted the candidate (rate-card numbers are cumulative level rates). Every level that does not exist in the chain is absorbed by the CEO:
  - Submitted by a **Recruiter** with leader + unit: recruiter gets `recruiter`; leader gets `leader − recruiter`; unit manager gets `unit − leader`; **CEO gets `externalAmount − unit`**.
  - Recruiter with a leader but no unit manager: leader gets `leader − recruiter`, CEO gets `externalAmount − leader`.
  - Recruiter directly under the CEO (no leader/unit): recruiter gets `recruiter`, **CEO gets `externalAmount − recruiter`**.
  - Submitted by a **Leader**: leader gets `leader`; his unit gets `unit − leader` (if any); CEO gets the rest.
  - Submitted by a **Unit Manager**: unit gets `unit`; CEO gets `externalAmount − unit`.
  - Submitted by **CEO**: CEO gets the full `externalAmount`.
  - General formula: CEO net = `externalAmount − (sum of payouts to the real chain)`. Example (external 3000, rates 1300/1700/2000): recruiter 1300 + leader 400 + unit 300 + CEO 1000 = 3000; recruiter directly under CEO: 1300 + CEO 1700.
  - **Dial Expert**: external amount = 2000 (CEO gets 500 over the unit rate of 1500).
- **My Money widgets (CEO only)**: (1) Earned & collectable this month, (2) Expected in coming months by due date, (3) Pending (still inside terms days) with countdown per candidate, (4) Overdue (due date passed and not yet marked collected), (5) Total payouts owed to recruiters/leaders/units and who still needs to be paid (using the InstaPay/wallet from their profiles), (6) Net per company and per team. All with charts and a period selector.
- **Commission Done** = I pay the recruiter after the period; it moves the payout from "owed" to "paid" and notifies the person. Also let me mark when Redz received the client payment (collected) separately from paying the team.
- **Teleperformance (TP)** has two sites: one English site and one French site. The seed has two "TP language" rules (4000 and 4500) marked `needsDecision`: show a warning in the Commissions tab until I assign each rule to its site/language, and let me edit rules from the UI at any time.

## 6. WhatsApp Interview Confirmation
- When a candidate becomes **Interview Scheduled** (visible to CEO and Account Manager), show a **WhatsApp icon/button** on the candidate row.
- Account Manager first confirms the interview day on a calendar. The selected date/day is automatically inserted into the company's confirmation message, alongside the candidate's name.
- Clicking the button opens WhatsApp (`https://wa.me/<phone>?text=<url-encoded message>`) with the ready message. Normalize Egyptian numbers to international format (+20).
- Placeholders in templates: `[Candidate Name]`, `[Day]` (use the full date + weekday). Everything else stays as written.
- CEO can **add, edit, and delete** confirmation templates for any company from Settings.
- Seed the templates below as the initial data.

### Seed templates

**Teleperformance English**
```
Hello [Candidate Name],

This is Ahmed from Mosla Pioneers. I hope you are doing well. I am writing to confirm your interview for the *Teleperformance English Customer Service account 🇬🇧 position at Teleperformance*

scheduled on: *[Day]*
from* 11 am to 3 pm*

As a quick reminder, the interview will be held at
📍 Cairo - Plaza
📍 https://g.co/kgs/yWVdUpX
- Don't forget to tell them that you are recruited by MOSLA Pioneers and write on the application form

*Reply with confirmed 👍 if you will attend on time or want me to reschedule*

If you need any further information from me beforehand, please do not hesitate to let me know.

Thank you once again for considering this opportunity.

Don't forget to *Follow Us* on:

Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr
LinkedIn: https://www.linkedin.com/company/redz-recruitment1/
```

**Teleperformance French**
```
Hello [Candidate Name],

I hope you are doing well. I am writing to confirm your interview for the *Customer Service position at Teleperformance ( French Account )* 

scheduled on: *[Day]*
at * 10am to 5pm*

As a quick reminder, the interview will be held at 
📍 Address 
*Tp french account*

 Teleperformance Egypt - Cairo - One Kattameya

 https://g.co/kgs/n9F4xZW

- Don't forget to tell them that you are recruited by MOSLA Pioneers and write on the application form

*Reply with confirmed 👍 if you will attend on time or want me to reschedule*

if you need any further information from me beforehand, please do not hesitate to let me know.

Thank you once again for considering this opportunity.

Don't forget to *Follow Us* on :

Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr
LinkedIn: https://www.linkedin.com/company/redz-recruitment1/
```

**TTEC**
```
Hello [Candidate Name],

We are confirming your dedicated interview slot in TTEC. We've reserved this time just for you!

📅 Date: [Day]
⏰ Time: Between 11:00 AM – 3:00 PM (Sharp)
👔 Dress Code: Smart-Casual

📍 Address:
TTEC Office
🔗 Location: Click here 
https://maps.app.goo.gl/HBHLJSy4XxejTmXA8?g_st=iw

⚠️ Please make sure to bring your National ID with you.

✅ Reply with "Confirmed" if you're attending the interview at the stated time above.

✨ Don't forget to tell them that you are recruited by MOSLA Pioneers and make sure to write it on the application form.

Plz make sure to attend on time cuz they appreciate commitments and punctuality.
Wish you the best of luck! 🍀. Follow Us on :

Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr
LinkedIn: https://www.linkedin.com/company/redz-recruitment1/
```

**Eclerx**
```
Hello [Candidate Name],

We are confirming your dedicated interview slot in Eclerx tomorrow. We've reserved this time just for you!

📅 Date: [Day]
⏰ Time: Between 1:00 PM – 5:00 PM (Sharp)
👔 Dress Code: Smart-Casual

📍 Address:
Eclerx Office
🔗 Location: Click here 
https://share.google/OQ5mIFnPA3ucWGBvL

⚠️ Please make sure to bring your National ID with you.

✅ Reply with "Confirmed" if you're attending the interview at the stated time above.

✨ Don't forget to tell them that you are recruited by MOSLA Pioneers and make sure to write it on the application form.

Plz make sure to attend on time cuz they appreciate commitments and punctuality.
Follow Us on :

Facebook: https://www.facebook.com/share/1UXfCR6QMC/?mibextid=wwXIfr
LinkedIn: https://www.linkedin.com/company/redz-recruitment1/
```

**Total Trip**
```
Interview Confirmation
Total Trip

Hello [Candidate Name],

We are pleased to confirm your interview as follows:

📅 Day: [Day]
⏰ Time: 2:00 PM – 3:00 PM

📍 Location:
شقه ٢ عماره ٦ مريع ١١٨٣ مساكن شيراتون
Unit 2, Building 6, Square 1183, Masaken Sheraton – Heliopolis, Cairo, Egypt

📍 Google Maps:
https://maps.google.com/?q=30.094416,31.376213

Upon arrival:

Please mention that you are coming from Career Core

⚠️ Important Instructions:

Arabic:
المدخل مدخل خاص من جانب المبنى في الدور الأرضي، وليس المدخل الرئيسي، وليس "ترافكو".
لا تستخدم الانتركم أو تدخل من المدخل الرئيسي للمبنى.
استخدام مدخل خاطئ أو استخدام جهاز الانتركم أو دخول "ترافكو" سيؤدي إلى رفض طلب المرشح تلقائيًا.

English:
The entrance is a private entrance from the SIDE of the building on the ground floor and NOT the main entrance and NOT "Travco".
Do NOT ring the intercom or enter the main building entrance.
Using the wrong entrance or using the intercom or entering "Travco" will result in automatic rejection of the candidate's application.

Best regards,
HR Recruiter
```

**LPM**
```
Hello [Candidate Name],

We are pleased to confirm your interview scheduled, 📅 Day: [Day] between 7:30 to 9:30 pm, at the following location:

El Motamyz District, Seyahya 6, Sameh Gado St.
Building 112, 3rd floor, Apt 7
https://maps.app.goo.gl/yA2Rra6EbGLGqBMu8?g_st=iw

🔔 Upon arrival:
        •        Clearly state that you are coming from Career Core.

We look forward to seeing you and wish you the best of luck in your interview.

Best regards,
HR Recruiter
```

**Creative Basket**
```
Hello [Candidate Name],

We are pleased to confirm your interview scheduled, 📅 Day: [Day] between 2pm to 5pm, at the following location:
٢ حافظ رمضان -عمارات الدلتا- اول مكرم عبيد 
M floor
https://maps.app.goo.gl/GGe1whuWRfwEtSJ59

🔔 Upon arrival:
        •        Clearly state that you are coming from Career Core.

We look forward to seeing you and wish you the best of luck in your interview.

Best regards,
HR Recruiter
```

## 7. Notifications
- Real-time in-app notifications (bell + toast) plus push notifications (FCM) where supported.
- Trigger on every change: new candidate submitted, voice note accepted/rejected, interview scheduled/rescheduled, interview accepted/rejected, training started, commission done, new offer added, process updated.
- Each notification goes to the relevant people: the recruiter who owns the candidate, his leader, his unit manager, the Account Manager, and the CEO.
- **CEO can send a custom notification/announcement** to any user, a role, a team, or everyone.
- Notifications have read/unread state and are stored in Firestore.

## 8. CEO Powers
- Add/edit/delete: users, offers, processes, companies, commission rules, statuses, confirmation templates, Vocaroo instructions, website link.
- Write/edit each company's process through an editor.
- Full dashboard with charts (bar, line, pie/donut) and drill-down for everything: candidates, statuses, companies, recruiters, leaders, units, commissions (earned, expected, collection dates).
- Mark candidates as **Commission Done** and track payouts per recruiter (using his InstaPay / wallet details from his profile).

## 9. Initial Data (attached: `redz-seed-data.json`)
Load this file as seed data on first run (admin-only seeding script/button), then everything must be editable from the UI:
- `offers` (15 offers: English, French, Spanish, Dutch, German), each with offer text, location, interview material (questions), candidate auto-reply, and interview days.
- `commissionRules`, `confirmationTemplates` (WhatsApp), `processes` (per company), `statuses`, `brand` (footer + social links).
- Companies list = all companies found in the seed data plus any I add later (for example Global Results, Dial Expert, CNX, Sutherland, VXI, INtouchCX, ABS). Do NOT include Amend, TTC, Atain, Minister Fitness Pharma, Evolve or Vintrin Clinic.
- Placeholders in confirmation templates: `[Candidate Name]`, `[Day]`, and `[Time]`/`[Your Name]` where present (let the Account Manager fill `[Time]`/`[Your Name]` in a small popup before opening WhatsApp).


## 10. Deliverables
- Complete working code with Firebase config placeholders and clear setup steps (create project, enable Auth + Firestore, paste config, deploy rules).
- Firestore collections structure + security rules enforcing the role/hierarchy permissions.
- Create the first CEO account on setup.
- Verify that real-time sync works across multiple users and that data persists after refresh and across devices.

## 11. Verification: CEO earnings per candidate (use these as test cases)
Normal case = full chain (recruiter → leader → unit manager → CEO), so CEO gets `external − unit`. If the recruiter sits directly under the CEO, CEO gets `external − recruiter rate`. If the CEO submits directly, CEO gets the full external amount.

| Offer | Rule (days) | External | CEO normal | CEO if recruiter is directly under CEO |
|---|---|---|---|---|
| TTEC English, Teleperformance English, Alorica English | 30 | 3000 | 1000 | 1700 |
| eClerx | 45 | 3500 | 1500 | 2200 |
| Total Trip, LPM, LTS, Global Results, Creative Basket | 30 | 2500 | 700 | 1500 |
| Dial Expert | 30 | 2000 | 500 | 1200 |
| TTEC French / Spanish / Dutch / German (TTEC languages) | 45 | 4500 | 2000 | 3000 |
| Teleperformance other languages (e.g. French), rule 4000 | 30 | 4000 | 1500 | 2500 |
