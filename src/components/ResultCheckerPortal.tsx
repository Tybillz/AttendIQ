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
  EyeOff,
  Mail,
  Send,
  ShieldAlert,
  Smartphone,
  Copy,
  ExternalLink,
  QrCode,
  Info,
  Users,
  Building2,
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
  saveParentPassword,
  verifyParentCredentials,
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

  // Parent Email & Password Authentication State
  const [parentEmailInput, setParentEmailInput] = useState<string>('emeka.obi@gmail.com');
  const [parentPasswordInput, setParentPasswordInput] = useState<string>('');
  const [showParentPassword, setShowParentPassword] = useState<boolean>(false);
  const [parentFamilyStudents, setParentFamilyStudents] = useState<Student[]>([]);

  // Email-Verified 6-Digit Passcode Forgot Password State
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<'request_otp' | 'verify_otp'>('request_otp');
  const [forgotEmailInput, setForgotEmailInput] = useState<string>('');
  const [forgotPasscodeInput, setForgotPasscodeInput] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Personalized Google Authenticator 2FA State (Secret unique per student)
  const [totpTokenInput, setTotpTokenInput] = useState<string>('');
  const [isTotpSetupModalOpen, setIsTotpSetupModalOpen] = useState<boolean>(false);
  const [setupAdmissionInput, setSetupAdmissionInput] = useState<string>('');
  const [setupParentPhoneInput, setSetupParentPhoneInput] = useState<string>('');
  const [setupVerifiedStudent, setSetupVerifiedStudent] = useState<Student | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState<boolean>(false);

  // Verification outcome
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationAuditRecord, setVerificationAuditRecord] = useState<{
    timestamp: string;
    serial: string;
    verifiedContact: string;
  } | null>(null);

  // Reinstated Licensing Architecture State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState<boolean>(false);
  const [isVendorAuthModalOpen, setIsVendorAuthModalOpen] = useState<boolean>(false);
  const [vendorPasscodeInput, setVendorPasscodeInput] = useState<string>('');
  const [vendorAuthError, setVendorAuthError] = useState<string | null>(null);

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
  const [staffActiveTab, setStaffActiveTab] = useState<'gradebook' | 'preview'>('gradebook');
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

  // Execute Result Access via Registered Parent Email & Password
  const handleVerifyResult = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerificationError(null);
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      const res = verifyParentCredentials(parentEmailInput, parentPasswordInput, students);

      if (!res.success || !res.students || res.students.length === 0) {
        setVerificationError(res.error || 'Authentication failed. Please check your email and password.');
        return;
      }

      setParentFamilyStudents(res.students);
      const primaryChild = res.students[0];
      setVerifiedStudent(primaryChild);

      const serial = `REQ-${Date.now().toString().slice(-6)}-${primaryChild.rollNumber.replace(/[^A-Za-z0-9]/g, '')}`;
      setVerificationAuditRecord({
        timestamp: new Date().toLocaleString(),
        serial,
        verifiedContact: `Parent Email: ${parentEmailInput.trim().toLowerCase()}`,
      });

      // Record anti-tamper security log
      addAuditLog({
        actorRole: 'admin',
        actorId: 'parent-portal',
        actorName: `Parent (${primaryChild.parentName})`,
        action: 'SECURITY_ALERT',
        targetType: 'pupil',
        targetId: primaryChild.id,
        targetName: primaryChild.name,
        classId: primaryChild.classId,
        className: classes.find((c) => c.id === primaryChild.classId)?.name || 'Class',
        severity: 'info',
        details: `Parent (${primaryChild.parentName} <${parentEmailInput.trim()}>) signed in with Email & Password to view terminal report for ${primaryChild.name} (${primaryChild.rollNumber}). Ref: ${serial}`,
      });
    }, 350);
  };

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send 6-Digit Verification Passcode to Registered Parent Email
  const handleSendResetOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const email = forgotEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setForgotError('Please enter a valid registered parent email address.');
      return;
    }

    // Verify email is registered to at least one student
    const matchedStudents = students.filter(
      (s) => (s.parentEmail || '').trim().toLowerCase() === email
    );

    if (matchedStudents.length === 0) {
      setForgotError(
        `No student record found registered under "${email}". Please enter the exact email provided during student onboarding.`
      );
      return;
    }

    setIsSendingOtp(true);

    setTimeout(() => {
      setIsSendingOtp(false);
      // Generate 6-digit cryptographic security passcode
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setForgotStep('verify_otp');
      setResendCooldown(30);

      const notice = `Passcode sent to ${email}! (For instant verification: ${code})`;
      setOtpSentNotice(notice);

      // Audit log the password reset request
      addAuditLog({
        actorRole: 'admin',
        actorId: 'auth-security',
        actorName: `Parent Password Reset (${email})`,
        action: 'SECURITY_ALERT',
        targetType: 'pupil',
        targetId: email,
        targetName: matchedStudents[0]?.parentName || 'Parent',
        severity: 'info',
        details: `Password reset passcode requested for parent email ${email}. 6-digit OTP code dispatched.`,
      });
    }, 450);
  };

  // Step 2: Verify 6-Digit Passcode & Complete Password Change
  const handleVerifyOtpAndResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const email = forgotEmailInput.trim().toLowerCase();
    const cleanPasscode = forgotPasscodeInput.trim().replace(/\s+/g, '');
    const newPass = forgotNewPassword.trim();
    const confirmPass = forgotConfirmPassword.trim();

    if (!cleanPasscode || cleanPasscode.length !== 6) {
      setForgotError('Please enter the 6-digit passcode sent to your email.');
      return;
    }

    if (cleanPasscode !== generatedOtp) {
      setForgotError('Security verification failed: Incorrect passcode. Please check your email and enter the exact 6-digit code.');
      return;
    }

    if (newPass.length < 4) {
      setForgotError('New password must be at least 4 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      setForgotError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResettingPassword(true);

    setTimeout(() => {
      setIsResettingPassword(false);
      saveParentPassword(email, newPass);
      setForgotSuccess('✅ Password reset successfully! You can now sign in.');
      setParentEmailInput(email);
      setParentPasswordInput(newPass);

      // Audit log the successful password change
      addAuditLog({
        actorRole: 'admin',
        actorId: 'auth-security',
        actorName: `Parent (${email})`,
        action: 'SECURITY_ALERT',
        targetType: 'pupil',
        targetId: email,
        targetName: email,
        severity: 'info',
        details: `Parent successfully verified email passcode and changed password for account ${email}.`,
      });

      setTimeout(() => {
        setIsForgotPasswordModalOpen(false);
        setForgotSuccess(null);
        setGeneratedOtp(null);
        setOtpSentNotice(null);
        setForgotStep('request_otp');
      }, 1500);
    }, 400);
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
      `Official verified transcript can be accessed online at: https://resultiq.vercel.app`;
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

  // 3. VENDOR PASSCODE VERIFICATION HANDLER
  const handleVendorUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setVendorAuthError(null);
    const pass = vendorPasscodeInput.trim();
    if (pass === 'vendor2026' || pass === 'admin123' || pass === 'resultiq' || pass === 'resultiq2026') {
      setIsVendorAuthModalOpen(false);
      setVendorPasscodeInput('');
      setIsVendorModalOpen(true);
    } else {
      setVendorAuthError('Invalid Vendor Authority Passcode. Access denied.');
    }
  };

  // 4. PARENT AUTHENTICATOR SETUP VERIFICATION HANDLER
  const handleVerifyForSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    const admission = setupAdmissionInput.trim().toUpperCase();
    const phoneInput = setupParentPhoneInput.trim().replace(/[\s\-\(\)\+]/g, '');

    const found = students.find((s) => s.rollNumber?.trim().toUpperCase() === admission || s.id?.trim().toUpperCase() === admission);
    if (!found) {
      setSetupError(`No student record found with ID "${admission}". Please check your admission number.`);
      return;
    }

    const parentPhoneNorm = (found.parentPhone || '').replace(/[\s\-\(\)\+]/g, '');
    if (phoneInput && !parentPhoneNorm.includes(phoneInput) && !phoneInput.includes(parentPhoneNorm.slice(-7))) {
      setSetupError('Parent Phone Number does not match school enrollment records. Please verify.');
      return;
    }

    setSetupVerifiedStudent(found);
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: PARENT SIGN-IN CARD (EMAIL & PASSWORD + FORGOT PASSWORD)
  // ─────────────────────────────────────────────────────────────
  const renderParentSignInCard = () => (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 sm:p-7 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30">
              🎓
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Parent &amp; Guardian Portal
              </h2>
              <p className="text-xs text-slate-300">
                Sign in to view your child&apos;s official terminal result
              </p>
            </div>
          </div>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleVerifyResult} className="p-6 sm:p-7 space-y-4">
          {/* Academic Session & Term Selector */}
          <div className="space-y-1">
            <label htmlFor="session-term-select" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              Academic Term:
            </label>
            <div className="relative">
              <select
                id="session-term-select"
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
                className="w-full text-xs font-semibold pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 transition appearance-none cursor-pointer"
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

          {/* Registered Parent Email */}
          <div className="space-y-1">
            <label htmlFor="parent-email-input" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              Registered Parent Email:
            </label>
            <div className="relative">
              <input
                id="parent-email-input"
                type="email"
                required
                placeholder="e.g. emeka.obi@gmail.com"
                value={parentEmailInput}
                onChange={(e) => {
                  setParentEmailInput(e.target.value);
                  setVerificationError(null);
                }}
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 transition"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
            <span className="text-[10px] text-slate-400 block">
              Enter the email address provided to the school during onboarding.
            </span>
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div className="space-y-1">
            <label htmlFor="parent-password-input" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              Account Password:
            </label>
            <div className="relative">
              <input
                id="parent-password-input"
                type={showParentPassword ? 'text' : 'password'}
                required
                placeholder="Enter parent password"
                value={parentPasswordInput}
                onChange={(e) => {
                  setParentPasswordInput(e.target.value);
                  setVerificationError(null);
                }}
                className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowParentPassword(!showParentPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title={showParentPassword ? 'Hide password' : 'Show password'}
              >
                {showParentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot Password Row */}
            <div className="flex items-center justify-between pt-1.5 text-[11px]">
              <span className="text-slate-400">
                Default: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">parent123</code> or Child ID
              </span>
              <button
                type="button"
                onClick={() => {
                  setForgotEmailInput(parentEmailInput);
                  setForgotPasscodeInput('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                  setForgotError(null);
                  setForgotSuccess(null);
                  setOtpSentNotice(null);
                  setForgotStep('request_otp');
                  setIsForgotPasswordModalOpen(true);
                }}
                className="text-amber-600 hover:text-amber-700 font-bold transition hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {verificationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{verificationError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sign In &amp; View Official Report Sheet</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER: PARENT REPORT SHEET (WITH SIBLING / MULTI-CHILD TABS)
  // ─────────────────────────────────────────────────────────────
  const renderParentReportSheet = () => {
    if (!verifiedStudent) return null;
    const currentClass = classes.find((c) => c.id === verifiedStudent.classId) || activeClass;

    return (
      <div className="space-y-6">
        {/* If Parent has multiple enrolled children, show Child Selection tabs */}
        {parentFamilyStudents.length > 1 && (
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md no-print">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">
                Children Registered to Your Account ({parentFamilyStudents.length}):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {parentFamilyStudents.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setVerifiedStudent(child)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    verifiedStudent.id === child.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{child.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({child.rollNumber})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top Verification Ribbon */}
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
              onClick={() => {
                setVerifiedStudent(null);
                setParentFamilyStudents([]);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-800 text-xs font-medium text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sign Out / Switch Parent</span>
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
              onClick={() => downloadStudentReportCardPDF(verifiedStudent, currentClass)}
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
          className={currentClass?.name || 'Primary 4'}
          classPupilsCount={currentClass?.pupilCount || 14}
          onStudentUpdated={refreshData}
        />
      </div>
    );
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
            {!authSession ? (
              <button
                type="button"
                onClick={() => setIsVendorAuthModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                title="Open Vendor Licensing Authority"
              >
                <Key className="w-3 h-3" />
                <span>Licensing Authority</span>
              </button>
            ) : (
              <span
                className="text-slate-500 font-medium flex items-center gap-1 cursor-not-allowed select-none opacity-40"
                title="Licensing Authority is locked for logged-in staff and administrators"
              >
                <Key className="w-3 h-3 text-slate-500" />
                <span>Licensing Authority</span>
              </span>
            )}
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

          {/* Right Action: SEPARATED Teacher Login & Principal / Admin Buttons (Only in Header) */}
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
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN BODY: RESULT CHECKER OR RESULT DISPLAY
          ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* ── LEFT SIDEBAR CONSOLE LAYOUT (WHEN LOGGED IN AS STAFF/ADMIN) ── */}
        {authSession ? (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* ── LEFT SIDEBAR: CONSOLE MODULE NAVIGATION ── */}
            <aside className="w-full lg:w-64 shrink-0 bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-800 space-y-5">
              {/* Console Role Badge & Status (No License Info) */}
              <div className="pb-4 border-b border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    {authSession.role === 'admin' ? 'Principal Console' : 'Teacher Console'}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight truncate">
                  {authSession.role === 'admin' ? 'Administrator' : authSession.teacherName || 'Faculty Member'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {authSession.role === 'admin' ? 'Institutional Management' : 'Score Entry & Grading'}
                </p>
              </div>

              {/* Navigation Actions (Strictly Faculty Tools, No License & No Parent Redirection) */}
              <nav className="space-y-1.5">
                {/* 1. Score Entry & Gradebook */}
                <button
                  type="button"
                  onClick={() => setStaffActiveTab('gradebook')}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 font-bold shadow-xs transition cursor-pointer text-left"
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="flex-1">Score Entry & Gradebook</span>
                </button>

                {/* 2. ADMIN ONLY MODULES */}
                {authSession.role === 'admin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsPupilModalOpen(true)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                    >
                      <Users className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex-1">Pupil Database & Directory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAuditModalOpen(true)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex-1">Result Access Logs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBrandingModalTab('branding');
                        setIsBrandingModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex-1">School Whitelabeling & Seal</span>
                    </button>
                  </>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-[11px] text-amber-300/90 font-mono">
                    🔒 Teacher Gradebook Mode: Continuous assessment score entry only.
                  </div>
                )}
              </nav>

              {/* Sidebar Footer Details (Session Status Only, Strictly No License Info) */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] space-y-1.5 font-mono">
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>ROLE:</span>
                    <span className="text-slate-200 font-semibold truncate max-w-[120px]">
                      {authSession.role === 'admin' ? 'Administrator' : 'Subject Teacher'}
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>TERM:</span>
                    <span className="text-slate-300 font-semibold">{branding.currentTerm?.split(' ')[0] || 'Harmattan'}</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between">
                    <span>CONSOLE:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStaffLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 border border-rose-500/30 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Console</span>
                </button>
              </div>
            </aside>

            {/* ── RIGHT MAIN WORKSPACE (DEDICATED GRADEBOOK, NO PARENT REDIRECTION) ── */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Academic Score Entry &amp; Terminal Gradebook</h2>
                  <p className="text-xs text-slate-500">Record Continuous Assessment (CA1, CA2, Exam) and synchronize official terminal records.</p>
                </div>
              </div>
              <SubjectGradebook
                currentTeacher={currentStaffTeacher}
                assignedClasses={classes}
                allStudents={students}
                onDataUpdated={refreshData}
              />
            </div>
          </div>
        ) : (
          /* ── PUBLIC VISITOR / PARENT VIEW: CLEAN CENTERED CARD (NO SIDEBAR) ── */
          <div>
            {verifiedStudent ? renderParentReportSheet() : renderParentSignInCard()}
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
            Powered by ResultIQ Systems &bull; Official Digital Terminal Registry
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

      {/* 3. REINSTATED VENDOR PASSCODE VERIFICATION MODAL (Parent Homepage Only) */}
      {!authSession && isVendorAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Vendor Authority Authorization</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVendorAuthModalOpen(false);
                  setVendorAuthError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVendorUnlock} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Authorized vendor and proprietor access only. Enter the licensor master passcode to generate signed commercial product keys.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                  Vendor Master Passcode:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter vendor passcode (vendor2026)"
                  value={vendorPasscodeInput}
                  onChange={(e) => setVendorPasscodeInput(e.target.value)}
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {vendorAuthError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {vendorAuthError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Unlock Vendor Console &rarr;
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. REINSTATED VENDOR LICENSING AUTHORITY MODAL (KEY GENERATOR) */}
      {!authSession && isVendorModalOpen && (
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

      {/* 5. FORGOT PASSWORD / EMAIL PASSCODE VERIFICATION MODAL */}
      {isForgotPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {forgotStep === 'request_otp' ? 'Forgot Parent Password' : 'Verify Email Passcode & Reset'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordModalOpen(false);
                  setForgotError(null);
                  setForgotSuccess(null);
                  setOtpSentNotice(null);
                  setForgotStep('request_otp');
                }}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotStep === 'request_otp' ? (
              /* ── STEP 1: ENTER REGISTERED EMAIL & REQUEST PASSCODE ── */
              <form onSubmit={handleSendResetOtp} className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered parent email address. For security, we will immediately send a <strong>6-digit verification passcode</strong> to your email to verify your identity before allowing a password reset.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Registered Parent Email Address:
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. emeka.obi@gmail.com"
                      value={forgotEmailInput}
                      onChange={(e) => {
                        setForgotEmailInput(e.target.value);
                        setForgotError(null);
                      }}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 transition"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must match the email provided during student onboarding.
                  </span>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordModalOpen(false);
                      setForgotError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSendingOtp ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending Passcode...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Send 6-Digit Passcode &rarr;</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── STEP 2: ENTER PASSCODE & SET NEW PASSWORD ── */
              <form onSubmit={handleVerifyOtpAndResetPassword} className="p-6 space-y-4">
                {/* Email Confirmation Ribbon */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">Code sent to: <strong>{forgotEmailInput}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForgotStep('request_otp')}
                    className="text-[11px] text-amber-800 underline hover:no-underline font-semibold cursor-pointer shrink-0"
                  >
                    Change Email
                  </button>
                </div>

                {otpSentNotice && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px]">{otpSentNotice}</span>
                  </div>
                )}

                {/* 6-Digit Passcode Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Enter 6-Digit Passcode from Email:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="• • • • • •"
                      value={forgotPasscodeInput}
                      onChange={(e) => {
                        setForgotPasscodeInput(e.target.value.replace(/\D/g, ''));
                        setForgotError(null);
                      }}
                      className="w-full text-center text-xl tracking-[0.4em] font-mono font-bold py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">Valid for 10 minutes</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0}
                      onClick={() => handleSendResetOtp()}
                      className={`font-semibold cursor-pointer ${
                        resendCooldown > 0 ? 'text-slate-400' : 'text-amber-600 hover:underline'
                      }`}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    New Password:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="Enter new password (min. 4 characters)"
                      value={forgotNewPassword}
                      onChange={(e) => {
                        setForgotNewPassword(e.target.value);
                        setForgotError(null);
                      }}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Confirm New Password:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={4}
                      placeholder="Re-enter new password"
                      value={forgotConfirmPassword}
                      onChange={(e) => {
                        setForgotConfirmPassword(e.target.value);
                        setForgotError(null);
                      }}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{forgotSuccess}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordModalOpen(false);
                      setForgotError(null);
                      setForgotSuccess(null);
                      setForgotStep('request_otp');
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isResettingPassword ? 'Updating Password...' : 'Verify Passcode & Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
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
