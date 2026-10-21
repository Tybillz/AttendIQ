export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type PupilFlag = 'late arrival' | 'left early' | 'nurse visit' | 'behavioral' | 'excused' | 'unexcused';

export interface TestExamRecord {
  id: string;
  title: string;
  subject: string;
  score: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  date: string;
  term: string;
}

export interface BehavioralNote {
  id: string;
  date: string;
  author: string;
  type: 'positive' | 'concern' | 'neutral';
  note: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  photoUrl: string;
  classId: string;
  dateOfBirth: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  academicRecords: TestExamRecord[];
  behavioralNotes: BehavioralNote[];
  totalPresent: number;
  totalAbsent: number;
  consecutiveAbsences: number;
  riskLevel: 'normal' | 'warning' | 'critical';
}

export interface ClassSection {
  id: string;
  name: string;
  grade: string;
  room: string;
  teacherId: string;
  teacherName: string;
  scheduleTime: string;
  pupilCount: number;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedClassIds: string[];
  subjects?: string[];
  subject?: string;
  avatarUrl?: string;
}

export interface SubjectGradeRecord {
  id: string; // `${studentId}-${subject}-${term}`
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subject: string;
  term: string; // e.g. "First Term"
  ca1: number; // continuous assessment 1 (max 15)
  ca2: number; // continuous assessment 2 (max 15)
  assignment: number; // assignment / homework / project (max 10)
  exam: number; // terminal exam (max 60)
  total: number; // ca1 + ca2 + assignment + exam (max 100)
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  remark: string;
  vitalNotes?: string;
  updatedAt: string;
}

export interface StudentAttendanceEntry {
  status: AttendanceStatus;
  flag?: PupilFlag;
  note?: string;
  markedAt: string;
}

export interface AttendanceSession {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string;
  teacherId: string;
  teacherName: string;
  records: Record<string, StudentAttendanceEntry>;
  submittedAt?: string;
  isAutoFinalized?: boolean;
  isLocked?: boolean;
  unlockedByAdmin?: boolean;
  unlockedAt?: string;
  unlockedReason?: string;
}

export interface ParentAlert {
  id: string;
  timestamp: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  type: 'absence_notice' | 'chronic_threshold_exceeded' | 'late_notice';
  status: 'delivered' | 'pending' | 'failed';
  channel: 'SMS' | 'Email' | 'Both';
  message: string;
  triggerReason: string;
}

export interface AlertSettings {
  chronicAbsenceThreshold: number; // e.g. 3 absences
  windowDays: number; // e.g. 14 days (2 weeks)
  notificationTiming: 'immediate' | 'next_morning' | 'manual_only';
  rollCallSchedulePolicy: 'early_morning' | 'mid_morning' | 'flexible_all_day';
  rollCallCutoffTime: string; // e.g. '08:15', '11:30', '15:30'
  autoAbsentCutoffTime: string; // e.g. '15:30'
  notifyAdminOnThreshold: boolean;
  notifyParentOnThreshold: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  lateAlertEnabled: boolean;
}

export interface TeacherAnalytics {
  teacherId: string;
  teacherName: string;
  className: string;
  onTimeSubmissions: number;
  lateSubmissions: number;
  missedSubmissions: number;
  lastSubmissionTimestamp?: string;
  complianceRate: number; // 0-100%
}

export type AuditActionType =
  | 'ATTENDANCE_MARKED'
  | 'ATTENDANCE_OVERWRITTEN'
  | 'GRADE_RECORDED'
  | 'GRADE_MODIFIED'
  | 'RECORD_REVERTED'
  | 'SESSION_LOCKED'
  | 'SESSION_UNLOCKED'
  | 'PUPIL_CREATED'
  | 'PUPIL_DELETED'
  | 'TEACHER_REASSIGNED';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string e.g. "2026-10-19T14:32:00Z"
  formattedTime: string; // e.g. "2026-10-19 02:32 PM"
  actorRole: 'teacher' | 'admin' | 'gate';
  actorId: string;
  actorName: string;
  action: AuditActionType;
  targetType: 'attendance' | 'grade' | 'pupil' | 'teacher' | 'session';
  targetId: string;
  targetName: string; // Student name, class name, etc.
  classId?: string;
  className?: string;
  subject?: string;
  term?: string;
  dateStr?: string; // Date of attendance session
  oldValue?: string;
  newValue?: string;
  severity: 'info' | 'warning' | 'critical';
  details: string;
  canRevert?: boolean;
}

export interface TeacherClockRecord {
  id: string; // `${teacherId}-${date}`
  teacherId: string;
  teacherName: string;
  className?: string;
  date: string; // YYYY-MM-DD
  clockInTime?: string; // e.g. "07:42 AM"
  clockInTimestamp?: number;
  clockOutTime?: string; // e.g. "02:15 PM"
  clockOutTimestamp?: number;
  status: 'on_time' | 'late' | 'not_clocked_in';
  distanceMeters?: number;
  deviceInfo?: string;
  coords?: { lat: number; lng: number };
  codeUsed?: string;
  hoursWorked?: number;
  isWithinPerimeter?: boolean;
}

export interface SchoolPerimeterConfig {
  schoolName: string;
  schoolLat: number;
  schoolLng: number;
  radiusMeters: number;
  resumptionTime: string; // "08:00 AM"
  closingTime: string; // "02:00 PM"
  dailyEntranceCodeOverride?: Record<string, string>; // date -> 4-digit code
}

export interface TeacherDeviceLock {
  teacherId: string;
  teacherName: string;
  deviceFingerprint: string;
  deviceName: string;
  pairedAt: string;
  hardwareSignature?: {
    gpu?: string;
    cpuCores?: number;
    screenRes?: string;
  };
}
