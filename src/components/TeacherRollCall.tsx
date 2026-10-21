'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowUpDown,
  CheckCheck,
  Zap,
  Printer,
  Calendar,
  Send,
  Phone,
  Lock,
  Unlock,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Student,
  ClassSection,
  AttendanceStatus,
  PupilFlag,
  AttendanceSession,
  AlertSettings,
} from '@/types/attendance';
import { INITIAL_ALERT_SETTINGS } from '@/lib/initialData';
import {
  recordAttendanceEntry,
  autoTagUnmarkedPupilsAbsent,
  exportAttendanceReportCSV,
  downloadCSVFile,
  getAlertSettings,
  isSessionTimeLocked,
  toggleAdminSessionUnlock,
  getExcuseForStudentOnDate,
} from '@/lib/storage';
import { downloadClassAttendanceDossierPDF } from '@/lib/pdfReportGenerator';
import { generateWhatsAppUrl } from '@/lib/notifications';

interface TeacherRollCallProps {
  classes: ClassSection[];
  selectedClassId: string;
  onSelectClassId: (id: string) => void;
  selectedDate: string;
  students: Student[];
  currentSession: AttendanceSession | undefined;
  onSelectStudentProfile: (student: Student) => void;
  onDataUpdated: () => void;
  currentRole?: 'teacher' | 'admin' | 'gate';
}

export const TeacherRollCall: React.FC<TeacherRollCallProps> = ({
  classes,
  selectedClassId,
  onSelectClassId,
  selectedDate,
  students,
  currentSession,
  onSelectStudentProfile,
  onDataUpdated,
  currentRole = 'teacher',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'unmarked' | 'flagged'>('all');
  const [sortOrder, setSortOrder] = useState<'chronological' | 'alpha_asc' | 'alpha_desc'>('chronological');
  const [expandedPupilIds, setExpandedPupilIds] = useState<Record<string, boolean>>({});
  const [activeNotePupilId, setActiveNotePupilId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [selectedFlag, setSelectedFlag] = useState<PupilFlag>('late arrival');

  const alertSettings: AlertSettings = React.useMemo(() => {
    try {
      return getAlertSettings();
    } catch {
      return INITIAL_ALERT_SETTINGS;
    }
  }, []);

  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  // Compute live roll call metrics for the top bar
  const totalPupils = classStudents.length;
  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let unmarkedCount = 0;

  classStudents.forEach((s) => {
    const rec = currentSession?.records[s.id];
    if (rec?.status === 'present') presentCount++;
    else if (rec?.status === 'late') lateCount++;
    else if (rec?.status === 'absent') absentCount++;
    else unmarkedCount++;
  });

  const totalInSchool = presentCount + lateCount;
  const attendanceRate =
    totalInSchool + absentCount > 0 ? Math.round((totalInSchool / (totalInSchool + absentCount)) * 100) : 100;

  // Sorting
  const sortedStudents = [...classStudents].sort((a, b) => {
    if (sortOrder === 'chronological') {
      return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true });
    } else if (sortOrder === 'alpha_asc') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  // Filtering
  const displayedStudents = sortedStudents.filter((s) => {
    const status = currentSession?.records[s.id]?.status;
    const hasFlag = Boolean(currentSession?.records[s.id]?.flag);

    if (statusFilter === 'present' && status !== 'present') return false;
    if (statusFilter === 'late' && status !== 'late') return false;
    if (statusFilter === 'absent' && status !== 'absent') return false;
    if (statusFilter === 'unmarked' && status) return false;
    if (statusFilter === 'flagged' && !hasFlag) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isLocked = isSessionTimeLocked(
    selectedDate,
    selectedClassId,
    alertSettings,
    currentRole
  );

  const handleToggleAdminUnlock = () => {
    const isCurrentlyUnlocked = !!currentSession?.unlockedByAdmin;
    let reason = 'Principal authorized administrative correction';
    if (!isCurrentlyUnlocked) {
      const input = prompt(
        'AUTHORIZED UNLOCK JUSTIFICATION:\n\nPlease specify the reason for unlocking this past/closed attendance session (e.g. parent medical excuse, school sports conflict):',
        'Principal authorized correction'
      );
      if (!input || !input.trim()) return;
      reason = input.trim();
    }

    toggleAdminSessionUnlock(
      selectedDate,
      selectedClassId,
      { id: 'admin-1', name: 'School Administration' },
      reason
    );
    onDataUpdated();
  };

  const handleMark = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) {
      alert(`RECORD FROZEN:\n\nAttendance records for ${selectedDate} are time-locked to prevent retroactive tampering.\n\nOnly a School Administrator can unlock past attendance records.`);
      return;
    }

    const flag: PupilFlag | undefined = status === 'late' ? 'late arrival' : undefined;
    const teacherRecording = currentClass
      ? { id: currentClass.teacherId, name: currentClass.teacherName }
      : undefined;

    recordAttendanceEntry(
      selectedDate,
      selectedClassId,
      studentId,
      status,
      flag,
      status === 'late' ? 'Marked late in class' : undefined,
      teacherRecording
    );
    onDataUpdated();

    // Check if class just achieved 100% attendance (present + late)
    if ((status === 'present' || status === 'late') && totalInSchool + 1 === totalPupils) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleMarkAllPresent = () => {
    if (isLocked) {
      alert(`RECORD FROZEN:\n\nAttendance records for ${selectedDate} are time-locked. Cannot modify past records without Admin override.`);
      return;
    }

    classStudents.forEach((s) => {
      recordAttendanceEntry(
        selectedDate,
        selectedClassId,
        s.id,
        'present',
        undefined,
        undefined,
        currentClass ? { id: currentClass.teacherId, name: currentClass.teacherName } : undefined
      );
    });
    onDataUpdated();
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.5 },
    });
  };

  const handleAutoTagUnmarked = () => {
    if (unmarkedCount === 0) {
      alert('All pupils have already been marked for today.');
      return;
    }
    if (
      confirm(
        `Auto-tag all remaining ${unmarkedCount} unmarked pupils as Absent? Parents will receive notifications per your alert settings.`
      )
    ) {
      autoTagUnmarkedPupilsAbsent(selectedDate, selectedClassId);
      onDataUpdated();
    }
  };

  const toggleExpand = (studentId: string) => {
    setExpandedPupilIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSaveNote = (studentId: string) => {
    const existing = currentSession?.records[studentId]?.status || 'present';
    recordAttendanceEntry(
      selectedDate,
      selectedClassId,
      studentId,
      existing,
      selectedFlag,
      noteText.trim(),
      currentClass ? { id: currentClass.teacherId, name: currentClass.teacherName } : undefined
    );
    setActiveNotePupilId(null);
    setNoteText('');
    onDataUpdated();
  };

  // If this teacher has no assigned classes, show dedicated private screen
  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-12 animate-in fade-in">
        <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-2xs">
          <Lock className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Classroom Sections Assigned</h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Welcome! You are in the <strong>Teacher Attendance Portal</strong>. For privacy and record integrity, teachers are strictly restricted to only view and record attendance for their own assigned classes.
        </p>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900">How to get your class assigned:</p>
          <p className="text-slate-500 text-[11px]">
            Please inform the School Principal or Administrator to assign you to your classroom section in the <strong>Management Console &rarr; Teacher Database</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Class Selector & Session Live Indicator */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Active Classroom Section
              </label>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> Assigned Only
              </span>
            </div>

            <div className="flex items-center gap-2">
              {classes.length === 1 ? (
                <div className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2 flex items-center gap-2">
                  <span>{currentClass?.name}</span>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    Class Teacher
                  </span>
                </div>
              ) : (
                <select
                  value={selectedClassId}
                  onChange={(e) => onSelectClassId(e.target.value)}
                  className="text-base font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-xs font-semibold text-slate-700 block">
              Class Teacher: <strong className="text-slate-900">{currentClass?.teacherName}</strong>
            </span>
            <span className="text-[11px] text-slate-500 block" suppressHydrationWarning>
              Schedule: {
                alertSettings.rollCallSchedulePolicy === 'early_morning'
                  ? `Early Morning (Cutoff: ${alertSettings.rollCallCutoffTime || '08:15 AM'})`
                  : alertSettings.rollCallSchedulePolicy === 'flexible_all_day'
                  ? `Flexible All-Day (Open Until ${alertSettings.rollCallCutoffTime || '03:30 PM'})`
                  : `Recess / Break Sync (Cutoff: ${alertSettings.rollCallCutoffTime || '11:30 AM'})`
              }
            </span>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                Teacher Roll Call Active • {currentSession?.submittedAt || 'Live'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2">


          {/* Mark All Present */}
          <button
            onClick={handleMarkAllPresent}
            disabled={isLocked}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition shadow-md shadow-emerald-600/20 ${
              isLocked
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 active:scale-95'
            }`}
            title={isLocked ? 'Record is time-locked for this date' : 'Mark all pupils in class as present on time'}
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All Present</span>
          </button>

          {/* Auto Tag Unmarked */}
          <button
            onClick={handleAutoTagUnmarked}
            disabled={unmarkedCount === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold text-xs hover:from-rose-700 hover:to-pink-700 shadow-md shadow-rose-600/20 transition active:scale-95 disabled:opacity-40"
            title="Auto-flag remaining unmarked pupils as absent"
          >
            <Zap className="h-4 w-4" />
            <span>Auto-Tag Absent ({unmarkedCount})</span>
          </button>

          {/* Export Class CSV */}
          <button
            onClick={() => {
              const csv = exportAttendanceReportCSV(selectedClassId);
              downloadCSVFile(csv, `${currentClass?.name || 'Class'}_Attendance_${selectedDate}.csv`);
            }}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
            title="Download CSV Attendance Sheet"
          >
            <Printer className="h-4 w-4" />
          </button>

          {/* Export Official PDF Register */}
          <button
            onClick={() => {
              if (currentClass) {
                downloadClassAttendanceDossierPDF(currentClass, classStudents, currentSession, selectedDate);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition shadow-2xs cursor-pointer"
            title="Download Official PDF Attendance Dossier & Register"
          >
            <FileText className="h-4 w-4" />
            <span>PDF Register</span>
          </button>
        </div>
      </div>

      {/* Metric Counters Bar with Top Gradient Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Class Roster</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalPupils}</span>
            <span className="text-xs font-medium text-slate-400">Pupils</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-500/20 shadow-2xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <span className="text-xs font-semibold text-emerald-600 block mb-1 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Present On-Time
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{presentCount}</span>
            <span className="text-xs font-semibold text-emerald-600">
              {totalPupils > 0 ? Math.round((presentCount / totalPupils) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-500/20 shadow-2xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-400" />
          <span className="text-xs font-semibold text-amber-600 block mb-1 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Late Arrivals
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{lateCount}</span>
            <span className="text-xs font-semibold text-amber-600">
              {totalPupils > 0 ? Math.round((lateCount / totalPupils) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-500/20 shadow-2xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-rose-500 to-pink-500" />
          <span className="text-xs font-semibold text-rose-600 block mb-1 flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Total Absent
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600">{absentCount}</span>
            <span className="text-xs font-semibold text-rose-600">
              {totalPupils > 0 ? Math.round((absentCount / totalPupils) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Time-Lock & Anti-Tamper Status Banner */}
      {isLocked ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">
                  Record Time-Locked ({selectedDate})
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Tamper-Protection Enforced
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Past and concluded attendance sessions are frozen to prevent unauthorized alterations. Teachers cannot modify locked records.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {currentRole === 'admin' ? (
              <button
                type="button"
                onClick={handleToggleAdminUnlock}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-xs active:scale-95"
              >
                Admin Override: Unlock Session
              </button>
            ) : (
              <span className="text-[11px] text-amber-300 font-semibold bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30">
                🔒 Read-Only for Teachers
              </span>
            )}
          </div>
        </div>
      ) : currentSession?.unlockedByAdmin ? (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Unlock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-300">
                  Admin Authorized Override Active
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Audit Tracked
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Unlocked by {currentSession.unlockedReason || 'Administration'}. All modifications will be recorded with non-repudiation in the security audit trail.
              </p>
            </div>
          </div>

          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={handleToggleAdminUnlock}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold rounded-xl text-xs transition border border-rose-900/40"
            >
              Re-lock Session
            </button>
          )}
        </div>
      ) : null}

      {/* Toolbar: Search, Filters, Sort Order */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter pupils by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 w-full focus:outline-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap rounded-xl bg-slate-100 p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              All ({totalPupils})
            </button>
            <button
              onClick={() => setStatusFilter('present')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === 'present' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Present ({presentCount})
            </button>
            <button
              onClick={() => setStatusFilter('late')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === 'late' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Late ({lateCount})
            </button>
            <button
              onClick={() => setStatusFilter('absent')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === 'absent' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Absent ({absentCount})
            </button>
            <button
              onClick={() => setStatusFilter('unmarked')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                statusFilter === 'unmarked' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Unmarked ({unmarkedCount})
            </button>
          </div>
        </div>

        {/* Sort Order Selector */}
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="chronological">Chronological (Roll #)</option>
            <option value="alpha_asc">Alphabetical (A → Z)</option>
            <option value="alpha_desc">Alphabetical (Z → A)</option>
          </select>
        </div>
      </div>

      {/* Pupil Attendance List */}
      <div className="space-y-3">
        {displayedStudents.length > 0 ? (
          displayedStudents.map((student) => {
            const entry = currentSession?.records[student.id];
            const isPresent = entry?.status === 'present';
            const isLate = entry?.status === 'late';
            const isAbsent = entry?.status === 'absent';
            const isExcused = entry?.status === 'excused';
            const isExpanded = Boolean(expandedPupilIds[student.id]);
            const isAddingNote = activeNotePupilId === student.id;
            const excuse = getExcuseForStudentOnDate(student.id, selectedDate);

            const totalStudentDays = student.totalPresent + student.totalAbsent;
            const studentRate =
              totalStudentDays > 0 ? Math.round((student.totalPresent / totalStudentDays) * 100) : 100;

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl border transition-all duration-200 ${
                  isPresent
                    ? 'border-emerald-200/90 shadow-xs ring-1 ring-emerald-500/10'
                    : isLate
                    ? 'border-amber-200/90 shadow-xs ring-1 ring-amber-500/20'
                    : isAbsent
                    ? 'border-rose-200/90 shadow-xs ring-1 ring-rose-500/10'
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Main Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Avatar, Roll Number, Name, Risk Badge */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      onClick={() => onSelectStudentProfile(student)}
                      className="relative cursor-pointer group shrink-0"
                      title="Click to view full student profile"
                    >
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-100 group-hover:scale-105 transition-transform shadow-xs"
                      />
                      {isPresent && (
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white" title="Present on time">
                          ✓
                        </span>
                      )}
                      {isLate && (
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white" title="Late arrival">
                          ⏱
                        </span>
                      )}
                      {isAbsent && (
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white" title="Absent">
                          ✕
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {student.rollNumber}
                        </span>

                        <button
                          onClick={() => onSelectStudentProfile(student)}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition truncate text-left"
                        >
                          {student.name}
                        </button>

                        {isLate && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Late ({entry?.markedAt || 'In Class'})
                          </span>
                        )}

                        {student.totalAbsent >= 3 ? (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {student.totalAbsent} Absences
                          </span>
                        ) : student.totalAbsent >= 2 ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {student.totalAbsent} Absences
                          </span>
                        ) : null}

                        {excuse && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1" title={excuse.explanation}>
                            <CheckCircle2 className="h-3 w-3 text-purple-700" />
                            Parent Excuse: {excuse.reasonCategory}
                          </span>
                        )}

                        {entry?.flag && !isLate && (
                          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full capitalize">
                            Flag: {entry.flag}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span>Parent: {student.parentName}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">Phone: {student.parentPhone}</span>
                        {student.parentPhone && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <a
                              href={generateWhatsAppUrl(
                                student.parentPhone,
                                `Hello ${student.parentName}, this is a notice from Apex Crest Academy regarding ${student.name} in ${currentClass?.name || 'class'}.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition"
                            >
                              <MessageSquare className="h-3 w-3" /> WhatsApp Parent
                            </a>
                          </>
                        )}
                        {entry?.markedAt && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">Marked at {entry.markedAt}</span>
                          </>
                        )}
                      </div>

                      {excuse && !isPresent && !isExcused && (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              recordAttendanceEntry(
                                selectedDate,
                                selectedClassId,
                                student.id,
                                'excused',
                                undefined,
                                `Doctor/Parent Note: ${excuse.reasonCategory} - ${excuse.explanation}`,
                                currentClass ? { id: currentClass.teacherId, name: currentClass.teacherName } : undefined
                              );
                              onDataUpdated();
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Auto-apply submitted doctor/parent excuse"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Apply Excused Absence
                          </button>
                          <span className="text-[10px] text-slate-500 italic">
                            &ldquo;{excuse.explanation}&rdquo;
                          </span>
                        </div>
                      )}

                      {entry?.note && (
                        <div className="mt-1 text-xs text-slate-700 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60 inline-block">
                          &ldquo;{entry.note}&rdquo;
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle: Side Attendance Day Counters */}
                  <div className="flex items-center gap-3 shrink-0 py-1 px-3 rounded-2xl bg-slate-50/90 border border-slate-100">
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Present
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        {student.totalPresent} Days
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Absent
                      </span>
                      <span className="text-xs font-black text-rose-600">
                        {student.totalAbsent} Days
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div className="text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Rate
                      </span>
                      <span
                        className={`text-xs font-black ${
                          studentRate >= 90
                            ? 'text-indigo-600'
                            : studentRate >= 80
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {studentRate}%
                      </span>
                    </div>
                  </div>

                  {/* Right: Tactile Present, Late, and Absent Buttons, Alerts, and Note */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* PRESENT BUTTON */}
                    <button
                      onClick={() => handleMark(student.id, 'present')}
                      disabled={isLocked}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                        isLocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                          : isPresent
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 active:scale-95'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 active:scale-95'
                      }`}
                      title={isLocked ? 'Record is time-locked (frozen)' : 'Mark pupil present on time'}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Present</span>
                    </button>

                    {/* LATE BUTTON */}
                    <button
                      onClick={() => handleMark(student.id, 'late')}
                      disabled={isLocked}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                        isLocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                          : isLate
                          ? 'bg-amber-500 text-white ring-2 ring-amber-300 active:scale-95'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-500 hover:text-white border border-amber-200 active:scale-95'
                      }`}
                      title={isLocked ? 'Record is time-locked (frozen)' : 'Mark pupil late (arrived after cutoff)'}
                    >
                      <Clock className="h-4 w-4" />
                      <span>Late</span>
                    </button>

                    {/* ABSENT BUTTON */}
                    <button
                      onClick={() => handleMark(student.id, 'absent')}
                      disabled={isLocked}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                        isLocked
                          ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                          : isAbsent
                          ? 'bg-rose-600 text-white ring-2 ring-rose-300 active:scale-95'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white border border-rose-200 active:scale-95'
                      }`}
                      title={isLocked ? 'Record is time-locked (frozen)' : 'Mark pupil absent'}
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Absent</span>
                    </button>

                    {/* 1-CLICK NIGERIAN WHATSAPP PARENT ALERT (ABSENT) */}
                    {isAbsent && (
                      <a
                        href={`https://wa.me/${student.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Good morning ${student.parentName},\n\nThis is ${currentClass?.teacherName || 'the Class Teacher'} from Apex Crest Academy, Abuja.\n\nYour child, ${student.name} (${student.rollNumber}), was marked ABSENT at morning roll call today (${selectedDate}, 8:15 AM).\n\nPlease kindly confirm if ${student.name} is safe at home.\n\nThank you,\nSchool Administration`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 animate-in fade-in"
                        title="Send Immediate WhatsApp Absence Alert to Parent"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">WhatsApp Alert</span>
                      </a>
                    )}

                    {/* 1-CLICK NIGERIAN WHATSAPP PARENT ALERT (LATE) */}
                    {isLate && (
                      <a
                        href={`https://wa.me/${student.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Good morning ${student.parentName},\n\nThis is ${currentClass?.teacherName || 'the Class Teacher'} from Apex Crest Academy, Abuja.\n\nNotice: Your child, ${student.name} (${student.rollNumber}), arrived LATE to class today (${selectedDate}, ${entry?.markedAt || 'after morning assembly'}).\n\nPlease ensure ${student.name} departs home earlier to avoid missing vital morning instruction.\n\nThank you,\nSchool Administration`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 animate-in fade-in"
                        title="Send Immediate WhatsApp Late Arrival Alert to Parent"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Late Notice</span>
                      </a>
                    )}

                    {/* Quick Note Trigger */}
                    <button
                      onClick={() => {
                        setActiveNotePupilId(isAddingNote ? null : student.id);
                        setNoteText(entry?.note || '');
                        setSelectedFlag(entry?.flag || 'late arrival');
                      }}
                      className={`p-2.5 rounded-xl border text-xs transition ${
                        entry?.note || entry?.flag
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Add note or flag (Late, Left early, Nurse)"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>

                    {/* Expand Profile Accordion Toggle */}
                    <button
                      onClick={() => toggleExpand(student.id)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition"
                      title={isExpanded ? 'Collapse info' : 'Expand student record'}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Note Editor Popup (if active) */}
                {isAddingNote && (
                  <div className="p-4 bg-indigo-50/70 border-t border-indigo-100 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold text-indigo-900 shrink-0">Flag:</span>
                      <select
                        value={selectedFlag}
                        onChange={(e) => setSelectedFlag(e.target.value as PupilFlag)}
                        className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-700"
                      >
                        <option value="late arrival">Late Arrival</option>
                        <option value="left early">Left Early</option>
                        <option value="nurse visit">Nurse Visit</option>
                        <option value="behavioral">Behavioral Flag</option>
                        <option value="excused">Excused Absence</option>
                        <option value="unexcused">Unexcused Absence</option>
                      </select>
                    </div>

                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Add quick teacher note for this session..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setActiveNotePupilId(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveNote(student.id)}
                        className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-xs"
                      >
                        Save Flag
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Expandable Student Profile Preview */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Academic Performance Summary */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-600" /> Academic Exam Scores
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {student.academicRecords?.length || 0} Records
                          </span>
                        </div>
                        {student.academicRecords && student.academicRecords.length > 0 ? (
                          <div className="space-y-1.5">
                            {student.academicRecords.slice(0, 2).map((ar) => (
                              <div
                                key={ar.id}
                                className="flex items-center justify-between py-1 border-b border-slate-100 last:border-none"
                              >
                                <span className="truncate max-w-[150px] font-medium text-slate-700">
                                  {ar.title}
                                </span>
                                <span className="font-bold text-slate-900">
                                  {ar.score}/{ar.maxScore} (Gr. {ar.grade})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No exams recorded yet.</p>
                        )}
                      </div>

                      {/* Behavioral Notes & Flags */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-amber-600" /> Teacher Observations
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {student.behavioralNotes?.length || 0} Notes
                          </span>
                        </div>
                        {student.behavioralNotes && student.behavioralNotes.length > 0 ? (
                          <p className="text-[11px] text-slate-700 line-clamp-2">
                            &ldquo;{student.behavioralNotes[0].note}&rdquo;
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No behavioral notes logged.</p>
                        )}
                      </div>

                      {/* Parent & Emergency Info */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block mb-1">
                            Guardian & Emergency Contact
                          </span>
                          <p className="text-[11px] text-slate-600">
                            {student.parentName} ({student.parentPhone})
                          </p>
                          <p className="text-[11px] text-slate-400">{student.parentEmail}</p>
                        </div>

                        <div className="mt-2 text-right">
                          <button
                            onClick={() => onSelectStudentProfile(student)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                          >
                            Open Full Student Dossier →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No pupils found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Adjust your search keywords or filter criteria above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
