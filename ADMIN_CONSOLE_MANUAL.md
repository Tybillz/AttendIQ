# AttendIQ™ Principal & Administrator Console Manual
**The Complete Institutional Guide & Operations Handbook for School Leadership**

---

## 📌 Executive Summary
The AttendIQ™ Administrator Console is the central command center for School Principals, Headteachers, Vice-Principals, and Proprietors. It connects daily classroom roll call compliance, automated parent communication, physical gate security, continuous assessment gradebooks, and staff anti-cheat protocols into a single, cohesive dashboard.

This manual serves as a complete reference guide for school administrators to smooth the learning curve and quickly navigate all console modules.

---

## 🧭 Visual Console Sitemap

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TOP EXECUTIVE HEADER                                   │
│  • School Identity (Name, Crest, Branch)      • Whole School Attendance Rate (%)       │
│  • Current Academic Date Picker               • Quick WhatsApp Summary                 │
│  • Branding & Whitelabel Settings             • Teacher Database & Assignments         │
│  • Export CSV & Print Terminal Reports        • Alert Settings Threshold               │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
 ┌───────────────────────────────────────┴───────────────────────────────────────────────┐
 │                                 KPI STAT CARDS                                        │
 │  [ Overall School Rate ]  [ Present Pupils ]  [ Frequent Absentees ]  [ Unmarked Arms]│
 └───────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
 ┌───────────────────────────────────────┴───────────────────────────────────────────────┐
 │                                NAVIGATION SUB-TABS                                    │
 │  [Tab 1] Class-by-Class Overview & Trends                                             │
 │  [Tab 2] Frequent Absences & Guardian Follow-up                                       │
 │  [Tab 3] Teacher Clock-In & Submission Performance                                    │
 │  [Tab 4] Nigerian NERDC Broadsheet & Terminal Report Sheets                           │
 │  [Tab 5] Staff PINs, Passwords & GPS Geofence Security                                │
 └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Module 1: Daily Classroom Monitoring & Roll Call
**Location**: Tab 1 — *Class-by-Class Overview & Trends*

### Purpose
To track daily classroom attendance in real-time, monitor which class teachers have submitted their registers, and verify student attendance tallies across all arms.

### Operator Workflow
1. **Navigate**: Click on **"Class-by-Class Overview & Trends"** on the navigation bar.
2. **Review Class Cards**:
   - Each card displays the class name (e.g. *JSS 1 Gold*), assigned form teacher, current attendance percentage, and count of Present, Late, and Absent pupils.
   - **Green Badge ("Recorded")**: Morning roll call has been submitted.
   - **Orange Badge ("Pending")**: Roll call has not yet been taken by the form teacher.
3. **Inspect 360° Pupil Dossier**:
   - Click on any student’s name to open their complete academic and attendance dossier, parent contacts, excuse note history, and NERDC assessment scores.
4. **WhatsApp Executive Summary**:
   - Click the green **"WhatsApp Summary"** button in the executive header to broadcast an instant attendance summary to the School Board or Management WhatsApp group.

---

## 🚨 Module 2: Frequent Absences & Guardian Outreach
**Location**: Tab 2 — *Frequent Absences & Follow-up*

### Purpose
Proactively flag truant or at-risk pupils before learning deficits occur. Automated parent alert links enable instant notification to guardians via WhatsApp and direct voice call.

### Operator Workflow
1. **Navigate**: Click on **"Frequent Absences & Follow-up"**.
2. **Review Watchlist**:
   - Shows all pupils who have exceeded your school's absence threshold (Default: 3+ absences or attendance rate below 85%).
3. **Send WhatsApp Absence Notice**:
   - Click the green **"WhatsApp Alert"** button on the pupil’s row. A structured advisory message is generated and pre-populated into WhatsApp:
     > *"Dear Guardian of [Pupil Name], this is an advisory from [School Name] regarding [X] consecutive absences recorded. Please contact school administration..."*
4. **Direct Guardian Phone Call**:
   - Click the phone icon to launch direct dialing to the registered parent contact.
5. **Absence Excuse Notes**:
   - If parents have submitted an excuse or medical note through the Parent Portal (`/excuse`), the reason and uploaded certificate will appear in the **"Absence Reason / Doctor Note"** column.

---

## 🛰️ Module 3: Teacher Anti-Cheat & GPS Geofence
**Location**: Tab 3 — *Teacher Submission Performance* & Tab 5 — *Staff PINs & Geofence*

### Purpose
Ensure teachers physically resume at the school premises and eliminate buddy-punching, off-site clock-ins, or retroactively falsified attendance records.

### Anti-Cheat Safeguards:
1. **150m GPS Geofence Perimeter**:
   - Teachers cannot clock in unless their smartphone GPS coordinates fall within your school's calibrated perimeter radius.
2. **Daily Rolling Entrance Code**:
   - A 4-digit numeric code rotates automatically at midnight each day. It is displayed on the gatehouse board so teachers must be physically present at the gate to see it.
3. **Hardware Device Binding**:
   - Upon first clock-in, a teacher's phone hardware signature is permanently bound to their profile. A single phone cannot be used to clock in multiple teachers.

### How to Calibrate School Coordinates:
1. Walk into the center of the school campus with your mobile device or laptop.
2. Navigate to **Tab 5 ("Staff PINs, Passwords & Geofence")**.
3. Under **School Geofence Perimeter Settings**, click **"📍 Calibrate to Current Device GPS"**.
4. The system automatically populates the exact Latitude and Longitude. Click **"Save Perimeter & Security Settings"**.

### How to Unpair a Teacher's Phone:
- If a teacher loses their phone or purchases a new device:
  1. Open Tab 5 and scroll down to the **"Teacher Device Locks"** table.
  2. Find the teacher’s name and click **"Unpair Phone"**.
  3. The teacher can now register their new phone on their next clock-in.

---

## 📑 Module 4: NERDC Broadsheets & Terminal Report Cards
**Location**: Tab 4 — *Nigerian Term Report Card Sheet*

### Purpose
Compile termly continuous assessments (CA 40% + Terminal Exam 60%) with cumulative attendance records, teacher observations, and principal signatures into official report cards ready for distribution to parents.

### Operator Workflow
1. **Navigate**: Click on **"Nigerian Term Report Card Sheet"**.
2. **Select Class & Term**:
   - Use the class dropdown to select *JSS 1, SS 3*, or *All Classes*.
   - Select the relevant term (e.g., *First Term 2026/2027*).
3. **Broadsheet Table**:
   - Displays student name, Subject CA scores, Exam marks, Total %, Grade (A1 to F9), Class Position (1st, 2nd, 3rd), and Days Present / Sessions Opened.
4. **Print Official Report Sheet**:
   - Click the **"Print Terminal Report Sheet"** button next to any pupil.
   - A high-resolution official report card opens in printable layout, pre-filled with:
     - School Crest Emoji / Logo
     - School Legal Name, Branch, and Motto
     - Continuous assessment marks and subject averages
     - Affective and psychomotor behavioral assessment domain
     - Automatic Principal Sign-Off & Official Stamp

---

## 🔐 Module 5: Staff PINs & Passcode Security
**Location**: Tab 5 — *Staff PINs, Passwords & Geofence*

### Purpose
Manage confidential administrative passwords and individual 4-digit teacher login PINs with live cloud database synchronization.

### Security Hierarchy:
- **Principal Passcode** (`adminPasscode`): Unlocks full administrative rights, broadsheet editing, and database management. Default: `admin123` or `attendiq`.
- **Gate Security Passcode** (`gatePasscode`): Unlocks physical entrance barcode/QR scanning at the gatehouse. Default: `gate123`.
- **Teacher 4-Digit PINs**: Individual PIN assigned to each form teacher to access only their assigned classroom register.

### How to Update or Reset a Teacher's PIN:
1. Navigate to **Tab 5**.
2. Scroll to the **"Teacher Confidential 4-Digit Access PINs"** table.
3. Locate the teacher (e.g. *Mrs. Amina Danladi*).
4. Enter the new 4-digit PIN in the input field and click **"Save PIN"**.
5. The update synchronizes immediately across the cloud.

### How to Bulk Randomize Staff PINs (New Term Protocol):
- Click **"🎲 Bulk Randomize All Staff PINs"**. Every teacher is immediately assigned a secure, unique 4-digit number.
- Click **"Print Staff Distribution Slips"** to generate cut-out confidential slips for staff pigeonholes.

---

## 📚 Module 6: Student & Staff Database
**Location**: Header button — *Teacher Database* or Navbar — *School Database*

### Features:
1. **Pupil Directory**: Search enrolled learners by Admission Number, full name, or class arm. View guardian details and attendance rates.
2. **Enroll New Pupil**: Add single pupils with biodata, date of birth, emergency contact phone, and assigned classroom arm.
3. **Bulk CSV Import**: Import an entire school roster (hundreds of pupils) in seconds using standard CSV column headers (`Name, AdmissionNo, Class, Gender, ParentPhone`).
4. **Staff Roster & Assignments**: Map form teachers to designated class sections.

---

## 🏫 Module 7: School Branding & Whitelabeling
**Location**: Header button — *Branding & License* or click the School Crest in top navbar

### Whitelabel Controls:
- **Institutional Identity**:
  - School Legal Name (e.g. *Apex Heights International College*)
  - Short Name / Acronym (e.g. *AHIC*)
  - Campus Branch / Location (e.g. *Garki II Campus, Abuja*)
  - School Crest / Mascot icon or custom uploaded emblem
  - Principal Full Name & Official Motto
- **License & Commercial Subscription**:
  - Displays subscription status (Active, Expiring Soon, Expired, or Revoked).
  - Valid duration and pupil population quota.
  - **License Renewal Activation**: Paste the cryptographic license key provided by AttendIQ Sales and click **"Verify & Activate License Key"** to immediately renew the institutional instance.

---

## 🛡️ Module 8: Audit Logs & Non-Repudiation
**Location**: Navbar — *Audit Trail*

### Purpose
Every clock-in, override, PIN reset, geofence calibration, and attendance submission creates an immutable chronological audit trail log with timestamps and hardware device identifiers. This prevents staff disputes and unauthorized record changes.

---

## ❓ Lost User Quick Reference & FAQ

| Problem / Question | Resolution / Where to Go |
| :--- | :--- |
| **How do I change a teacher's login PIN?** | Go to **Tab 5 ("Staff PINs & Geofence")**, enter the new 4-digit PIN next to the teacher's name, and click **"Save PIN"**. |
| **Why is the system in read-only mode?** | The school's commercial subscription has expired or was revoked. Click **"Branding & License" ➔ "License & Subscription"** and activate your renewal key. |
| **A teacher got a new phone and cannot clock in.** | Go to **Tab 5**, scroll to **"Teacher Device Locks"**, and click **"Unpair Phone"** next to their name. |
| **Can teachers clock in from home?** | No. AttendIQ enforces both a 150m GPS Geofence and a rotating Daily Rolling Entrance Code displayed at the school gate. |
| **Where do parents submit absence excuses?** | Parents visit the public link `/excuse` on any smartphone to submit notes with doctor's receipts without needing a password. |
| **How do I print end-of-term report cards?** | Go to **Tab 4 ("Nigerian Term Report Card Sheet")**, select the class, and click **"Print Terminal Report Sheet"**. |
| **Where do I add new pupils?** | Click **"Teacher Database"** in the executive header, select the **"Enroll New Pupil"** tab or **"Bulk CSV Import"**. |

---
*AttendIQ™ Multi-Tenant Institutional Platform • Commercial Software Licensing & School Management*
