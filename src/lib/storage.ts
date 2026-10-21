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
  AuditLogEntry,
  AuditActionType,
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
  const students = getStudents().filter((s) => s.id !== studentId);
  saveStudents(students);
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

// Classes
export function getClasses(): ClassSection[] {
  return getStored<ClassSection[]>(KEYS.CLASSES, INITIAL_CLASSES);
}

export function saveClasses(classes: ClassSection[]): void {
  setStored(KEYS.CLASSES, classes);
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
}

export function addTeacher(newTeacher: Omit<Teacher, 'id'>): Teacher {
  const teachers = getTeachers();
  const created: Teacher = {
    ...newTeacher,
    id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  teachers.push(created);
  saveTeachers(teachers);

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
  const teachers = getTeachers().filter((t) => t.id !== teacherId);
  saveTeachers(teachers);

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
    const rate = totalDays > 0 ? ((s.totalPresent / totalDays) * 100).toFixed(1) : '100.0';
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
