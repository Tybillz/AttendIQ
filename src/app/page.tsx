'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, BookOpen, Users, FolderOpen, Lock, ShieldAlert, Sparkles, FileQuestion, Bell } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { TeacherRollCall } from '@/components/TeacherRollCall';
import { TeacherClockCard } from '@/components/TeacherClockCard';
import { SubjectGradebook } from '@/components/SubjectGradebook';
import { AdminDashboard } from '@/components/AdminDashboard';
import { GateCheckIn } from '@/components/GateCheckIn';
import { TeacherCommunicationCenter } from '@/components/TeacherCommunicationCenter';
import { AuthScreen } from '@/components/AuthScreen';
import { getAuthSession, logout as performLogout, AuthSession, syncCredentialsFromCloud, initInactivityTracker, loginAsAdmin, saveAuthSession } from '@/lib/auth';
import { getTeacherRecordForDate, isRemoteAcademicAllowed, getPerimeterConfig, syncPerimeterConfigFromCloud } from '@/lib/teacherAttendance';
import { StudentProfileModal } from '@/components/StudentProfileModal';
import { AlertSettingsModal } from '@/components/AlertSettingsModal';
import { ParentAlertsModal } from '@/components/ParentAlertsModal';
import { PupilDatabaseModal } from '@/components/PupilDatabaseModal';
import {
  getStudents,
  getClasses,
  getTeachers,
  getAttendanceSessions,
  getParentAlerts,
  getAlertSettings,
  getTeacherAnalytics,
  recordAttendanceEntry,
  getAuditLogs,
  syncDataFromCloud,
  getStaffQueries,
  getStaffAnnouncements,
} from '@/lib/storage';
import { AuditLogModal } from '@/components/AuditLogModal';
import { DisasterRecoveryModal } from '@/components/DisasterRecoveryModal';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_PARENT_ALERTS,
  INITIAL_ALERT_SETTINGS,
  INITIAL_TEACHER_ANALYTICS,
} from '@/lib/initialData';
import { WhitelabelModal } from '@/components/WhitelabelModal';
import {
  getSchoolBranding,
  getLicenseStatus,
  SchoolBranding,
  LicenseStatusResult,
  DEFAULT_SCHOOL_BRANDING,
} from '@/lib/licensing';
import {
  Student,
  ClassSection,
  Teacher,
  AttendanceSession,
  ParentAlert,
  AlertSettings,
  TeacherAnalytics,
  AttendanceStatus,
  AuditLogEntry,
  StaffQuery,
  StaffAnnouncement,
} from '@/types/attendance';

export default function Home() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [currentRole, setCurrentRole] = useState<'teacher' | 'gate' | 'admin'>('teacher');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new Date().toISOString().split('T')[0];
    }
    return '2026-10-22';
  });

  // Initialize with initial data immediately so there is never a blank screen
  const [classes, setClasses] = useState<ClassSection[]>(INITIAL_CLASSES);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [currentTeacherId, setCurrentTeacherId] = useState<string>(
    INITIAL_TEACHERS.find((t) => t.name.includes('Danladi'))?.id || INITIAL_TEACHERS[0].id
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(INITIAL_CLASSES[0].id);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [alerts, setAlerts] = useState<ParentAlert[]>(INITIAL_PARENT_ALERTS);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(INITIAL_ALERT_SETTINGS);
  const [teacherAnalytics, setTeacherAnalytics] = useState<TeacherAnalytics[]>(INITIAL_TEACHER_ANALYTICS);
  const [teacherActiveTab, setTeacherActiveTab] = useState<
    'attendance' | 'dossiers' | 'gradebook' | 'queries' | 'announcements'
  >('attendance');
  const [queries, setQueries] = useState<StaffQuery[]>([]);
  const [announcements, setAnnouncements] = useState<StaffAnnouncement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isTeacherClockedIn, setIsTeacherClockedIn] = useState<boolean>(false);
  const [perimeterConfig, setPerimeterConfig] = useState(getPerimeterConfig());

  const checkTeacherClockStatus = useCallback(() => {
    if (typeof window === 'undefined') return;
    const realToday = new Date().toISOString().split('T')[0];
    const rec = getTeacherRecordForDate(currentTeacherId, realToday);
    setIsTeacherClockedIn(Boolean(rec && rec.clockInTime));
    setPerimeterConfig(getPerimeterConfig());
  }, [currentTeacherId]);

  useEffect(() => {
    checkTeacherClockStatus();
    const handleClockUpdate = () => checkTeacherClockStatus();
    const handlePerimeterUpdate = () => setPerimeterConfig(getPerimeterConfig());
    window.addEventListener('attend-iq-teacher-clock-update', handleClockUpdate);
    window.addEventListener('attend-iq-perimeter-update', handlePerimeterUpdate);
    return () => {
      window.removeEventListener('attend-iq-teacher-clock-update', handleClockUpdate);
      window.removeEventListener('attend-iq-perimeter-update', handlePerimeterUpdate);
    };
  }, [checkTeacherClockStatus]);

  const isRemoteAllowed = isRemoteAcademicAllowed(currentTeacherId, perimeterConfig);
  const canAccessAcademics = isTeacherClockedIn || isRemoteAllowed;

  // RESTRICTION: If staff is unable to clock in AND remote access is not authorized, protect dossiers and gradebook only
  useEffect(() => {
    if (
      currentRole === 'teacher' &&
      !canAccessAcademics &&
      (teacherActiveTab === 'dossiers' || teacherActiveTab === 'gradebook')
    ) {
      setTeacherActiveTab('attendance');
    }
  }, [currentRole, canAccessAcademics, teacherActiveTab]);

  // Modals state
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isWhitelabelModalOpen, setIsWhitelabelModalOpen] = useState(false);
  const [whitelabelModalTab, setWhitelabelModalTab] = useState<'branding' | 'licensing'>('branding');
  const [databaseModalTab, setDatabaseModalTab] = useState<'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers'>('pupils');
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(DEFAULT_SCHOOL_BRANDING);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResult>(getLicenseStatus());

  // Sync from storage (hydrates any saved local edits)
  const syncData = useCallback(() => {
    try {
      const loadedClasses = getClasses();
      if (loadedClasses && loadedClasses.length > 0) {
        setClasses(loadedClasses);
      }
      const loadedStudents = getStudents();
      setStudents(loadedStudents);
      setSelectedStudentForProfile((prev) => {
        if (!prev) return null;
        const fresh = loadedStudents.find((s) => s.id === prev.id);
        return fresh || prev;
      });
      setTeachers(getTeachers());
      setSessions(getAttendanceSessions());
      setAlerts(getParentAlerts());
      setAlertSettings(getAlertSettings());
      setTeacherAnalytics(getTeacherAnalytics());
      setAuditLogs(getAuditLogs());
      setQueries(getStaffQueries());
      setAnnouncements(getStaffAnnouncements());
    } catch (e) {
      console.warn('Storage sync fallback to initial dataset:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);

      const activeSession = getAuthSession();
      if (activeSession) {
        setAuthSession(activeSession);
        setCurrentRole(activeSession.role);
        if (activeSession.teacherId) {
          setCurrentTeacherId(activeSession.teacherId);
        }
      }
    } catch {}

    syncData();
    syncDataFromCloud().then(() => {
      syncData();
    });
    syncCredentialsFromCloud();
    syncPerimeterConfigFromCloud();

    const handleBranding = () => {
      setSchoolBranding(getSchoolBranding());
      setLicenseStatus(getLicenseStatus());
    };
    const handleLicense = () => {
      setLicenseStatus(getLicenseStatus());
    };
    setSchoolBranding(getSchoolBranding());
    setLicenseStatus(getLicenseStatus());
    window.addEventListener('attendiq:branding-updated', handleBranding);
    window.addEventListener('attendiq:license-updated', handleLicense);

    const handleStorageUpdate = () => {
      syncData();
      const activeSession = getAuthSession();
      if (activeSession) {
        setAuthSession(activeSession);
        setCurrentRole(activeSession.role);
        if (activeSession.teacherId) {
          setCurrentTeacherId(activeSession.teacherId);
        }
      } else {
        setAuthSession(null);
      }
    };

    // Automatic 30-minute inactivity auto-logout tracker
    const cleanupInactivity = initInactivityTracker(() => {
      setAuthSession(null);
    });

    const handleOpenAuditModal = () => setIsAuditModalOpen(true);
    const handleOpenRecoveryModal = () => setIsRecoveryModalOpen(true);
    window.addEventListener('attendiq:open-audit-modal', handleOpenAuditModal);
    window.addEventListener('attendiq:open-recovery-modal', handleOpenRecoveryModal);

    window.addEventListener('attend-iq-storage-update', handleStorageUpdate);
    window.addEventListener('attend-iq-auth-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      cleanupInactivity();
      window.removeEventListener('attend-iq-storage-update', handleStorageUpdate);
      window.removeEventListener('attend-iq-auth-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('attendiq:branding-updated', handleBranding);
      window.removeEventListener('attendiq:license-updated', handleLicense);
      window.removeEventListener('attendiq:open-audit-modal', handleOpenAuditModal);
      window.removeEventListener('attendiq:open-recovery-modal', handleOpenRecoveryModal);
    };
  }, [syncData]);

  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    setCurrentRole(session.role);
    if (session.teacherId) {
      setCurrentTeacherId(session.teacherId);
    }
  };

  const handleLogout = () => {
    performLogout();
    setAuthSession(null);
  };

  // Administrator authorized switch to Staff Console (Teacher View)
  const handleAdminSwitchToTeacher = (teacherId?: string) => {
    const targetTeacher = teachers.find((t) => t.id === teacherId) || activeTeacher || teachers[0];
    const session: AuthSession = {
      role: 'teacher',
      teacherId: targetTeacher.id,
      teacherName: targetTeacher.name,
      loginTime: new Date().toISOString(),
    };
    saveAuthSession(session);
    setAuthSession(session);
    setCurrentRole('teacher');
    setCurrentTeacherId(targetTeacher.id);
  };

  // Administrator authorized switch to Gate Security Post
  const handleAdminSwitchToGate = () => {
    const session: AuthSession = {
      role: 'gate',
      loginTime: new Date().toISOString(),
    };
    saveAuthSession(session);
    setAuthSession(session);
    setCurrentRole('gate');
  };

  // Protected Switch back to Admin Console (Strictly requires Master Passcode)
  const handleSwitchToAdmin = (passcode: string): { success: boolean; message: string } => {
    const res = loginAsAdmin(passcode);
    if (res.success && res.session) {
      setAuthSession(res.session);
      setCurrentRole('admin');
      return { success: true, message: 'Principal & School Management access granted.' };
    }
    return { success: false, message: res.message || 'Incorrect Management Passcode.' };
  };

  // STRICT CLASS ACCESS RESTRICTION:
  // When in teacher mode, the teacher can ONLY see and access their assigned classroom section(s).
  // When in management/admin mode, management has full access to the whole school.
  const activeTeacher = teachers.find((t) => t.id === currentTeacherId) || teachers[0];
  const teacherAssignedClasses = classes.filter(
    (c) => c.teacherId === currentTeacherId || activeTeacher?.assignedClassIds?.includes(c.id)
  );

  const accessibleClasses = currentRole === 'teacher' ? teacherAssignedClasses : classes;

  useEffect(() => {
    if (currentRole === 'teacher' && teacherAssignedClasses.length > 0) {
      const exists = teacherAssignedClasses.some((c) => c.id === selectedClassId);
      if (!exists) {
        setSelectedClassId(teacherAssignedClasses[0].id);
      }
    }
  }, [currentRole, currentTeacherId, teacherAssignedClasses, selectedClassId]);

  const currentClass = accessibleClasses.find((c) => c.id === selectedClassId) || accessibleClasses[0];
  const currentSession = sessions.find(
    (s) => s.date === selectedDate && s.classId === selectedClassId
  );
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  const teacherPendingQueries = queries.filter(
    (q) => q.teacherId === activeTeacher?.id && q.status === 'pending_reply'
  );
  const teacherUnreadAnnouncements = announcements.filter(
    (a) => !a.acknowledgedByTeacherIds?.includes(activeTeacher?.id || '')
  );

  const isLicenseLocked =
    licenseStatus.isWriteRestricted ||
    licenseStatus.isExpired ||
    licenseStatus.isRevoked === true ||
    licenseStatus.status === 'revoked' ||
    licenseStatus.status === 'expired' ||
    licenseStatus.status === 'unlicensed' ||
    licenseStatus.status === 'name_mismatch' ||
    !licenseStatus.isValid;

  // Render AuthScreen if unauthenticated
  if (!authSession) {
    return (
      <AuthScreen
        teachers={teachers}
        classes={classes}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen app-main-layout flex flex-col relative">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        alertCount={alerts.length}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenDatabaseModal={(tab) => {
          if (tab) setDatabaseModalTab(tab);
          setIsDatabaseModalOpen(true);
        }}
        alertSettings={alertSettings}
        teachers={teachers}
        currentTeacherId={currentTeacherId}
        onSelectTeacherId={setCurrentTeacherId}
        classes={accessibleClasses}
        onOpenAuditModal={() => setIsAuditModalOpen(true)}
        auditWarningCount={auditLogs.filter((l) => l.severity === 'critical' || l.severity === 'warning').length}
        onLogout={handleLogout}
        activeTeacher={activeTeacher}
        onSwitchToTeacher={handleAdminSwitchToTeacher}
        onSwitchToGate={handleAdminSwitchToGate}
        onSwitchToAdmin={handleSwitchToAdmin}
        onOpenWhitelabelModal={(tab) => {
          if (tab) setWhitelabelModalTab(tab);
          setIsWhitelabelModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* LICENSE REVOKED / KILL-SWITCH BANNER (Admin) */}
        {currentRole === 'admin' && licenseStatus.status === 'revoked' && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl border-2 border-rose-500 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 rounded-2xl bg-rose-600/30 text-rose-400 text-2xl border border-rose-500/50">⛔</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm uppercase tracking-wide text-rose-400">
                    INSTITUTIONAL LICENSE REVOKED / ACCESS SUSPENDED
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                    Licensor Lockout
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Reason: <strong className="text-white">{licenseStatus.revocationReason || 'Commercial Rental Agreement Suspended / Default'}</strong>. All attendance write operations, roll calls, and scores are locked by the software licensor.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setWhitelabelModalTab('licensing');
                setIsWhitelabelModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 text-white font-black text-xs hover:bg-rose-500 transition shrink-0 cursor-pointer shadow-md active:scale-95"
            >
              Resolve / Enter Key &rarr;
            </button>
          </div>
        )}

        {/* STAFF READ-ONLY LOCKOUT BANNER (Teachers & Gate) */}
        {currentRole !== 'admin' && isLicenseLocked && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-slate-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl border-2 border-rose-500 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 rounded-2xl bg-rose-600/30 text-rose-400 text-2xl border border-rose-500/50 shrink-0">⛔</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm uppercase tracking-wide text-rose-400">
                    ATTENDANCE & ACADEMIC PORTAL FROZEN — READ-ONLY MODE
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                    {licenseStatus.status === 'revoked' ? 'License Revoked' : 'License Expired'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  The institutional license for <strong>{schoolBranding.schoolName}</strong> is {licenseStatus.status === 'revoked' ? 'revoked by the software licensor' : `expired on ${licenseStatus.validUntilFormatted}`}. Daily roll-call recording, staff clock-in, gradebook score entries, and pupil profile updates are strictly locked. Please contact the School Principal or Administrator to renew the license.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LICENSE EXPIRED ALERT BANNER (Only visible to Admin) */}
        {currentRole === 'admin' && licenseStatus.isExpired && licenseStatus.status !== 'revoked' && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-rose-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-rose-500 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 rounded-2xl bg-white/20 text-white text-xl">🚨</span>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide">
                  AttendIQ Subscription Expired — {schoolBranding.schoolName}
                </h4>
                <p className="text-xs text-rose-100 mt-0.5">
                  Your institution&apos;s commercial license expired on {licenseStatus.validUntilFormatted}. System is operating under read-only mode for audit safety.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setWhitelabelModalTab('licensing');
                setIsWhitelabelModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-white text-rose-950 font-black text-xs hover:bg-rose-50 transition shrink-0 cursor-pointer shadow-md active:scale-95"
            >
              Enter Renewal License Key &rarr;
            </button>
          </div>
        )}

        {/* LICENSE EXPIRING SOON BANNER (Only visible to Admin) */}
        {currentRole === 'admin' && !licenseStatus.isExpired && licenseStatus.isExpiringSoon && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-amber-500 text-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-amber-400 animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <span className="p-2.5 rounded-2xl bg-slate-950/15 text-slate-950 text-xl">⚠️</span>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide">
                  Subscription Renewal Reminder — {licenseStatus.daysRemaining} Days Remaining
                </h4>
                <p className="text-xs text-slate-900 mt-0.5">
                  The {licenseStatus.planName.toUpperCase()} license for {schoolBranding.schoolName} expires on {licenseStatus.validUntilFormatted}. Please renew in advance to avoid disruption.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setWhitelabelModalTab('licensing');
                setIsWhitelabelModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-2xl bg-slate-950 text-white font-bold text-xs hover:bg-slate-900 transition shrink-0 cursor-pointer shadow-md active:scale-95"
            >
              Manage & Renew &rarr;
            </button>
          </div>
        )}

        {currentRole === 'teacher' ? (
          <div>
            {/* School Motto & Academic Context Header */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm overflow-hidden shrink-0">
                  {schoolBranding.logoUrl ? (
                    <img src={schoolBranding.logoUrl} alt={schoolBranding.schoolName} className="h-full w-full object-contain p-0.5" />
                  ) : (
                    <span>{schoolBranding.crestEmoji || '📚'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      {currentClass?.name || 'Classroom Portal'}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      Homeroom Session
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {schoolBranding.schoolName} • {schoolBranding.currentTerm} • Class Teacher: <strong className="text-slate-800">{activeTeacher?.name}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-500 font-medium">Session Date:</span>
                <span className="font-bold text-xs text-slate-800 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  {selectedDate}
                </span>
              </div>
            </div>

            {/* Security banner: Remote Academic Session vs Clock-In Required */}
            {!isTeacherClockedIn && isRemoteAllowed && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200/90 text-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-700 shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-indigo-950 flex items-center gap-2">
                      <span>🏠 Remote Academic Session Active</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-800 border border-indigo-300">
                        Authorized by Principal
                      </span>
                    </p>
                    <p className="text-indigo-800 text-[11px] mt-0.5">
                      You are working off-campus. <strong>Pupil Dossiers</strong> and the <strong>Subject Gradebook</strong> are fully unlocked for entering scores and term remarks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isTeacherClockedIn && !isRemoteAllowed && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-950">
                      Staff Clock-In Pending — Restricted Access Mode
                    </p>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      You are currently restricted to taking the <strong>Daily Attendance Roll Call</strong>. Complete your morning gate clock-in on campus, or ask the Principal to enable <strong>Remote Academic Access</strong> to work from home.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const realToday = new Date().toISOString().split('T')[0];
                    if (selectedDate !== realToday) {
                      setSelectedDate(realToday);
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Clock In Above</span>
                </button>
              </div>
            )}

            {teacherPendingQueries.length > 0 && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-700 shrink-0">
                    <FileQuestion className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-rose-950">
                      Official Disciplinary Notice — Action Required ({teacherPendingQueries.length} Pending Query)
                    </p>
                    <p className="text-rose-800 text-[11px] mt-0.5">
                      School Management has issued an official query requiring your written explanation within the established deadline.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTeacherActiveTab('queries')}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  <FileQuestion className="h-3.5 w-3.5" />
                  <span>Review & Respond Now</span>
                </button>
              </div>
            )}

            {/* Sub-navigation Tabs: Roll Call vs Dossiers vs Gradebook vs Queries vs Announcements */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTeacherActiveTab('attendance')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    teacherActiveTab === 'attendance'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span>Daily Attendance Roll Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!canAccessAcademics) {
                      alert('🔒 Staff Clock-In Required: You must clock in on campus or have Remote Academic Access authorized by the Principal to access pupil dossiers.');
                      return;
                    }
                    setTeacherActiveTab('dossiers');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    !canAccessAcademics
                      ? 'text-slate-400 bg-slate-100/60 cursor-not-allowed opacity-80'
                      : teacherActiveTab === 'dossiers'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={!canAccessAcademics ? 'Clock-in or Remote Access required to unlock pupil dossiers' : undefined}
                >
                  {!canAccessAcademics ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-sky-600" />
                  )}
                  <span>Pupil Dossiers & Profiles ({classStudents.length})</span>
                  {!canAccessAcademics && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                      Locked
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!canAccessAcademics) {
                      alert('🔒 Staff Clock-In Required: You must clock in on campus or have Remote Academic Access authorized by the Principal to access the gradebook.');
                      return;
                    }
                    setTeacherActiveTab('gradebook');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    !canAccessAcademics
                      ? 'text-slate-400 bg-slate-100/60 cursor-not-allowed opacity-80'
                      : teacherActiveTab === 'gradebook'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={!canAccessAcademics ? 'Clock-in or Remote Access required to unlock gradebook' : undefined}
                >
                  {!canAccessAcademics ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>Subject Gradebook (CA & Exams)</span>
                  {!canAccessAcademics && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                      Locked
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTeacherActiveTab('queries')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    teacherActiveTab === 'queries'
                      ? 'bg-white text-rose-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileQuestion className="h-4 w-4 text-rose-600" />
                  <span>My Official Queries</span>
                  {teacherPendingQueries.length > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                      {teacherPendingQueries.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTeacherActiveTab('announcements')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                    teacherActiveTab === 'announcements'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <span>Announcements</span>
                  {teacherUnreadAnnouncements.length > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      {teacherUnreadAnnouncements.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Active Teacher & Assigned Classes Info */}
              <div className="text-xs text-slate-500 px-3 hidden md:flex items-center gap-2">
                <span className="font-semibold text-slate-700">{activeTeacher?.name}</span>
                <span>&bull;</span>
                <span className="text-slate-600">{teacherAssignedClasses.length} {teacherAssignedClasses.length === 1 ? 'Class' : 'Classes'} Assigned</span>
              </div>
            </div>

            {teacherActiveTab === 'attendance' ? (
              <div className="space-y-6">
                {activeTeacher && (
                  <TeacherClockCard
                    teacher={activeTeacher}
                    activeClass={accessibleClasses.find((c) => c.id === selectedClassId) || accessibleClasses[0]}
                    selectedDate={selectedDate}
                    onRecordUpdated={syncData}
                    onReturnToToday={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    isLicenseLocked={isLicenseLocked}
                  />
                )}
                <TeacherRollCall
                  classes={accessibleClasses}
                  selectedClassId={selectedClassId || accessibleClasses[0]?.id || ''}
                  onSelectClassId={setSelectedClassId}
                  selectedDate={selectedDate}
                  students={students}
                  currentSession={currentSession}
                  isLicenseLocked={isLicenseLocked}
                  onSelectStudentProfile={(student) => {
                    if (currentRole === 'teacher' && !canAccessAcademics) {
                      alert('🔒 Staff Clock-In Required: Pupil dossiers and medical records are locked until you clock in within school grounds or receive Remote Academic Authorization from the Principal.');
                      return;
                    }
                    setSelectedStudentForProfile(student);
                  }}
                  onDataUpdated={syncData}
                  currentRole={currentRole}
                />
              </div>
            ) : teacherActiveTab === 'queries' || teacherActiveTab === 'announcements' ? (
              activeTeacher && (
                <TeacherCommunicationCenter
                  teacher={activeTeacher}
                  queries={queries}
                  announcements={announcements}
                  activeSubTab={teacherActiveTab === 'announcements' ? 'announcements' : 'queries'}
                  onSubTabChange={(subTab) => setTeacherActiveTab(subTab)}
                  onDataUpdated={syncData}
                  isLicenseLocked={isLicenseLocked}
                />
              )
            ) : !canAccessAcademics ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-6 space-y-4">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Clock-In or Remote Access Required</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  In accordance with school policy, pupil profiles, emergency parent telephone numbers, and continuous assessment gradebooks are locked until your morning clock-in is registered within school grounds or Remote Academic Session is authorized by the Principal.
                </p>
                <button
                  onClick={() => setTeacherActiveTab('attendance')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
                >
                  Return to Daily Attendance Roll Call
                </button>
              </div>
            ) : teacherActiveTab === 'dossiers' ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-indigo-600" />
                      Class Pupils & Academic Dossiers ({currentClass?.name || 'My Class'})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tap any pupil card to view full emergency parent phone numbers, medical flags, and term academic records
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    {classStudents.length} Students Enrolled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {classStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudentForProfile(s)}
                      className="p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl cursor-pointer transition shadow-2xs group flex items-center gap-3.5"
                    >
                      <img
                        src={s.photoUrl}
                        alt={s.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 group-hover:scale-105 transition shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-indigo-600 transition">
                          {s.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Roll #{s.rollNumber} • {s.gender}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {s.totalPresent} Present
                          </span>
                          <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            {s.totalAbsent} Absent
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <SubjectGradebook
                currentTeacher={activeTeacher}
                assignedClasses={teacherAssignedClasses}
                allStudents={students}
                onDataUpdated={syncData}
                onSelectStudentProfile={(student) => setSelectedStudentForProfile(student)}
                isLicenseLocked={isLicenseLocked}
              />
            )}
          </div>
        ) : currentRole === 'gate' ? (
          <GateCheckIn
            students={students}
            classes={classes}
            selectedDate={selectedDate}
            onDataUpdated={syncData}
            isLicenseLocked={isLicenseLocked}
          />
        ) : (
          <AdminDashboard
            students={students}
            classes={classes}
            teachers={teachers}
            sessions={sessions}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            alertSettings={alertSettings}
            teacherAnalytics={teacherAnalytics}
            isLicenseLocked={isLicenseLocked}
            onOpenDatabaseModal={(tab) => {
              if (tab) setDatabaseModalTab(tab);
              setIsDatabaseModalOpen(true);
            }}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onSelectStudentProfile={(student) => setSelectedStudentForProfile(student)}
            onDataUpdated={syncData}
            onOpenWhitelabelModal={(tab) => {
              if (tab) setWhitelabelModalTab(tab);
              setIsWhitelabelModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AttendIQ &bull; Cloud School Attendance & Management System</span>
          <span>{schoolBranding.schoolName} &bull; {schoolBranding.branchLocation}</span>
        </div>
      </footer>


      {/* Student Profile & Academic Dossier Modal */}
      <StudentProfileModal
        student={selectedStudentForProfile}
        isOpen={Boolean(selectedStudentForProfile)}
        onClose={() => setSelectedStudentForProfile(null)}
        classNameTitle={
          classes.find((c) => c.id === selectedStudentForProfile?.classId)?.name || 'Class'
        }
        onStudentUpdated={syncData}
        isLicenseLocked={isLicenseLocked}
      />

      {/* Parent SMS & Email Alerts Center Modal */}
      <ParentAlertsModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        alerts={alerts}
        students={students}
        onAlertsUpdated={syncData}
      />

      {/* Alert Thresholds & Settings Modal */}
      <AlertSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={alertSettings}
        onSettingsUpdated={(newSettings) => {
          setAlertSettings(newSettings);
          syncData();
        }}
      />

      {/* Pupil & Class Database Modal (Add Pupil, CSV Bulk Import, Add Class) */}
      <PupilDatabaseModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        students={students}
        classes={classes}
        teachers={teachers}
        onDataUpdated={syncData}
        onSelectStudentProfile={(student) => setSelectedStudentForProfile(student)}
        defaultTab={databaseModalTab}
        isLicenseLocked={isLicenseLocked}
      />

      {/* Staff Activity & Anti-Tamper Security Audit Trail Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        onDataUpdated={syncData}
      />

      {/* Institutional Whitelabeling & Commercial Subscription Licensing Console */}
      <WhitelabelModal
        isOpen={isWhitelabelModalOpen}
        onClose={() => setIsWhitelabelModalOpen(false)}
        defaultTab={whitelabelModalTab}
        onBrandingUpdated={() => {
          setSchoolBranding(getSchoolBranding());
          setLicenseStatus(getLicenseStatus());
          syncData();
        }}
      />

      {/* Disaster Recovery, 1-Click Rollback & Full Database Backups Modal */}
      <DisasterRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onDataRestored={syncData}
      />
    </div>
  );
}
