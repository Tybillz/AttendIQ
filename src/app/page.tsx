'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, BookOpen, Users, FolderOpen, Lock, ShieldAlert } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { TeacherRollCall } from '@/components/TeacherRollCall';
import { TeacherClockCard } from '@/components/TeacherClockCard';
import { SubjectGradebook } from '@/components/SubjectGradebook';
import { AdminDashboard } from '@/components/AdminDashboard';
import { GateCheckIn } from '@/components/GateCheckIn';
import { AuthScreen } from '@/components/AuthScreen';
import { getAuthSession, logout as performLogout, AuthSession } from '@/lib/auth';
import { getTeacherRecordForDate } from '@/lib/teacherAttendance';
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
} from '@/lib/storage';
import { AuditLogModal } from '@/components/AuditLogModal';
import {
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_PARENT_ALERTS,
  INITIAL_ALERT_SETTINGS,
  INITIAL_TEACHER_ANALYTICS,
} from '@/lib/initialData';
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
} from '@/types/attendance';

export default function Home() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [currentRole, setCurrentRole] = useState<'teacher' | 'gate' | 'admin'>('teacher');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15');

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
  const [teacherActiveTab, setTeacherActiveTab] = useState<'attendance' | 'dossiers' | 'gradebook'>('attendance');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isTeacherClockedIn, setIsTeacherClockedIn] = useState<boolean>(false);

  const checkTeacherClockStatus = useCallback(() => {
    if (typeof window === 'undefined') return;
    const rec = getTeacherRecordForDate(currentTeacherId, selectedDate);
    setIsTeacherClockedIn(Boolean(rec && rec.clockInTime));
  }, [currentTeacherId, selectedDate]);

  useEffect(() => {
    checkTeacherClockStatus();
    const handleClockUpdate = () => checkTeacherClockStatus();
    window.addEventListener('attend-iq-teacher-clock-update', handleClockUpdate);
    return () => {
      window.removeEventListener('attend-iq-teacher-clock-update', handleClockUpdate);
    };
  }, [checkTeacherClockStatus]);

  // RESTRICTION: If staff is unable to clock in, lock access so they can ONLY access daily attendance roll call
  useEffect(() => {
    if (currentRole === 'teacher' && !isTeacherClockedIn && teacherActiveTab !== 'attendance') {
      setTeacherActiveTab('attendance');
    }
  }, [currentRole, isTeacherClockedIn, teacherActiveTab]);

  // Modals state
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [databaseModalTab, setDatabaseModalTab] = useState<'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers'>('pupils');

  // Sync from storage (hydrates any saved local edits)
  const syncData = useCallback(() => {
    try {
      const loadedClasses = getClasses();
      if (loadedClasses && loadedClasses.length > 0) {
        setClasses(loadedClasses);
      }
      setStudents(getStudents());
      setTeachers(getTeachers());
      setSessions(getAttendanceSessions());
      setAlerts(getParentAlerts());
      setAlertSettings(getAlertSettings());
      setTeacherAnalytics(getTeacherAnalytics());
      setAuditLogs(getAuditLogs());
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

    window.addEventListener('attend-iq-storage-update', handleStorageUpdate);
    window.addEventListener('attend-iq-auth-update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('attend-iq-storage-update', handleStorageUpdate);
      window.removeEventListener('attend-iq-auth-update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
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
    <div className="min-h-screen bg-[#eef2f6] text-slate-800 flex flex-col relative">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'teacher' ? (
          <div>
            {/* School Motto & Academic Context Header */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                  📚
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
                    Apex Crest Academy • First Term (2026/2027) • Class Teacher: <strong className="text-slate-800">{activeTeacher?.name}</strong>
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

            {/* Security restriction banner when teacher has not clocked in */}
            {!isTeacherClockedIn && (
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
                      You are currently restricted to taking the <strong>Daily Attendance Roll Call</strong>. Complete your morning gate clock-in above to unlock <strong>Pupil Dossiers</strong> and the <strong>Subject Gradebook</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Clock In Above</span>
                </button>
              </div>
            )}

            {/* Sub-navigation Tabs: Roll Call vs Dossiers vs Gradebook */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200 flex-wrap">
                <button
                  onClick={() => setTeacherActiveTab('attendance')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 ${
                    teacherActiveTab === 'attendance'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span>Daily Attendance Roll Call</span>
                </button>

                <button
                  onClick={() => {
                    if (!isTeacherClockedIn) {
                      alert('🔒 Staff Clock-In Required: You must clock in within school grounds before accessing sensitive pupil dossiers and emergency parent contacts.');
                      return;
                    }
                    setTeacherActiveTab('dossiers');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 ${
                    !isTeacherClockedIn
                      ? 'text-slate-400 bg-slate-100/60 cursor-not-allowed opacity-80'
                      : teacherActiveTab === 'dossiers'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={!isTeacherClockedIn ? 'Clock-in required to unlock pupil dossiers' : undefined}
                >
                  {!isTeacherClockedIn ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <FolderOpen className="h-4 w-4 text-sky-600" />
                  )}
                  <span>Pupil Dossiers & Profiles ({classStudents.length})</span>
                  {!isTeacherClockedIn && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                      Locked
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (!isTeacherClockedIn) {
                      alert('🔒 Staff Clock-In Required: You must clock in within school grounds before accessing the continuous assessment and exam gradebook.');
                      return;
                    }
                    setTeacherActiveTab('gradebook');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition active:scale-95 ${
                    !isTeacherClockedIn
                      ? 'text-slate-400 bg-slate-100/60 cursor-not-allowed opacity-80'
                      : teacherActiveTab === 'gradebook'
                      ? 'bg-white text-indigo-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={!isTeacherClockedIn ? 'Clock-in required to unlock gradebook' : undefined}
                >
                  {!isTeacherClockedIn ? (
                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>Subject Gradebook (CA & Exams)</span>
                  {!isTeacherClockedIn && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                      Locked
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
                  />
                )}
                <TeacherRollCall
                  classes={accessibleClasses}
                  selectedClassId={selectedClassId || accessibleClasses[0]?.id || ''}
                  onSelectClassId={setSelectedClassId}
                  selectedDate={selectedDate}
                  students={students}
                  currentSession={currentSession}
                  onSelectStudentProfile={(student) => {
                    if (currentRole === 'teacher' && !isTeacherClockedIn) {
                      alert('🔒 Staff Clock-In Required: Pupil dossiers and medical records are locked until you clock in within school grounds.');
                      return;
                    }
                    setSelectedStudentForProfile(student);
                  }}
                  onDataUpdated={syncData}
                  currentRole={currentRole}
                />
              </div>
            ) : !isTeacherClockedIn ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-6 space-y-4">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Clock-In Required for Academic Records</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  In accordance with school policy, pupil profiles, emergency parent telephone numbers, and continuous assessment gradebooks are strictly locked until your morning clock-in is registered within school grounds.
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
              />
            )}
          </div>
        ) : currentRole === 'gate' ? (
          <GateCheckIn
            students={students}
            classes={classes}
            selectedDate={selectedDate}
            onDataUpdated={syncData}
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
            onOpenDatabaseModal={(tab) => {
              if (tab) setDatabaseModalTab(tab);
              setIsDatabaseModalOpen(true);
            }}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onSelectStudentProfile={(student) => setSelectedStudentForProfile(student)}
            onDataUpdated={syncData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AttendIQ &bull; Cloud School Attendance & Management System</span>
          <span>Apex Crest Academy &bull; Abuja (FCT), Nigeria</span>
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
      />

      {/* Staff Activity & Anti-Tamper Security Audit Trail Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditLogs={auditLogs}
        onDataUpdated={syncData}
      />
    </div>
  );
}
