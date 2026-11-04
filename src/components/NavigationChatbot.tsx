'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Compass,
  MapPin,
  KeyRound,
  FileSpreadsheet,
  Users,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  Bell,
  Sliders,
  Building,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Trash2,
  CheckCircle2,
  Printer,
  Search,
} from 'lucide-react';

export interface NavigationChatbotProps {
  currentRole: 'teacher' | 'gate' | 'admin';
  onSwitchRole: (role: 'teacher' | 'gate' | 'admin') => void;
  onNavigateAdminTab: (tab: 'overview' | 'pupils' | 'classes' | 'staff' | 'reports' | 'chronic_absentees' | 'teacher_analytics' | 'access_control' | 'recovery' | 'staff_queries' | 'announcements') => void;
  onNavigateTeacherTab: (tab: 'attendance' | 'dossiers' | 'gradebook' | 'queries' | 'announcements') => void;
  onOpenDatabaseModal: (tab?: 'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers') => void;
  onOpenAlertSettingsModal: () => void;
  onOpenAlertsModal: () => void;
  onOpenWhitelabelModal: (tab?: 'branding' | 'licensing') => void;
  onOpenAuditModal: () => void;
  onOpenRecoveryModal: () => void;
  schoolName?: string;
  isTeacherClockedIn?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  actions?: {
    label: string;
    action: () => void;
    icon?: any;
    primary?: boolean;
  }[];
  category?: string;
  relatedPrompts?: string[];
}

interface KnowledgeArticle {
  id: string;
  title: string;
  category: 'navigation' | 'geofence' | 'attendance' | 'broadsheet' | 'parent_alerts' | 'staff_security' | 'database' | 'licensing' | 'queries_announcements' | 'recovery';
  keywords: string[];
  patterns: RegExp[];
  answer: string;
  actionButtons?: (props: NavigationChatbotProps) => {
    label: string;
    action: () => void;
    icon?: any;
    primary?: boolean;
  }[];
  followUps?: string[];
}

export const NavigationChatbot: React.FC<NavigationChatbotProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Play a subtle notification chime using Web Audio API (no external file dependency)
  const playChime = (type: 'bot' | 'open') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'bot') {
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {}
  };

  // Comprehensive Knowledge Articles Database covering all modules and navigation paths
  const knowledgeBase: KnowledgeArticle[] = useMemo(() => [
    {
      id: 'geofence-calibration',
      title: 'How to Calibrate GPS Geofence Perimeter',
      category: 'geofence',
      keywords: ['geofence', 'gps', 'calibrate', 'coordinates', 'perimeter', 'unverified', 'location', 'outside', 'school ground', 'radius', '150m'],
      patterns: [/geofence/i, /calibrate/i, /gps/i, /perimeter/i, /outside school/i, /unverified/i, /set location/i],
      answer: `**How to Calibrate School GPS Coordinates:**\n\n1. Log into the **Principal Console**.\n2. Open **Tab 5 ("Staff PINs & Geofence")**.\n3. Scroll to **School Geofence Perimeter Settings**.\n4. Stand inside the school premises and click **"📍 Calibrate to Current Device GPS"** to automatically grab precise latitude & longitude.\n5. Adjust perimeter radius (Default is **150 meters**).\n6. Click **"Save Perimeter & Security Settings"**.\n\n*Tip: If a teacher's phone shows "GPS Unverified", ensure Location Services and Browser GPS permissions are allowed on their device, then tap the refresh icon next to the GPS badge.*`,
      actionButtons: (p) => [
        {
          label: 'Go to Staff PINs & Geofence',
          icon: MapPin,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('access_control');
          },
        },
        {
          label: 'Switch to Staff Console',
          icon: Smartphone,
          action: () => p.onSwitchRole('teacher'),
        },
      ],
      followUps: [
        'Why does teacher GPS say unverified?',
        'How to enable Remote Academic Access?',
        'What is the daily rolling entrance code?',
      ],
    },
    {
      id: 'teacher-clock-in',
      title: 'Teacher Personal Device Clock-In & Remote Work',
      category: 'attendance',
      keywords: ['clock in', 'clock-in', 'clock out', 'staff sign in', 'teacher sign in', 'morning attendance', 'device lock', 'pair device', 'remote work'],
      patterns: [/clock.?in/i, /sign.?in/i, /clock.?out/i, /staff clock/i, /teacher clock/i, /remote work/i],
      answer: `**Teacher Clock-In Protocol:**\n\n1. Open the **Staff Console** from any smartphone, tablet, or laptop.\n2. If not already paired, enter your **4-digit teacher PIN**.\n3. Enter the **Daily Rolling Entrance Code** displayed at the school gatehouse.\n4. Ensure GPS is enabled. If within the **150m perimeter**, click **"Clock In (Arrival)"**.\n\n**Working from home or travelling?**\nThe Principal can toggle **"Remote Academic Access"** for any teacher in Tab 5. This unlocks **Pupil Dossiers** and the **Subject Gradebook** for off-site grading without requiring campus clock-in.`,
      actionButtons: (p) => [
        {
          label: 'Go to Staff Console',
          icon: Smartphone,
          primary: true,
          action: () => p.onSwitchRole('teacher'),
        },
        {
          label: 'View Teacher Analytics & Clock Records',
          icon: Users,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('teacher_analytics');
          },
        },
      ],
      followUps: [
        'How to unpair a teacher phone?',
        'How to calibrate GPS coordinates?',
        'Where do I find the gate code?',
      ],
    },
    {
      id: 'teacher-unpair-device',
      title: 'Unpairing a Teacher Device (New Phone / Lost Phone)',
      category: 'staff_security',
      keywords: ['unpair', 'unbind', 'device lock', 'lost phone', 'replace phone', 'hardware bind', 'paired phone', 'reset device', 'hardware signature'],
      patterns: [
        /\b(unpair|unbind)\b/i,
        /(new|lost|broken|change|replace)\s+(phone|device|smartphone|hardware)/i,
        /device\s+(lock|hardware|bound|unpair)/i,
        /phone\s+(lock|unpair|replace)/i,
      ],
      answer: `**How to Unpair a Teacher's Phone:**\n\nEach teacher profile is securely bound to their first smartphone hardware ID to prevent buddy-clocking. If a teacher replaces or loses their phone:\n\n1. Go to the **Principal Console** ➔ **Tab 5 ("Staff PINs & Geofence")**.\n2. Scroll down to the **"Teacher Device Hardware Locks"** table.\n3. Locate the teacher's name and click **"Unpair Phone"** (or click "Clear All Device Locks" to reset everyone).\n4. The teacher can now sign in and bind their new device on their next clock-in.`,
      actionButtons: (p) => [
        {
          label: 'Open Staff PINs & Device Locks',
          icon: KeyRound,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('access_control');
          },
        },
      ],
      followUps: [
        'How to change a teacher PIN?',
        'How to bulk randomize all teacher PINs?',
      ],
    },
    {
      id: 'change-pins',
      title: 'Managing Teacher PINs & Passcodes',
      category: 'staff_security',
      keywords: ['pin', 'pins', 'password', 'passcode', 'admin passcode', 'gate code', 'randomize', 'reset pin'],
      patterns: [/pin/i, /passcode/i, /password/i, /reset pin/i, /change pin/i, /randomize/i],
      answer: `**Managing Staff PINs & Passcodes:**\n\n* **Teacher 4-Digit PINs**: Go to **Tab 5 ("Staff PINs & Geofence")**. In the teacher table, type any 4-digit code and click **"Save PIN"**.\n* **Bulk Randomize Staff PINs**: Click the **"🎲 Bulk Randomize All Staff PINs"** button to automatically generate fresh secure PINs for the new term, then click **"Print Staff Distribution Slips"**.\n* **Principal Admin Passcode**: Update the master admin passcode at the top of Tab 5 (Default: \`admin123\` or \`attendiq\`).\n* **Gatehouse Passcode**: Default: \`gate123\`.`,
      actionButtons: (p) => [
        {
          label: 'Open Staff PINs & Security',
          icon: KeyRound,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('access_control');
          },
        },
      ],
      followUps: [
        'How to unpair a teacher phone?',
        'What is the daily rolling entrance code?',
      ],
    },
    {
      id: 'broadsheet-reports',
      title: 'NERDC Broadsheets & Printing Report Cards',
      category: 'broadsheet',
      keywords: ['broadsheet', 'report card', 'print report', 'terminal report', 'nerdc', 'marks', 'exam', 'scores', 'ca score', 'assessment'],
      patterns: [/broadsheet/i, /report card/i, /print report/i, /terminal/i, /nerdc/i, /grade/i, /exam score/i],
      answer: `**Nigerian NERDC Broadsheet & Terminal Report Sheets:**\n\n1. In the **Principal Console**, click **Tab 4 ("Nigerian Term Broadsheet")**.\n2. Filter by Class (e.g., *JSS 1*, *Primary 4*) and Academic Term.\n3. View CA Scores (40%), Exam marks (60%), Total (100%), Letter Grades (A1–F9), Class Positions, and Attendance Tallies.\n4. Click **"Print Terminal Report Sheet"** next to any pupil to print their official institutional report card, complete with:\n   * School Crest Logo & Motto\n   * Continuous assessment breakdown\n   * Affective & psychomotor behavioral domain scores\n   * Automated Principal Signature & Stamp.`,
      actionButtons: (p) => [
        {
          label: 'Open NERDC Broadsheet Tab',
          icon: FileSpreadsheet,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('reports');
          },
        },
        {
          label: 'Switch to Teacher Gradebook',
          icon: BookOpen,
          action: () => {
            p.onSwitchRole('teacher');
            p.onNavigateTeacherTab('gradebook');
          },
        },
      ],
      followUps: [
        'How do teachers enter CA and Exam marks?',
        'Where do I customize school branding & crest?',
      ],
    },
    {
      id: 'parent-alerts-whatsapp',
      title: 'Parent WhatsApp Alerts & Absence Follow-Up',
      category: 'parent_alerts',
      keywords: ['parent', 'whatsapp', 'sms', 'alert', 'absence alert', 'chronic', 'frequent absence', 'notify parent', 'excuse', 'doctor note'],
      patterns: [/whatsapp/i, /parent/i, /sms/i, /alert parent/i, /chronic absence/i, /frequent absence/i, /notify/i],
      answer: `**Automated Parent Alerts & Chronic Absence Outreach:**\n\n1. Navigate to **Tab 2 ("Frequent Absences & Follow-up")** in the Admin Console.\n2. Pupils who reach your threshold (e.g., 3+ absences) are automatically flagged in red/amber.\n3. **1-Click WhatsApp Alert**: Click the green **"WhatsApp Alert"** button on the pupil's card to launch a pre-populated, polite official absence notification to the registered guardian.\n4. **Direct Phone Call**: Click the phone button to dial the guardian directly.\n5. **Parent Excuse Notes**: Parents can submit medical notes at the public link \`/excuse\`. Uploaded doctor's notes appear automatically on the pupil's profile and watchlist!`,
      actionButtons: (p) => [
        {
          label: 'Open Frequent Absences Tab',
          icon: AlertTriangle,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('chronic_absentees');
          },
        },
        {
          label: 'Configure Alert Thresholds',
          icon: Sliders,
          action: () => p.onOpenAlertSettingsModal(),
        },
      ],
      followUps: [
        'Where do parents submit doctor excuse notes?',
        'How to change the absence threshold count?',
      ],
    },
    {
      id: 'pupil-enrollment-database',
      title: 'How to Register & Enroll New Students',
      category: 'database',
      keywords: [
        'register',
        'registration',
        'register student',
        'register pupil',
        'register a student',
        'enroll',
        'enrollment',
        'add pupil',
        'add student',
        'new student',
        'new pupil',
        'admit',
        'admission',
        'pupil directory',
        'student database',
        'bulk import',
        'csv import',
        'roster'
      ],
      patterns: [
        /\b(register|registration|enroll|enrollment|admissions?)\b/i,
        /(add|new|create|register|enroll)\s+(a\s+)?(new\s+)?(student|pupil|child|learner)/i,
        /how\s+(can|do)\s+i\s+(register|enroll|add|admit)\b/i,
        /\b(pupil\s+directory|student\s+database|pupils?\s+database)\b/i,
        /\b(bulk\s+import|csv\s+import|import\s+pupils|import\s+students)\b/i,
      ],
      answer: `**How to Register / Enroll a New Student:**\n\n* **Form Teacher (Homeroom Class)**: In your daily Roll Call view, click **"+ Add Pupil"** ➔ **"Register Brand New Pupil"** to enroll latecomers directly into your class arm!\n* **Administrator**: In the top navigation bar, click **"Pupils"** (or click **"Teacher Database"** in the executive header) ➔ switch to **"Enroll New Pupil"**.\n\n**Details required:**\n* **Full Name** (e.g. *Chinedu Okafor*)\n* **Assigned Class Arm** (e.g. *Primary 4 - Gold*, *JSS 1*, etc.)\n* **Class Roll Number** (auto-assigned or custom)\n* **Gender** & **Date of Birth**\n* **Parent / Guardian WhatsApp Phone Number**\n\n*Tip: To add an entire class or whole school roster at once, click the **"Bulk CSV Import"** tab and upload your spreadsheet in seconds!*`,
      actionButtons: (p) => [
        {
          label: 'Open Student Enrollment Form',
          icon: Users,
          primary: true,
          action: () => p.onOpenDatabaseModal('add_pupil'),
        },
        {
          label: 'Bulk CSV Import',
          icon: FileSpreadsheet,
          action: () => p.onOpenDatabaseModal('bulk_import'),
        },
        {
          label: 'Browse Pupils Directory',
          icon: Search,
          action: () => p.onOpenDatabaseModal('pupils'),
        },
      ],
      followUps: [
        'How do I bulk import students from Excel or CSV?',
        'How to assign teachers to classrooms?',
        'Where do I view a student\'s 360° profile?',
      ],
    },
    {
      id: 'licensing-readonly-mode',
      title: 'Commercial License & Strict Read-Only Mode',
      category: 'licensing',
      keywords: ['license', 'licensing', 'read only', 'read-only', 'expired', 'revoked', 'renewal', 'renew', 'subscription', 'lockdown'],
      patterns: [/license/i, /read.?only/i, /expired/i, /revoked/i, /renew/i, /subscription/i],
      answer: `**Strict License Revocation & Expiration Lock:**\n\n* **What happens when expired or revoked?**\n  Both Admin and Staff dashboards enter an **air-tight read-only mode**. No attendance can be marked, no records modified, no PINs changed, and no grades entered.\n* **How to restore full access?**\n  1. In the Principal Console, click **"Branding & License"** in the top header.\n  2. Select the **"License & Subscription"** tab.\n  3. Enter the cryptographic renewal license key provided by AttendIQ.\n  4. Click **"Verify & Activate License Key"** to immediately unlock full functionality.`,
      actionButtons: (p) => [
        {
          label: 'Open License & Subscription Console',
          icon: KeyRound,
          primary: true,
          action: () => p.onOpenWhitelabelModal('licensing'),
        },
      ],
      followUps: [
        'How to customize school name and crest?',
        'Where do I find backup and rollback tools?',
      ],
    },
    {
      id: 'queries-and-announcements',
      title: 'Staff Queries & School Announcements',
      category: 'queries_announcements',
      keywords: ['query', 'queries', 'announcement', 'announcements', 'broadcast', 'disciplinary', 'staff query', 'memo', 'notice'],
      patterns: [/query/i, /queries/i, /announcement/i, /broadcast/i, /memo/i, /disciplinary/i],
      answer: `**Staff Queries & Broadcast Announcements:**\n\n* **Targeted Staff Queries (Principal ➔ Teacher)**:\n  1. Go to Admin Console ➔ **"Staff Queries"** tab.\n  2. Click **"Issue New Official Query"**.\n  3. Select the teacher, category (Lateness, Unexcused Absence, Insubordination, etc.), incident date, and response deadline (e.g., 24h or 48h).\n  4. The teacher receives an urgent alert banner on their dashboard and must submit a formal written response.\n\n* **School-Wide Staff Announcements**:\n  1. Go to Admin Console ➔ **"Staff Announcements"** tab.\n  2. Click **"Broadcast Announcement"**, select priority (*Normal, High, Urgent*), and publish to all teachers instantly.`,
      actionButtons: (p) => [
        {
          label: 'Open Staff Queries Tab',
          icon: FileQuestion,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('staff_queries');
          },
        },
        {
          label: 'Open Announcements Tab',
          icon: Bell,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('announcements');
          },
        },
      ],
      followUps: [
        'How does a teacher reply to an official query?',
        'Where can teachers view announcements?',
      ],
    },
    {
      id: 'branding-whitelabel',
      title: 'School Branding, Crest & Motto Customization',
      category: 'navigation',
      keywords: ['branding', 'whitelabel', 'crest', 'logo', 'school name', 'motto', 'principal name', 'customize'],
      patterns: [/branding/i, /whitelabel/i, /crest/i, /logo/i, /school name/i, /motto/i],
      answer: `**Customizing School Branding:**\n\n1. In the executive header, click **"Branding & License"** (or click the School Crest in the top navbar).\n2. Update:\n   * School Legal Name & Short Code (e.g., *Innovative International College*)\n   * Campus Branch & Location\n   * Official School Motto\n   * Principal Name & Sign-off Stamp\n   * Upload custom school emblem / crest image.\n3. Click **"Save Institutional Branding"**. All terminal broadsheets, report cards, and parent notices immediately reflect your identity!`,
      actionButtons: (p) => [
        {
          label: 'Open Branding & Whitelabel Modal',
          icon: Building,
          primary: true,
          action: () => p.onOpenWhitelabelModal('branding'),
        },
      ],
      followUps: [
        'How do I view terminal broadsheets?',
        'How do I activate a commercial license?',
      ],
    },
    {
      id: 'audit-trail-security',
      title: 'Audit Trail & Non-Repudiation Security',
      category: 'staff_security',
      keywords: ['audit', 'audit trail', 'log', 'history', 'tamper', 'security log', 'who clocked in', 'activity'],
      patterns: [/audit/i, /activity log/i, /history/i, /tamper/i, /security log/i],
      answer: `**Audit Trail & Immutable Logging:**\n\nEvery sensitive action in AttendIQ—including teacher clock-ins, daily roll call submissions, PIN modifications, geofence coordinate updates, and grade entries—records an indelible audit log with:\n* Exact ISO timestamp\n* User identity & role\n* Client device signature & IP\n* Before/after values.\n\nClick **"Audit Trail"** in the top navigation bar to inspect the chronological event stream.`,
      actionButtons: (p) => [
        {
          label: 'Open Audit Trail Modal',
          icon: ShieldCheck,
          primary: true,
          action: () => p.onOpenAuditModal(),
        },
      ],
      followUps: [
        'Where do I find disaster recovery backups?',
        'How do I reset teacher PINs?',
      ],
    },
    {
      id: 'disaster-recovery-backup',
      title: 'Disaster Recovery, 1-Click Rollback & Cloud Snapshots',
      category: 'recovery',
      keywords: ['backup', 'restore', 'rollback', 'snapshot', 'recovery', 'disaster recovery', 'export data'],
      patterns: [/backup/i, /rollback/i, /snapshot/i, /restore/i, /disaster recovery/i],
      answer: `**Disaster Recovery & Snapshots:**\n\nAttendIQ continuously captures encrypted snapshots of your entire institutional database.\n\n* **Create Instant Snapshot**: In the executive header, click **"Backup & Rollback"** and select **"Create Instant Snapshot"**.\n* **1-Click Rollback**: Revert the entire school database to any previous morning state if unintended modifications were made.\n* **Download Offline JSON Backup**: Download a local JSON archive for air-gapped record retention.`,
      actionButtons: (p) => [
        {
          label: 'Open Backup & Rollback Center',
          icon: RotateCcw,
          primary: true,
          action: () => p.onOpenRecoveryModal(),
        },
      ],
      followUps: [
        'How to export student attendance to CSV?',
        'Where is the audit log?',
      ],
    },
    {
      id: 'site-navigation-sitemap',
      title: 'AttendIQ Master Site Navigation Guide',
      category: 'navigation',
      keywords: ['menu', 'navigate', 'where', 'find', 'sitemap', 'tabs', 'dashboard', 'switch', 'console', 'buttons'],
      patterns: [/sitemap/i, /where is/i, /how to navigate/i, /dashboard/i, /find feature/i, /menu/i],
      answer: `**AttendIQ Site Navigation Architecture:**\n\n* **Top Navbar**: Switch between **Principal Console**, **Staff Console**, and **Gate Check-In**; pick date; view Audit Trail & Notifications.\n* **Principal Console Tabs**:\n  1. **Dashboard Pulse**: Whole-school stats, celebrants, class attendance progress.\n  2. **Pupils Directory**: Search learners and 360° dossiers.\n  3. **Frequent Absences**: Truancy watchlist & 1-click WhatsApp parent notices.\n  4. **Teacher Analytics**: Staff arrival timestamps, lateness flags, and clock records.\n  5. **NERDC Broadsheets**: Subject CA (40%) + Exam (60%) marks and printable report cards.\n  6. **Staff PINs & Geofence**: GPS perimeter calibration, device unpairing, teacher PINs.\n  7. **Staff Queries**: Issue official queries with response deadlines.\n  8. **Announcements**: School-wide broadcasts.\n* **Staff Console**: Personal device clock-in, daily register roll call, continuous assessment gradebook, and query reply center.`,
      actionButtons: (p) => [
        {
          label: 'Principal Console (Pulse)',
          icon: Compass,
          primary: true,
          action: () => {
            p.onSwitchRole('admin');
            p.onNavigateAdminTab('overview');
          },
        },
        {
          label: 'Staff Console',
          icon: Smartphone,
          action: () => p.onSwitchRole('teacher'),
        },
        {
          label: 'Gatehouse Scanner',
          icon: KeyRound,
          action: () => p.onSwitchRole('gate'),
        },
      ],
      followUps: [
        'How to calibrate GPS perimeter?',
        'How to print terminal report cards?',
        'How to issue a staff query?',
      ],
    },
  ], []);

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: `👋 **Welcome to AttendIQ Navigator!**\n\nI'm your intelligent interactive guide. Ask me **anything** about finding features, conducting roll calls, calibrating GPS perimeter, printing NERDC report cards, managing PINs, or sending WhatsApp alerts to parents!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: 'navigation',
        actions: [
          {
            label: '📍 How to Calibrate GPS?',
            primary: true,
            action: () => handleSuggestedQuery('How to calibrate GPS perimeter?'),
          },
          {
            label: '📄 Print NERDC Report Cards',
            action: () => handleSuggestedQuery('Where do I print report cards?'),
          },
          {
            label: '🔐 Reset Teacher PINs',
            action: () => handleSuggestedQuery('How do I change a teacher PIN?'),
          },
          {
            label: '📱 Teacher Clock-In Guide',
            action: () => handleSuggestedQuery('How do teachers clock in?'),
          },
        ],
      },
    ];
  });

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      playChime('open');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Filter out conversational stop words so intent matching is precise
  const STOP_WORDS = useMemo(() => new Set([
    'how', 'can', 'i', 'a', 'an', 'the', 'to', 'do', 'does', 'did', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'what', 'where', 'when', 'why', 'who', 'which',
    'there', 'their', 'they', 'we', 'you', 'your', 'my', 'me', 'it', 'its', 'of', 'for', 'in',
    'on', 'at', 'by', 'with', 'from', 'about', 'into', 'and', 'or', 'so', 'just', 'tell', 'show',
    'give', 'want', 'need', 'like', 'please', 'help', 'some', 'any', 'could', 'would', 'should'
  ]), []);

  // Intelligent matching engine
  const findBestAnswer = (query: string): KnowledgeArticle => {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Check direct regex patterns first
    for (const article of knowledgeBase) {
      if (article.patterns.some((pattern) => pattern.test(cleanQuery))) {
        return article;
      }
    }

    // 2. Tokenize and filter out conversational stop words
    const tokens = cleanQuery
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

    let bestArticle = knowledgeBase[0];
    let highestScore = -1;

    for (const article of knowledgeBase) {
      let score = 0;

      // Match multi-word keywords with high weight
      for (const kw of article.keywords) {
        const lowerKw = kw.toLowerCase();
        if (cleanQuery.includes(lowerKw)) {
          score += lowerKw.includes(' ') ? 20 : 12;
        }
      }

      // Match individual meaningful tokens against title, keywords, and answer
      for (const token of tokens) {
        if (article.title.toLowerCase().includes(token)) {
          score += 10;
        }
        if (article.keywords.some((kw) => kw.toLowerCase() === token)) {
          score += 8;
        } else if (article.keywords.some((kw) => kw.toLowerCase().includes(token))) {
          score += 4;
        }
        if (article.answer.toLowerCase().includes(token)) {
          score += 1;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestArticle = article;
      }
    }

    // Fallback to general sitemap if score is 0
    if (highestScore <= 0) {
      return knowledgeBase.find((a) => a.id === 'site-navigation-sitemap') || knowledgeBase[0];
    }

    return bestArticle;
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Realistic typing delay for smooth UX
    setTimeout(() => {
      const match = findBestAnswer(text);
      const actionBtns = match.actionButtons ? match.actionButtons(props) : [];

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: match.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: match.category,
        actions: actionBtns,
        relatedPrompts: match.followUps,
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, botMsg]);
      playChime('bot');
    }, 450);
  };

  const handleSuggestedQuery = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: `🧹 **Chat History Cleared.**\n\nHow can I help you navigate AttendIQ right now? Ask anything or pick a quick topic below:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          {
            label: '🧭 Show Master Site Architecture',
            primary: true,
            action: () => handleSuggestedQuery('Show me the sitemap and features'),
          },
          {
            label: '📍 GPS Perimeter Troubleshooting',
            action: () => handleSuggestedQuery('Why is GPS blocked or unverified?'),
          },
          {
            label: '📢 Broadcast Announcement Guide',
            action: () => handleSuggestedQuery('How do I broadcast an announcement?'),
          },
        ],
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden select-none">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 text-white font-bold rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/30 cursor-pointer"
          title="AttendIQ Site Navigation Assistant"
          aria-label="Open Navigation Chatbot"
        >
          {/* Animated pulse halo */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-indigo-950"></span>
          </span>

          <div className="p-1 rounded-full bg-white/10 group-hover:rotate-12 transition-transform duration-300">
            <Bot className="h-5 w-5 text-indigo-100" />
          </div>

          <div className="flex flex-col text-left leading-tight pr-1">
            <span className="text-xs font-black tracking-wide text-white flex items-center gap-1.5">
              <span>Ask AttendIQ AI</span>
              <Sparkles className="h-3 w-3 text-amber-300 animate-pulse" />
            </span>
            <span className="text-[10px] text-indigo-200 font-normal">Site Navigation & Help</span>
          </div>
        </button>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div
          className={`flex flex-col bg-slate-900 text-white border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95 ${
            isExpanded
              ? 'w-[94vw] sm:w-[620px] h-[85vh] max-h-[820px]'
              : 'w-[94vw] sm:w-[420px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Chatbot Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="p-2 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 text-white">
                  <Bot className="h-5 w-5 text-indigo-200" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
                    AttendIQ Navigator
                  </h3>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-300/30 text-indigo-200 uppercase tracking-wider">
                    AI Guide
                  </span>
                </div>
                <p className="text-[10px] text-indigo-200/90 flex items-center gap-1">
                  <span>Interactive Instant Site Directory</span>
                  <span>•</span>
                  <span className="text-emerald-300 font-medium">Ready</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  soundEnabled
                    ? 'text-indigo-200 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
                title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {/* Clear Chat */}
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-xl text-indigo-200 hover:text-rose-300 hover:bg-white/10 transition cursor-pointer"
                title="Clear conversation history"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Expand / Minimize Window Size */}
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition cursor-pointer hidden sm:block"
                title={isExpanded ? 'Restore compact size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white font-bold transition active:scale-95 cursor-pointer ml-1"
                title="Close Navigator"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Category Badges Bar */}
          <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
            <span className="text-slate-400 font-bold shrink-0 text-[10px] uppercase tracking-wider pl-1">
              Jump:
            </span>
            <button
              type="button"
              onClick={() => handleSuggestedQuery('How do I calibrate GPS coordinates?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium shrink-0 transition text-[11px] cursor-pointer"
            >
              📍 GPS Perimeter
            </button>
            <button
              type="button"
              onClick={() => handleSuggestedQuery('Where do I print report cards?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium shrink-0 transition text-[11px] cursor-pointer"
            >
              📄 Report Cards
            </button>
            <button
              type="button"
              onClick={() => handleSuggestedQuery('How do I change a teacher PIN?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium shrink-0 transition text-[11px] cursor-pointer"
            >
              🔐 Staff PINs
            </button>
            <button
              type="button"
              onClick={() => handleSuggestedQuery('How do teachers clock in on personal devices?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium shrink-0 transition text-[11px] cursor-pointer"
            >
              📱 Teacher Clock-In
            </button>
            <button
              type="button"
              onClick={() => handleSuggestedQuery('How do I broadcast an announcement?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium shrink-0 transition text-[11px] cursor-pointer"
            >
              📢 Announcements
            </button>
            <button
              type="button"
              onClick={() => handleSuggestedQuery('How do I issue an official query?')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-medium shrink-0 transition text-[11px] cursor-pointer"
            >
              📝 Staff Queries
            </button>
          </div>

          {/* Conversation Messages Container */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 overscroll-contain bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`flex items-start gap-2 max-w-[92%] sm:max-w-[85%] ${
                    msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.sender === 'user'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-950 border border-indigo-500/40 text-indigo-300'
                    }`}
                  >
                    {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-xs backdrop-blur-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap space-y-2">
                      {msg.text.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx}>
                          {paragraph.split('**').map((part, i) =>
                            i % 2 === 1 ? (
                              <strong key={i} className="text-white font-bold tracking-wide">
                                {part}
                              </strong>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      ))}
                    </div>

                    {/* Interactive Action Buttons ("Take Me There") */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap gap-2">
                        {msg.actions.map((act, actIdx) => {
                          const IconComponent = act.icon || ArrowRight;
                          return (
                            <button
                              key={actIdx}
                              type="button"
                              onClick={() => {
                                act.action();
                                // Optional auto-minimize or confirm toast
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs ${
                                act.primary
                                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600/70'
                              }`}
                            >
                              <IconComponent className="h-3.5 w-3.5" />
                              <span>{act.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Follow-up Prompts */}
                    {msg.relatedPrompts && msg.relatedPrompts.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/40">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                          Suggested Next Questions:
                        </span>
                        <div className="flex flex-col gap-1">
                          {msg.relatedPrompts.map((prompt, pIndex) => (
                            <button
                              key={pIndex}
                              type="button"
                              onClick={() => handleSuggestedQuery(prompt)}
                              className="text-left text-[11px] text-indigo-300 hover:text-indigo-100 hover:underline flex items-center gap-1 transition cursor-pointer"
                            >
                              <span className="text-slate-500">↳</span>
                              <span>{prompt}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-slate-400 mt-1 px-9">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 rounded-tl-xs flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-slate-300 ml-1 font-medium">Consulting navigation manual...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask where to find anything (e.g., 'how to print report cards')..."
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-[13px] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm disabled:cursor-not-allowed shrink-0"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
              <span>Tip: Click any green button to jump directly to that module</span>
              <span>AttendIQ™ v2.6</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

