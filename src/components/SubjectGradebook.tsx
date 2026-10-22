'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Save,
  CheckCircle2,
  Printer,
  Sparkles,
  Users,
  GraduationCap,
  Layers,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Student,
  ClassSection,
  Teacher,
  SubjectGradeRecord,
} from '@/types/attendance';
import {
  getSubjectGrades,
  batchSaveSubjectGrades,
  exportSubjectGradesCSV,
  downloadCSVFile,
} from '@/lib/storage';
import { downloadStudentReportCardPDF } from '@/lib/pdfReportGenerator';
import { computeGrade } from '@/lib/academicCalculations';

interface SubjectGradebookProps {
  currentTeacher: Teacher | undefined;
  assignedClasses: ClassSection[];
  allStudents: Student[];
  onDataUpdated?: () => void;
  onSelectStudentProfile?: (student: Student) => void;
}

export const SubjectGradebook: React.FC<SubjectGradebookProps> = ({
  currentTeacher,
  assignedClasses,
  allStudents,
  onDataUpdated,
  onSelectStudentProfile,
}) => {
  // Determine available subjects for this teacher
  const teacherSubjects = useMemo(() => {
    if (currentTeacher?.subjects && currentTeacher.subjects.length > 0) {
      return currentTeacher.subjects;
    }
    if (currentTeacher?.subject) {
      return [currentTeacher.subject];
    }
    return ['Mathematics', 'English Language', 'Basic Science', 'Civic Education'];
  }, [currentTeacher]);

  const [selectedSubject, setSelectedSubject] = useState<string>(teacherSubjects[0] || 'Mathematics');
  const [selectedClassId, setSelectedClassId] = useState<string>('all'); // 'all' or class ID
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // When teacher changes, reset selected subject to teacher's first subject
  useEffect(() => {
    if (teacherSubjects.length > 0 && !teacherSubjects.includes(selectedSubject)) {
      setSelectedSubject(teacherSubjects[0]);
    }
  }, [currentTeacher, teacherSubjects, selectedSubject]);

  // Load existing subject grades from storage (CA1: 15, CA2: 15, Assignment: 10, Exam: 60)
  const [recordsMap, setRecordsMap] = useState<Record<string, { ca1: number; ca2: number; assignment: number; exam: number; vitalNotes: string }>>({});

  useEffect(() => {
    const allGrades = getSubjectGrades();
    const map: Record<string, { ca1: number; ca2: number; assignment: number; exam: number; vitalNotes: string }> = {};

    allGrades.forEach((g) => {
      if (g.subject === selectedSubject && g.term === selectedTerm) {
        map[g.studentId] = {
          ca1: g.ca1,
          ca2: g.ca2,
          assignment: g.assignment ?? 0,
          exam: g.exam,
          vitalNotes: g.vitalNotes || '',
        };
      }
    });

    setRecordsMap(map);
    setHasUnsavedChanges(false);
  }, [selectedSubject, selectedTerm]);

  // Assigned class IDs for filtering
  const assignedClassIdSet = useMemo(() => {
    return new Set(assignedClasses.map((c) => c.id));
  }, [assignedClasses]);

  // Class lookup map
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    assignedClasses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [assignedClasses]);

  // Filter students: only those in this teacher's assigned classes
  const targetStudents = useMemo(() => {
    return allStudents.filter((s) => {
      // Must belong to teacher's classes
      if (!assignedClassIdSet.has(s.classId)) return false;

      // Class filter
      if (selectedClassId !== 'all' && s.classId !== selectedClassId) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
      }

      return true;
    });
  }, [allStudents, assignedClassIdSet, selectedClassId, searchQuery]);


  // Score change handler
  const handleScoreChange = (
    studentId: string,
    field: 'ca1' | 'ca2' | 'assignment' | 'exam',
    value: string,
    maxLimit: number
  ) => {
    const num = value === '' ? 0 : Math.min(maxLimit, Math.max(0, Number(value) || 0));
    setRecordsMap((prev) => {
      const current = prev[studentId] || { ca1: 0, ca2: 0, assignment: 0, exam: 0, vitalNotes: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: num,
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  // Note change handler
  const handleNoteChange = (studentId: string, text: string) => {
    setRecordsMap((prev) => {
      const current = prev[studentId] || { ca1: 0, ca2: 0, assignment: 0, exam: 0, vitalNotes: '' };
      return {
        ...prev,
        [studentId]: {
          ...current,
          vitalNotes: text,
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  // Save all grades (15 + 15 + 10 + 60 = 100)
  const handleSaveGrades = () => {
    const toSave: SubjectGradeRecord[] = targetStudents.map((s) => {
      const rec = recordsMap[s.id] || { ca1: 0, ca2: 0, assignment: 0, exam: 0, vitalNotes: '' };
      const total = rec.ca1 + rec.ca2 + rec.assignment + rec.exam;
      const { grade, remark } = computeGrade(total);

      return {
        id: `${s.id}-${selectedSubject}-${selectedTerm}`,
        studentId: s.id,
        studentName: s.name,
        classId: s.classId,
        className: classMap.get(s.classId) || s.classId,
        subject: selectedSubject,
        term: selectedTerm,
        ca1: rec.ca1,
        ca2: rec.ca2,
        assignment: rec.assignment,
        exam: rec.exam,
        total,
        grade,
        remark,
        vitalNotes: rec.vitalNotes,
        updatedAt: new Date().toISOString(),
      };
    });

    batchSaveSubjectGrades(
      toSave,
      currentTeacher ? { id: currentTeacher.id, name: currentTeacher.name, role: 'teacher' } : undefined
    );
    setHasUnsavedChanges(false);
    setSaveSuccessMsg(`Saved scores for ${toSave.length} pupils in ${selectedSubject}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);

    if (onDataUpdated) {
      onDataUpdated();
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const recordsToExport: SubjectGradeRecord[] = targetStudents.map((s) => {
      const rec = recordsMap[s.id] || { ca1: 0, ca2: 0, assignment: 0, exam: 0, vitalNotes: '' };
      const total = rec.ca1 + rec.ca2 + rec.assignment + rec.exam;
      const { grade, remark } = computeGrade(total);
      return {
        id: `${s.id}-${selectedSubject}-${selectedTerm}`,
        studentId: s.rollNumber,
        studentName: s.name,
        classId: s.classId,
        className: classMap.get(s.classId) || s.classId,
        subject: selectedSubject,
        term: selectedTerm,
        ca1: rec.ca1,
        ca2: rec.ca2,
        assignment: rec.assignment,
        exam: rec.exam,
        total,
        grade,
        remark,
        vitalNotes: rec.vitalNotes,
        updatedAt: new Date().toISOString(),
      };
    });

    const csv = exportSubjectGradesCSV(selectedSubject, selectedTerm, recordsToExport);
    downloadCSVFile(csv, `${selectedSubject.replace(/\s+/g, '_')}_BroadSheet_${selectedTerm.replace(/\s+/g, '_')}.csv`);
  };

  // Batch fill CA1, CA2, Assignment, or Exam with a default number for fast entry
  const handleQuickFill = (field: 'ca1' | 'ca2' | 'assignment' | 'exam', defaultVal: number) => {
    const fieldName = field === 'assignment' ? 'Assignment' : field.toUpperCase();
    if (confirm(`Fill ${fieldName} with ${defaultVal} marks for all ${targetStudents.length} pupils currently visible?`)) {
      setRecordsMap((prev) => {
        const next = { ...prev };
        targetStudents.forEach((s) => {
          const cur = next[s.id] || { ca1: 0, ca2: 0, assignment: 0, exam: 0, vitalNotes: '' };
          next[s.id] = { ...cur, [field]: defaultVal };
        });
        return next;
      });
      setHasUnsavedChanges(true);
    }
  };

  // Stats for the current view
  const stats = useMemo(() => {
    let totalScoreSum = 0;
    let gradedCount = 0;
    let aCount = 0;
    let fCount = 0;

    targetStudents.forEach((s) => {
      const r = recordsMap[s.id];
      if (r && (r.ca1 > 0 || r.ca2 > 0 || r.assignment > 0 || r.exam > 0)) {
        const tot = r.ca1 + r.ca2 + (r.assignment || 0) + r.exam;
        totalScoreSum += tot;
        gradedCount++;
        if (tot >= 75) aCount++;
        if (tot < 40) fCount++;
      }
    });

    const classAverage = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0';

    return { gradedCount, classAverage, aCount, fCount };
  }, [targetStudents, recordsMap]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Teacher Subject & Filter Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="h-1.5 w-full absolute top-0 left-0 bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Subject Gradebook & Continuous Assessment
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                • {currentTeacher?.name} ({assignedClasses.length} {assignedClasses.length === 1 ? 'Class' : 'Classes'})
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Grade Pupils by Subject</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Breakdown: <strong>CA 1 (/15)</strong> + <strong>CA 2 (/15)</strong> + <strong>Assignment (/10)</strong> + <strong>Exam (/60)</strong> = <strong>100 Marks</strong>. All pupil names taking your selected subject appear automatically.
            </p>
          </div>

          {/* Quick Actions (Save & Export) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveGrades}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs shadow-sm transition active:scale-95 ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/50'
                  : 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Save all grades to database & student dossiers"
            >
              <Save className="h-4 w-4" />
              <span>{hasUnsavedChanges ? 'Save Changes *' : 'Grades Saved'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold transition"
              title="Download CSV BroadSheet"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Export BroadSheet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (targetStudents.length > 0) {
                  const targetClass = assignedClasses.find((c) => c.id === selectedClassId) || assignedClasses[0];
                  downloadStudentReportCardPDF(targetStudents[0], targetClass);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Generate Official PDF Report Card"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>PDF Report Card</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}

        {/* 1-Click Subject Switcher Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
            Filter by Subject You Teach:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {teacherSubjects.map((subj) => {
              const isSelected = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-700 text-white shadow-sm border border-indigo-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{subj}</span>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              );
            })}

            {/* If teacher wants to select any other subject in school */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-300 text-xs rounded-2xl px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              title="Or choose other subject"
            >
              <option value={selectedSubject}>Custom / Other: {selectedSubject}</option>
              <option value="Mathematics">Mathematics</option>
              <option value="English Language">English Language</option>
              <option value="Basic Science">Basic Science</option>
              <option value="Civic Education">Civic Education</option>
              <option value="Computer Studies / ICT">Computer Studies / ICT</option>
              <option value="Agricultural Science">Agricultural Science</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Cultural & Creative Arts (CCA)">Cultural & Creative Arts (CCA)</option>
              <option value="Verbal Reasoning">Verbal Reasoning</option>
              <option value="Quantitative Reasoning">Quantitative Reasoning</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="Biology">Biology</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Classroom Section & Term & Search */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Class Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
              Class Section ({assignedClasses.length} Assigned)
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 border border-slate-300 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">★ All My Classes ({assignedClasses.map((c) => c.name).join(', ')})</option>
              {assignedClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Academic Term */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 border border-slate-300 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="First Term">First Term (2026/2027)</option>
              <option value="Second Term">Second Term (2026/2027)</option>
              <option value="Third Term">Third Term (2026/2027)</option>
            </select>
          </div>

          {/* Search Pupil Name */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
              Filter By Pupil Name / Roll #
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search pupil..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-slate-800 border border-slate-300 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-indigo-600" />
          <span className="text-xs font-semibold text-slate-500 block mb-1">Pupils in Roster</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{targetStudents.length}</span>
            <span className="text-xs font-medium text-slate-500">Taking {selectedSubject}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-emerald-600" />
          <span className="text-xs font-semibold text-emerald-800 block mb-1">Graded So Far</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{stats.gradedCount}</span>
            <span className="text-xs font-semibold text-emerald-800">
              {targetStudents.length > 0 ? Math.round((stats.gradedCount / targetStudents.length) * 100) : 0}% Done
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-sky-600" />
          <span className="text-xs font-semibold text-sky-800 block mb-1">Subject Average</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-sky-700">{stats.classAverage}</span>
            <span className="text-xs font-medium text-slate-500">/ 100 Marks</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs relative overflow-hidden">
          <div className="h-1 w-full absolute top-0 left-0 bg-purple-600" />
          <span className="text-xs font-semibold text-purple-800 block mb-1">Distinctions (Grade A)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">{stats.aCount}</span>
            <span className="text-xs font-medium text-purple-700">75% & above</span>
          </div>
        </div>
      </div>

      {/* Grade Entry Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
            <h3 className="text-sm font-bold text-slate-900">
              {selectedSubject} Score Sheet • {selectedTerm}
            </h3>
            <span className="text-xs text-slate-500">({targetStudents.length} pupils listed)</span>
          </div>

          {/* Quick Fill Helpers */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Quick Preset:</span>
            <button
              onClick={() => handleQuickFill('ca1', 12)}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200"
              title="Fill all CA1 with 12 marks"
            >
              CA1 = 12
            </button>
            <button
              onClick={() => handleQuickFill('ca2', 12)}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200"
              title="Fill all CA2 with 12 marks"
            >
              CA2 = 12
            </button>
            <button
              onClick={() => handleQuickFill('assignment', 9)}
              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200"
              title="Fill all Assignment with 9 marks"
            >
              Assignment = 9
            </button>
            <button
              onClick={() => handleQuickFill('exam', 48)}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold border border-slate-200"
              title="Fill all Exam with 48 marks"
            >
              Exam = 48
            </button>
          </div>
        </div>

        {targetStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="h-10 w-10 mx-auto mb-2 text-slate-400 opacity-60" />
            <p className="text-sm font-semibold text-slate-700">No pupils found matching the current filter.</p>
            <p className="text-xs text-slate-500 mt-1">Try switching the class section or clearing your search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-50/80">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[190px]">Pupil Details</th>
                  <th className="py-3 px-2 text-center w-20">
                    CA 1
                    <span className="block text-[9px] font-normal text-slate-500">Max 15</span>
                  </th>
                  <th className="py-3 px-2 text-center w-20">
                    CA 2
                    <span className="block text-[9px] font-normal text-slate-500">Max 15</span>
                  </th>
                  <th className="py-3 px-2 text-center w-22">
                    Assignment
                    <span className="block text-[9px] font-normal text-indigo-700 font-bold">Max 10</span>
                  </th>
                  <th className="py-3 px-2 text-center w-20">
                    Exam
                    <span className="block text-[9px] font-normal text-slate-500">Max 60</span>
                  </th>
                  <th className="py-3 px-2 text-center w-18">
                    Total
                    <span className="block text-[9px] font-normal text-slate-500">/ 100</span>
                  </th>
                  <th className="py-3 px-3 text-center w-24">Grade</th>
                  <th className="py-3 px-4 min-w-[200px]">Teacher Vital Remark & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {targetStudents.map((student, idx) => {
                  const rec = recordsMap[student.id] || { ca1: 0, ca2: 0, assignment: 0, exam: 0, vitalNotes: '' };
                  const total = rec.ca1 + rec.ca2 + (rec.assignment || 0) + rec.exam;
                  const { grade, remark, badgeColor } = computeGrade(total);
                  const className = classMap.get(student.classId) || student.classId;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/90 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Pupil details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <button
                              onClick={() => onSelectStudentProfile && onSelectStudentProfile(student)}
                              className="font-bold text-slate-900 hover:text-indigo-700 text-left transition flex items-center gap-1.5"
                              title="Click to view full dossier"
                            >
                              <span>{student.name}</span>
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {student.rollNumber}
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                {className}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CA 1 (/15) */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={rec.ca1 === 0 ? '' : rec.ca1}
                          placeholder="0"
                          onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value, 15)}
                          className="w-14 mx-auto text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-xl py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* CA 2 (/15) */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={rec.ca2 === 0 ? '' : rec.ca2}
                          placeholder="0"
                          onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value, 15)}
                          className="w-14 mx-auto text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-xl py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Assignment (/10) */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={rec.assignment === 0 ? '' : rec.assignment}
                          placeholder="0"
                          onChange={(e) => handleScoreChange(student.id, 'assignment', e.target.value, 10)}
                          className="w-14 mx-auto text-center font-bold text-sm bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Exam (/60) */}
                      <td className="py-3 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={rec.exam === 0 ? '' : rec.exam}
                          placeholder="0"
                          onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value, 60)}
                          className="w-14 mx-auto text-center font-bold text-sm bg-slate-50 border border-slate-300 rounded-xl py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>

                      {/* Total (/100) */}
                      <td className="py-3 px-2 text-center font-black text-base text-slate-900">
                        {total}
                      </td>

                      {/* Grade Badge */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeColor}`}>
                            Grade {grade}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">{remark}</span>
                        </div>
                      </td>

                      {/* Teacher Vital Notes / Remark */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Add vital comment, mastery note, or weakness..."
                          value={rec.vitalNotes}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Grading is auto-calculated per the Nigerian School Assessment standard: CA 1 (15) + CA 2 (15) + Assignment (10) + Exam (60) = 100 Marks.</span>
          </div>
          <button
            onClick={handleSaveGrades}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-800 underline"
          >
            Save all grades now &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
