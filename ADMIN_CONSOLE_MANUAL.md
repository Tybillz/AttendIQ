# ResultIQ™ Result Checker & Academic Administration Manual
**The Complete Institutional Guide & Operations Handbook for School Leadership & Registrars**

---

## 📌 Executive Summary
**ResultIQ™** is a sovereign, web-based School Result Checker and Terminal Academic Administration platform. Built for modern educational institutions, it eliminates the need for physical scratch cards by employing **robust multi-factor parent identity verification**, while giving school administrators and teachers complete control over Continuous Assessment (CA) scores, exam broadsheets, and publication-ready terminal report slips.

---

## 🧭 System Sitemap & Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC RESULT CHECKER PORTAL                              │
│  • Official Institutional Letterhead & Crest     • 256-Bit SSL Record Verification     │
│  • Academic Session & Term Selector              • Class & Grade Section Selector      │
│  • Student Admission/Roll Number Search          • Multi-Factor Parent Identity Check  │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
┌──────────────────────────────────┐            ┌──────────────────────────────────┐
│     VERIFIED RESULT DISPLAY      │            │       AUTHORIZED STAFF HUB       │
│ • Full NERDC Subject Breakdown   │            │ • Score Entry & Gradebook        │
│ • CA1, CA2, Exam & Total Scores  │            │ • Class Roster & Parent Contacts │
│ • Letter Grades & Class Rank     │            │ • Access Audit Trail Logs        │
│ • Character / Psychomotor Matrix │            │ • School Whitelabeling & Seal    │
│ • Teacher & Principal Remarks    │            │ • Result Publishing Lock/Unlock  │
│ • 1-Click Print, PDF & WhatsApp  │            └──────────────────────────────────┘
└──────────────────────────────────┘
```

---

## 📋 Module 1: Public Result Checker & Parent Authentication
**Location**: Public Landing (`/`)

### Purpose
To provide parents and guardians with an instant, secure, and confidential method to access and print their children's official terminal academic report cards without purchasing scratch cards.

### How Parents Check Results (3-Step Flow)
1. **Step 1: Select Academic Period & Class**:
   - Choose the Academic Session & Term (e.g. *2026/2027 • First Term*).
   - Select the student's Class/Section (e.g. *Primary 4 - Gold*).
2. **Step 2: Enter Student Identification**:
   - Type the Student's official Admission / Roll Number (e.g. `P4-01`).
   - Alternatively, parents can select their child's name from the verified class roster helper.
3. **Step 3: Multi-Factor Parent Authentication (No Scratch Cards)**:
   - **Method A (Registered Contact Match)**: Enter the guardian's phone number or email registered with the school during enrollment.
   - **Method B (Student Date of Birth)**: Provide the student's official birth date (DD/MM/YYYY) matching school records.
   - **Method C (Two-Factor OTP Security Passcode)**: Request a 6-digit one-time code dispatched directly to the registered phone number.
4. **View Official Report Slip**:
   - Instantly renders the comprehensive **Terminal Report Sheet**.
   - Parents can:
     - 🖨️ **Print Official Slip** (optimized for clean A4 printing).
     - 📥 **Download PDF** with authentic watermark and digital verification hash.
     - 💬 **Dispatch Summary to WhatsApp** with 1 click.

---

## 📊 Module 2: Staff Gradebook & Continuous Assessment Entry
**Location**: Authorized Staff Login &rarr; *Score Entry & Gradebook*

### Purpose
Allows subject teachers and administrators to enter Continuous Assessment (CA1, CA2, Assignment) and Examination marks.

### Operator Workflow
1. **Access**: Click **"Authorized Staff Login"** on the top right.
   - Teachers enter their 4-digit Staff PIN (Default demo: `1234`).
   - Principal/Admin enters the Master Passcode (Default demo: `admin123`).
2. **Select Class & Subject**:
   - Filter by Class (e.g. *Primary 4 - Gold*) and Subject (e.g. *Mathematics*).
3. **Record Marks**:
   - Enter CA1 (max 15), CA2 (max 15), Assignment (max 10), and Exam (max 60).
   - The system automatically computes the 100-point Total, NERDC Letter Grade (A, B, C, D, E, F), and Performance Remark.
4. **Save & Broadcast**:
   - Click **"Save Scores"** to update official database records immediately.

---

## 👥 Module 3: Pupil Directory & Parent Contact Registry
**Location**: Staff Hub &rarr; *Pupil & Parent Directory*

### Purpose
Manage enrolled students, assign Admission Numbers, and ensure parent phone numbers and dates of birth are accurately documented for authentication.

### Operator Workflow
1. **Add or Edit Pupil**:
   - Update Student Roll Number (used as their Result Checker ID).
   - Verify guardian contact phone number (crucial for parent 2FA verification).
   - Enter Date of Birth.
2. **Bulk CSV Import**:
   - Download the official ResultIQ CSV Template to batch upload class rosters in seconds.

---

## 🔒 Module 4: Security & Result Access Audit Log
**Location**: Staff Hub &rarr; *Result Access Logs*

### Purpose
Maintains an immutable audit trail of every result checked by parents or staff.

### Features
* Logs pupil name, roll number, time of verification, and the verification method used.
* Tracks IP/device references to detect and prevent unauthorized snooping or brute-force attempts.
* Automatic lockouts after 5 consecutive failed verification attempts.

---

## 🎨 Module 5: School Whitelabeling & Official Seal
**Location**: Staff Hub &rarr; *School Whitelabeling & Seal* (Admin only)

### Purpose
Enables school leadership to fully customize the institutional identity of the portal.

### Configurable Items
* **School Crest / Coat of Arms**: Upload high-resolution logo or emoji crest.
* **School Name & Branch**: Appears on all transcripts, PDF downloads, and prints.
* **Principal Signature & Seal**: Digital endorsement printed directly on all terminal report cards.
* **Official Motto & Address**: Displayed across headers and footers.
