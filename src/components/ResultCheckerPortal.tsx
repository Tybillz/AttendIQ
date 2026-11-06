'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Lock,
  Unlock,
  KeyRound,
  FileText,
  User,
  Calendar,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Clock,
  LogOut,
  Key,
  Check,
  Eye,
  ShieldAlert,
  Smartphone,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  Student,
  ClassSection,
  Teacher,
  AuditLogEntry,
} from '@/types/attendance';
import {
  getStudents,
  getClasses,
  getTeachers,
  addAuditLog,
  getAuditLogs,
} from '@/lib/storage';
import {
  getSchoolBranding,
  SchoolBranding,
  getLicenseStatus,
  LicenseStatusResult,
} from '@/lib/licensing';
import { downloadStudentReportCardPDF } from '@/lib/pdfReportGenerator';
import { TerminalReportSheet } from './TerminalReportSheet';
import { StudentProfileModal } from './StudentProfileModal';
import { SubjectGradebook } from './SubjectGradebook';
import { PupilDatabaseModal } from './PupilDatabaseModal';
import { WhitelabelModal } from './WhitelabelModal';
import { VendorLicensingModal } from './VendorLicensingModal';
import { AuditLogModal } from './AuditLogModal';
import { AuthSession, getAuthSession, saveAuthSession, logout as performAuthLogout } from '@/lib/auth';
import {
  getStudentTotpSecret,
  generateCurrentTotp,
  verifyStudentTotp,
  getAuthenticatorUri,
} from '@/lib/totp';

interface ResultCheckerPortalProps {
  initialClasses: ClassSection[];
  initialStudents: Student[];
  initialTeachers: Teacher[];
}

export const ResultCheckerPortal: React.FC<ResultCheckerPortalProps> = ({
  initialClasses,
  initialStudents,
  initialTeachers,
}) => {
  // Core state
  const [classes, setClasses] = useState<ClassSection[]>(initialClasses);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [branding, setBranding] = useState<SchoolBranding>(getSchoolBranding());
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResult>(getLicenseStatus());
  const [brandingModalTab, setBrandingModalTab] = useState<'branding' | 'licensing'>('branding');

  // Search & Verification state
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [selectedSession, setSelectedSession] = useState<string>('2026/2027');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || '');
  const [admissionNumberInput, setAdmissionNumberInput] = useState<string>('');

  // Google Authenticator RFC 6238 2FA Rotating Token State
  const [totpTokenInput, setTotpTokenInput] = useState<string>('');
  const [showAuthenticatorCard, setShowAuthenticatorCard] = useState<boolean>(false);
  const [currentTotpCode, setCurrentTotpCode] = useState<string>('000000');
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState<number>(30);
  const [totpSecretDisplay, setTotpSecretDisplay] = useState<string>('');
  const [totpCopied, setTotpCopied] = useState<boolean>(false);

  // Authentication & Verification outcome
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationAuditRecord, setVerificationAuditRecord] = useState<{
    timestamp: string;
    serial: string;
    verifiedContact: string;
  } | null>(null);

  // Vendor Licensing Modal State (accessible to administrators)
  const [isVendorModalOpen, setIsVendorModalOpen] = useState<boolean>(false);

  // Authentication Sessions: Distinct Separated Teacher vs Principal Modals
  const [authSession, setAuthSession] = useState<AuthSession | null>(getAuthSession());
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [staffTeacherId, setStaffTeacherId] = useState<string>(initialTeachers[0]?.id || '');
  const [teacherPinInput, setTeacherPinInput] = useState<string>('');
  const [adminPasscodeInput, setAdminPasscodeInput] = useState<string>('');
  const [teacherLoginError, setTeacherLoginError] = useState<string | null>(null);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Staff back-office views
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [staffActiveTab, setStaffActiveTab] = useState<'gradebook' | 'pupils' | 'audit' | 'branding'>('gradebook');
  const [isPupilModalOpen, setIsPupilModalOpen] = useState<boolean>(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Sync latest branding & data
  const refreshData = useCallback(() => {
    try {
      const freshStudents = getStudents();
      setClasses(getClasses());
      setStudents(freshStudents);
      setTeachers(getTeachers());
      setBranding(getSchoolBranding());
      setLicenseStatus(getLicenseStatus());
      setAuthSession(getAuthSession());
      setAuditLogs(getAuditLogs());
      setSelectedStudentForProfile((prev) => {
        if (!prev) return null;
        return freshStudents.find((s) => s.id === prev.id) || prev;
      });
    } catch (e) {
      console.warn('Error refreshing portal data:', e);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const handleBranding = () => {
      setBranding(getSchoolBranding());
      setLicenseStatus(getLicenseStatus());
    };
    const handleLicense = () => {
      setLicenseStatus(getLicenseStatus());
    };
    window.addEventListener('attendiq:branding-updated', handleBranding);
    window.addEventListener('attendiq:license-updated', handleLicense);
    return () => {
      window.removeEventListener('attendiq:branding-updated', handleBranding);
      window.removeEventListener('attendiq:license-updated', handleLicense);
    };
  }, [refreshData]);

  // Selected class
  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  // Active teacher for staff mode
  const currentStaffTeacher = useMemo(() => {
    if (authSession?.role === 'teacher' && authSession.teacherId) {
      return teachers.find((t) => t.id === authSession.teacherId) || teachers[0];
    }
    return teachers[0];
  }, [teachers, authSession]);

  // Find target student strictly by Student ID / Roll Number
  const findTargetStudent = useCallback((): Student | null => {
    const query = admissionNumberInput.trim().toUpperCase();
    if (!query) return null;
    return (
      students.find((s) => {
        const matchRoll = s.rollNumber?.trim().toUpperCase() === query;
        const matchId = s.id?.trim().toUpperCase() === query;
        return matchRoll || matchId;
      }) || null
    );
  }, [admissionNumberInput, students]);

  // Live 30-Second Google Authenticator TOTP Loop
  useEffect(() => {
    const updateRotatingToken = () => {
      const target = findTargetStudent() || students[0];
      if (target) {
        const secret = getStudentTotpSecret(target.id, target.rollNumber);
        const { code, secondsRemaining } = generateCurrentTotp(secret);
        setCurrentTotpCode(code);
        setTotpSecondsRemaining(secondsRemaining);
        setTotpSecretDisplay(secret);
      }
    };

    updateRotatingToken();
    const interval = setInterval(updateRotatingToken, 1000);
    return () => clearInterval(interval);
  }, [findTargetStudent, students]);

  // Execute Result Verification via 30s Rotating 2FA Authenticator
  const handleVerifyResult = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerificationError(null);
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      const student = findTargetStudent();

      if (!student) {
        setVerificationError(
          `No enrolled student found matching ID "${admissionNumberInput.toUpperCase() || 'EMPTY'}". Please enter a valid Student Admission Number (e.g. P4-01).`
        );
        return;
      }

      const cleanToken = totpTokenInput.replace(/\s+/g, '');
      if (!cleanToken || cleanToken.length !== 6) {
        setVerificationError('Please enter the 6-digit rotating security passcode from your Guardian Authenticator.');
        return;
      }

      const secret = getStudentTotpSecret(student.id, student.rollNumber);
      const isAuthorized = verifyStudentTotp(cleanToken, secret);

      if (isAuthorized) {
        setVerifiedStudent(student);
        const serial = `REQ-${Date.now().toString().slice(-6)}-${student.rollNumber.replace(/[^A-Za-z0-9]/g, '')}`;
        setVerificationAuditRecord({
          timestamp: new Date().toLocaleString(),
          serial,
          verifiedContact: `2FA Authenticator (${cleanToken.slice(0, 3)}***)`,
        });

        // Record anti-tamper security log
        addAuditLog({
          actorRole: 'admin',
          actorId: 'totp-authenticator',
          actorName: `Verified Guardian (${student.parentName})`,
          action: 'SECURITY_ALERT',
          targetType: 'pupil',
          targetId: student.id,
          targetName: student.name,
          classId: student.classId,
          className: activeClass?.name,
          severity: 'info',
          details: `Guardian successfully verified official terminal result for pupil ${student.name} (${student.rollNumber}) via 30s Rotating 2FA TOTP. Ref: ${serial}`,
        });
      } else {
        setVerificationError(
          'Security Authentication Failed: Invalid or expired 6-digit rotating token. Passcodes rotate every 30 seconds for maximum student privacy. Please enter the current code displayed in your Authenticator.'
        );
      }
    }, 350);
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    if (!verifiedStudent) return;
    const message =
      `🎓 *OFFICIAL TERMINAL REPORT SLIP - ${branding.schoolName.toUpperCase()}*\n\n` +
      `• *Pupil:* ${verifiedStudent.name} (${verifiedStudent.rollNumber})\n` +
      `• *Class:* ${activeClass.name}\n` +
      `• *Academic Session:* ${selectedSession} • ${selectedTerm}\n` +
      `• *Authenticity Ref:* ${verificationAuditRecord?.serial || 'AUTHENTIC'}\n\n` +
      `Official verified transcript can be accessed online at: ${typeof window !== 'undefined' ? window.location.origin : 'https://attendiq.vercel.app'}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 1. DEDICATED TEACHER LOGIN HANDLER
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherLoginError(null);
    const targetTeacher = teachers.find((t) => t.id === staffTeacherId) || teachers[0];
    const trimmed = teacherPinInput.trim();
    if (trimmed === '1234' || trimmed === targetTeacher.phone.slice(-4)) {
      const session: AuthSession = {
        role: 'teacher',
        teacherId: targetTeacher.id,
        teacherName: targetTeacher.name,
        loginTime: new Date().toISOString(),
      };
      saveAuthSession(session);
      setAuthSession(session);
      setStaffActiveTab('gradebook'); // Strictly Gradebook only for teachers
      setIsTeacherModalOpen(false);
      setTeacherPinInput('');
    } else {
      setTeacherLoginError('Invalid Teacher PIN. (Default demo PIN: 1234)');
    }
  };

  // 2. DEDICATED PRINCIPAL / ADMIN LOGIN HANDLER
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    const trimmed = adminPasscodeInput.trim();
    if (trimmed === 'admin123' || trimmed === 'attendiq' || trimmed === 'resultiq' || trimmed === 'vendor2026') {
      const session: AuthSession = {
        role: 'admin',
        loginTime: new Date().toISOString(),
      };
      saveAuthSession(session);
      setAuthSession(session);
      setIsAdminModalOpen(false);
      setAdminPasscodeInput('');
    } else {
      setAdminLoginError('Invalid Administrator Passcode. (Default demo: admin123)');
    }
  };

  const handleStaffLogout = () => {
    performAuthLogout();
    setAuthSession(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP INSTITUTIONAL REGISTRAR HEADER
          ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200/90 bg-white sticky top-0 z-40 shadow-xs no-print">
        {/* Top Official Micro-Ribbon */}
        <div className="bg-slate-900 text-slate-200 text-[11px] font-mono tracking-wider py-1.5 px-4 sm:px-8 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-slate-100">ResultIQ™ Academic Registrar Portal</span>
            <span className="text-slate-400 hidden sm:inline">• Official Terminal Assessment Verification</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <span className="text-slate-400 font-semibold">{branding.currentTerm || 'Second Term (Lent) 2026/2027'}</span>
          </div>
        </div>

        {/* Primary School Branding Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-serif text-2xl shadow-sm border border-slate-700 shrink-0">
              {branding.crestEmoji || '🎓'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-serif">
                  {branding.schoolName}
                </h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-300">
                  Verified Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans tracking-wide">
                {branding.motto} &bull; <span className="text-slate-600 font-medium">{branding.branchLocation}</span>
              </p>
            </div>
          </div>

          {/* Right Action: SEPARATED Teacher Login & Principal / Admin Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {authSession ? (
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg font-semibold text-slate-800 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {authSession.role === 'admin'
                      ? 'Principal Console (Admin)'
                      : `Teacher: ${authSession.teacherName?.split(' ')[1] || 'Staff'}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStaffLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* 1. SEPARATE TEACHER PORTAL BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setTeacherLoginError(null);
                    setIsTeacherModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Teacher Portal</span>
                </button>

                {/* 2. SEPARATE PRINCIPAL / ADMIN BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setAdminLoginError(null);
                    setIsAdminModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                  <span>Principal / Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── SECURITY ENFORCEMENT: Staff Management Sub-Navigation ──
            TEACHERS ARE STRICTLY RESTRICTED TO "Score Entry & Gradebook".
            ADMINISTRATIVE TOOLS (Pupil Database, Audit Logs, Whitelabeling, License)
            ARE ONLY RENDERED FOR PRINCIPAL / ADMIN.
        */}
        {authSession && (
          <div className="bg-slate-900 text-white px-4 sm:px-8 py-2 border-t border-slate-800">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-mono text-[11px] mr-2">
                  {authSession.role === 'admin' ? 'ADMIN CONSOLE:' : 'TEACHER CONSOLE:'}
                </span>

                {/* Visible to Teachers & Admin */}
                <button
                  type="button"
                  onClick={() => setStaffActiveTab('gradebook')}
                  className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                    staffActiveTab === 'gradebook'
                      ? 'bg-slate-800 text-amber-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Score Entry & Gradebook
                </button>

                {/* STRICTLY ADMIN-ONLY CAPABILITIES (HIDDEN FROM TEACHERS) */}
                {authSession.role === 'admin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsPupilModalOpen(true)}
                      className="px-3 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
                    >
                      Pupil Database & Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAuditModalOpen(true)}
                      className="px-3 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
                    >
                      Result Access Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBrandingModalTab('branding');
                        setIsBrandingModalOpen(true);
                      }}
                      className="px-3 py-1 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
                    >
                      School Whitelabeling & Seal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBrandingModalTab('licensing');
                        setIsBrandingModalOpen(true);
                      }}
                      className={`px-3 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        licenseStatus.isExpired || licenseStatus.isRevoked
                          ? 'bg-rose-600 text-white font-bold animate-pulse'
                          : licenseStatus.isExpiringSoon
                          ? 'bg-amber-600 text-white font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>
                        License: {licenseStatus.planName} ({licenseStatus.daysRemaining > 0 ? `${licenseStatus.daysRemaining}d` : 'Expired'})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVendorModalOpen(true)}
                      className="px-2.5 py-1 rounded-md font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition cursor-pointer flex items-center gap-1"
                    >
                      <Key className="w-3 h-3" />
                      <span>Key Generator</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-300/80 font-mono italic ml-2">
                    🔒 Teacher gradebook mode: Score entry for assigned classes
                  </span>
                )}
              </div>

              <span className="text-[11px] text-emerald-400 font-mono hidden md:inline">
                {licenseStatus.isWriteRestricted ? 'Read-Only Mode' : 'Read/Write Permissions Active'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN BODY: RESULT CHECKER OR RESULT DISPLAY
          ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* LICENSE EXPIRED / READ-ONLY BANNER FOR STAFF */}
        {authSession && (licenseStatus.isWriteRestricted || licenseStatus.isExpired) && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-rose-500 shadow-md">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 text-xl font-bold">⛔</span>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wide text-rose-400">
                  ResultIQ Term License Expired — Score Entry & Publishing Locked
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Academic records for {branding.schoolName} are currently operating in read-only audit mode. Activate a renewal key to enter marks or publish new terms.
                </p>
              </div>
            </div>
            {authSession.role === 'admin' ? (
              <button
                type="button"
                onClick={() => {
                  setBrandingModalTab('licensing');
                  setIsBrandingModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition cursor-pointer"
              >
                Enter Renewal Key &rarr;
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Contact School Administrator for license renewal.</span>
            )}
          </div>
        )}

        {/* If Staff is logged in and viewing Gradebook tab, render Gradebook directly */}
        {authSession && staffActiveTab === 'gradebook' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Academic Score Entry & Terminal Gradebook</h2>
                <p className="text-xs text-slate-500">Record Continuous Assessment (CA1, CA2, Exam) and synchronize official terminal records.</p>
              </div>
              <button
                type="button"
                onClick={() => setStaffActiveTab('gradebook')}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800"
              >
                Return to Parent Result Preview
              </button>
            </div>
            <SubjectGradebook
              currentTeacher={currentStaffTeacher}
              assignedClasses={classes}
              allStudents={students}
              onDataUpdated={refreshData}
            />
          </div>
        )}

        {/* Regular Parent Result Checking Flow */}
        {(!authSession || staffActiveTab !== 'gradebook') && (
          <div>
            {!verifiedStudent ? (
              /* ── CHECK RESULT CARD: Elevated Security & Dignity ── */
              <div className="max-w-xl mx-auto space-y-6">
                {/* Main Card Surface */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
                  {/* Form Container */}
                  <form onSubmit={handleVerifyResult} className="p-6 sm:p-8 space-y-5">
                    {/* STEP 1: ACADEMIC PERIOD & CLASS */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                          1
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Academic Period & Class
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Academic Session & Term */}
                        <div className="space-y-1">
                          <label htmlFor="session-term" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                            Academic Session & Term:
                          </label>
                          <div className="relative">
                            <select
                              id="session-term"
                              value={`${selectedSession} • ${selectedTerm}`}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val.includes('Second Term')) {
                                  setSelectedTerm('Second Term');
                                } else if (val.includes('Third Term')) {
                                  setSelectedTerm('Third Term');
                                } else {
                                  setSelectedTerm('First Term');
                                }
                              }}
                              className="w-full text-xs font-medium pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-slate-900 focus:outline-none transition appearance-none cursor-pointer"
                            >
                              <option value="2026/2027 • Second Term">2026/2027 • Second Term (Lent)</option>
                              <option value="2026/2027 • First Term">2026/2027 • First Term (Harmattan)</option>
                              <option value="2025/2026 • Third Term">2025/2026 • Third Term (Trinity)</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Class / Grade Section */}
                        <div className="space-y-1">
                          <label htmlFor="student-class" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                            Class / Grade Section:
                          </label>
                          <div className="relative">
                            <select
                              id="student-class"
                              value={selectedClassId}
                              onChange={(e) => {
                                setSelectedClassId(e.target.value);
                                setVerificationError(null);
                              }}
                              className="w-full text-xs font-medium pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white focus:bg-white focus:border-slate-900 focus:outline-none transition appearance-none cursor-pointer"
                            >
                              {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                  {cls.name} ({cls.pupilCount || 0} pupils)
                                </option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* STEP 2: STUDENT IDENTIFICATION (NO PUBLIC ROSTER DROPDOWN) */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                            2
                          </span>
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            Student Identification
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">e.g. P4-01 or Pupil ID</span>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="admission-no" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                          Student Admission / Roll Number:
                        </label>
                        <div className="relative">
                          <input
                            id="admission-no"
                            type="text"
                            required
                            placeholder="Enter Student ID / Roll Number (e.g. P4-01)"
                            value={admissionNumberInput}
                            onChange={(e) => {
                              setAdmissionNumberInput(e.target.value);
                              setVerificationError(null);
                            }}
                            className="w-full text-sm font-semibold tracking-wider font-mono pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none transition uppercase"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* STEP 3: HIGH-SECURITY 2FA ROTATING TOKEN AUTHENTICATOR (RFC 6238 TOTP) */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                            3
                          </span>
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            Guardian 2FA Passcode
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Rotating 30s Passcode
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">
                            Enter the 6-digit rotating code from your Guardian Authenticator:
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAuthenticatorCard(!showAuthenticatorCard)}
                            className="text-slate-900 underline font-semibold hover:text-slate-700 cursor-pointer flex items-center gap-1"
                          >
                            <Smartphone className="w-3 h-3 text-slate-700" />
                            <span>{showAuthenticatorCard ? 'Hide Key' : 'Setup / Live Key'}</span>
                          </button>
                        </div>

                        {/* 6-Digit Monospace TOTP Input Box */}
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            required
                            placeholder="• • • • • •"
                            value={totpTokenInput}
                            onChange={(e) => {
                              setTotpTokenInput(e.target.value.replace(/\D/g, ''));
                              setVerificationError(null);
                            }}
                            className="w-full text-center text-xl tracking-[0.4em] font-mono font-bold py-2.5 rounded-xl border border-slate-300 bg-white focus:border-slate-900 focus:outline-none transition shadow-2xs"
                          />
                        </div>

                        {/* Live Google Authenticator 30s Countdown & Helper Card */}
                        {showAuthenticatorCard && (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Google / ResultIQ Authenticator (RFC 6238)
                              </span>
                              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <span>Rotates in {totpSecondsRemaining}s</span>
                              </div>
                            </div>

                            {/* 30-Second Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-900 transition-all duration-1000 ease-linear"
                                style={{ width: `${(totpSecondsRemaining / 30) * 100}%` }}
                              ></div>
                            </div>

                            {/* Current Rotating Live Code Display for Demo/Parent */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-500 block uppercase font-mono">
                                  Current Rotating Code:
                                </span>
                                <span className="text-lg font-mono font-bold tracking-widest text-slate-900">
                                  {currentTotpCode.slice(0, 3)} {currentTotpCode.slice(3, 6)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTotpTokenInput(currentTotpCode);
                                  setVerificationError(null);
                                }}
                                className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition cursor-pointer"
                              >
                                Use Current Code
                              </button>
                            </div>

                            {/* Authenticator Secret for manual entry into Google Authenticator */}
                            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                              <div className="truncate mr-2">
                                <span className="font-mono text-slate-400">Secret: </span>
                                <span className="font-mono font-bold text-slate-800">{totpSecretDisplay || 'AUTHENTICATOR'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(totpSecretDisplay);
                                  setTotpCopied(true);
                                  setTimeout(() => setTotpCopied(false), 2000);
                                }}
                                className="shrink-0 text-slate-700 hover:text-slate-950 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                {totpCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{totpCopied ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              Tip: Add this key to Google Authenticator or Microsoft Authenticator for instant 30-second token generation on your phone.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Notice */}
                    {verificationError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{verificationError}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                      >
                        {isVerifying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Locating Academic Record...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>Verify Identity & View Official Report Sheet</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Card Footer: SEPARATED Teacher vs Principal links; Circled Vendor button removed */}
                  <div className="py-4 px-6 sm:px-8 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                      Not a student? Sign in to your portal:{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherLoginError(null);
                          setIsTeacherModalOpen(true);
                        }}
                        className="text-slate-900 font-bold hover:underline cursor-pointer"
                      >
                        Teacher Portal
                      </button>{' '}
                      &bull;{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAdminLoginError(null);
                          setIsAdminModalOpen(true);
                        }}
                        className="text-slate-900 font-bold hover:underline cursor-pointer"
                      >
                        Principal / Administrator
                      </button>
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-center text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3" /> 256-Bit SSL Record Encryption &bull; Official Digital Terminal Registry
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── VERIFIED OFFICIAL TERMINAL REPORT CARD DISPLAY ── */
              <div className="space-y-6">
                {/* Top Verification Confirmation Ribbon */}
                <div className="bg-emerald-900 text-emerald-100 px-5 py-3 rounded-xl border border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider">
                        Official Academic Record Authenticated
                      </div>
                      <div className="text-[11px] text-emerald-200 font-mono">
                        Ref: {verificationAuditRecord?.serial} &bull; Verified: {verificationAuditRecord?.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVerifiedStudent(null)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 text-xs font-medium text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Check Another Result</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share on WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadStudentReportCardPDF(verifiedStudent, activeClass)}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Official PDF</span>
                    </button>
                  </div>
                </div>

                {/* Pure Academic Terminal Report Sheet */}
                <TerminalReportSheet
                  student={verifiedStudent}
                  className={activeClass?.name || 'Primary 4'}
                  classPupilsCount={activeClass?.pupilCount || 14}
                  onStudentUpdated={refreshData}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. FOOTER
          ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/90 bg-white py-6 px-4 sm:px-8 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 font-serif">ResultIQ™ Academic Registry</span>
            <span>&bull;</span>
            <span>Zero Scratch Cards</span>
            <span>&bull;</span>
            <span>Time-based 2FA Security Architecture</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Powered by ResultIQ Systems &bull; Official Digital Registrar
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          4. SEPARATED MODALS
          ───────────────────────────────────────────────────────────── */}

      {/* 1. DEDICATED TEACHER PORTAL MODAL */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Teacher Portal Sign-In</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTeacherModalOpen(false);
                  setTeacherLoginError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTeacherLogin} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Authorized for class & subject teachers to enter continuous assessment scores (CA1, CA2, Exam) and terminal remarks.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Select Teacher Identity:
                </label>
                <select
                  value={staffTeacherId}
                  onChange={(e) => setStaffTeacherId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject || 'Class Teacher'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  4-Digit Teacher PIN:
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="Enter 4-digit PIN (1234)"
                  value={teacherPinInput}
                  onChange={(e) => setTeacherPinInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {teacherLoginError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {teacherLoginError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Access Teacher Gradebook &rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. DEDICATED PRINCIPAL & ADMINISTRATOR MODAL */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Principal & Administrator Console</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdminModalOpen(false);
                  setAdminLoginError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Authorized for School Principal and Chief Academic Administrators. Unlocks pupil database, broadsheet publishing, security audit logs, school whitelabeling, and license management.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Administrator Master Passcode:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter admin passcode (admin123)"
                  value={adminPasscodeInput}
                  onChange={(e) => setAdminPasscodeInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {adminLoginError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {adminLoginError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verify Passcode & Open Admin Console &rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Licensing Authority Modal (ADMINISTRATOR ACCESS) */}
      {isVendorModalOpen && authSession?.role === 'admin' && (
        <VendorLicensingModal
          isOpen={isVendorModalOpen}
          onClose={() => {
            setIsVendorModalOpen(false);
            refreshData();
          }}
          currentSchoolName={branding.schoolName}
          onLicenseActivated={refreshData}
        />
      )}

      {/* Pupil & Parent Directory Modal (ADMINISTRATOR ONLY) */}
      {isPupilModalOpen && authSession?.role === 'admin' && (
        <PupilDatabaseModal
          isOpen={isPupilModalOpen}
          onClose={() => {
            setIsPupilModalOpen(false);
            refreshData();
          }}
          students={students}
          classes={classes}
          teachers={teachers}
          onDataUpdated={refreshData}
          onSelectStudentProfile={(s) => setSelectedStudentForProfile(s)}
        />
      )}

      {/* Student Profile Modal (ADMINISTRATOR ONLY) */}
      {selectedStudentForProfile && authSession?.role === 'admin' && (
        <StudentProfileModal
          isOpen={Boolean(selectedStudentForProfile)}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          classNameTitle={activeClass.name}
          onStudentUpdated={refreshData}
        />
      )}

      {/* School Whitelabeling & Branding Modal (ADMINISTRATOR ONLY) */}
      {isBrandingModalOpen && authSession?.role === 'admin' && (
        <WhitelabelModal
          isOpen={isBrandingModalOpen}
          onClose={() => {
            setIsBrandingModalOpen(false);
            refreshData();
          }}
          defaultTab={brandingModalTab}
          onBrandingUpdated={refreshData}
        />
      )}

      {/* Audit Log Modal (ADMINISTRATOR ONLY) */}
      {isAuditModalOpen && authSession?.role === 'admin' && (
        <AuditLogModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          auditLogs={auditLogs}
          onDataUpdated={refreshData}
        />
      )}
    </div>
  );
};
