'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  UserPlus,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react';
import { Student, ClassSection } from '@/types/attendance';
import { updateStudent, addAuditLog } from '@/lib/storage';
import confetti from 'canvas-confetti';

interface AddPupilToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClass: ClassSection;
  allStudents: Student[];
  allClasses: ClassSection[];
  currentTeacherName: string;
  onStudentEnrolled: () => void;
}

export function AddPupilToClassModal({
  isOpen,
  onClose,
  targetClass,
  allStudents,
  allClasses,
  currentTeacherName,
  onStudentEnrolled,
}: AddPupilToClassModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unassigned' | 'transfer'>('all');
  const [confirmTransferStudent, setConfirmTransferStudent] = useState<{
    student: Student;
    currentClassName: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Map of classId -> Class Name
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    allClasses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [allClasses]);

  // Filtered directory list
  const filteredStudents = useMemo(() => {
    let list = allStudents.filter((s) => s.classId !== targetClass.id);

    if (filterType === 'unassigned') {
      list = list.filter((s) => !s.classId || s.classId === 'unassigned' || !classMap.has(s.classId));
    } else if (filterType === 'transfer') {
      list = list.filter((s) => s.classId && s.classId !== 'unassigned' && classMap.has(s.classId));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q) ||
          (classMap.get(s.classId) || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [allStudents, targetClass.id, filterType, searchQuery, classMap]);

  if (!isOpen) return null;

  // Handle enrollment / transfer
  const handleEnroll = (student: Student) => {
    const currentClassName = classMap.get(student.classId) || 'Unassigned / New Transfer';
    const isTransfer = Boolean(student.classId && classMap.has(student.classId));

    if (isTransfer) {
      setConfirmTransferStudent({ student, currentClassName });
      return;
    }

    executeEnrollment(student, currentClassName);
  };

  const executeEnrollment = (student: Student, oldClassName: string) => {
    const updated: Student = {
      ...student,
      classId: targetClass.id,
    };

    updateStudent(updated);

    try {
      addAuditLog({
        actorId: currentTeacherName || 'teacher',
        actorName: currentTeacherName || 'Form Teacher',
        actorRole: 'teacher',
        action: 'PUPIL_TRANSFERRED',
        targetType: 'pupil',
        targetId: student.id,
        targetName: student.name,
        details: `Form Teacher enrolled pupil "${student.name}" (${student.rollNumber}) into ${targetClass.name} (Previously in: ${oldClassName}).`,
        severity: 'info',
      });
    } catch {}

    setSuccessMessage(`✓ Successfully added ${student.name} to ${targetClass.name}!`);
    setConfirmTransferStudent(null);
    onStudentEnrolled();

    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch {}

    setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Add Pupil from School Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Enrolling into <strong className="text-indigo-900">{targetClass.name}</strong> • Class Teacher Authority
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Transfer Confirmation Dialog */}
        {confirmTransferStudent && (
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950">Confirm Pupil Class Stream Transfer</h4>
                <p className="text-xs text-amber-800 mt-1 leading-snug">
                  <strong>{confirmTransferStudent.student.name}</strong> ({confirmTransferStudent.student.rollNumber}) is currently enrolled in{' '}
                  <strong className="text-amber-950">{confirmTransferStudent.currentClassName}</strong>.
                  <br />
                  Do you want to transfer this pupil into your class (<strong>{targetClass.name}</strong>)?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmTransferStudent(null)}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeEnrollment(confirmTransferStudent.student, confirmTransferStudent.currentClassName)
                }
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold hover:from-amber-700 hover:to-orange-700 transition shadow-sm cursor-pointer"
              >
                Confirm Stream Transfer
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search directory by pupil name or roll/admission number..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Other Pupils ({allStudents.filter((s) => s.classId !== targetClass.id).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'unassigned'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unassigned Only
            </button>
            <button
              type="button"
              onClick={() => setFilterType('transfer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'transfer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              From Other Streams (Transfer)
            </button>
          </div>
        </div>

        {/* Directory Student List */}
        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No matching pupils found in school directory.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const currentClassName = classMap.get(student.classId);
              const isTransfer = Boolean(currentClassName);

              return (
                <div
                  key={student.id}
                  className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 hover:border-indigo-300 hover:shadow-xs transition"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={student.photoUrl || '/avatar-placeholder.png'}
                      alt={student.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-100"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{student.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                        <span>{student.rollNumber}</span>
                        <span>•</span>
                        <span
                          className={`font-sans font-semibold px-2 py-0.2 rounded-md ${
                            isTransfer
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isTransfer ? currentClassName : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEnroll(student)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                      isTransfer
                        ? 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {isTransfer ? (
                      <>
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        <span>Transfer In</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Enroll to Class</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          <span>Only verified pupils enrolled in the central school directory can be added.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
