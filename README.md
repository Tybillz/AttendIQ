# 🎓 AttendIQ - Smart School Attendance & Pupil Management App

AttendIQ is a full-featured, web and mobile-ready school attendance tracker built with **Next.js**, **TypeScript**, and **Tailwind CSS**. Designed for teachers, school administrators, and parents.

---

## 🚀 Key Features

### 👨‍🏫 1. Core Teacher Features
- **Class & Section Selector**: Easily switch between Grade 4 - Oak, Grade 5 - Maple, Grade 3 - Pine, or custom classes.
- **Pupil Roster (Chronological & Alphabetical)**: View pupils with high-res photo portraits, roll numbers, and parent details.
- **Tactile Attendance Action Buttons**:
  - 🟢 **Present (P)** with emerald green visual feedback
  - 🔴 **Absent (A)** with crimson red visual feedback
- **Side Counters**: Live count of **Total Present Days**, **Total Absent Days**, and **Attendance %** directly alongside each student row.
- **Session Timestamp**: Automatically logs exact time marked.
- **Teacher Notes & Flag Tagger**: Tag pupils with flags (*Late Arrival*, *Left Early*, *Nurse Visit*, *Behavioral Flag*, *Excused*, *Unexcused*) and custom notes.
- **Audio Roll Call Mode**: Hands-free, voice-assisted roll call using Web Speech Synthesis. The device calls out student names one by one with rapid Present/Absent keyboard and touch shortcuts.
- **Confetti Celebration**: Celebrates 100% full attendance days.

### 🧒 2. Expandable Student Profiles & Academic Dossier
- Tap any pupil's name or photo to expand their full student record:
  - **Photo Upload**: Change or upload pupil photos from the camera or device storage.
  - **Academic Records**: Track subject exams, quizzes, midterm marks (Grade A/B/C/D/F), and GPA averages. Teachers can record new test scores on the fly.
  - **Behavioral Notes & Observations**: Log praise or concerns.
  - **Parent Contact & Direct SMS**: Immediate SMS dispatch to parents with one tap.

### 🚨 3. Automated Parent & School Alert System
- **Auto-SMS / Email Alerts**: Dispatches absence notifications to parents when their child is marked absent.
- **Configurable Chronic Absence Threshold**: Automatically flags any pupil who hits **3+ absences in 14 days** as an *At-Risk Chronic Absentee* and alerts both parents and school administration.
- **Flexible Timing**: Choose between **Immediate (Same Day)** or **Scheduled (Next Morning Digest)**.
- **Parent Alerts Center**: Complete audit trail of all delivered notifications with recipient details and timestamps.

### 📊 4. Admin & Principal Dashboard
- **Whole-School Overview**: Real-time schoolwide attendance rate, total pupils present/absent across all sections.
- **Class-by-Class Comparison Grid**: Visual progress bars and submission compliance for each class.
- **Chronic Absentees Radar**: Rapid list of at-risk students needing intervention.
- **Attendance Trends Visualizer**: Day-of-week attendance distribution and section rankings.
- **Teacher Submission Timeliness**: Track which teachers submit roll call on time vs delayed.
- **Export & Print Center**: 1-click CSV export and print-ready PDF reports.

### 👥 5. Pupil & Class Database Management
- Enroll new pupils with photo preview, roll number, class assignment, and parent details.
- **Bulk CSV Import**: Import entire class rosters with one click (includes sample CSV download).
- Create and manage new classes, grades, and teacher assignments.
- End-of-day automatic absent tagging for any unmarked pupils.

---

## 📱 Mobile App (PWA & Android)

AttendIQ is pre-configured to run as an installed mobile application:

### A. Instant Mobile App (PWA)
1. Open the app in your browser (on iPhone, iPad, Android, or PC/Mac):
   - **Local development URL**: `http://localhost:3005` (or your local IP `http://192.168.0.143:3005` on your phone)
2. Tap the **"Install App"** button in the top navigation bar, or:
   - On **iPhone (Safari)**: Tap **Share** ➡️ **Add to Home Screen**.
   - On **Android (Chrome)**: Tap the 3 dots ➡️ **Install App** / **Add to Home screen**.
3. AttendIQ launches in standalone fullscreen mode with the custom AttendIQ graduation cap icon!

### B. Native Android Package (Capacitor)
AttendIQ comes with full Capacitor Android scaffolding in `android/`:
- **Sync web assets to Android**:
  ```bash
  npm run sync:android
  ```
- **Open in Android Studio**:
  ```bash
  npm run open:android
  ```
- Build the APK directly via Android Studio: **Build ➡️ Build APK(s)**.

---

## ☁️ Vercel Deployment

Deploying AttendIQ to Vercel takes less than 2 minutes:
1. Push the `school-attendance` folder to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select your repository (root directory set to `school-attendance`).
4. Click **Deploy**. Vercel will build and host it with zero configuration!
