'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  GraduationCap,
  Award,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Download,
  BookOpen,
  Pencil,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Student, ClassSection, SubjectGradeRecord, TerminalEvaluation } from '@/types/attendance';
import { getSubjectGrades, updateTerminalEvaluation } from '@/lib/storage';
import { getUnifiedAcademicReport } from '@/lib/academicCalculations';

interface TerminalReportSheetProps {
  student: Student;
  className: string;
  classPupilsCount?: number;
  classRank?: number;
  totalSessionsHeld?: number;
  onPrint?: () => void;
  onStudentUpdated?: () => void;
}

export const getDefaultEvaluation = (studentName: string): TerminalEvaluation => ({
  affective: {
    punctuality: 5,
    neatness: 5,
    honesty: 5,
    relationshipWithPeers: 4,
    leadership: 5,
    emotionalStability: 5,
  },
  psychomotor: {
    handwriting: 5,
    verbalFluency: 5,
    sports: 4,
    craft: 5,
    ict: 5,
    handlingOfTools: 5,
  },
  teacherRemark: `${studentName} has demonstrated exceptional brilliance, consistency, and discipline this term. Maintains an outstanding track record in both classroom participation and attendance.`,
  teacherSignature: 'Mrs. Victoria Adebayo',
  principalRecommendation: 'An exemplary scholar of high moral character. Recommended for Academic Honors and Placement in Term Honor Roll.',
  nextTermResumptionDate: 'Monday, 11th January 2027',
});

export const TerminalReportSheet: React.FC<TerminalReportSheetProps> = ({
  student,
  className,
  classPupilsCount = 14,
  classRank = 1,
  totalSessionsHeld = 60,
  onPrint,
  onStudentUpdated,
}) => {
  // Evaluation & Remarks State
  const [isEditingEvaluation, setIsEditingEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<TerminalEvaluation>(() => {
    return student.terminalEvaluation || getDefaultEvaluation(student.name);
  });
  const [savedSuccessNotice, setSavedSuccessNotice] = useState(false);

  useEffect(() => {
    if (student) {
      setEvaluation(student.terminalEvaluation || getDefaultEvaluation(student.name));
    }
  }, [student]);

  // Unified calculation engine guarantees zero discrepancies with Student Profile and PDF Report Card
  const reportData = React.useMemo(() => {
    return getUnifiedAcademicReport(student, className);
  }, [student, className]);

  const computedSubjects = reportData.subjects;
  const grandTotal = reportData.grandTotal;
  const maxPossible = reportData.maxPossible;
  const termAverage = reportData.termAverage;
  const effectiveSessionsHeld = reportData.attendance.totalDays;
  const attendanceRate = reportData.attendance.attendanceRate;
  const effectiveClassPosition = reportData.classPositionString;

  const handlePrintTrigger = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleSaveEvaluation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTerminalEvaluation(student.id, evaluation);
    setSavedSuccessNotice(true);
    setTimeout(() => setSavedSuccessNotice(false), 4000);
    setIsEditingEvaluation(false);
    onStudentUpdated?.();
  };

  const handleResetDefaults = () => {
    if (confirm(`Reset all ratings and remarks to standard school defaults for ${student.name}?`)) {
      const def = getDefaultEvaluation(student.name);
      setEvaluation(def);
      updateTerminalEvaluation(student.id, def);
      setSavedSuccessNotice(true);
      setTimeout(() => setSavedSuccessNotice(false), 3000);
      onStudentUpdated?.();
    }
  };

  const affectiveTraitsList: { key: keyof typeof evaluation.affective; label: string }[] = [
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'neatness', label: 'Neatness & Grooming' },
    { key: 'honesty', label: 'Honesty & Integrity' },
    { key: 'relationshipWithPeers', label: 'Relationship with Peers' },
    { key: 'leadership', label: 'Leadership & Responsibility' },
    { key: 'emotionalStability', label: 'Emotional Stability' },
  ];

  const psychomotorTraitsList: { key: keyof typeof evaluation.psychomotor; label: string }[] = [
    { key: 'handwriting', label: 'Handwriting & Legibility' },
    { key: 'verbalFluency', label: 'Verbal Fluency' },
    { key: 'sports', label: 'Sports & Physical Activity' },
    { key: 'craft', label: 'Craft & Creative Arts' },
    { key: 'ict', label: 'ICT & Computer Handling' },
    { key: 'handlingOfTools', label: 'Handling of School Tools' },
  ];

  const teacherRemarkPresets = [
    {
      title: 'Distinction / Outstanding',
      text: `${student.name} has demonstrated exceptional brilliance, consistency, and discipline this term. Maintains an outstanding track record in both classroom participation and attendance.`,
    },
    {
      title: 'Diligent & Promising',
      text: `${student.name} is a dedicated and hardworking pupil who shows great enthusiasm for learning. With continuous practice, will achieve even greater academic heights.`,
    },
    {
      title: 'Intellectual & Active',
      text: `${student.name} displays strong intellectual curiosity and participates actively in class discussions. Highly recommended for continued academic acceleration.`,
    },
    {
      title: 'Satisfactory / Needs Focus',
      text: `${student.name} is making steady progress. Needs to focus more on neatness of class assignments and punctuality to reach full academic potential.`,
    },
  ];

  const principalPresets = [
    {
      title: 'Honor Roll Placement',
      text: 'An exemplary scholar of high moral character. Recommended for Academic Honors and Placement in Term Honor Roll.',
    },
    {
      title: 'Promoted with High Honors',
      text: 'Outstanding terminal performance across cognitive, affective, and psychomotor domains. Promoted with High Honors.',
    },
    {
      title: 'Commended for Leadership',
      text: 'A well-rounded pupil of commendable character and diligence. Commended for leadership, discipline, and exemplary conduct.',
    },
    {
      title: 'Promoted to Next Grade',
      text: 'Has successfully fulfilled all academic requirements for the session. Promoted to the next class.',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Action Bar (Hidden when printed) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <span className="text-xs sm:text-sm font-bold text-white block">
              Official Nigerian Term Report Sheet • {student.name}
            </span>
            <span className="text-[11px] text-slate-400">
              Affective, psychomotor traits, teacher remarks & principal recommendations
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingEvaluation(!isEditingEvaluation)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
              isEditingEvaluation
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>{isEditingEvaluation ? 'Close Remarks Editor' : 'Edit Remarks & Ratings'}</span>
          </button>

          <button
            onClick={handlePrintTrigger}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:from-emerald-700 hover:to-teal-700 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report Sheet</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {savedSuccessNotice && (
        <div className="no-print p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Ratings, teacher remarks, and principal recommendations saved successfully!</span>
        </div>
      )}

      {/* INTERACTIVE REMARKS & RATINGS EDITOR (Visible when isEditingEvaluation is true) */}
      {isEditingEvaluation && (
        <form
          onSubmit={handleSaveEvaluation}
          className="no-print p-5 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-md space-y-6 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-950">
                Edit Affective & Psychomotor Ratings, Remarks & Recommendations
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1 font-semibold"
                title="Reset to default template"
              >
                <RotateCcw className="h-3 w-3" /> Reset Defaults
              </button>
            </div>
          </div>

          {/* 1. Affective Domain Ratings (1 to 5) */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Affective Domain & Character Development (Rating 1 - 5)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rate punctuality, neatness, honesty, leadership, and emotional traits (1 = Poor, 5 = Excellent)
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                NERDC Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {affectiveTraitsList.map(({ key, label }) => {
                const currentRating = evaluation.affective[key] ?? 5;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span className="text-xs font-medium text-slate-800">{label}:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const isSelected = currentRating === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() =>
                              setEvaluation((prev) => ({
                                ...prev,
                                affective: {
                                  ...prev.affective,
                                  [key]: score,
                                },
                              }))
                            }
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50'
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Psychomotor Skills Ratings (1 to 5) */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Psychomotor & Practical Skills (Rating 1 - 5)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rate physical, handwriting, sports, computer, and practical tool competencies
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                NERDC Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {psychomotorTraitsList.map(({ key, label }) => {
                const currentRating = evaluation.psychomotor[key] ?? 5;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span className="text-xs font-medium text-slate-800">{label}:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const isSelected = currentRating === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() =>
                              setEvaluation((prev) => ({
                                ...prev,
                                psychomotor: {
                                  ...prev.psychomotor,
                                  [key]: score,
                                },
                              }))
                            }
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-indigo-50'
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Form / Class Teacher's Remark */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Form / Class Teacher&apos;s Remark
                </label>
                <p className="text-[11px] text-slate-500">
                  Document terminal attendance, character assessment, and class participation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                <div className="flex flex-wrap gap-1">
                  {teacherRemarkPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setEvaluation((prev) => ({
                          ...prev,
                          teacherRemark: preset.text,
                        }))
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 font-semibold border border-slate-200"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <textarea
              rows={3}
              value={evaluation.teacherRemark}
              onChange={(e) =>
                setEvaluation((prev) => ({
                  ...prev,
                  teacherRemark: e.target.value,
                }))
              }
              required
              placeholder="Write comprehensive class teacher's evaluation..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-indigo-500 focus:bg-white"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Teacher Endorsement Name / Signature:
                </label>
                <input
                  type="text"
                  value={evaluation.teacherSignature || ''}
                  onChange={(e) =>
                    setEvaluation((prev) => ({
                      ...prev,
                      teacherSignature: e.target.value,
                    }))
                  }
                  placeholder="e.g. Mrs. Victoria Adebayo"
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* 4. Principal's Official Recommendation */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Principal&apos;s Official Recommendation & Promotion Endorsement
                </label>
                <p className="text-[11px] text-slate-500">
                  Final executive administrative endorsement and honor roll or promotion recommendation
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                <div className="flex flex-wrap gap-1">
                  {principalPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setEvaluation((prev) => ({
                          ...prev,
                          principalRecommendation: preset.text,
                        }))
                      }
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-semibold border border-slate-200"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <textarea
              rows={2}
              value={evaluation.principalRecommendation}
              onChange={(e) =>
                setEvaluation((prev) => ({
                  ...prev,
                  principalRecommendation: e.target.value,
                }))
              }
              required
              placeholder="Write principal's official recommendation..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-indigo-500 focus:bg-white"
            />

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Next Term Resumption Date:
              </label>
              <input
                type="text"
                value={evaluation.nextTermResumptionDate || ''}
                onChange={(e) =>
                  setEvaluation((prev) => ({
                    ...prev,
                    nextTermResumptionDate: e.target.value,
                  }))
                }
                placeholder="e.g. Monday, 11th January 2027"
                className="w-full sm:w-1/2 text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 focus:outline-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-300">
            <button
              type="button"
              onClick={() => setIsEditingEvaluation(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-amber-100 rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save & Apply to Report Sheet
            </button>
          </div>
        </form>
      )}

      {/* Printable Sheet Container (Styled for crisp white output on print) */}
      <div className="print-report-card bg-white text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg text-xs font-sans">
        {/* School Header & Crest */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-14 w-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-md">
              <GraduationCap className="h-9 w-9 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950">
                Apex Crest Academy
              </h1>
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Government Approved • Abuja (FCT), Nigeria
              </p>
              <p className="text-[10px] text-slate-500">
                Plot 412, Cadastral Zone B06, Mabushi District, Abuja • Tel: +234 803 234 5678
              </p>
            </div>
          </div>
          <div className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white font-bold text-[11px] tracking-wide uppercase mt-1">
            End of Term Comprehensive Academic & Attendance Report Sheet
          </div>
        </div>

        {/* Pupil Bio & Session Header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-300 mb-4 text-[11px]">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Pupil Name</span>
            <span className="font-black text-slate-950 text-xs">{student.name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Admission / Roll No.</span>
            <span className="font-mono font-bold text-slate-950">{student.rollNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Class Section</span>
            <span className="font-bold text-indigo-900">{className}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Term / Session</span>
            <span className="font-bold text-slate-950">First Term (2026/2027)</span>
          </div>
        </div>

        {/* Attendance Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-300 mb-4 text-[11px]">
          <div>
            <span className="text-emerald-900 block text-[9px] uppercase font-bold">School Days Held</span>
            <span className="font-bold text-slate-900">{effectiveSessionsHeld} Days</span>
          </div>
          <div>
            <span className="text-emerald-900 block text-[9px] uppercase font-bold">Days Present</span>
            <span className="font-bold text-emerald-700">{student.totalPresent} Days</span>
          </div>
          <div>
            <span className="text-emerald-900 block text-[9px] uppercase font-bold">Days Absent</span>
            <span className="font-bold text-rose-700">{student.totalAbsent} Days</span>
          </div>
          <div>
            <span className="text-emerald-900 block text-[9px] uppercase font-bold">Attendance Rate</span>
            <span className="font-black text-emerald-800 text-xs">{attendanceRate}%</span>
          </div>
        </div>

        {/* Cognitive Domain Table (Academic Continuous Assessment) */}
        <div className="overflow-x-auto mb-4 border border-slate-300 rounded-2xl">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-2 text-center">CA 1 (15)</th>
                <th className="py-2.5 px-2 text-center">CA 2 (15)</th>
                <th className="py-2.5 px-2 text-center">Assign (10)</th>
                <th className="py-2.5 px-2 text-center">Exam (60)</th>
                <th className="py-2.5 px-2 text-center">Total (100)</th>
                <th className="py-2.5 px-2 text-center">Grade</th>
                <th className="py-2.5 px-3">Teacher Observation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {computedSubjects.map((s, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                  <td className="py-2 px-3 font-bold text-slate-900">{s.subject}</td>
                  <td className="py-2 px-2 text-center">{s.ca1}</td>
                  <td className="py-2 px-2 text-center">{s.ca2}</td>
                  <td className="py-2 px-2 text-center">{s.assignment}</td>
                  <td className="py-2 px-2 text-center font-semibold text-slate-900">{s.exam}</td>
                  <td className="py-2 px-2 text-center font-bold text-indigo-900">{s.total}</td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        s.grade === 'A'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.grade === 'B'
                          ? 'bg-blue-100 text-blue-800'
                          : s.grade === 'C'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {s.grade}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 italic text-[10px]">{s.vitalNotes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-[11px] text-slate-900">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 text-right uppercase">
                  Grand Total Score / Maximum Possible:
                </td>
                <td className="py-2.5 px-2 text-center text-sm font-black text-indigo-900">
                  {grandTotal} / {maxPossible}
                </td>
                <td colSpan={2} className="py-2.5 px-3">
                  Term Average: <strong className="text-emerald-700 text-sm">{termAverage}%</strong> &bull; Class Position: <strong className="text-slate-950 text-sm">{effectiveClassPosition}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Affective & Psychomotor Traits (Nigerian NERDC Evaluation) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Affective Domain Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 relative group">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                Affective Domain & Character Development (Rating 1 - 5)
              </span>
              <button
                onClick={() => setIsEditingEvaluation(true)}
                className="no-print p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                title="Edit Affective Ratings"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-700">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Punctuality:</span>
                <strong className="text-emerald-700 font-bold">{evaluation.affective.punctuality} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Neatness & Grooming:</span>
                <strong className="text-emerald-700 font-bold">{evaluation.affective.neatness} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Honesty & Integrity:</span>
                <strong className="text-emerald-700 font-bold">{evaluation.affective.honesty} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Relationship with Peers:</span>
                <strong className="text-emerald-700 font-bold">{evaluation.affective.relationshipWithPeers} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Leadership & Responsibility:</span>
                <strong className="text-emerald-700 font-bold">{evaluation.affective.leadership} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Emotional Stability:</span>
                <strong className="text-emerald-700 font-bold">{evaluation.affective.emotionalStability} / 5</strong>
              </div>
            </div>
          </div>

          {/* Psychomotor Skills Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 relative group">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                Psychomotor & Practical Skills (Rating 1 - 5)
              </span>
              <button
                onClick={() => setIsEditingEvaluation(true)}
                className="no-print p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                title="Edit Psychomotor Ratings"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-700">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Handwriting & Legibility:</span>
                <strong className="text-indigo-900 font-bold">{evaluation.psychomotor.handwriting} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Verbal Fluency:</span>
                <strong className="text-indigo-900 font-bold">{evaluation.psychomotor.verbalFluency} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Sports & Physical Activity:</span>
                <strong className="text-indigo-900 font-bold">{evaluation.psychomotor.sports} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Craft & Creative Arts:</span>
                <strong className="text-indigo-900 font-bold">{evaluation.psychomotor.craft} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>ICT & Computer Handling:</span>
                <strong className="text-indigo-900 font-bold">{evaluation.psychomotor.ict} / 5</strong>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span>Handling of School Tools:</span>
                <strong className="text-indigo-900 font-bold">{evaluation.psychomotor.handlingOfTools} / 5</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher & Principal Remarks & Signatures */}
        <div className="space-y-3 border-t-2 border-slate-300 pt-3">
          {/* Form / Class Teacher Remark Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 relative group">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
              <div className="flex items-center gap-2">
                <span>Form / Class Teacher&apos;s Remark</span>
                <button
                  onClick={() => setIsEditingEvaluation(true)}
                  className="no-print p-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                  title="Edit Teacher's Remark"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <span>
                Signature: {evaluation.teacherSignature ? <strong className="text-slate-900 italic font-serif capitalize">{evaluation.teacherSignature}</strong> : '______________________'}
              </span>
            </div>
            <p className="text-slate-900 font-semibold italic text-[11px] leading-relaxed">
              &ldquo;{evaluation.teacherRemark}&rdquo;
            </p>
          </div>

          {/* Principal Recommendation Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 relative group">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase mb-1">
              <div className="flex items-center gap-2">
                <span>Principal&apos;s Official Recommendation</span>
                <button
                  onClick={() => setIsEditingEvaluation(true)}
                  className="no-print p-0.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                  title="Edit Principal's Recommendation"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
              <span className="text-emerald-700 font-bold">School Stamp & Seal: [ VERIFIED ]</span>
            </div>
            <p className="text-slate-900 font-bold text-[11px] leading-relaxed">
              &ldquo;{evaluation.principalRecommendation}&rdquo;
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-bold text-slate-600 pt-2 border-t border-slate-200">
            <span>
              Next Term Resumption Date: <strong>{evaluation.nextTermResumptionDate || 'Monday, 11th January 2027'}</strong>
            </span>
            <span>Issued by Apex Crest Academy Academic Registry • Abuja (FCT)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
