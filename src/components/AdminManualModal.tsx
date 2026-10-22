'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  X,
  Search,
  Compass,
  BarChart3,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  KeyRound,
  Database,
  Building,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Printer,
  ExternalLink,
  CheckCircle2,
  Phone,
  Sliders,
  Sparkles,
  MapPin,
  Lock,
  Download,
  Users,
  ChevronRight,
} from 'lucide-react';

export interface AdminManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'overview' | 'chronic_absentees' | 'teacher_analytics' | 'reports' | 'access_control') => void;
  onOpenDatabaseModal?: (tab?: 'pupils' | 'teachers' | 'classes') => void;
  onOpenSettingsModal?: () => void;
  onOpenWhitelabelModal?: (tab?: 'branding' | 'licensing') => void;
  onOpenAuditModal?: () => void;
}

interface ManualSection {
  id: string;
  title: string;
  icon: any;
  badge: string;
  summary: string;
  keywords: string[];
  content: {
    purpose: string;
    whereToFind: string;
    stepByStep: string[];
    proTips?: string[];
    quickAction?: {
      label: string;
      action: () => void;
    };
  };
}

export const AdminManualModal: React.FC<AdminManualModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenDatabaseModal,
  onOpenSettingsModal,
  onOpenWhitelabelModal,
  onOpenAuditModal,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('sitemap');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sections: ManualSection[] = useMemo(
    () => [
      {
        id: 'sitemap',
        title: 'Console Sitemap & Navigation Map',
        icon: Compass,
        badge: 'Getting Started',
        summary: 'Complete visual roadmap of the Principal & Administrator Console layout and controls.',
        keywords: ['layout', 'navigation', 'tabs', 'menu', 'sitemap', 'dashboard', 'lost', 'where', 'start'],
        content: {
          purpose:
            'The Principal Console is the command center of AttendIQ. It gives you 360-degree oversight over daily attendance rates, teacher clock-ins, student risk alerts, exam reports, and institutional credentials without needing technical training.',
          whereToFind: 'Main dashboard view when logged in as "Principal" or switching roles in the top navbar.',
          stepByStep: [
            'Top Executive Header: Displays overall school rate, today’s date, and quick action buttons (WhatsApp Summary, Branding, Teachers Roster, CSV Export, Print).',
            'KPI Highlights Row: 4 high-level stat cards tracking Rate %, Total Present, Frequent Absentees watchlist, and Unmarked Classrooms.',
            'Navigation Tabs Bar: Switch between the 5 core operational areas: Class Overview, Frequent Absences, Teacher Attendance, Broadsheet Reports, and Staff PINs & Geofence.',
            'Role Switcher (Navbar): Quickly test the Gate Post scanner or Teacher view without logging out.',
            'Inactivity Auto-Logout: For safety, sessions lock automatically after 30 minutes of inactivity.',
          ],
          proTips: [
            'If you ever feel lost, look at the 5 navigation tabs right below the KPI cards—they group all school administrative tasks logically.',
            'Use the "Session Date" picker in the navbar to travel back in time to inspect any prior school day or term.',
          ],
        },
      },
      {
        id: 'daily_rollcall',
        title: 'Daily Attendance & Class Monitoring',
        icon: BarChart3,
        badge: 'Tab 1: Overview',
        summary: 'Monitor live homeroom roll calls across every arm and identify unmarked classrooms.',
        keywords: ['overview', 'rate', 'roll call', 'daily', 'classes', 'present', 'absent', 'late', 'excused', 'homeroom'],
        content: {
          purpose:
            'Verify that class teachers take morning and afternoon attendance promptly. Review which classes have achieved 100% compliance and spot attendance deficits early in the day.',
          whereToFind: 'Tab 1: "Class-by-Class Overview & Trends"',
          stepByStep: [
            'Click on "Class-by-Class Overview & Trends" on the navigation bar.',
            'Examine the Class Attendance Breakdown grid. Each card shows the class name (e.g. JSS 1 Gold), assigned teacher, attendance percentage, and tally of Present, Late, and Absent pupils.',
            'Check the status badge: "Recorded" (Green) means roll call is finalized; "Pending" (Orange) means the teacher has not yet completed morning roll call.',
            'Click on any student row in the expanded view to pull up their complete 360° Academic and Attendance Dossier.',
          ],
          proTips: [
            'Click "WhatsApp Summary" in the top header to send a pre-formatted attendance report directly to the school board or executive WhatsApp group.',
            'Late arrivals recorded by the physical Gatekeeper scanner automatically link into this daily roll call view.',
          ],
          quickAction: {
            label: 'Jump to Class Overview Tab',
            action: () => {
              onNavigateTab?.('overview');
              onClose();
            },
          },
        },
      },
      {
        id: 'chronic_absentees',
        title: 'Chronic Absences & Parent Interventions',
        icon: AlertTriangle,
        badge: 'Tab 2: Interventions',
        summary: 'Automatic watchlist of pupils with excessive missed days, parent WhatsApp alerts, and excuse notes.',
        keywords: ['chronic', 'absent', 'watchlist', 'frequent', 'whatsapp', 'alert', 'parents', 'excuse', 'intervention', 'truancy'],
        content: {
          purpose:
            'Identify at-risk learners before they fall behind academically. AttendIQ automatically calculates cumulative unexcused absences and provides 1-click guardian communication tools.',
          whereToFind: 'Tab 2: "Frequent Absences & Follow-up"',
          stepByStep: [
            'Click "Frequent Absences & Follow-up" on the navigation bar.',
            'Review the filtered list of pupils who have exceeded your school’s absence threshold (Default: 3+ absences or attendance below 85%).',
            'Click the green "WhatsApp Alert" button next to any child to send a personalized absence advisory message directly to the parent’s phone.',
            'Click the phone icon to dial the guardian directly from your device.',
            'Inspect the "Absence Reason / Doctor Note" column to check if the parent submitted an online excuse note via the Parent Portal (/excuse).',
          ],
          proTips: [
            'Click the "Settings" (sliders icon) in the header to customize your school’s chronic absence threshold (e.g. change from 3 days to 5 days).',
            'Parents can submit absence excuse notes online with photo receipts at the public link /excuse.',
          ],
          quickAction: {
            label: 'Jump to Frequent Absences Tab',
            action: () => {
              onNavigateTab?.('chronic_absentees');
              onClose();
            },
          },
        },
      },
      {
        id: 'teacher_geofence',
        title: 'Teacher Anti-Cheat & GPS Geofence',
        icon: Clock,
        badge: 'Tab 3: Staff Compliance',
        summary: 'GPS perimeter check-ins, daily rotating entrance codes, and device unpairing controls.',
        keywords: ['teacher', 'clock in', 'gps', 'geofence', 'perimeter', 'cheat', 'spoof', 'radius', 'device', 'punctuality'],
        content: {
          purpose:
            'Prevent fraudulent off-site clock-ins, time-theft, and proxy check-ins. Ensure teachers are physically present within the school gates and on time for homeroom duties.',
          whereToFind: 'Tab 3: "Teacher Submission Performance" and Tab 5: "Staff PINs & Geofence"',
          stepByStep: [
            'Tab 3 shows real-time clock-in times for all staff: "On Time" (before resumption hour), "Late", or "Missed".',
            'Geofence Perimeter: Attendance requires teachers to be within your designated perimeter (e.g. 150m) of the school GPS coordinates.',
            'Daily Rolling Entrance Code: A 4-digit code rotates automatically at midnight each day (and displayed on the admin board) to prevent clock-ins from home.',
            'Device Binding: When a teacher clocks in, their phone hardware ID is locked. They cannot clock in for colleagues on the same phone.',
            'Device Unpairing: If a teacher gets a new phone, click "Unpair Device" in Tab 5 to release their hardware lock.',
          ],
          proTips: [
            'To set your school coordinates in 1 second: Open Tab 5 while standing inside the school campus and click "📍 Calibrate to Current Device GPS".',
            'You can set custom resumption times (e.g. 07:45 AM) and closing times in Tab 5.',
          ],
          quickAction: {
            label: 'Jump to Staff Attendance Tab',
            action: () => {
              onNavigateTab?.('teacher_analytics');
              onClose();
            },
          },
        },
      },
      {
        id: 'terminal_reports',
        title: 'NERDC Broadsheets & Terminal Report Cards',
        icon: FileSpreadsheet,
        badge: 'Tab 4: Academic Reports',
        summary: 'Continuous assessment gradebook, automatic position ranking, and 1-click printable parent report cards.',
        keywords: ['report card', 'broadsheet', 'grades', 'nerdc', 'exam', 'ca1', 'ca2', 'position', 'pdf', 'terminal', 'print'],
        content: {
          purpose:
            'Generate compliant Nigerian NERDC terminal report cards combining academic continuous assessment (CA 40% + Exam 60%) with cumulative attendance records, teacher remarks, and principal sign-off.',
          whereToFind: 'Tab 4: "Nigerian Term Report Card Sheet"',
          stepByStep: [
            'Click on "Nigerian Term Report Card Sheet" on the navigation bar.',
            'Select the target Class (e.g. JSS 2 Diamond or All Classes) and Academic Term from the dropdown.',
            'Choose your viewing mode: "Comprehensive (Attendance + Academics)" or "Attendance Only".',
            'Inspect the live Broadsheet table with computed Totals, Average %, Class Rank (1st, 2nd, 3rd), and Attendance Rates.',
            'Click "Print Terminal Report Sheet" on any pupil to open their high-resolution printable report card formatted for official distribution to parents.',
          ],
          proTips: [
            'Report cards automatically embed your school’s Crest, Motto, Branch location, and Principal signature configured in Branding settings.',
            'Use the "Export Broadsheet CSV" button to download spreadsheet data for ministry audits or archive storage.',
          ],
          quickAction: {
            label: 'Jump to Report Cards & Broadsheet',
            action: () => {
              onNavigateTab?.('reports');
              onClose();
            },
          },
        },
      },
      {
        id: 'access_control',
        title: 'Staff PINs, Passwords & Access Control',
        icon: KeyRound,
        badge: 'Tab 5: Security',
        summary: 'Manage Principal passcode, Gatekeeper passcode, and 4-digit teacher login PINs.',
        keywords: ['pin', 'passcode', 'password', 'security', 'credentials', 'reset', 'randomize', 'principal', 'gatekeeper', 'login'],
        content: {
          purpose:
            'Keep school records safe by managing confidential login credentials. No passwords need to be emailed—passcodes and PINs are securely assigned and updated directly from this console.',
          whereToFind: 'Tab 5: "Staff PINs, Passwords & Geofence"',
          stepByStep: [
            'Click "Staff PINs, Passwords & Geofence" on the navigation bar.',
            'Principal Passcode: Update the master administrative passcode (Default: admin123 or attendiq).',
            'Gate Security Passcode: Update the passcode used by security guards at the school gate (Default: gate123).',
            'Teacher Confidential PINs: Every teacher has a private 4-digit numeric PIN to access only their assigned classroom.',
            'To update a teacher’s PIN: Type a new 4-digit number next to their name and click "Save PIN".',
            'To randomize all staff PINs for a new term: Click "🎲 Bulk Randomize All Staff PINs" and print out the staff distribution slips.',
          ],
          proTips: [
            'Never share your Principal passcode with class teachers—teachers only need their individual 4-digit PINs.',
            'All credential updates synchronize live to the cloud database so teachers can immediately sign in on their phones.',
          ],
          quickAction: {
            label: 'Jump to Staff PINs & Passwords Tab',
            action: () => {
              onNavigateTab?.('access_control');
              onClose();
            },
          },
        },
      },
      {
        id: 'database_management',
        title: 'Student & Staff Database Management',
        icon: Database,
        badge: 'Central Directory',
        summary: 'Enrolling new pupils, editing biodata, assigning class teachers, and bulk CSV uploading.',
        keywords: ['database', 'students', 'pupils', 'teachers', 'classes', 'enroll', 'add pupil', 'import', 'csv', 'roster'],
        content: {
          purpose:
            'Central repository for all enrolled learners, class structures, and teaching staff assignments.',
          whereToFind: 'Header button: "Teacher Database" or Navbar: "School Database"',
          stepByStep: [
            'Click "Teacher Database" in the header or select Database in settings.',
            'Tab 1 (Pupil Roster): Search any pupil by name, admission number, or class arm. View guardian phone numbers and attendance history.',
            'Tab 2 (Enroll New Pupil): Fill out single-pupil biodata, assign an admission ID, select class, and save immediately.',
            'Tab 3 (Bulk CSV Import): Upload an Excel/CSV spreadsheet with hundreds of students in one click using the built-in template.',
            'Tab 4 (Class Arms): View class section populations and capacity.',
            'Tab 5 (Staff Directory): Assign form teachers to specific classrooms.',
          ],
          proTips: [
            'Download the CSV Sample Template before importing to ensure column headers match (Name, AdmissionNo, Class, Gender, ParentPhone).',
            'Deleting or promoting a student updates all broadsheets and roll calls automatically.',
          ],
          quickAction: {
            label: 'Open School Database Modal',
            action: () => {
              onOpenDatabaseModal?.('pupils');
              onClose();
            },
          },
        },
      },
      {
        id: 'branding_whitelabel',
        title: 'School Branding & Commercial Licensing',
        icon: Building,
        badge: 'Institutional Identity',
        summary: 'Whitelabeling school name, motto, branch, crest icon, and entering subscription renewal keys.',
        keywords: ['whitelabel', 'branding', 'logo', 'crest', 'school name', 'license', 'subscription', 'renew', 'termly'],
        content: {
          purpose:
            'Transform AttendIQ into your institution’s proprietary branded software platform and manage software rental subscriptions.',
          whereToFind: 'Header button: "Branding & License" or click the School Crest in the top navbar',
          stepByStep: [
            'Click "Branding & License" in the executive header.',
            'Tab 1 (School Identity & Whitelabel): Customize your School Legal Name, Campus Branch, Motto, Contact Email/Phone, Resumption Date, and Principal Name.',
            'Select your School Crest icon or upload a custom crest image.',
            'Click "Save Institutional Identity": All report cards, headers, and login screens update immediately.',
            'Tab 2 (License & Subscription): View your current commercial subscription status, expiry date, pupil quota, and days remaining.',
            'To Renew Subscription: Paste the cryptographic license key provided by AttendIQ Sales into the box and click "Verify & Activate License Key".',
          ],
          proTips: [
            'If your subscription expires or is suspended, the system enters read-only audit mode until a valid renewal key is activated.',
            'Vendor Master Key generation is kept separate on the Sign-In screen (Licensor tab) for commercial security.',
          ],
          quickAction: {
            label: 'Open Branding & License Modal',
            action: () => {
              onOpenWhitelabelModal?.('branding');
              onClose();
            },
          },
        },
      },
      {
        id: 'audit_log',
        title: 'Audit Trail & Non-Repudiation Security',
        icon: ShieldCheck,
        badge: 'Security Logs',
        summary: 'Tamper-proof chronological log of every clock-in, override, credential change, and record update.',
        keywords: ['audit', 'logs', 'security', 'tamper', 'history', 'who did what', 'track', 'records', 'timestamps'],
        content: {
          purpose:
            'Maintain an indisputable legal and institutional audit log. Eliminates discrepancies, disputes with staff regarding attendance timestamps, and unauthorized record alterations.',
          whereToFind: 'Navbar: Click "Audit Trail" or Settings modal',
          stepByStep: [
            'Open the Audit Log Modal from the top menu or quick actions.',
            'Every event records: Timestamp, Actor (e.g. Principal Danladi), Action Type (Clock-in, PIN Reset, Geofence Calibration, Grade Entry), and Device/IP details.',
            'Search by staff name or action to inspect past activities.',
            'Audit records are immutable and cannot be deleted or backdated.',
          ],
          proTips: [
            'If a teacher claims they were marked absent unfairly, inspect their exact clock-in timestamp in the audit log.',
          ],
          quickAction: {
            label: 'Open Security Audit Modal',
            action: () => {
              onOpenAuditModal?.();
              onClose();
            },
          },
        },
      },
      {
        id: 'faq_troubleshooting',
        title: 'Lost User FAQ & Common Troubleshooting',
        icon: HelpCircle,
        badge: 'Quick Solutions',
        summary: 'Instant answers to the most common questions and hurdles encountered by school administrators.',
        keywords: ['faq', 'help', 'lost', 'how do i', 'problem', 'error', 'reset', 'forgot', 'locked', 'read only'],
        content: {
          purpose:
            'Fast solutions for when you are unsure where to click or how to resolve an issue in the school day routine.',
          whereToFind: 'This Navigation Manual • Help & Operations Guide',
          stepByStep: [
            'Q: How do I change a teacher’s 4-digit PIN? ➔ Click Tab 5 ("Staff PINs, Passwords & Geofence"), find the teacher, type a new 4-digit number, and click Save PIN.',
            'Q: Why is attendance locked or in read-only mode? ➔ Your commercial school subscription has expired or was revoked. Click "Branding & License" ➔ "License & Subscription" and paste an authentic renewal key.',
            'Q: A teacher got a new phone and cannot clock in. What do I do? ➔ Go to Tab 5, scroll down to "Teacher Device Locks", find the teacher, and click "Unpair Device".',
            'Q: Can teachers clock in from their bedrooms? ➔ No. AttendIQ enforces both a 150m GPS geofence and a Daily Rolling Entrance Code displayed only at the school gatehouse.',
            'Q: How do I print report cards for parents? ➔ Click Tab 4 ("Nigerian Term Report Card Sheet"), select class, and click "Print Terminal Report Sheet".',
            'Q: Where do parents submit doctor/excuse notes? ➔ Parents visit your live portal at /excuse on any phone and submit notes without needing a password.',
          ],
          proTips: [
            'Bookmark this manual anytime you are training a new vice-principal, secretary, or IT administrator.',
          ],
        },
      },
    ],
    [
      onNavigateTab,
      onOpenDatabaseModal,
      onOpenSettingsModal,
      onOpenWhitelabelModal,
      onOpenAuditModal,
      onClose,
    ]
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.badge.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q)) ||
        s.content.purpose.toLowerCase().includes(q) ||
        s.content.stepByStep.some((step) => step.toLowerCase().includes(q))
    );
  }, [sections, searchQuery]);

  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) || sections[0],
    [sections, activeSectionId]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-md">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Administrator Console Navigation Manual
                </h2>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200 border border-indigo-500/40">
                  Principal Guide
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Complete operational manual, visual sitemap, and step-by-step navigation instructions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition"
              title="Print manual for physical handbook"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Guide</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Close Manual"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar Bar */}
        <div className="p-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search features, buttons, or tasks (e.g. 'PIN', 'GPS', 'Report Card', 'WhatsApp', 'Enroll', 'Excuse')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Modal Body: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sidebar Menu */}
          <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50/70 p-3 overflow-y-auto shrink-0 space-y-1">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Manual Modules ({filteredSections.length})
            </div>

            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = sec.id === activeSection.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSectionId(sec.id)}
                  className={`w-full text-left p-3 rounded-2xl transition flex items-start gap-2.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'hover:bg-slate-200/60 text-slate-700'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white border border-slate-200 text-indigo-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate leading-tight">{sec.title}</span>
                    </div>
                    <span
                      className={`text-[10px] font-semibold block mt-0.5 ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {sec.badge}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredSections.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No sections matched &quot;{searchQuery}&quot;. Try searching for general terms like &quot;PIN&quot;, &quot;Report&quot;, or &quot;Staff&quot;.
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-6">
            {/* Topic Header Card */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 text-xl shadow-xs">
                  {React.createElement(activeSection.icon, { className: 'h-6 w-6' })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">{activeSection.title}</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/20">
                      {activeSection.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">{activeSection.summary}</p>
                </div>
              </div>

              {activeSection.content.quickAction && (
                <button
                  type="button"
                  onClick={activeSection.content.quickAction.action}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                >
                  <span>{activeSection.content.quickAction.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Where to find it */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-start gap-3 text-xs">
              <Compass className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-950 block">Console Location & How to Access:</span>
                <span className="text-indigo-800 font-medium">{activeSection.content.whereToFind}</span>
              </div>
            </div>

            {/* Purpose & Value */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Operational Purpose
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {activeSection.content.purpose}
              </p>
            </div>

            {/* Step-by-Step Operator Guide */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Step-by-Step Navigation & Action Workflow
              </h4>
              <div className="space-y-2.5">
                {activeSection.content.stepByStep.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-start gap-3 shadow-2xs hover:border-indigo-300 transition"
                  >
                    <span className="w-6 h-6 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tips & Best Practices */}
            {activeSection.content.proTips && activeSection.content.proTips.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Principal Pro-Tips & Best Practices</span>
                </div>
                <ul className="space-y-1.5 text-amber-800 list-disc list-inside">
                  {activeSection.content.proTips.map((tip, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>AttendIQ™ Institutional Principal Console • Version 2.0</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
