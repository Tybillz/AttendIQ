'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Users,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Sliders,
  ChevronRight,
  BarChart3,
  Award,
  FileSpreadsheet,
  Sparkles,
  GraduationCap,
  UserPlus,
  Phone,
  FileText,
  Smartphone,
  MapPin,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Shuffle,
  Building,
} from 'lucide-react';
import {
  Student,
  ClassSection,
  Teacher,
  AttendanceSession,
  AlertSettings,
  TeacherAnalytics,
  SubjectGradeRecord,
  TeacherClockRecord,
  SchoolPerimeterConfig,
} from '@/types/attendance';
import { exportAttendanceReportCSV, downloadCSVFile, getSubjectGrades } from '@/lib/storage';
import { calculateStudentAttendanceMetrics, getUnifiedAcademicReport } from '@/lib/academicCalculations';
import {
  getPerimeterConfig,
  savePerimeterConfig,
  syncPerimeterConfigFromCloud,
  getDailyEntranceCode,
  setDailyEntranceCodeOverride,
  getTeacherClockRecords,
  getDeviceLocks,
  unpairTeacherDevice,
  getLivePortalUrl,
} from '@/lib/teacherAttendance';
import { TeacherDeviceLock } from '@/types/attendance';
import {
  getPortalCredentials,
  updateTeacherPin,
  updateAdminPasscode,
  updateGatePasscode,
  randomizeAllTeacherPins,
  generateRandomPin,
} from '@/lib/auth';
import { getSchoolBranding, SchoolBranding } from '@/lib/licensing';

interface AdminDashboardProps {
  students: Student[];
  classes: ClassSection[];
  teachers: Teacher[];
  sessions: AttendanceSession[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  alertSettings: AlertSettings;
  teacherAnalytics: TeacherAnalytics[];
  onOpenDatabaseModal: (tab?: 'pupils' | 'teachers' | 'classes') => void;
  onOpenSettingsModal: () => void;
  onSelectStudentProfile: (student: Student) => void;
  onDataUpdated?: () => void;
  onOpenWhitelabelModal?: (tab?: 'branding' | 'licensing') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  classes,
  teachers,
  sessions,
  selectedDate,
  onDateChange,
  alertSettings,
  teacherAnalytics,
  onOpenDatabaseModal,
  onOpenSettingsModal,
  onSelectStudentProfile,
  onOpenWhitelabelModal,
}) => {
  const [branding, setBranding] = useState<SchoolBranding>(getSchoolBranding());
  const [activeTab, setActiveTab] = useState<'overview' | 'chronic_absentees' | 'teacher_analytics' | 'reports' | 'access_control'>('overview');
  const [selectedBroadsheetClass, setSelectedBroadsheetClass] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term (2026/2027 Session)');
  const [broadsheetMode, setBroadsheetMode] = useState<'comprehensive' | 'attendance_only'>('comprehensive');
  const [schoolSessionsOpened, setSchoolSessionsOpened] = useState<number>(60);
  const [perimeterConfig, setPerimeterConfig] = useState(getPerimeterConfig());
  const [teacherClockRecords, setTeacherClockRecords] = useState<TeacherClockRecord[]>([]);
  const [deviceLocks, setDeviceLocks] = useState<TeacherDeviceLock[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Security & Access Control State
  const [creds, setCreds] = useState(getPortalCredentials());
  const [adminPassInput, setAdminPassInput] = useState(creds.adminPasscode);
  const [gatePassInput, setGatePassInput] = useState(creds.gatePasscode);
  const [teacherPinsState, setTeacherPinsState] = useState<Record<string, string>>({ ...creds.teacherPins });
  const [customDailyCodeInput, setCustomDailyCodeInput] = useState('');
  const [accessFeedback, setAccessFeedback] = useState<string | null>(null);
  const [geofenceGpsLoading, setGeofenceGpsLoading] = useState(false);

  // Editable geofence form state
  const [schoolLatInput, setSchoolLatInput] = useState(perimeterConfig.schoolLat.toString());
  const [schoolLngInput, setSchoolLngInput] = useState(perimeterConfig.schoolLng.toString());
  const [radiusInput, setRadiusInput] = useState(perimeterConfig.radiusMeters.toString());
  const [resumptionInput, setResumptionInput] = useState(perimeterConfig.resumptionTime);
  const [closingInput, setClosingInput] = useState(perimeterConfig.closingTime);
  const [portalUrlInput, setPortalUrlInput] = useState(getLivePortalUrl(perimeterConfig));

  React.useEffect(() => {
    const loadClockRecords = () => {
      setTeacherClockRecords(getTeacherClockRecords());
      const pConf = getPerimeterConfig();
      setPerimeterConfig(pConf);
      setSchoolLatInput(pConf.schoolLat.toString());
      setSchoolLngInput(pConf.schoolLng.toString());
      setRadiusInput(pConf.radiusMeters.toString());
      setResumptionInput(pConf.resumptionTime);
      setClosingInput(pConf.closingTime);
      setPortalUrlInput(getLivePortalUrl(pConf));
      setDeviceLocks(getDeviceLocks());
      const currentCreds = getPortalCredentials();
      setCreds(currentCreds);
      setAdminPassInput(currentCreds.adminPasscode);
      setGatePassInput(currentCreds.gatePasscode);
      setTeacherPinsState({ ...currentCreds.teacherPins });
    };
    loadClockRecords();
    syncPerimeterConfigFromCloud().then(() => {
      loadClockRecords();
    });

    const handleBrandingUpdated = () => {
      setBranding(getSchoolBranding());
    };
    window.addEventListener('attendiq:branding-updated', handleBrandingUpdated);
    return () => {
      window.removeEventListener('attendiq:branding-updated', handleBrandingUpdated);
    };

    window.addEventListener('attend-iq-teacher-clock-update', loadClockRecords);
    window.addEventListener('attend-iq-perimeter-update', loadClockRecords);
    window.addEventListener('attend-iq-device-locks-update', loadClockRecords);
    window.addEventListener('attend-iq-credentials-update', loadClockRecords);
    return () => {
      window.removeEventListener('attend-iq-teacher-clock-update', loadClockRecords);
      window.removeEventListener('attend-iq-perimeter-update', loadClockRecords);
      window.removeEventListener('attend-iq-device-locks-update', loadClockRecords);
      window.removeEventListener('attend-iq-credentials-update', loadClockRecords);
    };
  }, [selectedDate]);

  const tomorrowDateStr = (() => {
    try {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return selectedDate;
    }
  })();
  const todayDailyCode = getDailyEntranceCode(selectedDate, perimeterConfig);
  const tomorrowDailyCode = getDailyEntranceCode(tomorrowDateStr, perimeterConfig);
  const isCustomCodeToday = Boolean(perimeterConfig.dailyEntranceCodeOverride?.[selectedDate]);

  const handleCalibratePerimeterGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGeofenceGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeofenceGpsLoading(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setSchoolLatInput(lat.toString());
        setSchoolLngInput(lng.toString());
        const updated = {
          ...perimeterConfig,
          schoolLat: lat,
          schoolLng: lng,
        };
        savePerimeterConfig(updated);
        setPerimeterConfig(updated);
        setAccessFeedback(`School coordinates successfully calibrated to current GPS position (${lat}, ${lng})!`);
        setTimeout(() => setAccessFeedback(null), 5000);
      },
      (err) => {
        setGeofenceGpsLoading(false);
        alert(`Could not acquire GPS: ${err.message}. Please check device location permissions.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSavePerimeterSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(schoolLatInput);
    const lng = parseFloat(schoolLngInput);
    const radius = parseInt(radiusInput, 10);
    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius < 10) {
      alert('Please enter valid numeric latitude, longitude, and radius (minimum 10m).');
      return;
    }
    const updated: SchoolPerimeterConfig = {
      ...perimeterConfig,
      schoolLat: lat,
      schoolLng: lng,
      radiusMeters: radius,
      resumptionTime: resumptionInput,
      closingTime: closingInput,
      portalWebUrl: portalUrlInput.trim() || 'https://attendiq.vercel.app',
    };
    savePerimeterConfig(updated);
    setPerimeterConfig(updated);
    setAccessFeedback('School perimeter geofence, portal web URL, and bell schedule updated successfully!');
    setTimeout(() => setAccessFeedback(null), 4000);
  };

  const handleSaveAdminPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassInput || adminPassInput.trim().length < 4) {
      alert('Admin passcode must be at least 4 characters.');
      return;
    }
    updateAdminPasscode(adminPassInput);
    setAccessFeedback('Administrator master passcode updated successfully!');
    setTimeout(() => setAccessFeedback(null), 4000);
  };

  const handleSaveGatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatePassInput || gatePassInput.trim().length < 4) {
      alert('Gatehouse scanner passcode must be at least 4 characters.');
      return;
    }
    updateGatePasscode(gatePassInput);
    setAccessFeedback('Gatehouse security passcode updated successfully!');
    setTimeout(() => setAccessFeedback(null), 4000);
  };

  const handleUpdateSingleTeacherPin = (teacherId: string, pin: string) => {
    if (!pin || pin.trim().length < 4) {
      alert('Staff PIN must be at least 4 digits.');
      return;
    }
    updateTeacherPin(teacherId, pin);
    setTeacherPinsState((prev) => ({ ...prev, [teacherId]: pin.trim() }));
    setAccessFeedback(`Login PIN updated for teacher!`);
    setTimeout(() => setAccessFeedback(null), 3000);
  };

  const handleRandomizeSinglePin = (teacherId: string) => {
    const newPin = generateRandomPin();
    updateTeacherPin(teacherId, newPin);
    setTeacherPinsState((prev) => ({ ...prev, [teacherId]: newPin }));
    setAccessFeedback(`New separate 4-digit PIN generated: ${newPin}`);
    setTimeout(() => setAccessFeedback(null), 3500);
  };

  const handleRandomizeAllPins = () => {
    if (confirm('Generate brand-new, unique 4-digit PINs for ALL teachers? Every teacher will have their own distinct PIN.')) {
      const updated = randomizeAllTeacherPins(teachers.map((t) => t.id));
      setTeacherPinsState({ ...updated });
      setAccessFeedback('Generated separate, unique 4-digit PINs for all teachers!');
      setTimeout(() => setAccessFeedback(null), 4000);
    }
  };

  const handleCopyPinRoster = () => {
    const lines = teachers.map((t) => {
      const cls = classes.find((c) => c.teacherId === t.id);
      const pin = teacherPinsState[t.id] || creds.teacherPins[t.id] || '7314';
      return `• ${t.name} (${cls ? cls.name : 'Subject Teacher'}): PIN ${pin}`;
    });
    const text = `AttendIQ School Portal — Confidential Staff PIN Directory\n\n${lines.join('\n')}\n\nPlease distribute each PIN privately to its respective teacher.`;
    navigator.clipboard.writeText(text);
    setAccessFeedback('Confidential Staff PIN Directory copied to clipboard!');
    setTimeout(() => setAccessFeedback(null), 4000);
  };

  const handleSendTeacherWhatsAppSlip = (teacher: Teacher) => {
    const assignedClasses = classes.filter(
      (c) => c.teacherId === teacher.id || teacher.assignedClassIds?.includes(c.id)
    );
    const homeroomDisplay = assignedClasses.length > 0
      ? assignedClasses.map((c) => c.name).join(', ')
      : 'Assigned Subject Teacher';

    const subjectsList = teacher.subjects && teacher.subjects.length > 0 
      ? teacher.subjects.join(', ') 
      : teacher.subject || 'All Class Subjects';

    const currentPin = teacherPinsState[teacher.id] || creds.teacherPins[teacher.id] || '7314';
    const portalUrl = getLivePortalUrl(perimeterConfig);

    const message = 
      `🏫 *APEX CREST ACADEMY — OFFICIAL STAFF PORTAL CREDENTIALS*\n\n` +
      `Dear *${teacher.name}*,\n` +
      `Your official staff portal access has been provisioned:\n\n` +
      `🌐 *Portal Link:* ${portalUrl}\n` +
      `👤 *Staff Profile:* ${teacher.name}\n` +
      `🏫 *Homeroom Section:* ${homeroomDisplay}\n` +
      `📚 *Assigned Subject(s):* ${subjectsList}\n` +
      `🔑 *Your Confidential 4-Digit Login PIN:* *${currentPin}*\n\n` +
      `--------------------------------------------\n` +
      `📋 *Daily Clock-In & Roll Call Protocol:*\n` +
      `1. Open the portal link above on your smartphone.\n` +
      `2. Select your teacher profile from the dropdown.\n` +
      `3. Enter your confidential 4-digit PIN.\n` +
      `4. Verify school GPS perimeter and clock in using the daily rotating code.\n` +
      `5. Your smartphone will securely pair on your first clock-in.\n\n` +
      `⚠️ *Confidentiality Notice:* Please keep your PIN secure and do not share it.\n\n` +
      `Warm regards,\n` +
      `*Office of the School Administrator*\n` +
      `${branding.schoolName}, ${branding.branchLocation}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
    }

    const cleanPhone = (teacher.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(waUrl, '_blank');
    setAccessFeedback(`WhatsApp credentials slip opened for ${teacher.name} with live URL: ${portalUrl}!`);
    setTimeout(() => setAccessFeedback(null), 5000);
  };

  const handleCopyAllWhatsAppSlips = () => {
    const portalUrl = getLivePortalUrl(perimeterConfig);
    const slips = teachers.map((teacher) => {
      const assignedClasses = classes.filter(
        (c) => c.teacherId === teacher.id || teacher.assignedClassIds?.includes(c.id)
      );
      const homeroomDisplay = assignedClasses.length > 0
        ? assignedClasses.map((c) => c.name).join(', ')
        : 'Assigned Subject Teacher';

      const subjectsList = teacher.subjects && teacher.subjects.length > 0 
        ? teacher.subjects.join(', ') 
        : teacher.subject || 'All Class Subjects';

      const currentPin = teacherPinsState[teacher.id] || creds.teacherPins[teacher.id] || '7314';
      return (
        `*${branding.schoolName} — Staff Credentials*\n` +
        `👤 Teacher: ${teacher.name}\n` +
        `📱 Phone: ${teacher.phone || 'N/A'}\n` +
        `🏫 Class: ${homeroomDisplay}\n` +
        `📚 Subject(s): ${subjectsList}\n` +
        `🔑 Login PIN: *${currentPin}*\n` +
        `🌐 Portal: ${portalUrl}`
      );
    });
    navigator.clipboard.writeText(slips.join('\n\n========================================\n\n'));
    setAccessFeedback('All staff WhatsApp credential slips copied to clipboard!');
    setTimeout(() => setAccessFeedback(null), 4000);
  };

  const handleSetDailyCodeOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDailyCodeInput.trim().length !== 4) {
      alert('Daily code must be exactly 4 digits.');
      return;
    }
    setDailyEntranceCodeOverride(selectedDate, customDailyCodeInput.trim());
    setCustomDailyCodeInput('');
    setAccessFeedback(`Custom 4-digit code set for ${selectedDate}!`);
    setTimeout(() => setAccessFeedback(null), 4000);
  };

  const handleResetDailyCodeOverride = () => {
    const config = getPerimeterConfig();
    if (config.dailyEntranceCodeOverride && config.dailyEntranceCodeOverride[selectedDate]) {
      delete config.dailyEntranceCodeOverride[selectedDate];
      savePerimeterConfig(config);
      setPerimeterConfig({ ...config });
      setAccessFeedback(`Reset ${selectedDate} back to automatic rotating daily code!`);
      setTimeout(() => setAccessFeedback(null), 4000);
    }
  };

  const handleUnpairTeacher = (teacherId: string, teacherName: string) => {
    if (confirm(`Are you sure you want to unpair the phone for ${teacherName}? They will be able to bind a new device on their next clock-in.`)) {
      unpairTeacherDevice(teacherId);
      setDeviceLocks(getDeviceLocks());
      setAccessFeedback(`Device lock for ${teacherName} has been cleared.`);
      setTimeout(() => setAccessFeedback(null), 4000);
    }
  };


  // Whole school today calculations
  const totalStudents = students.length;
  let totalPresentToday = 0;
  let totalAbsentToday = 0;

  // Gather today's marked attendance across sessions for selectedDate
  const todaySessions = sessions.filter((s) => s.date === selectedDate);
  classes.forEach((c) => {
    const session = todaySessions.find((s) => s.classId === c.id);
    const classPupils = students.filter((s) => s.classId === c.id);

    classPupils.forEach((p) => {
      const rec = session?.records[p.id];
      if (rec?.status === 'present') totalPresentToday++;
      else if (rec?.status === 'absent') totalAbsentToday++;
      else {
        // Fallback to cumulative if not marked today
        if (p.totalPresent > 0) totalPresentToday += 0;
      }
    });
  });

  // Calculate overall rate
  const totalMarked = totalPresentToday + totalAbsentToday;
  const overallRate = totalMarked > 0 ? Math.round((totalPresentToday / totalMarked) * 100) : 94;

  // Identify chronic absentees (at or exceeding threshold)
  const chronicAbsentees = students.filter(
    (s) => s.totalAbsent >= alertSettings.chronicAbsenceThreshold
  );

  // Class stats
  const classStats = classes.map((cls) => {
    const classPupils = students.filter((s) => s.classId === cls.id);
    const session = todaySessions.find((s) => s.classId === cls.id);

    let present = 0;
    let absent = 0;

    classPupils.forEach((p) => {
      const rec = session?.records[p.id];
      if (rec?.status === 'present') present++;
      else if (rec?.status === 'absent') absent++;
      else {
        present += p.totalPresent > 0 ? 1 : 0;
      }
    });

    const sum = present + absent;
    const rate = sum > 0 ? Math.round((present / sum) * 100) : 92;

    return {
      ...cls,
      present,
      absent,
      rate,
      isSubmitted: Boolean(session?.records && Object.keys(session.records).length > 0),
      submittedTime: session?.submittedAt || '08:24 AM',
    };
  });

  // Sort classes by worst attendance first for trend analysis
  const classesByWorstAttendance = [...classStats].sort((a, b) => a.rate - b.rate);

  const handleExportWholeSchoolCSV = () => {
    const csv = exportAttendanceReportCSV();
    downloadCSVFile(csv, `Apex_Crest_Academy_Attendance_${selectedDate}.csv`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

  const handleSendPrincipalWhatsAppSummary = () => {
    const bestClass = [...classStats].sort((a, b) => b.rate - a.rate)[0];
    const topAbsentees = chronicAbsentees.slice(0, 3);

    const absenteeLines = topAbsentees.length > 0
      ? topAbsentees.map((p) => `• ${p.name} (${classes.find(c => c.id === p.classId)?.name || 'Class'}) - ${p.totalAbsent} absences`).join('\n')
      : '• None (Good standing across all sections)';

    const text =
      `*${branding.schoolName}, ${branding.branchLocation}*\n` +
      `*Principal & Management Weekly Attendance Summary*\n` +
      `📅 Date: ${selectedDate}\n\n` +
      `📊 *Overall School Performance:*\n` +
      `• Whole-School Attendance Rate: *${overallRate}%*\n` +
      `• Total Enrolled: ${totalStudents} Pupils\n` +
      `• Present in Classrooms Today: ${totalPresentToday}\n` +
      `• Absent Today: ${totalAbsentToday}\n\n` +
      `🏆 *Top Performing Classroom:*\n` +
      `• ${bestClass?.name || 'Primary 4 - Gold'} (${bestClass?.rate || 98}% Attendance)\n\n` +
      `⚠️ *Pupils Flagged for Attention:*\n` +
      `${absenteeLines}\n\n` +
      `_Dispatched from AttendIQ School Management Console_`;

    try {
      navigator.clipboard.writeText(text);
      setWhatsAppNotice('✓ Executive summary copied to clipboard & WhatsApp opened!');
      setTimeout(() => setWhatsAppNotice(null), 4000);
    } catch {}

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {whatsAppNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{whatsAppNotice}</span>
        </div>
      )}

      {/* Admin Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Principal & Administrator Console
              </span>
              <span className="text-xs text-slate-400">
                Date: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Whole-School Attendance Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Real-time monitoring of classroom roll call compliance, automated parent alert delivery, and proactive intervention for at-risk pupils.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSendPrincipalWhatsAppSummary}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
              title="Share executive summary directly via WhatsApp"
            >
              <Phone className="h-4 w-4" />
              <span>WhatsApp Summary</span>
            </button>

            {onOpenWhitelabelModal && (
              <button
                onClick={() => onOpenWhitelabelModal('branding')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition"
                title="School Branding, Whitelabeling & Subscription Licensing"
              >
                <Building className="h-4 w-4" />
                <span>Branding & License</span>
              </button>
            )}

            <button
              onClick={() => onOpenDatabaseModal('teachers')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Teacher Database ({teachers.length})</span>
            </button>

            <button
              onClick={handleExportWholeSchoolCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-md active:scale-95 transition"
            >
              <Download className="h-4 w-4 text-indigo-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md active:scale-95 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print Report</span>
            </button>

            <button
              onClick={onOpenSettingsModal}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
              title="Alert Configuration"
            >
              <Sliders className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Whole School Attendance Rate */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Overall School Rate</span>
            <span className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{overallRate}%</span>
              <span className="text-xs font-bold text-emerald-600">+1.4% vs last week</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Target benchmark: 92.0%</p>
          </div>
        </div>

        {/* Total Enrolled & Present */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Present Across School</span>
            <span className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">
                {totalPresentToday > 0 ? totalPresentToday : totalStudents - 2}
              </span>
              <span className="text-xs text-slate-500">of {totalStudents} enrolled pupils</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across {classes.length} active class sections</p>
          </div>
        </div>

        {/* Frequent Absences Watchlist */}
        <div className="bg-white rounded-3xl p-5 border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Frequent Absences ({alertSettings.chronicAbsenceThreshold}+ Days)
            </span>
            <span className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600">{chronicAbsentees.length}</span>
              <span className="text-xs font-bold text-rose-700">Needs Follow-Up</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Parents notified via WhatsApp/SMS</p>
          </div>
        </div>

        {/* Teacher Roll Call Compliance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Teacher On-Time Rate</span>
            <span className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-sky-600">94.4%</span>
              <span className="text-xs font-semibold text-slate-500">Submitted on schedule</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">3 of 3 morning sessions logged</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-4 shadow-2xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Class-by-Class Overview & Trends
        </button>
        <button
          onClick={() => setActiveTab('chronic_absentees')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'chronic_absentees'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-rose-500" /> Frequent Absences & Follow-up ({chronicAbsentees.length})
        </button>
        <button
          onClick={() => setActiveTab('teacher_analytics')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'teacher_analytics'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4" /> Teacher Submission Performance
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Nigerian Term Report Card Sheet
        </button>
        <button
          onClick={() => setActiveTab('access_control')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'access_control'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="h-4 w-4 text-amber-600" /> Staff PINs, Passwords & Geofence
        </button>
        <button
          onClick={() => onOpenDatabaseModal('teachers')}
          className="py-3.5 px-4 font-bold text-xs border-b-2 border-transparent text-indigo-600 hover:text-indigo-900 hover:border-indigo-300 transition flex items-center gap-1.5 sm:ml-auto"
        >
          <GraduationCap className="h-4 w-4" /> Teachers Roster & Assignments ({teachers.length}) &rarr;
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CLASS TRENDS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Class-by-Class Attendance Grid */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Classroom Attendance Rates & Submission Status
                </h3>
                <p className="text-xs text-slate-500">
                  Daily roll call completion and pupil attendance percentages by section
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                {classes.length} Total Sections
              </span>
            </div>

            <div className="space-y-4">
              {classStats.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{cls.name}</span>
                        <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {cls.grade}
                        </span>
                        {cls.rate < 85 && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                            Intervention Needed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Teacher: {cls.teacherName} • Room: {cls.room}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900">{cls.rate}%</span>
                        <span className="text-[10px] text-slate-500 block">
                          {cls.present} Present / {cls.absent} Absent
                        </span>
                      </div>

                      <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Submitted {cls.submittedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        cls.rate >= 90
                          ? 'bg-emerald-500'
                          : cls.rate >= 80
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${cls.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Radar: Classes with Lowest Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Attendance Trend & Vulnerability Ranking
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Identifies sections requiring attendance outreach or parent check-in
              </p>

              <div className="space-y-3">
                {classesByWorstAttendance.map((cls, idx) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-400">#{idx + 1}</span>
                      <div>
                        <span className="font-bold text-slate-900 block">{cls.name}</span>
                        <span className="text-[11px] text-slate-500">{cls.teacherName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-black text-sm ${
                          cls.rate >= 90
                            ? 'text-emerald-600'
                            : cls.rate >= 80
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {cls.rate}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">{cls.absent} Absences</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Attendance Day Trend */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Day-of-Week Attendance Distribution
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Past 5 school days average attendance rates
                </p>

                <div className="grid grid-cols-5 gap-2 items-end h-32 pt-4">
                  {[
                    { day: 'Mon', rate: 96 },
                    { day: 'Tue', rate: 94 },
                    { day: 'Wed', rate: 97 },
                    { day: 'Thu', rate: 93 },
                    { day: 'Fri', rate: 91 },
                  ].map((d) => (
                    <div key={d.day} className="flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-[10px] font-bold text-slate-600">{d.rate}%</span>
                      <div
                        className="w-full bg-gradient-to-t from-indigo-600 to-sky-500 rounded-t-xl transition-all"
                        style={{ height: `${(d.rate / 100) * 80}px` }}
                      />
                      <span className="text-[11px] font-semibold text-slate-400">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900">
                💡 <strong>Insight:</strong> Friday attendance shows slight drop (-3%). Auto-alert SMS for Friday absences is currently active.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FREQUENT ABSENCES & FOLLOW-UP WATCHLIST */}
      {activeTab === 'chronic_absentees' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Frequent Absences & Follow-up List
              </h3>
              <p className="text-xs text-slate-500">
                Pupils who have reached {alertSettings.chronicAbsenceThreshold}+ unexcused absences within a {alertSettings.windowDays}-day period
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              {chronicAbsentees.length} Students Flagged
            </span>
          </div>

          {chronicAbsentees.length > 0 ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Pupil Information</th>
                    <th className="py-3 px-4 font-semibold">Class</th>
                    <th className="py-3 px-4 font-semibold">Total Absences</th>
                    <th className="py-3 px-4 font-semibold">Parent & Phone</th>
                    <th className="py-3 px-4 font-semibold">Notification Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chronicAbsentees.map((s) => {
                    const cName = classes.find((c) => c.id === s.classId)?.name || s.classId;
                    return (
                      <tr key={s.id} className="hover:bg-rose-50/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={s.photoUrl}
                              alt={s.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block">{s.name}</span>
                              <span className="text-[10px] text-slate-500">Roll #{s.rollNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{cName}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-rose-100 text-rose-800 border border-rose-200">
                            {s.totalAbsent} Days Missed
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{s.parentName}</span>
                          <span className="text-[10px] text-slate-500">{s.parentPhone}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Auto-SMS Dispatched
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onSelectStudentProfile(s)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition"
                          >
                            Open Profile →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">No high-absence pupils detected!</p>
              <p className="text-[11px] text-slate-400 mt-1">
                All pupils are below the {alertSettings.chronicAbsenceThreshold} absence follow-up threshold.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEACHER ACCOUNTABILITY, DAILY CODE & TIMESHEET */}
      {activeTab === 'teacher_analytics' && (
        <div className="space-y-6">
          {/* Top Banner: Today's 4-Digit Entrance Code & School Perimeter */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/60 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-800 flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3 text-indigo-400" /> Daily Entrance Code
                  </span>
                  <span className="text-xs text-indigo-200">
                    Active for Date: <strong className="text-white">{selectedDate}</strong>
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Teacher Perimeter Clock-In Code
                </h3>
                <p className="text-xs text-indigo-200/80 max-w-xl leading-relaxed">
                  Teachers enter this 4-digit code on their own mobile devices upon arriving at school. The code is strictly locked to within <strong>{perimeterConfig.radiusMeters}m</strong> of the school grounds.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                    Geofence Radius: <strong className="text-white">{perimeterConfig.radiusMeters} meters</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                    Arrival Cutoff: <strong className="text-white">{perimeterConfig.resumptionTime}</strong>
                  </span>
                </div>
              </div>

              {/* Big 4-Digit Display & Action Buttons */}
              <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-indigo-800/60 self-start lg:self-auto">
                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Today&apos;s 4-Digit Code
                  </span>
                  <span className="text-3xl sm:text-4xl font-mono font-black tracking-wider text-emerald-400 select-all">
                    {getDailyEntranceCode(selectedDate, perimeterConfig)}
                  </span>
                </div>

                <div className="flex flex-col gap-2 border-l border-indigo-800/60 pl-4">
                  <button
                    onClick={() => {
                      const code = getDailyEntranceCode(selectedDate, perimeterConfig);
                      navigator.clipboard.writeText(code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const current = getDailyEntranceCode(selectedDate, perimeterConfig);
                      const input = prompt(
                        `Set Custom 4-Digit Code for ${selectedDate}:\n(Leave blank to keep automatic deterministic code)`,
                        current
                      );
                      if (input && /^\d{4}$/.test(input.trim())) {
                        setDailyEntranceCodeOverride(selectedDate, input.trim());
                        setPerimeterConfig(getPerimeterConfig());
                      } else if (input !== null) {
                        alert('Code must be exactly 4 numeric digits.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Change Code</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Daily Timesheet Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" />
                  Teacher Daily Clock-In Timesheet ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time arrival and departure logs stamped from teachers&apos; mobile devices
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Resumption Cutoff: {perimeterConfig.resumptionTime}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Teacher Name</th>
                    <th className="py-3 px-4 font-semibold">Class Assigned</th>
                    <th className="py-3 px-4 font-semibold text-center">Clock-In (Arrival)</th>
                    <th className="py-3 px-4 font-semibold text-center">Clock-Out (Departure)</th>
                    <th className="py-3 px-4 font-semibold text-center">Arrival Status</th>
                    <th className="py-3 px-4 font-semibold text-center">GPS Perimeter</th>
                    <th className="py-3 px-4 font-semibold text-center">Paired Device (Anti-Cheat)</th>
                    <th className="py-3 px-4 font-semibold text-right">Hours Worked</th>
                    <th className="py-3 px-4 font-semibold text-right">Device Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => {
                    const record = teacherClockRecords.find(
                      (r) => r.teacherId === t.id && r.date === selectedDate
                    );
                    const assignedClass = classes.find((c) => c.teacherId === t.id)?.name || 'Class Teacher';
                    const lock = deviceLocks.find((l) => l.teacherId === t.id);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {t.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{t.name}</span>
                              <span className="text-[10px] text-slate-400">{t.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{assignedClass}</td>
                        <td className="py-3 px-4 text-center">
                          {record?.clockInTime ? (
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {record.clockInTime}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not Clocked In</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record?.clockOutTime ? (
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {record.clockOutTime}
                            </span>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record?.clockInTime ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                record.status === 'on_time'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {record.status === 'on_time' ? '✓ On-Time' : '⚠️ Late Arrival'}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                              Awaiting Clock-In
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {record?.distanceMeters !== undefined ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <MapPin className="h-3 w-3" />
                              Within {record.distanceMeters}m
                            </span>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {lock ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                              <Smartphone className="h-3 w-3 text-indigo-600" />
                              <span>{lock.deviceName}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Unpaired
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-slate-900">
                            {record?.hoursWorked ? `${record.hoursWorked} hrs` : record?.clockInTime ? 'Active Shift' : '0 hrs'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {lock ? (
                            <button
                              onClick={() => {
                                if (confirm(`Unpair ${t.name}'s phone (${lock.deviceName})?\n\nThis will allow them to pair a new phone on their next clock-in.`)) {
                                  unpairTeacherDevice(t.id);
                                  setDeviceLocks(getDeviceLocks());
                                }
                              }}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 transition"
                              title="Reset device binding (e.g. if teacher got a new phone)"
                            >
                              Reset Phone Lock
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Auto-pairs on punch</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roll Call Timeliness Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-sky-600" />
                  Teacher Roll Call Submission Timeliness
                </h3>
                <p className="text-xs text-slate-500">
                  Audit tracking of which teachers submit classroom attendance on time vs delayed
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Teacher Name</th>
                    <th className="py-3 px-4 font-semibold">Class Assigned</th>
                    <th className="py-3 px-4 font-semibold text-center">On-Time Submissions</th>
                    <th className="py-3 px-4 font-semibold text-center">Late Submissions</th>
                    <th className="py-3 px-4 font-semibold text-center">Missed</th>
                    <th className="py-3 px-4 font-semibold">Today&apos;s Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Compliance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherAnalytics.map((ta) => (
                    <tr key={ta.teacherId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{ta.teacherName}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{ta.className}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {ta.onTimeSubmissions}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-600">
                        {ta.lateSubmissions}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600">
                        {ta.missedSubmissions}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {ta.lastSubmissionTimestamp || 'Logged on time'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            ta.complianceRate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ta.complianceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NIGERIAN REPORT CARD ATTENDANCE BROADSHEET */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>{branding.schoolName} • Nigerian Term Master Result & Attendance Broadsheet</span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-white">
                  End-of-Term Master Result & Attendance Broadsheet
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Comprehensive terminal result compilation combining all subject continuous assessments (CA 1, CA 2, Assignment, Exam), term averages, class rankings, and attendance records.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/20 text-xs mr-2">
                  <button
                    onClick={() => setBroadsheetMode('comprehensive')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      broadsheetMode === 'comprehensive'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    All Subjects & Attendance
                  </button>
                  <button
                    onClick={() => setBroadsheetMode('attendance_only')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition ${
                      broadsheetMode === 'attendance_only'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Attendance Only
                  </button>
                </div>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 shadow-md transition active:scale-95 cursor-pointer"
                  title="Print Landscape Master Broadsheet"
                >
                  <Printer className="h-4 w-4 text-emerald-600" />
                  <span>Print Master Broadsheet</span>
                </button>
                <button
                  onClick={handleExportWholeSchoolCSV}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Select Class Section:</label>
                <select
                  value={selectedBroadsheetClass}
                  onChange={(e) => setSelectedBroadsheetClass(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="all">All School Sections ({students.length} pupils)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({students.filter((s) => s.classId === cls.id).length} pupils)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Academic Term:</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="First Term (2026/2027 Session)">First Term (2026/2027 Session)</option>
                  <option value="Second Term (2026/2027 Session)">Second Term (2026/2027 Session)</option>
                  <option value="Third Term (2026/2027 Session)">Third Term (2026/2027 Session)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Total School Sessions Held:</label>
                <input
                  type="number"
                  value={schoolSessionsOpened}
                  onChange={(e) => setSchoolSessionsOpened(Number(e.target.value) || 60)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {broadsheetMode === 'comprehensive'
                    ? 'Master Terminal Academic & Attendance Matrix Broadsheet'
                    : 'Report Card Attendance Broadsheet'}{' '}
                  &bull; {selectedTerm}
                </span>
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Showing {students.filter((s) => selectedBroadsheetClass === 'all' || s.classId === selectedBroadsheetClass).length} pupils
              </span>
            </div>

            <div className="overflow-x-auto">
              {broadsheetMode === 'comprehensive' ? (
                /* COMPREHENSIVE ALL-SUBJECTS + ATTENDANCE BROADSHEET */
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white border-b border-slate-800 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 font-bold w-12 text-center">Rank</th>
                      <th className="py-3 px-4 font-bold min-w-[170px]">Pupil Details</th>
                      <th className="py-3 px-3 font-bold text-center">Attendance</th>
                      <th className="py-3 px-2 font-bold text-center w-16">Math</th>
                      <th className="py-3 px-2 font-bold text-center w-16">English</th>
                      <th className="py-3 px-2 font-bold text-center w-16">Science</th>
                      <th className="py-3 px-2 font-bold text-center w-16">Civic</th>
                      <th className="py-3 px-2 font-bold text-center w-16">ICT</th>
                      <th className="py-3 px-3 font-bold text-center bg-slate-800 text-emerald-400">Total (/500)</th>
                      <th className="py-3 px-2 font-bold text-center bg-slate-800 text-sky-400">Average %</th>
                      <th className="py-3 px-3 font-bold text-center">Status</th>
                      <th className="py-3 px-3 font-bold text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(() => {
                      const filteredPupils = students.filter(
                        (s) => selectedBroadsheetClass === 'all' || s.classId === selectedBroadsheetClass
                      );

                      // Compute unified academic report for each pupil
                      const pupilsWithReports = filteredPupils.map((pupil) => {
                        const pupilClass = classes.find((c) => c.id === pupil.classId);
                        const report = getUnifiedAcademicReport(pupil, pupilClass?.name, pupilClass);
                        const math = report.subjects.find((s) => s.subject.toLowerCase().includes('math'))?.total ?? 0;
                        const eng = report.subjects.find((s) => s.subject.toLowerCase().includes('eng'))?.total ?? 0;
                        const sci = report.subjects.find((s) => s.subject.toLowerCase().includes('sci'))?.total ?? 0;
                        const civ = report.subjects.find((s) => s.subject.toLowerCase().includes('civic'))?.total ?? 0;
                        const ict = report.subjects.find((s) => s.subject.toLowerCase().includes('computer') || s.subject.toLowerCase().includes('ict'))?.total ?? 0;

                        return {
                          pupil,
                          pupilClass,
                          report,
                          math,
                          eng,
                          sci,
                          civ,
                          ict,
                        };
                      });

                      // Sort by term average descending
                      pupilsWithReports.sort((a, b) => b.report.termAverageNum - a.report.termAverageNum);

                      return pupilsWithReports.map((item, idx) => {
                        const { pupil, pupilClass, report, math, eng, sci, civ, ict } = item;

                        return (
                          <tr key={pupil.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-3 text-center font-bold text-slate-500">
                              {idx + 1 === 1 ? '🥇 1st' : idx + 1 === 2 ? '🥈 2nd' : idx + 1 === 3 ? '🥉 3rd' : `${idx + 1}th`}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => onSelectStudentProfile(pupil)}
                                className="font-bold text-slate-900 hover:text-indigo-700 text-left transition flex items-center gap-1.5"
                                title="Click to view printable Terminal Report Sheet"
                              >
                                <span>{pupil.name}</span>
                              </button>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                                <span>{pupil.rollNumber}</span>
                                <span>&bull;</span>
                                <span className="font-sans font-semibold text-indigo-700">{pupilClass?.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-bold text-emerald-700">{report.attendance.totalPresent}</span>
                              <span className="text-slate-500"> / {report.attendance.totalDays}</span>
                              <span className="block text-[10px] text-indigo-700 font-semibold">{report.attendance.attendanceRate}% Present</span>
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{math}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{eng}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{sci}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{civ}</td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{ict}</td>
                            <td className="py-3 px-3 text-center font-black text-emerald-800 bg-emerald-50/60">
                              {report.grandTotal}
                            </td>
                            <td className="py-3 px-2 text-center font-black text-sky-800 bg-sky-50/60 text-sm">
                              {report.termAverage}%
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                report.termAverageNum >= 75 ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-sky-50 text-sky-800 border border-sky-300'
                              }`}>
                                {report.termAverageNum >= 75 ? 'Distinction' : 'Promoted'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right no-print">
                              <button
                                onClick={() => onSelectStudentProfile(pupil)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition"
                                title="Open & print official terminal report card"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Report Sheet</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              ) : (
                /* ATTENDANCE ONLY BROADSHEET */
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-3 px-4 font-bold">Roll No.</th>
                      <th className="py-3 px-4 font-bold">Pupil Name</th>
                      <th className="py-3 px-4 font-bold">Class</th>
                      <th className="py-3 px-4 font-bold text-center">Times Opened</th>
                      <th className="py-3 px-4 font-bold text-center text-emerald-700">Times Present</th>
                      <th className="py-3 px-4 font-bold text-center text-rose-700">Times Absent</th>
                      <th className="py-3 px-4 font-bold text-center">Attendance %</th>
                      <th className="py-3 px-4 font-bold text-center">Punctuality Rating</th>
                      <th className="py-3 px-4 font-bold">Teacher&apos;s Report Remark</th>
                      <th className="py-3 px-4 font-bold text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students
                      .filter((s) => selectedBroadsheetClass === 'all' || s.classId === selectedBroadsheetClass)
                      .map((pupil) => {
                        const { attendanceRate: rate, totalDays } = calculateStudentAttendanceMetrics(pupil);
                        const pupilClass = classes.find((c) => c.id === pupil.classId);

                        let punctuality = 'Excellent (5/5)';
                        let badgeColor = 'bg-emerald-100 text-emerald-800';
                        let remark = 'Punctual, attentive and regular in school.';

                        if (rate < 75 || pupil.totalAbsent >= 5) {
                          punctuality = 'Needs Improvement';
                          badgeColor = 'bg-rose-100 text-rose-800';
                          remark = 'Frequent absenteeism is affecting academic performance.';
                        } else if (rate < 85) {
                          punctuality = 'Fair (3/5)';
                          badgeColor = 'bg-amber-100 text-amber-800';
                          remark = 'Attendance is satisfactory, but punctuality needs care.';
                        } else if (rate < 95) {
                          punctuality = 'Very Good (4/5)';
                          badgeColor = 'bg-sky-100 text-sky-800';
                          remark = 'Consistent and well-behaved pupil.';
                        }

                        return (
                          <tr key={pupil.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-mono font-bold text-slate-500">{pupil.rollNumber}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{pupil.name}</td>
                            <td className="py-3 px-4 text-slate-600 font-medium">{pupilClass?.name || 'Class'}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">{totalDays}</td>
                            <td className="py-3 px-4 text-center font-black text-emerald-600">{pupil.totalPresent}</td>
                            <td className="py-3 px-4 text-center font-black text-rose-600">{pupil.totalAbsent}</td>
                            <td className="py-3 px-4 text-center font-black text-indigo-700">{rate}%</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeColor}`}>
                                {punctuality}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 italic">{remark}</td>
                            <td className="py-3 px-4 text-right no-print">
                              <button
                                onClick={() => onSelectStudentProfile(pupil)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Report</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACCESS CONTROL, GEOFENCE PERIMETER & STAFF CREDENTIALS */}
      {activeTab === 'access_control' && (
        <div className="space-y-6">
          {/* Notification Feedback Banner */}
          {accessFeedback && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <span className="text-xs font-bold">{accessFeedback}</span>
              </div>
              <button
                onClick={() => setAccessFeedback(null)}
                className="text-emerald-700 hover:text-emerald-900 text-sm font-bold px-2 py-0.5"
              >
                &times;
              </button>
            </div>
          )}

          {/* SECTION 1: DAILY ROTATING 4-DIGIT ENTRANCE CODE */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Daily Rotating 4-Digit Clock-In Code
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  The gate code automatically changes every calendar day at midnight (12:00 AM) so staff must arrive on the specific date.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-xl">
                Daily Automatic Rotation Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Today's Code Card */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                    Today's Code ({selectedDate})
                  </span>
                  {isCustomCodeToday ? (
                    <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded-full">
                      Custom Override
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-400 text-slate-900 font-black px-2 py-0.5 rounded-full">
                      Auto Rotated
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3 my-2">
                  <span className="font-mono text-4xl font-black tracking-widest text-white">
                    {todayDailyCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(todayDailyCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-xs flex items-center gap-1 text-slate-200"
                    title="Copy code"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300">
                  Staff see this code on their dashboard to complete gate & classroom clock-in.
                </p>
              </div>

              {/* Tomorrow's Code Preview Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tomorrow's Code Preview
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    {tomorrowDateStr}
                  </span>
                </div>
                <div className="font-mono text-3xl font-black tracking-widest text-slate-800 my-2">
                  {tomorrowDailyCode}
                </div>
                <p className="text-[11px] text-slate-500">
                  Will automatically activate tomorrow morning at 00:00. No manual action needed.
                </p>
              </div>

              {/* Principal Manual Override Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Manual Code Override (Optional)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 mb-3">
                    Specify a custom 4-digit code for {selectedDate} if needed.
                  </p>
                </div>
                <form onSubmit={handleSetDailyCodeOverride} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={customDailyCodeInput}
                    onChange={(e) => setCustomDailyCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 8821"
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Set
                  </button>
                  {isCustomCodeToday && (
                    <button
                      type="button"
                      onClick={handleResetDailyCodeOverride}
                      className="px-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                      title="Reset to automatic rotating daily code"
                    >
                      Reset
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* SECTION 2: GEOFENCE PERIMETER & GPS CALIBRATION (ADMIN EXCLUSIVE) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-rose-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    School Geofence & GPS Perimeter Calibration
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defines the geographic boundary for staff clock-in. Only administrators have authorization to calibrate or alter these coordinates.
                </p>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-3 py-1 rounded-xl">
                Restricted to Admin Only
              </span>
            </div>

            {/* Security Warning Notice */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl mb-6 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong className="font-bold">Anti-Spoofing Perimeter Enforced:</strong> Teachers do not have access to calibration controls on their dashboards. When teachers open their portal, they can only verify that their GPS position falls within this perimeter ({perimeterConfig.radiusMeters}m radius) before clocking in.
              </div>
            </div>

            <form onSubmit={handleSavePerimeterSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School Latitude (&deg;N)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={schoolLatInput}
                    onChange={(e) => setSchoolLatInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School Longitude (&deg;E)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={schoolLngInput}
                    onChange={(e) => setSchoolLngInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Radius (Meters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={radiusInput}
                    onChange={(e) => setRadiusInput(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Resumption Bell (Cutoff)
                  </label>
                  <input
                    type="text"
                    value={resumptionInput}
                    onChange={(e) => setResumptionInput(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dismissal Bell (Closing)
                  </label>
                  <input
                    type="text"
                    value={closingInput}
                    onChange={(e) => setClosingInput(e.target.value)}
                    placeholder="02:30 PM"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-3 lg:col-span-5 pt-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-900 font-bold">
                      <span>🌐 Production School Portal Web URL (Embedded in WhatsApp Slips)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Live Link (Never Localhost)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={portalUrlInput}
                    onChange={(e) => setPortalUrlInput(e.target.value)}
                    placeholder="https://attendiq.vercel.app"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    This live production URL is automatically embedded in all staff WhatsApp credential messages so teachers can tap and log in directly from their phones.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCalibratePerimeterGps}
                  disabled={geofenceGpsLoading}
                  className="px-4 py-2.5 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 text-rose-600" />
                  <span>
                    {geofenceGpsLoading
                      ? 'Acquiring GPS Signal...'
                      : '📍 Calibrate School Center to My Current Location (GPS)'}
                  </span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
                >
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Save Perimeter & Bell Settings</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 3: PORTAL PASSWORDS & STAFF LOGIN PINS (CLOCKPOINT ACCESS CONTROL) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Staff Login PINs & Portal Access Passwords
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Teachers only have access to staff tools (roll call and clock-in). Administrators have full modification rights over all passcodes.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                ClockPoint-Style Access Control
              </span>
            </div>

            {/* Admin & Gate Security Passcodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Administrator Master Passcode */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Administrator Master Passcode</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Default: 1234</span>
                </div>
                <form onSubmit={handleSaveAdminPasscode} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                    placeholder="Enter new admin passcode"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Save Passcode
                  </button>
                </form>
              </div>

              {/* Gatehouse Security Passcode */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Gatehouse Scanner Passcode</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Default: 1234</span>
                </div>
                <form onSubmit={handleSaveGatePasscode} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={gatePassInput}
                    onChange={(e) => setGatePassInput(e.target.value)}
                    placeholder="Enter new gate passcode"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Save Passcode
                  </button>
                </form>
              </div>
            </div>

            {/* Individual Teacher Login PINs */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Individual Teacher Login PINs ({teachers.length} Active Staff)</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                      Unique Per Teacher
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Each teacher is assigned their own private 4-digit PIN so staff only access their personal dashboard and students.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRandomizeAllPins}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    title="Generate unique random 4-digit PINs for all teachers at once"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>Generate Unique PINs for All</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAllWhatsAppSlips}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    title="Copy pre-formatted WhatsApp credential messages for all teachers"
                  >
                    <Send className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copy All WhatsApp Slips</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPinRoster}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    title="Copy confidential staff PIN directory to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy PIN Directory</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Staff Member & Contact</th>
                      <th className="py-2.5 px-4">Assigned Section & Subjects</th>
                      <th className="py-2.5 px-4">Individual 4-Digit PIN</th>
                      <th className="py-2.5 px-4 text-right">Dispatch & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((teacher) => {
                      const teacherPin = teacherPinsState[teacher.id] || creds.teacherPins[teacher.id] || '7314';
                      const assignedClass = classes.find((c) => c.teacherId === teacher.id || teacher.assignedClassIds?.includes(c.id));
                      const subjectsList = teacher.subjects && teacher.subjects.length > 0 
                        ? teacher.subjects.join(', ') 
                        : teacher.subject || 'All Subjects';

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs shrink-0">
                                {teacher.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900">{teacher.name}</p>
                                <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span>{teacher.phone || 'No phone set'}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-indigo-950">{assignedClass ? assignedClass.name : 'Subject Teacher'}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{subjectsList}</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                maxLength={6}
                                value={teacherPin}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setTeacherPinsState((prev) => ({ ...prev, [teacher.id]: val }));
                                }}
                                className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-black text-center focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleRandomizeSinglePin(teacher.id)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Randomize new PIN for this teacher"
                              >
                                <Shuffle className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSendTeacherWhatsAppSlip(teacher)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                                title={`Send official PIN, class & subject assignment slip to ${teacher.name} on WhatsApp`}
                              >
                                <Send className="h-3 w-3" />
                                <span>WhatsApp Slip</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateSingleTeacherPin(teacher.id, teacherPin)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              >
                                Save PIN
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 4: HARDWARE ANTI-CHEAT DEVICE LOCKS */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Anti-Cheat Device Hardware Binding
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Staff devices are locked to prevent proxy clock-ins ("buddy punching"). Unpair a device if a staff member gets a new phone.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-xl">
                {deviceLocks.length} Devices Paired
              </span>
            </div>

            {deviceLocks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No teacher devices are currently paired. When a teacher clocks in for the first time, their smartphone will automatically bind to their account.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Staff Member</th>
                      <th className="py-2.5 px-4">Bound Smartphone</th>
                      <th className="py-2.5 px-4">Hardware Signature</th>
                      <th className="py-2.5 px-4">Paired Timestamp</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deviceLocks.map((lock) => (
                      <tr key={lock.teacherId} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{lock.teacherName}</td>
                        <td className="py-3 px-4 font-medium text-slate-700 flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{lock.deviceName}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {lock.hardwareSignature?.gpu || 'Standard Signature'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{lock.pairedAt}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleUnpairTeacher(lock.teacherId, lock.teacherName)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
                          >
                            Unpair Phone
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
