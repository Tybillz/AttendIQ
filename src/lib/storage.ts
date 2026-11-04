import {
  Student,
  ClassSection,
  Teacher,
  AttendanceSession,
  ParentAlert,
  AlertSettings,
  TeacherAnalytics,
  AttendanceStatus,
  PupilFlag,
  TestExamRecord,
  SubjectGradeRecord,
  BehavioralNote,
  TerminalEvaluation,
  AuditLogEntry,
  AuditActionType,
  ParentExcuse,
  SchoolBackupSnapshot,
  StaffQuery,
  StaffAnnouncement,
} from '@/types/attendance';
import {
  INITIAL_CLASSES,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_PARENT_ALERTS,
  INITIAL_ALERT_SETTINGS,
  INITIAL_TEACHER_ANALYTICS,
  INITIAL_SUBJECT_GRADES,
  INITIAL_AUDIT_LOGS,
  INITIAL_STAFF_QUERIES,
  INITIAL_ANNOUNCEMENTS,
} from './initialData';

const KEYS = {
  STUDENTS: 'attend_iq_students_v2',
  CLASSES: 'attend_iq_classes_v2',
  TEACHERS: 'attend_iq_teachers_v2',
  SESSIONS: 'attend_iq_sessions_v2',
  ALERTS: 'attend_iq_alerts_v2',
  SETTINGS: 'attend_iq_settings_v2',
  ANALYTICS: 'attend_iq_analytics_v2',
  GRADES: 'attend_iq_subject_grades_v2',
  AUDIT_LOGS: 'attend_iq_audit_logs_v2',
  EXCUSES: 'attend_iq_excuses_v2',
  OFFLINE_QUEUE: 'attend_iq_offline_queue_v2',
  SNAPSHOTS: 'attend_iq_snapshots_v2',
  QUERIES: 'attend_iq_staff_queries_v1',
  ANNOUNCEMENTS: 'attend_iq_announcements_v1',
};

// Safe LocalStorage helpers
function getStored<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  } catch (e) {
    console.error(`Error writing ${key} to storage:`, e);
  }
}

// Students
export function getStudents(): Student[] {
  return getStored<Student[]>(KEYS.STUDENTS, INITIAL_STUDENTS);
}

export function saveStudents(students: Student[]): void {
  setStored(KEYS.STUDENTS, students);
}

export function getStudentsByClass(classId: string): Student[] {
  const all = getStudents();
  return all.filter((s) => s.classId === classId);
}

export function addStudent(newStudent: Omit<Student, 'id' | 'totalPresent' | 'totalAbsent' | 'consecutiveAbsences' | 'riskLevel'>): Student {
  const students = getStudents();
  const student: Student = {
    ...newStudent,
    id: `stu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    totalPresent: 0,
    totalAbsent: 0,
    consecutiveAbsences: 0,
    riskLevel: 'normal',
    academicRecords: newStudent.academicRecords || [],
    behavioralNotes: newStudent.behavioralNotes || [],
  };
  students.push(student);
  saveStudents(students);
  return student;
}

export function updateStudent(updated: Student): void {
  const students = getStudents().map((s) => (s.id === updated.id ? updated : s));
  saveStudents(students);
}

export function deleteStudent(studentId: string): void {
  const students = getStudents();
  const target = students.find((s) => s.id === studentId);
  if (target) {
    createSnapshot(`Auto-saved before deleting pupil "${target.name}" (${target.rollNumber})`, 'auto');
  }
  const filtered = students.filter((s) => s.id !== studentId);
  saveStudents(filtered);

  if (target) {
    try {
      addAuditLog({
        actorId: 'admin',
        actorName: 'School Administrator',
        actorRole: 'admin',
        action: 'PUPIL_DELETED',
        targetType: 'pupil',
        targetId: studentId,
        targetName: target.name,
        severity: 'warning',
        details: `Pupil ${target.name} (Roll: ${target.rollNumber}) was deleted from directory. Auto-recovery snapshot captured.`,
        canRevert: true,
      });
    } catch {}
  }
}

export function addAcademicRecord(studentId: string, record: Omit<TestExamRecord, 'id'>): void {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return;

  const newRecord: TestExamRecord = {
    ...record,
    id: `ar-${Date.now()}`,
  };

  student.academicRecords = [newRecord, ...(student.academicRecords || [])];
  saveStudents(students);
}

export function updateAcademicRecord(studentId: string, updatedRecord: TestExamRecord): void {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student || !student.academicRecords) return;

  student.academicRecords = student.academicRecords.map((ar) =>
    ar.id === updatedRecord.id ? updatedRecord : ar
  );
  saveStudents(students);
}

export function deleteAcademicRecord(studentId: string, recordId: string): void {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student || !student.academicRecords) return;

  student.academicRecords = student.academicRecords.filter((ar) => ar.id !== recordId);
  saveStudents(students);
}

export function updateBehavioralNote(studentId: string, updatedNote: BehavioralNote): void {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student || !student.behavioralNotes) return;

  student.behavioralNotes = student.behavioralNotes.map((bn) =>
    bn.id === updatedNote.id ? updatedNote : bn
  );
  saveStudents(students);
}

export function deleteBehavioralNote(studentId: string, noteId: string): void {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student || !student.behavioralNotes) return;

  student.behavioralNotes = student.behavioralNotes.filter((bn) => bn.id !== noteId);
  saveStudents(students);
}

export function updateTerminalEvaluation(studentId: string, evaluation: TerminalEvaluation): void {
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return;

  student.terminalEvaluation = {
    ...evaluation,
    updatedAt: new Date().toISOString(),
  };
  saveStudents(students);
}

// Classes
export function getClasses(): ClassSection[] {
  return getStored<ClassSection[]>(KEYS.CLASSES, INITIAL_CLASSES);
}

export function saveClasses(classes: ClassSection[]): void {
  setStored(KEYS.CLASSES, classes);
  if (typeof window !== 'undefined') {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes }),
    }).catch(() => {});
  }
}

export function addClass(newClass: Omit<ClassSection, 'id' | 'pupilCount'>): ClassSection {
  const classes = getClasses();
  const created: ClassSection = {
    ...newClass,
    id: `class-${Date.now()}`,
    pupilCount: 0,
  };
  classes.push(created);
  saveClasses(classes);
  return created;
}

export function deleteClass(classId: string): boolean {
  const classes = getClasses();
  const targetClass = classes.find((c) => c.id === classId);
  if (!targetClass) return false;

  // Auto-protection snapshot before deleting class section
  createSnapshot(`Auto-saved before deleting class "${targetClass.name}"`, 'auto');

  const updatedClasses = classes.filter((c) => c.id !== classId);
  saveClasses(updatedClasses);

  // Safely move any pupils in this deleted class to 'unassigned' so their records are not lost
  const students = getStudents();
  let studentsUpdated = false;
  students.forEach((s) => {
    if (s.classId === classId) {
      s.classId = 'unassigned';
      studentsUpdated = true;
    }
  });
  if (studentsUpdated) {
    saveStudents(students);
  }

  // Remove class from teacher assignments
  const teachers = getTeachers();
  let teachersUpdated = false;
  teachers.forEach((t) => {
    if (t.assignedClassIds?.includes(classId)) {
      t.assignedClassIds = t.assignedClassIds.filter((id) => id !== classId);
      teachersUpdated = true;
    }
  });
  if (teachersUpdated) {
    saveTeachers(teachers);
  }

  try {
    addAuditLog({
      actorId: 'admin',
      actorName: 'School Administrator',
      actorRole: 'admin',
      action: 'RECORD_REVERTED',
      targetType: 'session',
      targetId: classId,
      targetName: targetClass.name,
      className: targetClass.name,
      classId,
      severity: 'warning',
      details: `Administrator deleted class section "${targetClass.name}". Enrolled pupils were safely moved to Unassigned in the school directory.`,
    });
  } catch {}

  return true;
}

// Teachers
export function getTeachers(): Teacher[] {
  const loaded = getStored<Teacher[]>(KEYS.TEACHERS, INITIAL_TEACHERS);
  if (!Array.isArray(loaded) || loaded.length === 0) {
    return INITIAL_TEACHERS;
  }
  return loaded.map((t) => ({
    ...t,
    name: t.name || 'Staff Member',
    email: t.email || '',
    phone: t.phone || '',
    assignedClassIds: Array.isArray(t.assignedClassIds) ? t.assignedClassIds : [],
    subjects: Array.isArray(t.subjects) ? t.subjects : t.subject ? [t.subject] : ['Mathematics', 'English Language'],
    subject: t.subject || 'Class Teacher',
    avatarUrl:
      t.avatarUrl ||
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
  }));
}

export function saveTeachers(teachers: Teacher[]): void {
  setStored(KEYS.TEACHERS, teachers);
  if (typeof window !== 'undefined') {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teachers }),
    }).catch(() => {});
  }
}

export async function syncDataFromCloud(): Promise<{ teachers: Teacher[]; classes: ClassSection[] }> {
  if (typeof window === 'undefined') {
    return { teachers: getTeachers(), classes: getClasses() };
  }

  try {
    const res = await fetch('/api/sync');
    if (res.ok) {
      const data = await res.json();
      let updatedAny = false;

      if (Array.isArray(data.teachers) && data.teachers.length > 0) {
        const localTeachers = getTeachers();
        const teacherMap = new Map<string, Teacher>();
        localTeachers.forEach((t) => teacherMap.set(t.id, t));
        data.teachers.forEach((t: Teacher) => teacherMap.set(t.id, t));
        const mergedTeachers = Array.from(teacherMap.values());
        setStored(KEYS.TEACHERS, mergedTeachers);
        updatedAny = true;
      }

      if (Array.isArray(data.classes) && data.classes.length > 0) {
        const localClasses = getClasses();
        const classMap = new Map<string, ClassSection>();
        localClasses.forEach((c) => classMap.set(c.id, c));
        data.classes.forEach((c: ClassSection) => classMap.set(c.id, c));
        const mergedClasses = Array.from(classMap.values());
        setStored(KEYS.CLASSES, mergedClasses);
        updatedAny = true;
      }

      if (Array.isArray(data.parentExcuses) && data.parentExcuses.length > 0) {
        const localExcuses = getParentExcuses();
        const excuseMap = new Map<string, ParentExcuse>();
        localExcuses.forEach((e) => excuseMap.set(e.id, e));
        data.parentExcuses.forEach((e: ParentExcuse) => excuseMap.set(e.id, e));
        setStored(KEYS.EXCUSES, Array.from(excuseMap.values()));
        updatedAny = true;
      }

      if (updatedAny) {
        window.dispatchEvent(new Event('attend-iq-storage-update'));
      }
    }
  } catch (err) {
    console.warn('Failed to sync school data from cloud:', err);
  }

  return { teachers: getTeachers(), classes: getClasses() };
}

export function addTeacher(newTeacher: Omit<Teacher, 'id'>): Teacher {
  const teachers = getTeachers();
  const created: Teacher = {
    ...newTeacher,
    id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  teachers.push(created);
  saveTeachers(teachers);

  // Automatically assign an initial distinct 4-digit PIN for this new teacher and sync to cloud
  if (typeof window !== 'undefined') {
    try {
      const rawCreds = localStorage.getItem('attend_iq_portal_credentials_v1');
      const creds = rawCreds ? JSON.parse(rawCreds) : { teacherPins: {} };
      if (!creds.teacherPins) creds.teacherPins = {};
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      creds.teacherPins[created.id] = newPin;
      localStorage.setItem('attend_iq_portal_credentials_v1', JSON.stringify(creds));
      window.dispatchEvent(new Event('attend-iq-credentials-update'));
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherPins: creds.teacherPins }),
      }).catch(() => {});
    } catch {}
  }

  // If assigned to any classes upon creation, sync the classes too
  if (created.assignedClassIds && created.assignedClassIds.length > 0) {
    const classes = getClasses();
    classes.forEach((c) => {
      if (created.assignedClassIds.includes(c.id)) {
        c.teacherId = created.id;
        c.teacherName = created.name;
      }
    });
    saveClasses(classes);
  }

  return created;
}

export function updateTeacher(updated: Teacher): void {
  const teachers = getTeachers().map((t) => (t.id === updated.id ? updated : t));
  saveTeachers(teachers);

  // Also update teacherName across classes they teach
  const classes = getClasses();
  let classesChanged = false;
  classes.forEach((c) => {
    if (c.teacherId === updated.id) {
      c.teacherName = updated.name;
      classesChanged = true;
    }
  });
  if (classesChanged) {
    saveClasses(classes);
  }
}

export function deleteTeacher(teacherId: string): void {
  const teachers = getTeachers();
  const target = teachers.find((t) => t.id === teacherId);
  if (target) {
    createSnapshot(`Auto-saved before deleting staff member "${target.name}"`, 'auto');
  }

  const updatedTeachers = teachers.filter((t) => t.id !== teacherId);
  saveTeachers(updatedTeachers);

  // Clear teacher from assigned classes
  const classes = getClasses();
  classes.forEach((c) => {
    if (c.teacherId === teacherId) {
      c.teacherId = '';
      c.teacherName = 'Unassigned';
    }
  });
  saveClasses(classes);
}

export function reassignClassTeacher(classId: string, teacherId: string): void {
  const classes = getClasses();
  const teachers = getTeachers();

  const cls = classes.find((c) => c.id === classId);
  if (!cls) return;

  const previousTeacherId = cls.teacherId;

  // Remove this class from previous teacher's list
  if (previousTeacherId && previousTeacherId !== teacherId) {
    const prevTeacher = teachers.find((t) => t.id === previousTeacherId);
    if (prevTeacher) {
      prevTeacher.assignedClassIds = (prevTeacher.assignedClassIds || []).filter((id) => id !== classId);
    }
  }

  const teacher = teachers.find((t) => t.id === teacherId);

  // If teacher is selected
  if (teacher) {
    cls.teacherId = teacher.id;
    cls.teacherName = teacher.name;

    // Add classId to teacher's assigned classes if not present
    if (!teacher.assignedClassIds) teacher.assignedClassIds = [];
    if (!teacher.assignedClassIds.includes(classId)) {
      teacher.assignedClassIds.push(classId);
    }
  } else {
    // Unassigned
    cls.teacherId = '';
    cls.teacherName = 'Unassigned';
  }

  saveClasses(classes);
  saveTeachers(teachers);
}

// Alert Settings
export function getAlertSettings(): AlertSettings {
  return getStored<AlertSettings>(KEYS.SETTINGS, INITIAL_ALERT_SETTINGS);
}

export function saveAlertSettings(settings: AlertSettings): void {
  setStored(KEYS.SETTINGS, settings);
}

// Parent Alerts
export function getParentAlerts(): ParentAlert[] {
  return getStored<ParentAlert[]>(KEYS.ALERTS, INITIAL_PARENT_ALERTS);
}

export function addParentAlert(alertData: Omit<ParentAlert, 'id' | 'timestamp' | 'status'>): ParentAlert {
  const alerts = getParentAlerts();
  const newAlert: ParentAlert = {
    ...alertData,
    id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    status: 'delivered',
  };
  alerts.unshift(newAlert);
  setStored(KEYS.ALERTS, alerts);
  return newAlert;
}

// Parent Pre-Excused Absence & Doctor's Notes
export function getParentExcuses(): ParentExcuse[] {
  return getStored<ParentExcuse[]>(KEYS.EXCUSES, []);
}

export function saveParentExcuses(excuses: ParentExcuse[]): void {
  setStored(KEYS.EXCUSES, excuses);
  if (typeof window !== 'undefined') {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentExcuses: excuses }),
    }).catch(() => {});
  }
}

export function addParentExcuse(excuseData: Omit<ParentExcuse, 'id' | 'submittedAt' | 'status'>): ParentExcuse {
  const excuses = getParentExcuses();
  const created: ParentExcuse = {
    ...excuseData,
    id: `exc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };
  excuses.unshift(created);
  saveParentExcuses(excuses);
  return created;
}

export function getExcuseForStudentOnDate(studentId: string, dateStr: string): ParentExcuse | undefined {
  const excuses = getParentExcuses();
  return excuses.find(
    (e) => e.studentId === studentId && dateStr >= e.startDate && dateStr <= e.endDate
  );
}

// Offline Action Queue
export interface OfflineAction {
  id: string;
  type: 'attendance' | 'grade' | 'excuse';
  payload: any;
  timestamp: string;
}

export function getOfflineQueue(): OfflineAction[] {
  return getStored<OfflineAction[]>(KEYS.OFFLINE_QUEUE, []);
}

export function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): void {
  const queue = getOfflineQueue();
  queue.push({
    ...action,
    id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  setStored(KEYS.OFFLINE_QUEUE, queue);
}

export async function flushOfflineQueue(): Promise<{ synced: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) return { synced: 0 };
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0 };

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offlineActions: queue }),
    });
    if (res.ok) {
      setStored(KEYS.OFFLINE_QUEUE, []);
      return { synced: queue.length };
    }
  } catch (err) {
    console.warn('Failed to flush offline queue:', err);
  }
  return { synced: 0 };
}

// Attendance Sessions
export function getAttendanceSessions(): AttendanceSession[] {
  return getStored<AttendanceSession[]>(KEYS.SESSIONS, []);
}

export function getSessionForDateAndClass(dateStr: string, classId: string): AttendanceSession | undefined {
  const sessions = getAttendanceSessions();
  return sessions.find((s) => s.date === dateStr && s.classId === classId);
}

export function recordAttendanceEntry(
  dateStr: string,
  classId: string,
  studentId: string,
  status: AttendanceStatus,
  flag?: PupilFlag,
  note?: string,
  teacherInfo?: { id: string; name: string; role?: 'teacher' | 'admin' | 'gate' }
): void {
  const actorRole = teacherInfo?.role || (teacherInfo?.name?.toLowerCase().includes('admin') || teacherInfo?.name?.toLowerCase().includes('principal') ? 'admin' : 'teacher');

  // Hard Tamper-Lock Enforcement at Data Layer:
  // Non-admin writes are strictly blocked if session is time-locked
  if (actorRole !== 'admin') {
    const settings = getAlertSettings();
    if (isSessionTimeLocked(dateStr, classId, settings, actorRole)) {
      console.warn(`[Tamper Blocked] Write rejected for student ${studentId} on locked session (${dateStr}, ${classId}).`);
      return;
    }
  }

  const sessions = getAttendanceSessions();
  let session = sessions.find((s) => s.date === dateStr && s.classId === classId);

  if (!session) {
    session = {
      id: `sess-${classId}-${dateStr}`,
      date: dateStr,
      classId,
      teacherId: teacherInfo?.id || 't-101',
      teacherName: teacherInfo?.name || 'Class Teacher',
      records: {},
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    sessions.push(session);
  }

  const previousStatus = session.records[studentId]?.status;

  session.records[studentId] = {
    status,
    flag,
    note,
    markedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  setStored(KEYS.SESSIONS, sessions);

  // Immutable Audit Logging
  const students = getStudents();
  const student = students.find((s) => s.id === studentId);
  const classes = getClasses();
  const cls = classes.find((c) => c.id === classId);
  const todayStr = new Date().toISOString().split('T')[0];

  const actorName = teacherInfo?.name || 'Class Teacher';
  const actorId = teacherInfo?.id || 't-staff';

  if (previousStatus && previousStatus !== status) {
    const isPastDate = dateStr < todayStr;
    addAuditLog({
      actorRole,
      actorId,
      actorName,
      action: 'ATTENDANCE_OVERWRITTEN',
      targetType: 'attendance',
      targetId: studentId,
      targetName: student?.name || studentId,
      classId,
      className: cls?.name,
      dateStr,
      oldValue: previousStatus,
      newValue: status,
      severity: isPastDate ? 'critical' : 'warning',
      details: isPastDate
        ? `CRITICAL ALERT: Overwrote historical attendance on past date (${dateStr}) from ${previousStatus.toUpperCase()} to ${status.toUpperCase()}.`
        : `Attendance status changed from ${previousStatus.toUpperCase()} to ${status.toUpperCase()}.`,
      canRevert: true,
    });
  } else if (!previousStatus) {
    addAuditLog({
      actorRole,
      actorId,
      actorName,
      action: 'ATTENDANCE_MARKED',
      targetType: 'attendance',
      targetId: studentId,
      targetName: student?.name || studentId,
      classId,
      className: cls?.name,
      dateStr,
      newValue: status,
      severity: 'info',
      details: `Roll call marked ${status.toUpperCase()} on ${dateStr}.`,
      canRevert: false,
    });
  }

  // Update Student stats if status changed
  if (previousStatus !== status) {
    const students = getStudents();
    const student = students.find((s) => s.id === studentId);
    const settings = getAlertSettings();

    if (student) {
      if (status === 'present' || status === 'late') {
        if (previousStatus !== 'present' && previousStatus !== 'late') {
          student.totalPresent += 1;
        }
        if (previousStatus === 'absent' && student.totalAbsent > 0) {
          student.totalAbsent -= 1;
        }
        student.consecutiveAbsences = 0;
      } else if (status === 'absent') {
        student.totalAbsent += 1;
        if ((previousStatus === 'present' || previousStatus === 'late') && student.totalPresent > 0) {
          student.totalPresent -= 1;
        }
        student.consecutiveAbsences = (student.consecutiveAbsences || 0) + 1;

        // Check chronic absence threshold
        if (student.totalAbsent >= settings.chronicAbsenceThreshold) {
          student.riskLevel = 'critical';

          // Trigger Auto Alert to Parent and Admin
          if (settings.notifyParentOnThreshold || settings.notifyAdminOnThreshold) {
            addParentAlert({
              studentId: student.id,
              studentName: student.name,
              parentName: student.parentName,
              parentPhone: student.parentPhone,
              parentEmail: student.parentEmail,
              type: 'chronic_threshold_exceeded',
              channel: 'Both',
              message: `ATTENDANCE NOTICE: ${student.name} has recorded ${student.totalAbsent} absences in the last ${settings.windowDays} days. Please consult the school administration office regarding class learning progress.`,
              triggerReason: `Reached absence threshold (>= ${settings.chronicAbsenceThreshold} absences in ${settings.windowDays} days)`,
            });
          }
        } else {
          student.riskLevel = student.totalAbsent >= 2 ? 'warning' : 'normal';

          // Standard daily absence notice
          if (settings.smsEnabled || settings.emailEnabled) {
            const timingText = settings.notificationTiming === 'immediate' ? 'today' : 'recorded on ' + dateStr;
            addParentAlert({
              studentId: student.id,
              studentName: student.name,
              parentName: student.parentName,
              parentPhone: student.parentPhone,
              parentEmail: student.parentEmail,
              type: 'absence_notice',
              channel: settings.smsEnabled && settings.emailEnabled ? 'Both' : settings.smsEnabled ? 'SMS' : 'Email',
              message: `ATTENDANCE NOTICE: ${student.name} was marked absent for ${timingText}. If you have prior notice, please contact ${student.parentPhone ? 'the school attendance office' : 'us'}.`,
              triggerReason: 'Daily teacher attendance marking',
            });
          }
        }
      }

      saveStudents(students);
    }
  }
}

// Automatic absent tagging for unmarked pupils at end of day
export function autoTagUnmarkedPupilsAbsent(dateStr: string, classId: string): number {
  const settings = getAlertSettings();
  if (isSessionTimeLocked(dateStr, classId, settings, 'teacher')) {
    console.warn(`[Tamper Blocked] autoTagUnmarkedPupilsAbsent blocked because session ${dateStr} is time-locked.`);
    return 0;
  }

  const students = getStudentsByClass(classId);
  const session = getSessionForDateAndClass(dateStr, classId);
  let taggedCount = 0;

  students.forEach((student) => {
    const existing = session?.records[student.id];
    if (!existing || (!existing.status && existing.status !== 'present')) {
      recordAttendanceEntry(
        dateStr,
        classId,
        student.id,
        'absent',
        'unexcused',
        'Automatically flagged absent at end-of-day cutoff.'
      );
      taggedCount++;
    }
  });

  return taggedCount;
}

// Teacher Analytics
export function getTeacherAnalytics(): TeacherAnalytics[] {
  return getStored<TeacherAnalytics[]>(KEYS.ANALYTICS, INITIAL_TEACHER_ANALYTICS);
}

// Bulk CSV Import
export function bulkImportPupilsFromCSV(csvContent: string, classId: string): { added: number; errors: string[] } {
  const lines = csvContent.trim().split(/\r?\n/);
  const errors: string[] = [];
  let added = 0;

  if (lines.length < 2) {
    return { added: 0, errors: ['CSV file is empty or missing data rows.'] };
  }

  // Auto-protection snapshot before executing bulk import
  createSnapshot('Auto-saved before CSV bulk pupil import', 'auto');

  // Header format expected: Name, RollNumber, Gender, ParentName, ParentPhone, ParentEmail, DOB
  const dataLines = lines.slice(1);

  dataLines.forEach((line, idx) => {
    if (!line.trim()) return;
    const parts = line.split(',').map((p) => p.trim());
    const [name, rollNumber, genderRaw, parentName, parentPhone, parentEmail, dob] = parts;

    if (!name) {
      errors.push(`Row ${idx + 2}: Student name is required.`);
      return;
    }

    const gender = (genderRaw?.toLowerCase() === 'female' ? 'Female' : 'Male') as 'Male' | 'Female';
    const avatarNumber = Math.floor(Math.random() * 50) + 1;
    const photoUrl = `https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=face&seed=${avatarNumber}`;

    addStudent({
      name,
      rollNumber: rollNumber || `ROLL-${Date.now().toString().slice(-4)}`,
      gender,
      photoUrl,
      classId,
      dateOfBirth: dob || '2016-01-01',
      parentName: parentName || 'Guardian',
      parentPhone: parentPhone || '+1 (555) 000-0000',
      parentEmail: parentEmail || 'parent@example.com',
      academicRecords: [],
      behavioralNotes: [],
    });

    added++;
  });

  return { added, errors };
}

// CSV Export helpers
export function exportAttendanceReportCSV(classId?: string): string {
  const students = classId ? getStudentsByClass(classId) : getStudents();
  const classes = getClasses();
  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  let csv = 'Roll Number,Student Name,Class,Total Present Days,Total Absent Days,Attendance Rate (%),Risk Status,Parent Name,Parent Phone\n';

  students.forEach((s) => {
    const totalDays = s.totalPresent + s.totalAbsent;
    const rate = totalDays > 0 ? Math.round((s.totalPresent / totalDays) * 100) : 100;
    const className = classMap.get(s.classId) || s.classId;
    csv += `"${s.rollNumber}","${s.name}","${className}",${s.totalPresent},${s.totalAbsent},"${rate}%","${s.riskLevel}","${s.parentName}","${s.parentPhone}"\n`;
  });

  return csv;
}

export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Subject Grades & Continuous Assessment (CA)
export function getSubjectGrades(): SubjectGradeRecord[] {
  return getStored<SubjectGradeRecord[]>(KEYS.GRADES, INITIAL_SUBJECT_GRADES);
}

export function saveSubjectGrades(grades: SubjectGradeRecord[]): void {
  setStored(KEYS.GRADES, grades);
}

export function updateOrAddSubjectGrade(record: SubjectGradeRecord): void {
  const grades = getSubjectGrades();
  const existingIdx = grades.findIndex(
    (g) => g.studentId === record.studentId && g.subject === record.subject && g.term === record.term
  );
  if (existingIdx >= 0) {
    grades[existingIdx] = record;
  } else {
    grades.push(record);
  }
  saveSubjectGrades(grades);

  // Sync automatically to student's academic profile for report cards
  const students = getStudents();
  const student = students.find((s) => s.id === record.studentId);
  if (student) {
    if (!student.academicRecords) student.academicRecords = [];
    const arIdx = student.academicRecords.findIndex(
      (ar) => ar.subject === record.subject && ar.term === record.term
    );
    const newAcademicRecord: TestExamRecord = {
      id: `ar-${record.studentId}-${record.subject.replace(/\s+/g, '_')}-${record.term.replace(/\s+/g, '_')}`,
      title: `${record.term} ${record.subject} Evaluation`,
      subject: record.subject,
      score: record.total,
      maxScore: 100,
      grade: record.grade as 'A' | 'B' | 'C' | 'D' | 'F',
      date: new Date().toISOString().split('T')[0],
      term: record.term,
    };
    if (arIdx >= 0) {
      student.academicRecords[arIdx] = newAcademicRecord;
    } else {
      student.academicRecords.unshift(newAcademicRecord);
    }
    saveStudents(students);
  }
}

export function batchSaveSubjectGrades(
  records: SubjectGradeRecord[],
  actorInfo?: { id: string; name: string; role?: 'teacher' | 'admin' }
): void {
  const grades = getSubjectGrades();
  const gradeMap = new Map(grades.map((g) => [`${g.studentId}__${g.subject}__${g.term}`, g]));

  const actorRole = actorInfo?.role || 'teacher';
  const actorName = actorInfo?.name || 'Class Teacher';
  const actorId = actorInfo?.id || 't-101';

  records.forEach((r) => {
    const existing = gradeMap.get(`${r.studentId}__${r.subject}__${r.term}`);
    if (existing) {
      if (existing.total !== r.total || existing.exam !== r.exam || existing.ca1 !== r.ca1) {
        const diff = Math.abs(existing.total - r.total);
        addAuditLog({
          actorRole,
          actorId,
          actorName,
          action: 'GRADE_MODIFIED',
          targetType: 'grade',
          targetId: r.studentId,
          targetName: r.studentName,
          classId: r.classId,
          className: r.className,
          subject: r.subject,
          term: r.term,
          oldValue: `Total: ${existing.total} (CA1:${existing.ca1}, CA2:${existing.ca2}, Assign:${existing.assignment || 0}, Exam:${existing.exam})`,
          newValue: `Total: ${r.total} (CA1:${r.ca1}, CA2:${r.ca2}, Assign:${r.assignment || 0}, Exam:${r.exam})`,
          severity: diff >= 15 ? 'critical' : 'warning',
          details: `Grade was changed in ${r.subject} (${r.term}): ${existing.total} ➔ ${r.total}.`,
          canRevert: true,
        });
      }
    } else {
      addAuditLog({
        actorRole,
        actorId,
        actorName,
        action: 'GRADE_RECORDED',
        targetType: 'grade',
        targetId: r.studentId,
        targetName: r.studentName,
        classId: r.classId,
        className: r.className,
        subject: r.subject,
        term: r.term,
        newValue: `${r.total}/100 (${r.grade})`,
        severity: 'info',
        details: `Recorded initial broadsheet scores in ${r.subject} (${r.term}): ${r.total}/100.`,
        canRevert: false,
      });
    }

    gradeMap.set(`${r.studentId}__${r.subject}__${r.term}`, r);
  });

  saveSubjectGrades(Array.from(gradeMap.values()));

  // Sync to students in bulk
  const students = getStudents();
  const studentMap = new Map(students.map((s) => [s.id, s]));

  records.forEach((r) => {
    const student = studentMap.get(r.studentId);
    if (student) {
      if (!student.academicRecords) student.academicRecords = [];
      const arIdx = student.academicRecords.findIndex(
        (ar) => ar.subject === r.subject && ar.term === r.term
      );
      const newAr: TestExamRecord = {
        id: `ar-${r.studentId}-${r.subject.replace(/\s+/g, '_')}-${r.term.replace(/\s+/g, '_')}`,
        title: `${r.term} ${r.subject} Assessment`,
        subject: r.subject,
        score: r.total,
        maxScore: 100,
        grade: r.grade as 'A' | 'B' | 'C' | 'D' | 'F',
        date: new Date().toISOString().split('T')[0],
        term: r.term,
      };
      if (arIdx >= 0) {
        student.academicRecords[arIdx] = newAr;
      } else {
        student.academicRecords.unshift(newAr);
      }
    }
  });

  saveStudents(Array.from(studentMap.values()));
}

export function exportSubjectGradesCSV(subject: string, term: string, records: SubjectGradeRecord[]): string {
  let csv = `Subject Evaluation BroadSheet - ${subject} (${term})\n`;
  csv += 'Roll Number,Student Name,Class,CA 1 (/15),CA 2 (/15),Assignment (/10),Exam (/60),Total (/100),Grade,Remark,Teacher Vital Notes\n';
  records.forEach((r) => {
    csv += `"${r.studentId}","${r.studentName}","${r.className}",${r.ca1},${r.ca2},${r.assignment || 0},${r.exam},${r.total},"${r.grade}","${r.remark}","${r.vitalNotes || ''}"\n`;
  });
  return csv;
}

// ==========================================
// ANTI-TAMPER AUDIT TRAIL & SECURITY SYSTEM
// ==========================================

export function getAuditLogs(): AuditLogEntry[] {
  const logs = getStored<AuditLogEntry[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  return logs.map((l) => {
    if (l.details && l.details.includes('re-marking')) {
      return { ...l, details: 'Grade was changed.' };
    }
    return l;
  });
}

export function saveAuditLogs(logs: AuditLogEntry[]): void {
  setStored(KEYS.AUDIT_LOGS, logs);
}

export function addAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'formattedTime'>
): AuditLogEntry {
  const logs = getAuditLogs();
  const now = new Date();
  const created: AuditLogEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: now.toISOString(),
    formattedTime: now.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Keep up to 250 most recent immutable logs
  logs.unshift(created);
  if (logs.length > 250) {
    logs.pop();
  }
  saveAuditLogs(logs);
  return created;
}

// 1-Click Rollback for Suspicious or Malicious Changes
export function revertAuditAction(
  logId: string,
  adminInfo: { id: string; name: string }
): { success: boolean; message: string } {
  const logs = getAuditLogs();
  const log = logs.find((l) => l.id === logId);
  if (!log) {
    return { success: false, message: 'Audit entry not found.' };
  }

  if (log.action === 'ATTENDANCE_OVERWRITTEN' && log.oldValue && log.dateStr && log.classId && log.targetId) {
    const previousStatus = log.oldValue as AttendanceStatus;
    recordAttendanceEntry(
      log.dateStr,
      log.classId,
      log.targetId,
      previousStatus,
      undefined,
      `Reverted by Admin ${adminInfo.name} from tamper alert`,
      { id: adminInfo.id, name: adminInfo.name, role: 'admin' }
    );

    addAuditLog({
      actorRole: 'admin',
      actorId: adminInfo.id,
      actorName: adminInfo.name,
      action: 'RECORD_REVERTED',
      targetType: 'attendance',
      targetId: log.targetId,
      targetName: log.targetName,
      classId: log.classId,
      className: log.className,
      dateStr: log.dateStr,
      oldValue: log.newValue,
      newValue: log.oldValue,
      severity: 'info',
      details: `Disaster Recovery: Reverted attendance alteration back to "${log.oldValue.toUpperCase()}" for ${log.targetName}.`,
    });

    return {
      success: true,
      message: `Restored attendance for ${log.targetName} to "${log.oldValue.toUpperCase()}".`,
    };
  }

  if (log.action === 'GRADE_MODIFIED' && log.targetId && log.subject && log.term && log.oldValue) {
    const grades = getSubjectGrades();
    const gradeRec = grades.find(
      (g) => g.studentId === log.targetId && g.subject === log.subject && g.term === log.term
    );

    if (gradeRec) {
      const matchTotal = log.oldValue.match(/Total:\s*(\d+)/i);
      const matchCA1 = log.oldValue.match(/CA1:\s*(\d+)/i);
      const matchCA2 = log.oldValue.match(/CA2:\s*(\d+)/i);
      const matchExam = log.oldValue.match(/Exam:\s*(\d+)/i);
      const matchAssign = log.oldValue.match(/Assign:\s*(\d+)/i);

      if (matchTotal) {
        gradeRec.total = parseInt(matchTotal[1], 10);
        if (matchCA1) gradeRec.ca1 = parseInt(matchCA1[1], 10);
        if (matchCA2) gradeRec.ca2 = parseInt(matchCA2[1], 10);
        if (matchAssign) gradeRec.assignment = parseInt(matchAssign[1], 10);
        if (matchExam) gradeRec.exam = parseInt(matchExam[1], 10);
        gradeRec.updatedAt = new Date().toISOString();
        saveSubjectGrades(grades);

        addAuditLog({
          actorRole: 'admin',
          actorId: adminInfo.id,
          actorName: adminInfo.name,
          action: 'RECORD_REVERTED',
          targetType: 'grade',
          targetId: log.targetId,
          targetName: log.targetName,
          classId: log.classId,
          className: log.className,
          subject: log.subject,
          term: log.term,
          oldValue: log.newValue,
          newValue: log.oldValue,
          severity: 'info',
          details: `Disaster Recovery: Restored ${log.targetName}'s ${log.subject} evaluation back to previous scores.`,
        });

        return {
          success: true,
          message: `Restored ${log.targetName}'s ${log.subject} score to original values.`,
        };
      }
    }
  }

  return { success: false, message: 'This type of audit entry cannot be automatically rolled back.' };
}

// ==========================================
// TIME-LOCK & CUTOFF POLICIES
// ==========================================

export function isSessionTimeLocked(
  dateStr: string,
  classId: string,
  settings?: Partial<AlertSettings>,
  userRole: 'teacher' | 'admin' | 'gate' = 'teacher'
): boolean {
  // Admins always have override permission
  if (userRole === 'admin') return false;

  const session = getSessionForDateAndClass(dateStr, classId);
  // If explicitly unlocked by an Admin
  if (session?.unlockedByAdmin) return false;

  const todayStr = new Date().toISOString().split('T')[0];

  // Any past date is strictly locked for teachers to prevent tampering
  if (dateStr < todayStr) return true;

  // Future dates cannot be marked
  if (dateStr > todayStr) return true;

  // Same day cutoff check: if current time is past autoAbsentCutoffTime (e.g. 15:30)
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoff = settings?.autoAbsentCutoffTime || '15:30';
    const [cHours, cMins] = cutoff.split(':').map(Number);
    if (!isNaN(cHours) && !isNaN(cMins)) {
      const cutoffMinutes = cHours * 60 + cMins;
      if (currentMinutes > cutoffMinutes) {
        return true;
      }
    }
  } catch (e) {
    // fallback safe
  }

  return false;
}

export function toggleAdminSessionUnlock(
  dateStr: string,
  classId: string,
  adminInfo: { id: string; name: string },
  reason?: string
): boolean {
  const sessions = getAttendanceSessions();
  let session = sessions.find((s) => s.date === dateStr && s.classId === classId);

  if (!session) {
    session = {
      id: `sess-${classId}-${dateStr}`,
      date: dateStr,
      classId,
      teacherId: 't-101',
      teacherName: 'Class Teacher',
      records: {},
      submittedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    sessions.push(session);
  }

  const newState = !session.unlockedByAdmin;
  session.unlockedByAdmin = newState;
  session.unlockedAt = newState ? new Date().toISOString() : undefined;
  session.unlockedReason = newState ? reason || 'Principal/Admin authorized override' : undefined;

  setStored(KEYS.SESSIONS, sessions);

  const classes = getClasses();
  const cls = classes.find((c) => c.id === classId);

  addAuditLog({
    actorRole: 'admin',
    actorId: adminInfo.id,
    actorName: adminInfo.name,
    action: newState ? 'SESSION_UNLOCKED' : 'SESSION_LOCKED',
    targetType: 'session',
    targetId: session.id,
    targetName: `${cls?.name || classId} (${dateStr})`,
    classId,
    className: cls?.name,
    dateStr,
    severity: 'warning',
    details: newState
      ? `Authorized admin override unlocked attendance session for editing. Reason: ${reason || 'Administrative correction'}.`
      : `Admin re-locked session. Records are now frozen.`,
    canRevert: false,
  });

  return newState;
}

// -------------------------------------------------------------
// SNAPSHOTS, ROLLBACK & DISASTER RECOVERY ENGINE
// -------------------------------------------------------------

export function saveAttendanceSessions(sessions: AttendanceSession[]): void {
  setStored(KEYS.SESSIONS, sessions);
}

export function getSnapshots(): SchoolBackupSnapshot[] {
  return getStored<SchoolBackupSnapshot[]>(KEYS.SNAPSHOTS, []);
}

export function saveSnapshots(snapshots: SchoolBackupSnapshot[]): void {
  setStored(KEYS.SNAPSHOTS, snapshots);
}

export function createSnapshot(
  reason: string,
  triggerType: 'auto' | 'manual' = 'manual'
): SchoolBackupSnapshot {
  const students = getStudents();
  const classes = getClasses();
  const teachers = getTeachers();
  const sessions = getAttendanceSessions();
  const subjectGrades = getSubjectGrades();
  const alerts = getParentAlerts();
  const settings = getAlertSettings();
  const analytics = getTeacherAnalytics();

  const now = new Date();
  const formattedTime =
    now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) +
    ', ' +
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const snapshot: SchoolBackupSnapshot = {
    id: `snap-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: now.toISOString(),
    formattedTime,
    reason: reason.trim() || 'Manual System Snapshot',
    triggerType,
    stats: {
      students: students.length,
      classes: classes.length,
      teachers: teachers.length,
      sessions: sessions.length,
      grades: subjectGrades.length,
    },
    data: {
      students: JSON.parse(JSON.stringify(students)),
      classes: JSON.parse(JSON.stringify(classes)),
      teachers: JSON.parse(JSON.stringify(teachers)),
      sessions: JSON.parse(JSON.stringify(sessions)),
      subjectGrades: JSON.parse(JSON.stringify(subjectGrades)),
      alerts: JSON.parse(JSON.stringify(alerts)),
      settings: JSON.parse(JSON.stringify(settings)),
      analytics: JSON.parse(JSON.stringify(analytics)),
    },
  };

  const existing = getSnapshots();
  // Keep last 15 rolling snapshots to prevent local storage exhaustion
  const updated = [snapshot, ...existing].slice(0, 15);
  saveSnapshots(updated);

  try {
    addAuditLog({
      actorId: 'admin',
      actorName: 'System Engine',
      actorRole: 'admin',
      action: 'SYSTEM_SNAPSHOT_CREATED',
      targetType: 'session',
      targetId: snapshot.id,
      targetName: snapshot.reason,
      severity: 'info',
      details: `Captured ${triggerType} snapshot "${snapshot.reason}". Stats: ${students.length} pupils, ${classes.length} classes, ${teachers.length} staff.`,
      canRevert: true,
    });
  } catch {}

  return snapshot;
}

export function rollbackToSnapshot(snapshotId: string): {
  success: boolean;
  error?: string;
  snapshot?: SchoolBackupSnapshot;
} {
  const snapshots = getSnapshots();
  const target = snapshots.find((s) => s.id === snapshotId);
  if (!target) {
    return { success: false, error: 'Snapshot not found in local archives.' };
  }

  // Safety first: capture an automated safety snapshot of the state RIGHT NOW before executing rollback!
  createSnapshot(
    `Pre-Rollback Safety Point (before reverting to: ${target.formattedTime} - ${target.reason})`,
    'auto'
  );

  try {
    if (Array.isArray(target.data.students)) saveStudents(target.data.students);
    if (Array.isArray(target.data.classes)) saveClasses(target.data.classes);
    if (Array.isArray(target.data.teachers)) saveTeachers(target.data.teachers);
    if (Array.isArray(target.data.sessions)) saveAttendanceSessions(target.data.sessions);
    if (Array.isArray(target.data.subjectGrades)) saveSubjectGrades(target.data.subjectGrades);
    if (Array.isArray(target.data.alerts)) setStored(KEYS.ALERTS, target.data.alerts);
    if (target.data.settings) saveAlertSettings(target.data.settings);
    if (Array.isArray(target.data.analytics)) setStored(KEYS.ANALYTICS, target.data.analytics);

    addAuditLog({
      actorId: 'admin',
      actorName: 'School Administrator',
      actorRole: 'admin',
      action: 'SYSTEM_ROLLBACK_EXECUTED',
      targetType: 'session',
      targetId: target.id,
      targetName: target.reason,
      severity: 'critical',
      details: `Principal executed database rollback to snapshot captured on ${target.formattedTime}. Restored ${target.stats.students} pupils, ${target.stats.classes} classes, ${target.stats.teachers} staff.`,
      canRevert: false,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('attend-iq-storage-update'));
    }

    return { success: true, snapshot: target };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to rollback snapshot data.' };
  }
}

export function deleteSnapshot(snapshotId: string): void {
  const existing = getSnapshots().filter((s) => s.id !== snapshotId);
  saveSnapshots(existing);
}

export function exportFullSchoolBackupJSON(): string {
  const backup = {
    attendIqVersion: '2.0.0',
    backupType: 'COMPLETE_INSTITUTIONAL_DATABASE',
    exportedAt: new Date().toISOString(),
    schoolMeta: {
      name: 'Innovative International Secondary School',
      district: 'Gwarinpa / Maitama District, Abuja FCT, Nigeria',
    },
    stats: {
      pupilsCount: getStudents().length,
      classesCount: getClasses().length,
      teachersCount: getTeachers().length,
      attendanceSessionsCount: getAttendanceSessions().length,
      subjectGradesCount: getSubjectGrades().length,
    },
    data: {
      students: getStudents(),
      classes: getClasses(),
      teachers: getTeachers(),
      sessions: getAttendanceSessions(),
      subjectGrades: getSubjectGrades(),
      alerts: getParentAlerts(),
      settings: getAlertSettings(),
      analytics: getTeacherAnalytics(),
      excuses: getParentExcuses(),
    },
  };
  return JSON.stringify(backup, null, 2);
}

export function restoreSchoolFromJSON(jsonString: string): {
  success: boolean;
  error?: string;
  counts?: { students: number; classes: number; teachers: number; sessions: number };
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      return { success: false, error: 'Invalid backup format: missing root database payload.' };
    }

    const { students, classes, teachers, sessions, subjectGrades, alerts, settings, analytics, excuses } =
      parsed.data;

    if (!Array.isArray(students) || !Array.isArray(classes) || !Array.isArray(teachers)) {
      return {
        success: false,
        error: 'Corrupt backup file: Expected valid arrays for pupils, classes, and teachers.',
      };
    }

    // Safety snapshot before restoring external backup
    createSnapshot('Pre-Restore Safety Point (before importing external backup file)', 'auto');

    saveStudents(students);
    saveClasses(classes);
    saveTeachers(teachers);
    if (Array.isArray(sessions)) saveAttendanceSessions(sessions);
    if (Array.isArray(subjectGrades)) saveSubjectGrades(subjectGrades);
    if (Array.isArray(alerts)) setStored(KEYS.ALERTS, alerts);
    if (settings) saveAlertSettings(settings);
    if (Array.isArray(analytics)) setStored(KEYS.ANALYTICS, analytics);
    if (Array.isArray(excuses)) saveParentExcuses(excuses);

    addAuditLog({
      actorId: 'admin',
      actorName: 'School Administrator',
      actorRole: 'admin',
      action: 'SYSTEM_BACKUP_RESTORED',
      targetType: 'session',
      targetId: `restore-${Date.now()}`,
      targetName: 'External JSON Backup',
      severity: 'critical',
      details: `Restored entire school database from offline backup file. Loaded ${students.length} pupils, ${classes.length} classes, and ${teachers.length} staff.`,
      canRevert: false,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('attend-iq-storage-update'));
    }

    return {
      success: true,
      counts: {
        students: students.length,
        classes: classes.length,
        teachers: teachers.length,
        sessions: Array.isArray(sessions) ? sessions.length : 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse JSON backup.' };
  }
}

// ========================================================
// STAFF QUERIES MANAGEMENT (Admin <-> Staff Disciplinary)
// ========================================================

export function getStaffQueries(): StaffQuery[] {
  return getStored<StaffQuery[]>(KEYS.QUERIES, INITIAL_STAFF_QUERIES);
}

export function getQueriesForTeacher(teacherId: string): StaffQuery[] {
  const all = getStaffQueries();
  return all.filter((q) => q.teacherId === teacherId);
}

export function issueStaffQuery(queryData: {
  teacherId: string;
  teacherName: string;
  teacherPhone?: string;
  teacherEmail?: string;
  title: string;
  category: StaffQuery['category'];
  description: string;
  incidentDate: string;
  deadlineDays: number;
  issuedBy?: string;
}): StaffQuery {
  const existing = getStaffQueries();
  const counter = existing.length + 1;
  const year = new Date().getFullYear();
  const queryNumber = `QRY-${year}-${String(counter).padStart(3, '0')}`;
  
  // Calculate reply deadline
  const now = new Date();
  const deadlineDate = new Date(now.getTime() + queryData.deadlineDays * 60 * 60 * 1000);
  const replyDeadline = deadlineDate.toISOString().split('T')[0];

  const newQuery: StaffQuery = {
    id: `qry-${Date.now()}`,
    queryNumber,
    teacherId: queryData.teacherId,
    teacherName: queryData.teacherName,
    teacherPhone: queryData.teacherPhone,
    teacherEmail: queryData.teacherEmail,
    title: queryData.title,
    category: queryData.category,
    description: queryData.description,
    incidentDate: queryData.incidentDate || now.toISOString().split('T')[0],
    deadlineDays: queryData.deadlineDays || 48,
    replyDeadline,
    status: 'pending_reply',
    issuedBy: queryData.issuedBy || 'Office of the Principal',
    issuedAt: now.toISOString(),
  };

  const updated = [newQuery, ...existing];
  setStored(KEYS.QUERIES, updated);

  try {
    addAuditLog({
      actorId: 'admin',
      actorName: queryData.issuedBy || 'Administrator',
      actorRole: 'admin',
      action: 'STAFF_QUERY_ISSUED',
      targetType: 'query',
      targetId: queryData.teacherId,
      targetName: queryData.teacherName,
      severity: 'warning',
      details: `Official Query issued (${queryNumber}): "${queryData.title}" to staff ${queryData.teacherName}. Reply deadline: ${replyDeadline}.`,
      canRevert: false,
    });
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  }

  return newQuery;
}

export function submitStaffQueryReply(
  queryId: string,
  explanation: string,
  deviceName?: string
): { success: boolean; message: string } {
  const queries = getStaffQueries();
  const targetIdx = queries.findIndex((q) => q.id === queryId);
  if (targetIdx === -1) {
    return { success: false, message: 'Query record not found.' };
  }

  const query = queries[targetIdx];
  const now = new Date();

  query.status = 'replied';
  query.staffReply = {
    repliedAt: now.toISOString(),
    explanation: explanation.trim(),
    submittedFromDevice: deviceName || 'Authorized Staff Workspace',
  };

  queries[targetIdx] = query;
  setStored(KEYS.QUERIES, queries);

  try {
    addAuditLog({
      actorId: query.teacherId,
      actorName: query.teacherName,
      actorRole: 'teacher',
      action: 'STAFF_QUERY_RESOLVED',
      targetType: 'query',
      targetId: query.teacherId,
      targetName: query.teacherName,
      severity: 'info',
      details: `Staff ${query.teacherName} submitted formal written reply for Query ${query.queryNumber}: "${query.title}".`,
      canRevert: false,
    });
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  }

  return { success: true, message: 'Your formal explanation has been submitted to Management.' };
}

export function resolveStaffQuery(
  queryId: string,
  decisionData: {
    decision: NonNullable<StaffQuery['adminDecision']>['decision'];
    notes: string;
    decidedBy: string;
  }
): { success: boolean; message: string } {
  const queries = getStaffQueries();
  const targetIdx = queries.findIndex((q) => q.id === queryId);
  if (targetIdx === -1) {
    return { success: false, message: 'Query record not found.' };
  }

  const query = queries[targetIdx];
  const now = new Date();

  query.status = decisionData.decision === 'explanation_accepted' ? 'resolved' : 'warning_issued';
  query.adminDecision = {
    decidedAt: now.toISOString(),
    decidedBy: decisionData.decidedBy || 'School Administrator',
    decision: decisionData.decision,
    notes: decisionData.notes.trim(),
  };

  queries[targetIdx] = query;
  setStored(KEYS.QUERIES, queries);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  }

  return { success: true, message: 'Query status updated and archived.' };
}

export function deleteStaffQuery(queryId: string): void {
  const queries = getStaffQueries().filter((q) => q.id !== queryId);
  setStored(KEYS.QUERIES, queries);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  }
}

// ========================================================
// STAFF ANNOUNCEMENTS & CIRCULARS (Broadcasting to all staff)
// ========================================================

export function getStaffAnnouncements(): StaffAnnouncement[] {
  return getStored<StaffAnnouncement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
}

export function publishStaffAnnouncement(data: {
  title: string;
  category: StaffAnnouncement['category'];
  priority: StaffAnnouncement['priority'];
  content: string;
  publishedBy?: string;
}): StaffAnnouncement {
  const existing = getStaffAnnouncements();
  const now = new Date();

  const created: StaffAnnouncement = {
    id: `anc-${Date.now()}`,
    title: data.title.trim(),
    category: data.category || 'general',
    priority: data.priority || 'normal',
    content: data.content.trim(),
    publishedBy: data.publishedBy || 'Office of the Principal',
    publishedAt: now.toISOString(),
    targetAudience: 'all_staff',
    acknowledgedByTeacherIds: [],
  };

  const updated = [created, ...existing];
  setStored(KEYS.ANNOUNCEMENTS, updated);

  try {
    addAuditLog({
      actorId: 'admin',
      actorName: data.publishedBy || 'Administrator',
      actorRole: 'admin',
      action: 'ANNOUNCEMENT_PUBLISHED',
      targetType: 'announcement',
      targetId: 'all-staff',
      targetName: 'All Staff Members',
      severity: data.priority === 'urgent' ? 'warning' : 'info',
      details: `Broadcasted staff announcement "${data.title}" to all teachers.`,
      canRevert: false,
    });
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  }

  return created;
}

export function acknowledgeStaffAnnouncement(announcementId: string, teacherId: string): void {
  const announcements = getStaffAnnouncements();
  const targetIdx = announcements.findIndex((a) => a.id === announcementId);
  if (targetIdx === -1) return;

  const anc = announcements[targetIdx];
  const acks = anc.acknowledgedByTeacherIds || [];
  if (!acks.includes(teacherId)) {
    anc.acknowledgedByTeacherIds = [...acks, teacherId];
    announcements[targetIdx] = anc;
    setStored(KEYS.ANNOUNCEMENTS, announcements);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('attend-iq-storage-update'));
    }
  }
}

export function deleteStaffAnnouncement(announcementId: string): void {
  const announcements = getStaffAnnouncements().filter((a) => a.id !== announcementId);
  setStored(KEYS.ANNOUNCEMENTS, announcements);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('attend-iq-storage-update'));
  }
}
