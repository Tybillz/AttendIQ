'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Users,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Search,
  FileSpreadsheet,
  Sparkles,
  Phone,
  ExternalLink,
  Pencil,
  Check,
  X,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  BarChart2,
  Share2,
  Save,
} from 'lucide-react';
import {
  Student,
  ClassSection,
  Teacher,
  SubjectGradeRecord,
  TerminalEvaluation,
} from '@/types/attendance';
import {
  getSubjectGrades,
  updateTerminalEvaluation,
  downloadCSVFile,
  getSchoolSubjects,
  getSubjectLevel,
} from '@/lib/storage';
import {
  getUnifiedAcademicReport,
  getClassLevel,
  computeGrade,
} from '@/lib/academicCalculations';
import { downloadStudentReportCardPDF } from '@/lib/pdfReportGenerator';
import { generateWhatsAppUrl } from '@/lib/notifications';
import { getSchoolBranding, isLicenseWriteRestricted } from '@/lib/licensing';

interface HomeroomBroadsheetProps {
  currentTeacher?: Teacher;
  classes: ClassSection[];
  allStudents: Student[];
  allTeachers: Teacher[];
  isAdmin?: boolean;
  onDataUpdated?: () => void;
  onSelectStudentProfile?: (student: Student) => void;
  isLicenseLocked?: boolean;
}

export const HomeroomBroadsheet: React.FC<HomeroomBroadsheetProps> = ({
  currentTeacher,
  classes,
  allStudents,
  allTeachers,
  isAdmin = false,
  onDataUpdated,
  onSelectStudentProfile,
  isLicenseLocked = false,
}) => {
  const isStrictReadOnly = isLicenseLocked || isLicenseWriteRestricted();
  const branding = getSchoolBranding();

  // Determine initial selected class:
  // If teacher has permanentClassId, default to that homeroom. Otherwise first class.
  const initialClassId = useMemo(() => {
    if (currentTeacher?.permanentClassId) {
      const found = classes.find((c) => c.id === currentTeacher.permanentClassId);
      if (found) return found.id;
    }
    return classes[0]?.id || '';
  }, [currentTeacher, classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [filterType, setFilterType] = useState<'all' | 'top' | 'needs_attention' | 'pending_remarks'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing Remark Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [quickRemark, setQuickRemark] = useState<string>('');
  const [quickSignature, setQuickSignature] = useState<string>('');
  const [quickAffective, setQuickAffective] = useState({
    punctuality: 5,
    neatness: 5,
    honesty: 5,
    relationshipWithPeers: 5,
    leadership: 4,
    emotionalStability: 5,
  });
  const [quickPsychomotor, setQuickPsychomotor] = useState({
    handwriting: 5,
    verbalFluency: 5,
    sports: 4,
    craft: 4,
    ict: 5,
    handlingOfTools: 4,
  });
  const [remarkSaveSuccess, setRemarkSaveSuccess] = useState<boolean>(false);

  // Active Class Section
  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  // Is this the logged-in teacher's homeroom class?
  const isMyHomeroom = currentTeacher?.permanentClassId === activeClass?.id;

  // Form Master of this class
  const classFormMaster = useMemo(() => {
    if (!activeClass) return null;
    return allTeachers.find((t) => t.id === activeClass.teacherId) || null;
  }, [allTeachers, activeClass]);

  // Pupils in active class
  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    return allStudents.filter((s) => s.classId === activeClass.id);
  }, [allStudents, activeClass]);

  // Grade records from storage
  const allGrades = useMemo(() => {
    return getSubjectGrades();
  }, [allStudents]);

  // Determine Class Level (Nursery, Primary, Secondary)
  const classLevel = useMemo(() => {
    if (!activeClass) return 'primary';
    return getClassLevel(activeClass.name || activeClass.grade);
  }, [activeClass]);

  // Relevant subjects for this class
  const classSubjects = useMemo(() => {
    const allSubjects = getSchoolSubjects();
    const filtered = allSubjects.filter((subj) => {
      const lvl = getSubjectLevel(subj);
      return lvl === 'all' || lvl === classLevel;
    });
    return filtered.length > 0 ? filtered : ['Mathematics', 'English Language', 'Basic Science', 'Civic Education'];
  }, [classLevel]);

  // Subject Submission Progress: For each subject, how many pupils have scores?
  const subjectProgress = useMemo(() => {
    if (classStudents.length === 0) return [];

    return classSubjects.map((subj) => {
      // Find the teacher assigned to teach this subject in this class
      const assignedTeacher = allTeachers.find((t) => {
        const teachesClass = t.assignedClassIds?.includes(activeClass?.id || '') || t.id === activeClass?.teacherId;
        const teachesSubject = (t.subjects || []).includes(subj) || t.subject === subj;
        return teachesClass && teachesSubject;
      }) || classFormMaster || allTeachers[0];

      // Count students with saved scores for this subject
      const submittedCount = classStudents.filter((stu) => {
        return allGrades.some(
          (g) => g.studentId === stu.id && g.subject.toLowerCase() === subj.toLowerCase() && g.term === selectedTerm
        );
      }).length;

      const totalStudents = classStudents.length;
      const percent = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
      const isComplete = submittedCount >= totalStudents;
      const isPartial = submittedCount > 0 && submittedCount < totalStudents;

      return {
        subject: subj,
        teacher: assignedTeacher,
        submittedCount,
        totalStudents,
        percent,
        isComplete,
        isPartial,
        isPending: submittedCount === 0,
      };
    });
  }, [classSubjects, classStudents, allTeachers, activeClass, classFormMaster, allGrades, selectedTerm]);

  // Compute full academic reports for every pupil in this class
  const broadsheetData = useMemo(() => {
    if (!activeClass || classStudents.length === 0) return [];

    const reports = classStudents.map((student) => {
      const report = getUnifiedAcademicReport(student, activeClass.name, activeClass);
      return {
        student,
        report,
      };
    });

    // Sort by term average descending (highest score first)
    reports.sort((a, b) => b.report.termAverageNum - a.report.termAverageNum);

    return reports;
  }, [activeClass, classStudents]);

  // Apply Search and Tab Filters
  const filteredBroadsheet = useMemo(() => {
    return broadsheetData.filter(({ student, report }, index) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = student.name.toLowerCase().includes(q);
        const matchesRoll = student.rollNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll) return false;
      }

      // Filter tabs
      if (filterType === 'top') {
        return report.termAverageNum >= 75;
      }
      if (filterType === 'needs_attention') {
        return report.termAverageNum < 50;
      }
      if (filterType === 'pending_remarks') {
        const defRem = `${student.name} has demonstrated exceptional brilliance`;
        return !student.terminalEvaluation?.teacherRemark || student.terminalEvaluation.teacherRemark.includes(defRem);
      }

      return true;
    });
  }, [broadsheetData, searchQuery, filterType]);

  // Summary Metrics for this class
  const classMetrics = useMemo(() => {
    if (broadsheetData.length === 0) {
      return { classAverage: 0, highestAvg: 0, lowestAvg: 0, passRate: 0 };
    }
    const averages = broadsheetData.map((b) => b.report.termAverageNum);
    const sum = averages.reduce((a, b) => a + b, 0);
    const classAverage = Number((sum / averages.length).toFixed(1));
    const highestAvg = Math.max(...averages);
    const lowestAvg = Math.min(...averages);
    const passCount = averages.filter((a) => a >= 50).length;
    const passRate = Math.round((passCount / averages.length) * 100);

    return { classAverage, highestAvg, lowestAvg, passRate };
  }, [broadsheetData]);

  // Open Quick Remark Modal
  const handleOpenRemarkModal = (student: Student) => {
    const ev = student.terminalEvaluation;
    setEditingStudent(student);
    setQuickRemark(
      ev?.teacherRemark ||
        `${student.name} is a hardworking and attentive pupil who demonstrates commendable dedication to academic tasks.`
    );
    setQuickSignature(
      ev?.teacherSignature || classFormMaster?.name || currentTeacher?.name || 'Form Master'
    );
    if (ev?.affective) setQuickAffective(ev.affective);
    if (ev?.psychomotor) setQuickPsychomotor(ev.psychomotor);
    setRemarkSaveSuccess(false);
  };

  // Save Quick Remark
  const handleSaveRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || isStrictReadOnly) return;

    const evaluation: TerminalEvaluation = {
      affective: quickAffective,
      psychomotor: quickPsychomotor,
      teacherRemark: isAdmin
        ? (editingStudent.terminalEvaluation?.teacherRemark || quickRemark.trim())
        : quickRemark.trim(),
      teacherSignature: isAdmin
        ? (editingStudent.terminalEvaluation?.teacherSignature || classFormMaster?.name || 'Form Master')
        : (quickSignature.trim() || classFormMaster?.name || 'Form Master'),
      principalRecommendation: isAdmin
        ? quickRemark.trim()
        : (editingStudent.terminalEvaluation?.principalRecommendation || 'Approved for promotion with commendable academic merit.'),
      nextTermResumptionDate:
        editingStudent.terminalEvaluation?.nextTermResumptionDate || 'Monday, 11th January 2027',
    };

    updateTerminalEvaluation(editingStudent.id, evaluation);
    setRemarkSaveSuccess(true);
    setTimeout(() => {
      setRemarkSaveSuccess(false);
      setEditingStudent(null);
      onDataUpdated?.();
    }, 1000);
  };

  // Export Broadsheet CSV
  const handleExportCSV = () => {
    if (broadsheetData.length === 0) return;

    const headers = [
      'Rank',
      'Roll Number',
      'Student Name',
      'Gender',
      ...classSubjects,
      'Grand Total',
      'Average (%)',
      'Grade',
      'Form Master Remark',
    ];

    const rows = broadsheetData.map(({ student, report }, idx) => {
      const subjectCols = classSubjects.map((sName) => {
        const found = report.subjects.find((sub) => sub.subject.toLowerCase() === sName.toLowerCase());
        return found ? found.total : 'N/A';
      });

      return [
        idx + 1,
        `"${student.rollNumber}"`,
        `"${student.name}"`,
        student.gender,
        ...subjectCols,
        report.grandTotal,
        report.termAverage,
        report.subjects[0]?.grade || 'A',
        `"${(student.terminalEvaluation?.teacherRemark || report.teacherRemark).replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSVFile(csvContent, `AttendIQ_Broadsheet_${(activeClass?.name || 'Class').replace(/\s+/g, '_')}_${selectedTerm.replace(/\s+/g, '_')}.csv`);
  };

  // Send WhatsApp Reminder to Subject Teacher
  const handleSendSubjectTeacherReminder = (subj: string, teacher: Teacher) => {
    const schoolName = branding?.schoolName || 'AttendIQ Academy';
    const formMasterName = classFormMaster?.name || currentTeacher?.name || 'Form Master';
    const msg =
      `*REMINDER: ${schoolName.toUpperCase()} RESULT COMPUTATION* 📚\n\n` +
      `Hello *${teacher.name}*,\n` +
      `This is *${formMasterName}* (Form Master of *${activeClass?.name}*).\n\n` +
      `Kindly remember to enter the official Continuous Assessment and Exam scores for *${subj}* on the AttendIQ Portal so we can finalize the class terminal broadsheet.\n\n` +
      `Portal Link: ${typeof window !== 'undefined' ? window.location.origin : 'https://resultiq.vercel.app'}\n\n` +
      `Thank you for your dedicated cooperation!`;

    const cleanPhone = (teacher.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length >= 10) {
      window.open(generateWhatsAppUrl(teacher.phone, msg), '_blank');
    } else {
      alert(`Teacher ${teacher.name} has no valid WhatsApp phone registered in the Staff Database.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ── TOP BANNER: CLASS SELECTION & OVERVIEW ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl ${isAdmin ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700' : 'bg-gradient-to-tr from-amber-500 to-amber-600'} text-white flex items-center justify-center shrink-0 shadow-md`}>
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {isAdmin ? 'Master School Broadsheet & Final Results' : 'Class Broadsheet & Terminal Reports'}
                </h3>
                {isAdmin ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800">
                    👑 Principal Executive Review
                  </span>
                ) : isMyHomeroom ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    ★ Your Homeroom Class
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Master compilation of all subject teacher scores across all classes. View submission completion, audit rankings, and officially endorse report cards.'
                  : 'Master terminal broadsheet combining all subject teachers’ scores with live ranking and PDF generation'}
              </p>
            </div>
          </div>

          {/* Quick Actions (Print, Export CSV) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={classStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-40"
              title="Download full class broadsheet as Excel CSV"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={classStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-40"
              title="Print official broadsheet matrix"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Broadsheet</span>
            </button>
          </div>
        </div>

        {/* Selection Dropdowns Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {isAdmin ? 'Select Class to Audit:' : 'Select Homeroom Class:'}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {classes.map((c) => {
                const isFormTeacher = currentTeacher?.permanentClassId === c.id;
                const formMasterTeacher = allTeachers.find((t) => t.permanentClassId === c.id || t.id === c.teacherId);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade}) {isAdmin ? `• Form Master: ${formMasterTeacher?.name || 'Unassigned'}` : isFormTeacher ? '★ [Your Homeroom]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Academic Term:
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="First Term">First Term (2026/2027)</option>
              <option value="Second Term">Second Term (2026/2027)</option>
              <option value="Third Term">Third Term (2026/2027)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Permanent Form Master:
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              <GraduationCap className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="truncate">{classFormMaster?.name || 'Class Teacher'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Class Average</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{classMetrics.classAverage}%</span>
            <span className="text-[11px] text-emerald-600 font-bold">Overall</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Top Performer</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600">{classMetrics.highestAvg}%</span>
            <span className="text-[11px] text-amber-500 font-bold">🥇 1st Pos</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Enrolled Pupils</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{classStudents.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">registered</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pass Rate (&ge;50%)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{classMetrics.passRate}%</span>
            <span className="text-[11px] text-emerald-500 font-bold">Passing</span>
          </div>
        </div>
      </div>

      {/* ── SUBJECT SUBMISSION PROGRESS TRACKER ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Subject Teachers Submission Status ({subjectProgress.length} Subjects)</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Track which subject teachers have submitted continuous assessments and exam marks for this class
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle2 className="h-3 w-3" /> Complete
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
              <Clock className="h-3 w-3" /> Partial
            </span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 text-rose-500 font-bold">
              <AlertCircle className="h-3 w-3" /> Pending
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {subjectProgress.map((sp) => {
            return (
              <div
                key={sp.subject}
                className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                  sp.isComplete
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
                    : sp.isPartial
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {sp.subject}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        sp.isComplete
                          ? 'bg-emerald-600 text-white'
                          : sp.isPartial
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sp.submittedCount}/{sp.totalStudents}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Taught by: <strong className="text-slate-700 dark:text-slate-300">{sp.teacher?.name || 'Faculty Member'}</strong>
                  </p>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  {/* Progress bar */}
                  <div className="flex-1 max-w-[100px] bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mr-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        sp.isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${sp.percent}%` }}
                    />
                  </div>

                  {!sp.isComplete && sp.teacher?.phone && (
                    <button
                      type="button"
                      onClick={() => handleSendSubjectTeacherReminder(sp.subject, sp.teacher)}
                      className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      title="Send friendly reminder to this subject teacher via WhatsApp"
                    >
                      <Phone className="h-2.5 w-2.5" />
                      <span>Remind</span>
                    </button>
                  )}
                  {sp.isComplete && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                      <Check className="h-3 w-3" /> Ready
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MASTER BROADSHEET TABLE ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
        {/* Table Filter / Search Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Pupils ({classStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('top')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'top'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              🥇 Top Honors (&ge;75%)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('needs_attention')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'needs_attention'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              ⚠️ Needs Attention (&lt;50%)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pending_remarks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'pending_remarks'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              ✍️ Pending Remarks
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student in broadsheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-xs border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-3 w-12 text-center">Rank</th>
                <th className="px-3 py-3 min-w-[180px]">Pupil Name &amp; Admission</th>
                {classSubjects.map((subj) => (
                  <th key={subj} className="px-2 py-3 text-center min-w-[70px]" title={subj}>
                    <span className="truncate block max-w-[85px] mx-auto">{subj.split(' ')[0]}</span>
                    <span className="text-[8px] font-normal text-slate-400 block lowercase">/100</span>
                  </th>
                ))}
                <th className="px-3 py-3 text-center min-w-[75px]">Grand Total</th>
                <th className="px-3 py-3 text-center min-w-[65px]">Average</th>
                <th className="px-2 py-3 text-center min-w-[50px]">Grade</th>
                <th className="px-3 py-3 min-w-[160px]">Form Master Endorsement</th>
                <th className="px-3 py-3 text-right min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBroadsheet.length === 0 ? (
                <tr>
                  <td colSpan={classSubjects.length + 7} className="text-center py-12 text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">No students matching the selected criteria</p>
                  </td>
                </tr>
              ) : (
                filteredBroadsheet.map(({ student, report }, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  const hasRemark = Boolean(student.terminalEvaluation?.teacherRemark);

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Rank Column */}
                      <td className="px-3 py-2.5 text-center font-bold">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-2xs">
                            🥇 1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-2xs">
                            🥈 2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-amber-100 font-black text-xs shadow-2xs">
                            🥉 3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">{rank}</span>
                        )}
                      </td>

                      {/* Pupil Info */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onSelectStudentProfile?.(student)}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition truncate block max-w-[140px] cursor-pointer"
                              title="Click to view full dossier"
                            >
                              {student.name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {student.rollNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Subject Score Columns */}
                      {classSubjects.map((subjName) => {
                        const found = report.subjects.find(
                          (sub) => sub.subject.toLowerCase() === subjName.toLowerCase()
                        );
                        const score = found ? found.total : null;
                        const grade = found ? found.grade : '-';

                        return (
                          <td key={subjName} className="px-2 py-2.5 text-center font-mono font-semibold">
                            {score !== null ? (
                              <div className="flex flex-col items-center">
                                <span
                                  className={`text-xs font-bold ${
                                    score >= 70
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : score >= 50
                                      ? 'text-slate-800 dark:text-slate-200'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {score}
                                </span>
                                <span className="text-[8px] uppercase text-slate-400 font-normal">
                                  {grade}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Grand Total */}
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {report.grandTotal}
                      </td>

                      {/* Term Average */}
                      <td className="px-3 py-2.5 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            report.termAverageNum >= 75
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : report.termAverageNum >= 50
                              ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}
                        >
                          {report.termAverage}%
                        </span>
                      </td>

                      {/* Overall Grade */}
                      <td className="px-2 py-2.5 text-center font-bold">
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-black">
                          {computeGrade(report.termAverageNum).grade}
                        </span>
                      </td>

                      {/* Form Master Endorsement Status */}
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenRemarkModal(student)}
                          className="w-full text-left p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer group/btn"
                          title="Click to edit Form Master remark and psychomotor traits"
                        >
                          <div className="flex items-center gap-1.5">
                            <Pencil className="h-3 w-3 text-amber-500 group-hover/btn:scale-110 transition-transform" />
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px] block">
                              {student.terminalEvaluation?.teacherRemark || 'Add Form Master remark...'}
                            </span>
                          </div>
                        </button>
                      </td>

                      {/* Actions (View Report / Download PDF) */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectStudentProfile?.(student)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                            title="View / Print Full Terminal Report Sheet"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadStudentReportCardPDF(student, activeClass)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            title="Download Official PDF Report Card"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── QUICK REMARK & CONDUCT MODAL DRAWER ── */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white flex items-center justify-between border-b border-amber-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Form Master Terminal Endorsement</h4>
                  <p className="text-xs text-amber-200">{editingStudent.name} ({activeClass?.name})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {remarkSaveSuccess && (
              <div className="p-3 bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>End-of-term endorsement saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveRemark} className="p-5 overflow-y-auto space-y-4">
              {/* Presets */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                  1-Click Preset Remarks ({isAdmin ? "Principal Endorsements" : "Form Teacher"}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(isAdmin ? [
                    'Outstanding academic attainment and exemplary leadership! Promoted with honours.',
                    'Very good academic results this term. Demonstrates sound mastery across subjects.',
                    'Satisfactory performance. Recommended for promotion with advice to strengthen weak areas.',
                    'Promoted on trial. Consistent holiday revision advised in core subjects.',
                  ] : [
                    'Outstanding academic performance! Keeps up an exemplary attitude.',
                    'A disciplined, hardworking, and attentive scholar with great promise.',
                    'Good progress shown this term. Capable of higher attainment with consistency.',
                    'Shows genuine enthusiasm in class activities. Recommended to focus on mathematics.',
                  ]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuickRemark(preset)}
                      className="text-[10px] text-left p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      &ldquo;{preset.slice(0, 45)}...&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Remark Text */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  {isAdmin ? "Principal Official Endorsement & Recommendation *" : "Form Teacher Remark *"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={quickRemark}
                  onChange={(e) => setQuickRemark(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder={isAdmin ? "Type official Principal's recommendation for report card..." : "Type your official end-of-term remark here..."}
                />
              </div>

              {/* Signature Name */}
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  {isAdmin ? "Principal / Approver Official Title:" : "Form Master Sign-off Name:"}
                </label>
                <input
                  type="text"
                  value={quickSignature}
                  onChange={(e) => setQuickSignature(e.target.value)}
                  placeholder={isAdmin ? "e.g. Dr. A. O. Balogun (Principal)" : "e.g. Mrs. Victoria Adebayo"}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Affective & Psychomotor Traits */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Affective Domain Ratings (1 - 5):
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(quickAffective).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="capitalize text-slate-600 dark:text-slate-400 text-[11px]">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <select
                        value={val}
                        onChange={(e) =>
                          setQuickAffective((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                        className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                      >
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Very Good</option>
                        <option value={3}>3 - Good</option>
                        <option value={2}>2 - Fair</option>
                        <option value={1}>1 - Poor</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStrictReadOnly}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Endorsement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

