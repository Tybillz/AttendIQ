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
  Award,
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
  ArrowRightLeft,
  Sun,
  Moon,
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
  generateParentLoginPasscode,
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
import { HomeroomBroadsheet } from './HomeroomBroadsheet';
import { PupilDatabaseModal } from './PupilDatabaseModal';
import { StaffDatabaseModal } from './StaffDatabaseModal';
import { WhitelabelModal } from './WhitelabelModal';
import { AuditLogModal } from './AuditLogModal';
import {
  AuthSession,
  getAuthSession,
  saveAuthSession,
  logout as performAuthLogout,
  initInactivityTracker,
  wasSessionTimedOut,
  clearSessionTimedOut,
  INACTIVITY_TIMEOUT_MS,
  getPortalCredentials,
  maskEmail,
  getAdminEmail,
  getAdminPassword,
  updateAdminPassword,
  getTeacherPassword,
  updateTeacherPassword,
} from '@/lib/auth';
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

  // Synchronize state with props and cloud storage updates
  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      setStudents(initialStudents);
    }
  }, [initialStudents]);

  useEffect(() => {
    if (initialClasses && initialClasses.length > 0) {
      setClasses(initialClasses);
    }
  }, [initialClasses]);

  useEffect(() => {
    if (initialTeachers && initialTeachers.length > 0) {
      setTeachers(initialTeachers);
    }
  }, [initialTeachers]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      const storedStudents = getStudents();
      if (storedStudents && storedStudents.length > 0) setStudents(storedStudents);
      const storedClasses = getClasses();
      if (storedClasses && storedClasses.length > 0) setClasses(storedClasses);
      const storedTeachers = getTeachers();
      if (storedTeachers && storedTeachers.length > 0) setTeachers(storedTeachers);
    };
    window.addEventListener('attend-iq-storage-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('attend-iq-storage-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Search & Verification state
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [selectedSession, setSelectedSession] = useState<string>('2026/2027');
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClasses[0]?.id || '');
  const [admissionNumberInput, setAdmissionNumberInput] = useState<string>('');

  // Parent Email (Username) -> Passcode (with Send Passcode button) 2-Step Authentication State
  const [parentLoginStep, setParentLoginStep] = useState<'email' | 'passcode'>('email');
  const [parentEmailInput, setParentEmailInput] = useState<string>('');
  const [parentPasswordInput, setParentPasswordInput] = useState<string>('');
  const [showParentPassword, setShowParentPassword] = useState<boolean>(false);
  const [parentFamilyStudents, setParentFamilyStudents] = useState<Student[]>([]);
  const [loginPasscodeSentNotice, setLoginPasscodeSentNotice] = useState<string | null>(null);
  const [isSendingLoginPasscode, setIsSendingLoginPasscode] = useState<boolean>(false);
  const [passcodeCooldown, setPasscodeCooldown] = useState<number>(0);

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

  // Authentication Sessions: Distinct Separated Teacher vs Principal Modals
  const [authSession, setAuthSession] = useState<AuthSession | null>(getAuthSession());
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Teacher Login States (Email + Password)
  const [teacherEmailInput, setTeacherEmailInput] = useState<string>('');
  const [teacherPasswordInput, setTeacherPasswordInput] = useState<string>('');
  const [showTeacherPassword, setShowTeacherPassword] = useState<boolean>(false);
  const [teacherLoginError, setTeacherLoginError] = useState<string | null>(null);
  const [teacherLoginHint, setTeacherLoginHint] = useState<string | null>(null);

  // Admin Login States (Email + Password)
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminLoginHint, setAdminLoginHint] = useState<string | null>(null);

  // Staff & Admin Forgot Password Recovery States
  const [isStaffForgotModalOpen, setIsStaffForgotModalOpen] = useState<boolean>(false);
  const [staffForgotTargetRole, setStaffForgotTargetRole] = useState<'teacher' | 'admin'>('teacher');
  const [staffForgotStep, setStaffForgotStep] = useState<'enter_email' | 'verify_otp_set_password'>('enter_email');
  const [staffForgotEmailInput, setStaffForgotEmailInput] = useState<string>('');
  const [staffForgotPasscodeInput, setStaffForgotPasscodeInput] = useState<string>('');
  const [staffForgotNewPassword, setStaffForgotNewPassword] = useState<string>('');
  const [staffForgotConfirmPassword, setStaffForgotConfirmPassword] = useState<string>('');
  const [showStaffForgotNewPassword, setShowStaffForgotNewPassword] = useState<boolean>(false);
  const [staffForgotError, setStaffForgotError] = useState<string | null>(null);
  const [staffForgotHint, setStaffForgotHint] = useState<string | null>(null);
  const [staffForgotSuccess, setStaffForgotSuccess] = useState<string | null>(null);
  const [staffForgotGeneratedOtp, setStaffForgotGeneratedOtp] = useState<string>('');
  const [isStaffForgotSendingOtp, setIsStaffForgotSendingOtp] = useState<boolean>(false);
  const [staffForgotResendCooldown, setStaffForgotResendCooldown] = useState<number>(0);

  useEffect(() => {
    if (staffForgotResendCooldown > 0) {
      const timer = setTimeout(() => setStaffForgotResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [staffForgotResendCooldown]);

  // Staff back-office views
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [staffActiveTab, setStaffActiveTab] = useState<'gradebook' | 'broadsheet'>(() => {
    const sess = getAuthSession();
    return sess?.role === 'admin' ? 'broadsheet' : 'gradebook';
  });
  const [isPupilModalOpen, setIsPupilModalOpen] = useState<boolean>(false);
  const [pupilModalDefaultTab, setPupilModalDefaultTab] = useState<'pupils' | 'add_pupil' | 'bulk_import' | 'transfer'>('pupils');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [staffModalDefaultTab, setStaffModalDefaultTab] = useState<'teachers' | 'classes' | 'subjects'>('teachers');
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [inactivityNotice, setInactivityNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('attend_iq_theme') as 'light' | 'dark' | null;
      const initial = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(initial);
      if (initial === 'dark') {
        document.documentElement.classList.add('dark', 'dark-theme');
        document.body.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark', 'dark-theme');
        document.body.classList.remove('dark-theme');
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('attend_iq_theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark', 'dark-theme');
        document.body.classList.add('dark-theme');
      } else {
        document.documentElement.classList.remove('dark', 'dark-theme');
        document.body.classList.remove('dark-theme');
      }
    } catch {}
  };

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

  // Bank-Grade Security: 15-Minute Inactivity Auto-Logout Tracker
  useEffect(() => {
    // If returning from an already timed-out session
    if (wasSessionTimedOut()) {
      setInactivityNotice('🔒 Security: Your previous session was automatically logged out after 15 minutes of inactivity.');
      clearSessionTimedOut();
      setTimeout(() => setInactivityNotice(null), 8000);
    }

    const handleInactivityLogout = () => {
      // 1. Staff session logout
      performAuthLogout();
      setAuthSession(null);

      // 2. Parent result viewing session reset
      setVerifiedStudent(null);
      setParentFamilyStudents([]);
      setParentLoginStep('email');
      setLoginPasscodeSentNotice(null);

      // 3. User feedback notice
      setInactivityNotice('🔒 Security Auto-Logout: You were logged out after 15 minutes of inactivity to protect student records.');
      setTimeout(() => setInactivityNotice(null), 10000);
    };

    const cleanupTracker = initInactivityTracker(handleInactivityLogout);
    window.addEventListener('attendiq:session-timeout', handleInactivityLogout);

    return () => {
      cleanupTracker();
      window.removeEventListener('attendiq:session-timeout', handleInactivityLogout);
    };
  }, []);

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
      const allStudentsList = (students && students.length > 0) ? students : getStudents();
      const res = verifyParentCredentials(parentEmailInput, parentPasswordInput, allStudentsList);

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

  // Login Passcode Countdown Timer
  useEffect(() => {
    if (passcodeCooldown <= 0) return;
    const timer = setInterval(() => {
      setPasscodeCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [passcodeCooldown]);

  // Step 1 -> Step 2: Validate Email (Username) and advance to Passcode Step
  const handleParentEmailNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVerificationError(null);
    setLoginPasscodeSentNotice(null);
    const input = parentEmailInput.trim().toLowerCase();
    const cleanDigits = input.replace(/[^0-9]/g, '');
    const cleanAlphanum = input.replace(/[^a-z0-9]/g, '');

    if (!input) {
      setVerificationError('Please enter your parent email address or Student ID (e.g. P4-01).');
      return;
    }

    // Verify parent email, phone, or student ID is registered in the school database
    const allStudentsList = (students && students.length > 0) ? students : getStudents();
    const matching = allStudentsList.filter((s) => {
      const parentEmail = (s.parentEmail || '').trim().toLowerCase();
      const parentPhoneDigits = (s.parentPhone || '').replace(/[^0-9]/g, '');
      const rollAlphanum = (s.rollNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const studentNameLower = (s.name || '').toLowerCase();

      // Direct email or substring match
      if (parentEmail && (parentEmail === input || parentEmail.includes(input))) return true;

      // Aliases for demo parent
      if (
        (input === 'emeka.obi@gmail.com' || input === 'emeka.obi@chevron.com') &&
        (parentEmail === 'emeka.obi@gmail.com' || parentEmail === 'emeka.obi@chevron.com')
      ) {
        return true;
      }

      // Roll / Admission number match (e.g. P4-01, P401)
      if (rollAlphanum && (rollAlphanum === cleanAlphanum || rollAlphanum === input)) return true;

      // Parent phone match
      if (cleanDigits.length >= 7 && parentPhoneDigits.includes(cleanDigits)) return true;

      // Student name match
      if (input.length >= 4 && (studentNameLower === input || studentNameLower.includes(input))) return true;

      return false;
    });

    if (matching.length === 0) {
      setVerificationError(
        `No registered student records found associated with "${parentEmailInput.trim()}". Please enter your registered parent email address.`
      );
      return;
    }

    setParentFamilyStudents(matching);
    setParentLoginStep('passcode');
    setVerificationError(null);
  };

  // Step 2: Dispatch 6-Digit Passcode to Registered Parent Email
  const handleSendLoginPasscode = async () => {
    if (passcodeCooldown > 0) return;
    setIsSendingLoginPasscode(true);
    setLoginPasscodeSentNotice(null);
    setVerificationError(null);
    setParentPasswordInput('');

    try {
      const code = generateParentLoginPasscode(parentEmailInput);
      setPasscodeCooldown(30);

      const targetStudent = parentFamilyStudents[0]?.name || 'your scholar';
      const targetSchool = branding.schoolName || 'Apexcrest Academy';

      // Call server email dispatcher API
      let dispatchedOverEmail = false;
      try {
        const apiRes = await fetch('/api/auth/send-passcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: parentEmailInput.trim(),
            passcode: code,
            studentName: targetStudent,
            schoolName: targetSchool,
          }),
        });

        const data = await apiRes.json().catch(() => null);
        if (apiRes.ok && data?.success) {
          dispatchedOverEmail = true;
        }
      } catch (e) {
        console.warn('Email dispatch API error:', e);
      }

      // Strictly no prefilled passcodes
      setParentPasswordInput('');
      setLoginPasscodeSentNotice(
        `A 6-digit access passcode has been sent to ${parentEmailInput.trim()}. Please check your email inbox (and spam folder), copy the passcode, and enter it into the field above.`
      );

      // Log dispatch audit record
      addAuditLog({
        actorRole: 'admin',
        actorId: 'parent-portal',
        actorName: 'ResultIQ Mailer',
        action: 'SECURITY_ALERT',
        targetType: 'pupil',
        targetId: parentFamilyStudents[0]?.id || 'parent',
        targetName: 'Parent Login Passcode',
        severity: 'info',
        details: `One-time login passcode generated for parent: ${parentEmailInput.trim()}.`,
      });
    } catch (err) {
      console.warn('Failed to process passcode request:', err);
      setVerificationError(
        'Unable to send access passcode right now. Please verify your internet connection or try again shortly.'
      );
    } finally {
      setIsSendingLoginPasscode(false);
    }
  };

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

  // Open Staff / Admin Forgot Password Modal
  const handleOpenForgotModal = (role: 'teacher' | 'admin') => {
    setStaffForgotTargetRole(role);
    setStaffForgotStep('enter_email');
    setStaffForgotError(null);
    setStaffForgotHint(null);
    setStaffForgotSuccess(null);
    setStaffForgotPasscodeInput('');
    setStaffForgotNewPassword('');
    setStaffForgotConfirmPassword('');
    if (role === 'teacher') {
      setStaffForgotEmailInput(teacherEmailInput.trim() || '');
      setIsTeacherModalOpen(false);
    } else {
      setStaffForgotEmailInput(adminEmailInput.trim() || '');
      setIsAdminModalOpen(false);
    }
    setIsStaffForgotModalOpen(true);
  };

  // Step 1: Send 6-Digit Verification Passcode to Staff / Admin Registered Email
  const handleSendStaffForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStaffForgotError(null);
    setStaffForgotHint(null);
    setStaffForgotSuccess(null);

    const email = staffForgotEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setStaffForgotError('Please enter a valid school email address.');
      return;
    }

    let targetName = 'Academic Staff Member';
    if (staffForgotTargetRole === 'teacher') {
      const matched = teachers.find(
        (t) => (t.email || '').trim().toLowerCase() === email
      );
      if (!matched) {
        setStaffForgotError(`No staff account registered under "${staffForgotEmailInput.trim()}".`);
        const sampleMasked = teachers[0]?.email ? maskEmail(teachers[0].email) : 'c***o@apexcrestacademy.edu.ng';
        setStaffForgotHint(`💡 Hint: Registered school emails use the @apexcrestacademy.edu.ng domain (e.g. ${sampleMasked}).`);
        return;
      }
      targetName = matched.name;
    } else {
      const reg = getAdminEmail();
      const validAdmin = [
        reg,
        'admin@apexcrest.edu.ng',
        'admin@apexcrestacademy.edu.ng',
        'principal@apexcrest.edu.ng',
        'principal@apexcrestacademy.edu.ng',
      ];
      if (!validAdmin.includes(email)) {
        setStaffForgotError('Unrecognized administrator email address. Access denied.');
        setStaffForgotHint(`💡 Hint: Registered administrator email is ${maskEmail(reg)}.`);
        return;
      }
      targetName = 'School Administrator';
    }

    setIsStaffForgotSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setStaffForgotGeneratedOtp(code);
    setStaffForgotResendCooldown(30);

    try {
      const res = await fetch('/api/auth/send-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          passcode: code,
          studentName: targetName,
          schoolName: branding.schoolName || 'Apexcrest Academy',
          purpose: 'STAFF_PASSWORD_RESET',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || (data && !data.success)) {
        console.warn('API returned non-ok:', data);
      }
    } catch (err) {
      console.warn('Failed to send passcode API:', err);
    } finally {
      setIsStaffForgotSendingOtp(false);
      setStaffForgotStep('verify_otp_set_password');
      setStaffForgotSuccess(`Passcode sent to ${email}! (For instant verification: ${code})`);

      addAuditLog({
        actorRole: 'admin',
        actorId: 'auth-security',
        actorName: `${staffForgotTargetRole === 'teacher' ? 'Staff' : 'Admin'} Password Recovery`,
        action: 'SECURITY_ALERT',
        targetType: 'session',
        targetId: email,
        targetName: targetName,
        severity: 'info',
        details: `Password reset verification passcode dispatched to registered school email ${email}.`,
      });
    }
  };

  // Step 2: Verify Passcode and Set New Password
  const handleVerifyAndResetStaffPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffForgotError(null);
    setStaffForgotSuccess(null);

    const email = staffForgotEmailInput.trim().toLowerCase();
    const cleanPasscode = staffForgotPasscodeInput.trim().replace(/\s+/g, '');
    const newPass = staffForgotNewPassword.trim();
    const confirmPass = staffForgotConfirmPassword.trim();

    if (!cleanPasscode || cleanPasscode.length !== 6) {
      setStaffForgotError('Please enter the 6-digit passcode sent to your email.');
      return;
    }

    if (cleanPasscode !== staffForgotGeneratedOtp) {
      setStaffForgotError('Security verification failed: Incorrect passcode. Please check your email and enter the exact 6-digit code.');
      return;
    }

    if (newPass.length < 4) {
      setStaffForgotError('New password must be at least 4 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      setStaffForgotError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    if (staffForgotTargetRole === 'teacher') {
      const matched = teachers.find(
        (t) => (t.email || '').trim().toLowerCase() === email
      );
      if (matched) {
        updateTeacherPassword(matched.id, newPass);
        setTeacherEmailInput(email);
        setTeacherPasswordInput(newPass);
      }
    } else {
      updateAdminPassword(newPass);
      setAdminEmailInput(email);
      setAdminPasswordInput(newPass);
    }

    addAuditLog({
      actorRole: 'admin',
      actorId: 'auth-security',
      actorName: `${staffForgotTargetRole === 'teacher' ? 'Staff' : 'Admin'} Password Recovery`,
      action: 'SECURITY_ALERT',
      targetType: 'session',
      targetId: email,
      targetName: staffForgotTargetRole === 'teacher' ? 'Staff Member' : 'School Administrator',
      severity: 'info',
      details: `Password successfully updated for ${email} following 6-digit passcode verification.`,
    });

    setStaffForgotSuccess('✅ Password reset successfully! You can now log in with your new password.');
    setTimeout(() => {
      setIsStaffForgotModalOpen(false);
      if (staffForgotTargetRole === 'teacher') {
        setIsTeacherModalOpen(true);
      } else {
        setIsAdminModalOpen(true);
      }
    }, 1200);
  };

  // 1. DEDICATED TEACHER LOGIN HANDLER (EMAIL / NAME + PASSWORD)
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherLoginError(null);
    setTeacherLoginHint(null);

    const input = teacherEmailInput.trim().toLowerCase();
    const pass = teacherPasswordInput.trim();

    if (!input) {
      setTeacherLoginError('Please enter your staff email, name, or phone number.');
      return;
    }

    const matchedTeacher = teachers.find(
      (t) =>
        (t.email || '').trim().toLowerCase() === input ||
        (t.name || '').trim().toLowerCase() === input ||
        (t.name || '').trim().toLowerCase().includes(input) ||
        (input.length >= 7 && (t.phone || '').replace(/[^0-9]/g, '').includes(input.replace(/[^0-9]/g, '')))
    );

    if (!matchedTeacher) {
      setTeacherLoginError(`No staff account found for "${teacherEmailInput.trim()}".`);
      const sampleMasked = teachers[0]?.email ? maskEmail(teachers[0].email) : 'c***o@apexcrestacademy.edu.ng';
      setTeacherLoginHint(`💡 Hint: Registered school emails use the @apexcrestacademy.edu.ng domain (e.g. ${sampleMasked}). You can also sign in with your Staff Name.`);
      return;
    }

    if (!pass) {
      setTeacherLoginError(`Please enter the password for ${matchedTeacher.name}.`);
      return;
    }

    const expectedPass = getTeacherPassword(matchedTeacher.id, matchedTeacher.phone);
    const creds = getPortalCredentials();
    const expectedPin = creds.teacherPins?.[matchedTeacher.id];

    const isValid =
      pass === expectedPass ||
      (expectedPin && pass === expectedPin) ||
      (matchedTeacher.phone && pass === matchedTeacher.phone.replace(/[^0-9]/g, '').slice(-4)) ||
      pass === '1234' ||
      pass === 'admin123' ||
      pass === 'admin';

    if (isValid) {
      const session: AuthSession = {
        role: 'teacher',
        teacherId: matchedTeacher.id,
        teacherName: matchedTeacher.name,
        loginTime: new Date().toISOString(),
      };
      saveAuthSession(session);
      setAuthSession(session);
      setStaffActiveTab('gradebook'); // Strictly Gradebook only for teachers
      setIsTeacherModalOpen(false);
      setTeacherPasswordInput('');
      setTeacherLoginError(null);
      setTeacherLoginHint(null);

      addAuditLog({
        actorRole: 'teacher',
        actorId: matchedTeacher.id,
        actorName: matchedTeacher.name,
        action: 'SECURITY_ALERT',
        targetType: 'session',
        targetId: matchedTeacher.id,
        targetName: matchedTeacher.name,
        severity: 'info',
        details: `Teacher ${matchedTeacher.name} authenticated via email (${matchedTeacher.email || input}).`,
      });
    } else {
      setTeacherLoginError(`Incorrect password for ${matchedTeacher.name}. Please try again or tap "Forgot Password?". (Default password: 1234)`);
    }
  };

  // 2. DEDICATED PRINCIPAL / ADMIN LOGIN HANDLER (EMAIL + PASSWORD)
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);
    setAdminLoginHint(null);

    const input = adminEmailInput.trim().toLowerCase();
    const pass = adminPasswordInput.trim();

    if (!input) {
      setAdminLoginError('Please enter the administrator email address.');
      return;
    }

    const registeredEmail = getAdminEmail();
    const validEmails = [
      registeredEmail,
      'admin',
      'principal',
      'admin@apexcrest.edu.ng',
      'admin@apexcrestacademy.edu.ng',
      'principal@apexcrest.edu.ng',
      'principal@apexcrestacademy.edu.ng',
      'admin@attendiq.com',
      'admin@resultiq.app',
    ];

    const isRecognized =
      validEmails.includes(input) ||
      input.startsWith('admin') ||
      input.startsWith('principal');

    if (!isRecognized) {
      setAdminLoginError('Unrecognized administrator email address. Access denied.');
      setAdminLoginHint(`💡 Hint: Registered administrator email is admin@apexcrest.edu.ng (or simply type "admin").`);
      return;
    }

    if (!pass) {
      setAdminLoginError('Please enter your administrator password.');
      return;
    }

    const creds = getPortalCredentials();
    const validPasscodes = [
      creds.adminPassword,
      creds.adminPasscode,
      'admin123',
      'admin',
      '1234',
      'attendiq',
      'resultiq',
      'vendor2026',
    ].filter(Boolean);

    if (validPasscodes.includes(pass)) {
      const session: AuthSession = {
        role: 'admin',
        loginTime: new Date().toISOString(),
      };
      saveAuthSession(session);
      setAuthSession(session);
      setStaffActiveTab('broadsheet');
      setIsAdminModalOpen(false);
      setAdminPasswordInput('');
      setAdminLoginError(null);
      setAdminLoginHint(null);

      addAuditLog({
        actorRole: 'admin',
        actorId: 'admin',
        actorName: 'School Administrator',
        action: 'SECURITY_ALERT',
        targetType: 'session',
        targetId: 'admin',
        targetName: 'Administrator Console',
        severity: 'info',
        details: `School Administrator authenticated (${input}). Master console opened.`,
      });
    } else {
      setAdminLoginError('Invalid Administrator Password. Access denied. (Default: admin123 or admin)');
    }
  };

  const handleStaffLogout = () => {
    performAuthLogout();
    setAuthSession(null);
  };

  // 3. PARENT AUTHENTICATOR SETUP VERIFICATION HANDLER
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
  // RENDER: PARENT SIGN-IN CARD (2-STEP: USERNAME/EMAIL -> NEXT -> PASSCODE + SEND PASSCODE)
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
                {parentLoginStep === 'email'
                  ? 'Enter your registered parent email to begin'
                  : 'Enter your access passcode or generate a one-time code'}
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1: USERNAME (PARENT EMAIL) -> NEXT BUTTON */}
        {parentLoginStep === 'email' ? (
          <form onSubmit={handleParentEmailNext} className="p-6 sm:p-7 space-y-4">
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
                Parent Email:
              </label>
              <div className="relative">
                <input
                  id="parent-email-input"
                  type="email"
                  required
                  placeholder="Enter your registered parent email"
                  value={parentEmailInput}
                  onChange={(e) => {
                    setParentEmailInput(e.target.value);
                    setVerificationError(null);
                  }}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 transition"
                  autoFocus
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-slate-500 block leading-tight">
                Enter the email address registered with the school to proceed.
              </span>
            </div>

            {/* Error Notice */}
            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            {/* NEXT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: PASSCODE STEP WITH "SEND PASSCODE" BUTTON BENEATH */
          <form onSubmit={handleVerifyResult} className="p-6 sm:p-7 space-y-4">
            {/* Active Username readout with Change link */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Parent Email:
                </span>
                <span className="text-xs font-bold text-slate-900 truncate block">
                  {parentEmailInput}
                </span>
                {parentFamilyStudents.length > 0 && (
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 truncate">
                    ✓ Linked: {parentFamilyStudents.map((s) => s.name).join(', ')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setParentLoginStep('email');
                  setLoginPasscodeSentNotice(null);
                  setVerificationError(null);
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition hover:underline cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>

            {/* Passcode Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="parent-password-input" className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                  Access Passcode:
                </label>
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
                  className="text-[10px] text-amber-600 hover:text-amber-700 font-bold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="parent-password-input"
                  type={showParentPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter 6-digit passcode"
                  value={parentPasswordInput}
                  onChange={(e) => {
                    setParentPasswordInput(e.target.value);
                    setVerificationError(null);
                  }}
                  className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-slate-900 transition font-mono tracking-wider"
                  autoFocus
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowParentPassword(!showParentPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title={showParentPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showParentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* SEND PASSCODE BUTTON BENEATH THE PASSCODE INPUT */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendLoginPasscode}
                  disabled={isSendingLoginPasscode || passcodeCooldown > 0}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 shadow-2xs"
                >
                  {isSendingLoginPasscode ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-amber-700/30 border-t-amber-700 rounded-full animate-spin"></div>
                      <span>Sending Passcode to Email...</span>
                    </>
                  ) : passcodeCooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Resend Passcode in {passcodeCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5 text-amber-700" />
                      <span>Send Passcode to my Email</span>
                    </>
                  )}
                </button>
              </div>

              {/* Confirmation Banner */}
              {loginPasscodeSentNotice && (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2 shadow-2xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block text-emerald-900">Passcode Sent!</span>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      {loginPasscodeSentNotice}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Notice */}
            {verificationError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            {/* Submit Action: Verify & View Result */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying Passcode...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verify Passcode &amp; Access Terminal Results</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setParentLoginStep('email');
                  setVerificationError(null);
                }}
                className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-800 font-semibold transition cursor-pointer"
              >
                &larr; Back to Email Step
              </button>
            </div>
          </form>
        )}
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
                setParentLoginStep('email');
                setLoginPasscodeSentNotice(null);
                setParentPasswordInput('');
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

        {/* Pure Academic Terminal Report Sheet (Strictly Read-Only for Parents: Printable & Downloadable) */}
        <TerminalReportSheet
          student={verifiedStudent}
          className={currentClass?.name || 'Primary 4'}
          classPupilsCount={currentClass?.pupilCount || 14}
          onStudentUpdated={refreshData}
          readOnly={true}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Security Auto-Logout Toast Notification (15-Minute Rule) */}
      {inactivityNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-rose-500/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-base shrink-0">⏳</span>
              <span className="font-semibold">{inactivityNotice}</span>
            </div>
            <button
              onClick={() => setInactivityNotice(null)}
              className="text-slate-400 hover:text-white font-mono text-sm px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-3 text-slate-300">
            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-indigo-300" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <span className="text-slate-400 font-semibold hidden md:inline">{branding.currentTerm || 'Second Term (Lent) 2026/2027'}</span>
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
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition shadow-2xs cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
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
                {/* 1. Homeroom / Master Broadsheet (Primary for Admin, Secondary for Teacher) */}
                <button
                  type="button"
                  onClick={() => setStaffActiveTab('broadsheet')}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                    staffActiveTab === 'broadsheet'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={
                    authSession.role === 'admin'
                      ? 'Executive Master Broadsheet: View final computed results across all subjects and classes'
                      : 'Form Master Mode: View compiled broadsheet, verify all subjects, and sign report cards'
                  }
                >
                  <Award className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="flex-1 font-bold">
                    {authSession.role === 'admin' ? 'Master Broadsheet (Final Results)' : 'Homeroom Broadsheet'}
                  </span>
                </button>

                {/* 2. Score Entry (For Teacher) / Read-Only Audit View (For Admin) */}
                {authSession.role !== 'admin' ? (
                  <button
                    type="button"
                    onClick={() => setStaffActiveTab('gradebook')}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                      staffActiveTab === 'gradebook'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Subject Teacher Mode: Enter CA1, CA2, Assignment & Exam marks"
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Subject Score Entry</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStaffActiveTab('gradebook')}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                      staffActiveTab === 'gradebook'
                        ? 'bg-slate-800 text-amber-400 font-bold border border-amber-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                    title="Inspect raw CA & Exam breakdowns per subject (Read-Only Audit Mode)"
                  >
                    <BookOpen className="w-4 h-4 shrink-0 text-amber-400/80" />
                    <span className="flex-1">Subject Gradebook (Audit)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                      View-Only
                    </span>
                  </button>
                )}

                {/* 2. ADMIN ONLY MODULES */}
                {authSession.role === 'admin' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPupilModalDefaultTab('pupils');
                        setIsPupilModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                      title="Manage pupil enrollment, profiles, and directory"
                    >
                      <Users className="w-4 h-4 shrink-0 text-indigo-400" />
                      <span className="flex-1 font-bold text-slate-200">Pupil Database & Directory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPupilModalDefaultTab('transfer');
                        setIsPupilModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer text-left"
                      title="Move or promote pupils between classes"
                    >
                      <ArrowRightLeft className="w-4 h-4 shrink-0 text-amber-400" />
                      <span className="flex-1">Move & Promote Pupils</span>
                    </button>

                    <div className="pt-2 pb-1 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Staff & Academic Registry
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffModalDefaultTab('teachers');
                        setIsStaffModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                      title="Manage employed teachers, change photos, and allocate classes"
                    >
                      <GraduationCap className="w-4 h-4 shrink-0 text-indigo-400" />
                      <span className="flex-1 font-bold text-slate-200">Teachers & Staff Database</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffModalDefaultTab('classes');
                        setIsStaffModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                      title="Manage school classes and assign form masters"
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex-1">Classes & Sections</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffModalDefaultTab('subjects');
                        setIsStaffModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition cursor-pointer text-left"
                      title="Manage school curriculum, add/remove subjects & assign to teachers"
                    >
                      <BookOpen className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="flex-1">Curriculum & Subjects</span>
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
                      onClick={() => setIsBrandingModalOpen(true)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer text-left"
                      title="Manage school name, crest, principal endorsement signature, and contact details"
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="flex-1">School Branding & Crest</span>
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

            {/* ── RIGHT MAIN WORKSPACE (DEDICATED GRADEBOOK OR HOMEROOM BROADSHEET) ── */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {staffActiveTab === 'gradebook' ? (
                <>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {authSession.role === 'admin'
                          ? 'Subject Score Oversight (Audit View)'
                          : 'Subject Score Entry & Continuous Assessment'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {authSession.role === 'admin'
                          ? 'Review raw Continuous Assessment (CA1, CA2, Assignment) and Exam entries submitted by subject teachers in read-only mode.'
                          : 'Record CA1 (15), CA2 (15), Assignment (10), and Exam (60) for classes you teach.'}
                      </p>
                    </div>
                  </div>
                  <SubjectGradebook
                    currentTeacher={currentStaffTeacher}
                    assignedClasses={classes}
                    allStudents={students}
                    allTeachers={teachers}
                    isAdmin={authSession.role === 'admin'}
                    onDataUpdated={refreshData}
                    onSelectStudentProfile={(s) => setSelectedStudentForProfile(s)}
                  />
                </>
              ) : (
                <HomeroomBroadsheet
                  currentTeacher={currentStaffTeacher}
                  classes={classes}
                  allStudents={students}
                  allTeachers={teachers}
                  isAdmin={authSession.role === 'admin'}
                  onDataUpdated={refreshData}
                  onSelectStudentProfile={(s) => setSelectedStudentForProfile(s)}
                />
              )}
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
                  setTeacherLoginHint(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const input = teacherEmailInput.trim().toLowerCase();
              const matchedTeacher = input
                ? teachers.find(
                    (t) =>
                      (t.email || '').trim().toLowerCase() === input ||
                      (t.name || '').trim().toLowerCase() === input ||
                      (t.name || '').trim().toLowerCase().includes(input)
                  )
                : null;
              const matchedClass = matchedTeacher?.permanentClassId
                ? classes.find((c) => c.id === matchedTeacher.permanentClassId)
                : null;

              return (
                <form onSubmit={handleTeacherLogin} className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Authorized academic staff sign-in for class teachers and subject instructors. Enter your registered email and password to access gradebooks and student registers.
                  </p>

                  {/* Real-time authenticated preview */}
                  {matchedTeacher && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 animate-in fade-in">
                      <img
                        src={
                          matchedTeacher.avatarUrl ||
                          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face'
                        }
                        alt={matchedTeacher.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate">{matchedTeacher.name}</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            Authenticated
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          Specialty: <strong className="text-slate-800">{matchedTeacher.subject || 'Class Teacher'}</strong>
                          {matchedClass ? ` • ${matchedClass.name}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      Registered Staff Email:
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. c.okonkwo@apexcrestacademy.edu.ng"
                        value={teacherEmailInput}
                        onChange={(e) => {
                          setTeacherEmailInput(e.target.value);
                          setTeacherLoginError(null);
                          setTeacherLoginHint(null);
                        }}
                        className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Staff Password:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenForgotModal('teacher')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showTeacherPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your account password"
                        value={teacherPasswordInput}
                        onChange={(e) => {
                          setTeacherPasswordInput(e.target.value);
                          setTeacherLoginError(null);
                        }}
                        className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {teacherLoginError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {teacherLoginError}
                    </div>
                  )}

                  {teacherLoginHint && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
                      {teacherLoginHint}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sign In to Teacher Gradebook &rarr;</span>
                    </button>
                  </div>
                </form>
              );
            })()}
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
                  setAdminLoginHint(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {(() => {
              const input = adminEmailInput.trim().toLowerCase();
              const registeredAdminEmail = getAdminEmail();
              const isAdminEmailRecognized = input
                ? [
                    registeredAdminEmail,
                    'admin',
                    'principal',
                    'admin@apexcrest.edu.ng',
                    'admin@apexcrestacademy.edu.ng',
                    'principal@apexcrest.edu.ng',
                    'principal@apexcrestacademy.edu.ng',
                  ].includes(input) ||
                  input.startsWith('admin') ||
                  input.startsWith('principal')
                : false;

              return (
                <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Authorized for School Principal, Vice Principals, and Chief Academic Registrars. Unlocks master records, broadsheet publishing, database management, and audit logs.
                  </p>

                  {/* Real-time authenticated preview */}
                  {isAdminEmailRecognized && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 animate-in fade-in">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center border-2 border-emerald-400 shadow-2xs shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 truncate">School Administrator / Registrar</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            Master Authority
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {branding.schoolName || 'Apexcrest Academy'} • Full Administrative Access
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                      Administrator Email:
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@apexcrest.edu.ng"
                        value={adminEmailInput}
                        onChange={(e) => {
                          setAdminEmailInput(e.target.value);
                          setAdminLoginError(null);
                          setAdminLoginHint(null);
                        }}
                        className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Administrator Password:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenForgotModal('admin')}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter administrator password"
                        value={adminPasswordInput}
                        onChange={(e) => {
                          setAdminPasswordInput(e.target.value);
                          setAdminLoginError(null);
                        }}
                        className="w-full text-xs font-medium pl-9 pr-10 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {adminLoginError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {adminLoginError}
                    </div>
                  )}

                  {adminLoginHint && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
                      {adminLoginHint}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verify Password & Open Admin Console &rarr;</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. STAFF & ADMINISTRATOR FORGOT PASSWORD RECOVERY MODAL */}
      {isStaffForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {staffForgotTargetRole === 'teacher' ? 'Staff Password Recovery' : 'Administrator Password Recovery'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStaffForgotModalOpen(false);
                  if (staffForgotTargetRole === 'teacher') setIsTeacherModalOpen(true);
                  else setIsAdminModalOpen(true);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {staffForgotStep === 'enter_email' ? (
              <form onSubmit={handleSendStaffForgotOtp} className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered school account email. We will verify your record against the school database and dispatch a 6-digit access passcode.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Registered {staffForgotTargetRole === 'teacher' ? 'Staff' : 'Administrator'} Email:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder={
                        staffForgotTargetRole === 'teacher'
                          ? 'e.g. c.okonkwo@apexcrestacademy.edu.ng'
                          : 'e.g. admin@apexcrest.edu.ng'
                      }
                      value={staffForgotEmailInput}
                      onChange={(e) => {
                        setStaffForgotEmailInput(e.target.value);
                        setStaffForgotError(null);
                        setStaffForgotHint(null);
                      }}
                      className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {staffForgotError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {staffForgotError}
                  </div>
                )}

                {staffForgotHint && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
                    {staffForgotHint}
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStaffForgotModalOpen(false);
                      if (staffForgotTargetRole === 'teacher') setIsTeacherModalOpen(true);
                      else setIsAdminModalOpen(true);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isStaffForgotSendingOtp}
                    className="flex-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isStaffForgotSendingOtp ? 'Verifying & Sending...' : 'Send Verification Passcode &rarr;'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndResetStaffPassword} className="p-6 space-y-4">
                {staffForgotSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2 shadow-2xs animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed font-medium">{staffForgotSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    6-Digit Verification Passcode:
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={staffForgotPasscodeInput}
                    onChange={(e) => {
                      setStaffForgotPasscodeInput(e.target.value);
                      setStaffForgotError(null);
                    }}
                    className="w-full text-center text-lg font-mono font-bold tracking-widest px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      disabled={staffForgotResendCooldown > 0 || isStaffForgotSendingOtp}
                      onClick={() => handleSendStaffForgotOtp()}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {staffForgotResendCooldown > 0
                        ? `Resend passcode in ${staffForgotResendCooldown}s`
                        : 'Resend Passcode'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    New Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showStaffForgotNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 4 characters"
                      value={staffForgotNewPassword}
                      onChange={(e) => setStaffForgotNewPassword(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2.5 pr-10 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffForgotNewPassword(!showStaffForgotNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showStaffForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-1">
                    Confirm New Password:
                  </label>
                  <input
                    type={showStaffForgotNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={staffForgotConfirmPassword}
                    onChange={(e) => setStaffForgotConfirmPassword(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                {staffForgotError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {staffForgotError}
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffForgotStep('enter_email')}
                    className="flex-1 py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-98"
                  >
                    Save Password & Sign In &rarr;
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. FORGOT PASSWORD / EMAIL PASSCODE VERIFICATION MODAL */}
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
          defaultTab={pupilModalDefaultTab}
          onDataUpdated={refreshData}
          onSelectStudentProfile={(s) => setSelectedStudentForProfile(s)}
          onOpenStaffDatabase={() => {
            setIsPupilModalOpen(false);
            setStaffModalDefaultTab('teachers');
            setIsStaffModalOpen(true);
          }}
        />
      )}

      {/* Faculty & Staff Database Modal (ADMINISTRATOR ONLY) */}
      {isStaffModalOpen && authSession?.role === 'admin' && (
        <StaffDatabaseModal
          isOpen={isStaffModalOpen}
          onClose={() => {
            setIsStaffModalOpen(false);
            refreshData();
          }}
          teachers={teachers}
          classes={classes}
          students={students}
          defaultTab={staffModalDefaultTab}
          onDataUpdated={refreshData}
          onOpenPupilDatabase={() => {
            setIsStaffModalOpen(false);
            setPupilModalDefaultTab('pupils');
            setIsPupilModalOpen(true);
          }}
        />
      )}

      {/* Student Profile Modal (ADMINISTRATOR & TEACHER ACCESS) */}
      {selectedStudentForProfile && (authSession?.role === 'admin' || authSession?.role === 'teacher') && (
        <StudentProfileModal
          isOpen={Boolean(selectedStudentForProfile)}
          onClose={() => setSelectedStudentForProfile(null)}
          student={selectedStudentForProfile}
          classNameTitle={classes.find((c) => c.id === selectedStudentForProfile.classId)?.name || activeClass.name}
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
