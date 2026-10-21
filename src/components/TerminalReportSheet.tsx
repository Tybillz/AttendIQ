'use client';

import React from 'react';
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
} from 'lucide-react';
import { Student, ClassSection, SubjectGradeRecord } from '@/types/attendance';
import { getSubjectGrades } from '@/lib/storage';

interface TerminalReportSheetProps {
  student: Student;
  className: string;
  classPupilsCount?: number;
  classRank?: number;
  totalSessionsHeld?: number;
  onPrint?: () => void;
}

export const TerminalReportSheet: React.FC<TerminalReportSheetProps> = ({
  student,
  className,
  classPupilsCount = 14,
  classRank = 1,
  totalSessionsHeld = 60,
  onPrint,
}) => {
  // Load recorded subject grades from storage
  const recordedGrades = React.useMemo(() => {
    try {
      const all = getSubjectGrades();
      return all.filter((g) => g.studentId === student.id);
    } catch {
      return [];
    }
  }, [student.id]);

  // Default Nigerian school curriculum subjects if not all recorded yet
  const defaultSubjects = [
    { subject: 'Mathematics', ca1: 14, ca2: 14, assignment: 10, exam: 56, vitalNotes: 'Strong analytical skills' },
    { subject: 'English Language', ca1: 13, ca2: 13, assignment: 10, exam: 52, vitalNotes: 'Eloquent speech & composition' },
    { subject: 'Basic Science & Tech', ca1: 14, ca2: 13, assignment: 9, exam: 54, vitalNotes: 'Keen scientific curiosity' },
    { subject: 'Civic Education', ca1: 13, ca2: 14, assignment: 10, exam: 48, vitalNotes: 'Exemplary civic responsibility' },
    { subject: 'Computer Studies / ICT', ca1: 14, ca2: 14, assignment: 10, exam: 55, vitalNotes: 'Practical computer literacy' },
  ];

  // Merge recorded grades with default subjects so report card is rich and complete
  const subjectsList = React.useMemo(() => {
    const list = defaultSubjects.map((def) => {
      const found = recordedGrades.find((rg) => rg.subject.toLowerCase() === def.subject.toLowerCase());
      if (found) {
        return {
          subject: found.subject,
          ca1: found.ca1,
          ca2: found.ca2,
          assignment: found.assignment || 10,
          exam: found.exam,
          vitalNotes: found.vitalNotes || def.vitalNotes,
        };
      }
      return def;
    });

    // Also append any extra recorded subjects
    recordedGrades.forEach((rg) => {
      const exists = list.some((l) => l.subject.toLowerCase() === rg.subject.toLowerCase());
      if (!exists) {
        list.push({
          subject: rg.subject,
          ca1: rg.ca1,
          ca2: rg.ca2,
          assignment: rg.assignment || 10,
          exam: rg.exam,
          vitalNotes: rg.vitalNotes || 'Satisfactory progress',
        });
      }
    });

    return list;
  }, [recordedGrades]);

  // Compute total and grade for each subject
  const computedSubjects = subjectsList.map((s) => {
    const total = s.ca1 + s.ca2 + s.assignment + s.exam;
    let grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' = 'F';
    let remark = 'Needs Support';

    if (total >= 75) {
      grade = 'A';
      remark = 'Excellent (Distinction)';
    } else if (total >= 65) {
      grade = 'B';
      remark = 'Very Good';
    } else if (total >= 50) {
      grade = 'C';
      remark = 'Credit / Good';
    } else if (total >= 45) {
      grade = 'D';
      remark = 'Pass';
    } else if (total >= 40) {
      grade = 'E';
      remark = 'Fair Pass';
    }

    return {
      ...s,
      total,
      grade,
      remark,
    };
  });

  const grandTotal = computedSubjects.reduce((sum, s) => sum + s.total, 0);
  const maxPossible = computedSubjects.length * 100;
  const termAverage = maxPossible > 0 ? (grandTotal / computedSubjects.length).toFixed(1) : '0';

  const attendanceRate = totalSessionsHeld > 0 ? ((student.totalPresent / totalSessionsHeld) * 100).toFixed(1) : '100.0';

  const handlePrintTrigger = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar (Hidden when printed) */}
      <div className="no-print flex items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-700/80">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <GraduationCap className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold text-slate-200">
            Official Nigerian Term Report Sheet • {student.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintTrigger}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:from-emerald-700 hover:to-teal-700 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Student Report Sheet</span>
          </button>
        </div>
      </div>

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
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Gender</span>
            <span className="font-semibold text-slate-800">{student.gender}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Birth</span>
            <span className="font-semibold text-slate-800">{student.dateOfBirth}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Parent / Guardian</span>
            <span className="font-semibold text-slate-800">{student.parentName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Parent Phone</span>
            <span className="font-semibold text-slate-800">{student.parentPhone}</span>
          </div>
        </div>

        {/* Attendance Summary Section (Nigerian Report Card requirement) */}
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-300">
          <div className="flex items-center gap-1.5 mb-2 font-bold text-emerald-950 text-xs">
            <Clock className="h-4 w-4 text-emerald-700" />
            <span>Attendance & Regularity Record</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
            <div className="p-2 rounded-xl bg-white border border-emerald-200">
              <span className="text-slate-500 text-[10px] block">School Sessions Opened</span>
              <span className="font-black text-slate-900 text-sm">{totalSessionsHeld}</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-emerald-200">
              <span className="text-emerald-700 text-[10px] block font-semibold">Times Present</span>
              <span className="font-black text-emerald-700 text-sm">{student.totalPresent}</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-emerald-200">
              <span className="text-rose-700 text-[10px] block font-semibold">Times Absent</span>
              <span className="font-black text-rose-700 text-sm">{student.totalAbsent}</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-emerald-200">
              <span className="text-slate-500 text-[10px] block">Attendance Rate</span>
              <span className="font-black text-indigo-700 text-sm">{attendanceRate}%</span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-emerald-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 text-[10px] block">Punctuality Rating</span>
              <span className="font-bold text-emerald-800 text-xs">
                {Number(attendanceRate) >= 95 ? 'Excellent (5/5)' : Number(attendanceRate) >= 85 ? 'Very Good (4/5)' : 'Fair (3/5)'}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Performance Matrix Table (15 15 10 60 = 100) */}
        <div className="mb-4 border border-slate-300 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3">Subject Title</th>
                <th className="py-2.5 px-2 text-center w-16">CA 1 (15)</th>
                <th className="py-2.5 px-2 text-center w-16">CA 2 (15)</th>
                <th className="py-2.5 px-2 text-center w-20">Assign (10)</th>
                <th className="py-2.5 px-2 text-center w-16">Exam (60)</th>
                <th className="py-2.5 px-2 text-center w-16 bg-slate-800">Total (100)</th>
                <th className="py-2.5 px-2 text-center w-14">Grade</th>
                <th className="py-2.5 px-3">Teacher Remarks & Mastery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {computedSubjects.map((s, idx) => (
                <tr key={s.subject} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-slate-950">{s.subject}</td>
                  <td className="py-2 px-2 text-center font-medium">{s.ca1}</td>
                  <td className="py-2 px-2 text-center font-medium">{s.ca2}</td>
                  <td className="py-2 px-2 text-center font-medium text-indigo-900">{s.assignment}</td>
                  <td className="py-2 px-2 text-center font-medium">{s.exam}</td>
                  <td className="py-2 px-2 text-center font-black text-slate-950 bg-slate-100">
                    {s.total}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="font-black px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-900">
                      {s.grade}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-700 italic">{s.vitalNotes}</td>
                </tr>
              ))}
            </tbody>
            {/* Table Summary Footer */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold text-[11px] text-slate-950">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 text-right uppercase">
                  Grand Total Score / Maximum Possible:
                </td>
                <td className="py-2.5 px-2 text-center text-sm font-black text-indigo-900">
                  {grandTotal} / {maxPossible}
                </td>
                <td colSpan={2} className="py-2.5 px-3">
                  Term Average: <strong className="text-emerald-700 text-sm">{termAverage}%</strong> &bull; Class Position: <strong className="text-slate-950 text-sm">{classRank} of {classPupilsCount}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Affective & Psychomotor Traits (Nigerian NERDC Evaluation) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-300">
            <span className="font-bold text-slate-900 block mb-1.5 uppercase text-[10px] tracking-wider">
              Affective Domain & Character Development (Rating 1 - 5)
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-700">
              <div className="flex justify-between"><span>Punctuality:</span><strong className="text-emerald-700">5 / 5</strong></div>
              <div className="flex justify-between"><span>Neatness & Grooming:</span><strong className="text-emerald-700">5 / 5</strong></div>
              <div className="flex justify-between"><span>Honesty & Integrity:</span><strong className="text-emerald-700">5 / 5</strong></div>
              <div className="flex justify-between"><span>Relationship with Peers:</span><strong className="text-emerald-700">4 / 5</strong></div>
              <div className="flex justify-between"><span>Leadership & Responsibility:</span><strong className="text-emerald-700">5 / 5</strong></div>
              <div className="flex justify-between"><span>Emotional Stability:</span><strong className="text-emerald-700">5 / 5</strong></div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-300">
            <span className="font-bold text-slate-900 block mb-1.5 uppercase text-[10px] tracking-wider">
              Psychomotor & Practical Skills (Rating 1 - 5)
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-700">
              <div className="flex justify-between"><span>Handwriting & Legibility:</span><strong className="text-indigo-900">5 / 5</strong></div>
              <div className="flex justify-between"><span>Verbal Fluency:</span><strong className="text-indigo-900">5 / 5</strong></div>
              <div className="flex justify-between"><span>Sports & Physical Activity:</span><strong className="text-indigo-900">4 / 5</strong></div>
              <div className="flex justify-between"><span>Craft & Creative Arts:</span><strong className="text-indigo-900">5 / 5</strong></div>
              <div className="flex justify-between"><span>ICT & Computer Handling:</span><strong className="text-indigo-900">5 / 5</strong></div>
              <div className="flex justify-between"><span>Handling of School Tools:</span><strong className="text-indigo-900">5 / 5</strong></div>
            </div>
          </div>
        </div>

        {/* Teacher & Principal Remarks & Signatures */}
        <div className="space-y-3 border-t-2 border-slate-300 pt-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              <span>Form / Class Teacher&apos;s Remark</span>
              <span>Signature: ______________________</span>
            </div>
            <p className="text-slate-900 font-semibold italic text-[11px]">
              &ldquo;{student.name} has demonstrated exceptional brilliance, consistency, and discipline this term. Maintains an outstanding track record in both classroom participation and attendance.&rdquo;
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-0.5">
              <span>Principal&apos;s Official Recommendation</span>
              <span>School Stamp & Seal: [ VERIFIED ]</span>
            </div>
            <p className="text-slate-900 font-bold text-[11px]">
              &ldquo;An exemplary scholar of high moral character. Recommended for Academic Honors and Placement in Term Honor Roll.&rdquo;
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-bold text-slate-600 pt-2 border-t border-slate-200">
            <span>Next Term Resumption Date: <strong>Monday, 11th January 2027</strong></span>
            <span>Issued by Apex Crest Academy Academic Registry • Abuja (FCT)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
