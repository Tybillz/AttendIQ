'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Plus,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  Search,
  Camera,
  FolderPlus,
  GraduationCap,
  ArrowRightLeft,
  Award,
  ExternalLink,
} from 'lucide-react';
import { Student, ClassSection, Teacher } from '@/types/attendance';
import {
  addStudent,
  deleteStudent,
  moveStudentToClass,
  bulkMoveStudentsToClass,
  bulkImportPupilsFromCSV,
  downloadCSVFile,
} from '@/lib/storage';
import { calculateStudentAttendanceMetrics, isStudentBirthdayToday, getStudentAgeToday } from '@/lib/academicCalculations';
import { isLicenseWriteRestricted } from '@/lib/licensing';

interface PupilDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassSection[];
  teachers: Teacher[];
  onDataUpdated: () => void;
  onSelectStudentProfile: (student: Student) => void;
  defaultTab?: 'pupils' | 'add_pupil' | 'bulk_import' | 'transfer';
  isLicenseLocked?: boolean;
  onOpenStaffDatabase?: () => void;
}

export const PupilDatabaseModal: React.FC<PupilDatabaseModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  teachers,
  onDataUpdated,
  onSelectStudentProfile,
  defaultTab = 'pupils',
  isLicenseLocked = false,
  onOpenStaffDatabase,
}) => {
  const isStrictReadOnly = isLicenseLocked || isLicenseWriteRestricted();
  const [activeTab, setActiveTab] = useState<'pupils' | 'add_pupil' | 'bulk_import' | 'transfer'>(
    (defaultTab as any) === 'transfer' ? 'transfer' : (defaultTab as any) === 'add_pupil' ? 'add_pupil' : (defaultTab as any) === 'bulk_import' ? 'bulk_import' : 'pupils'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Pupil form
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [dob, setDob] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Transfer / Move / Promote form
  const [transferSourceClass, setTransferSourceClass] = useState<string>(classes[0]?.id || '');
  const [transferTargetClass, setTransferTargetClass] = useState<string>(classes[1]?.id || classes[0]?.id || '');
  const [selectedPupilIdsToMove, setSelectedPupilIdsToMove] = useState<string[]>([]);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  // Bulk CSV state
  const [csvContent, setCsvContent] = useState('');
  const [bulkResult, setBulkResult] = useState<{ added: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (isOpen && defaultTab) {
      if ((defaultTab as any) === 'transfer') setActiveTab('transfer');
      else if ((defaultTab as any) === 'add_pupil') setActiveTab('add_pupil');
      else if ((defaultTab as any) === 'bulk_import') setActiveTab('bulk_import');
      else setActiveTab('pupils');
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  // Filtered students for All Pupils tab
  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleCreatePupil = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('Action Blocked: System is in read-only mode.');
      return;
    }
    if (!name.trim()) return;

    const defaultAvatar =
      photoUrl ||
      (gender === 'Male'
        ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=face'
        : 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face');

    addStudent({
      name: name.trim(),
      rollNumber: rollNumber.trim() || `ROLL-${Date.now().toString().slice(-4)}`,
      gender,
      photoUrl: defaultAvatar,
      classId: classId || classes[0]?.id || 'class-pry1-gold',
      dateOfBirth: dob || '2016-01-01',
      parentName: parentName.trim() || 'Parent / Guardian',
      parentPhone: parentPhone.trim() || '+234 800 000 0000',
      parentEmail: parentEmail.trim() || '',
      academicRecords: [],
      behavioralNotes: [],
    });

    setName('');
    setRollNumber('');
    setParentName('');
    setParentPhone('');
    setParentEmail('');
    setPhotoUrl('');
    setActiveTab('pupils');
    onDataUpdated();
  };

  const handleDeletePupil = (studentId: string, studentName: string) => {
    if (isStrictReadOnly) {
      alert('Action Blocked: Cannot delete pupils in read-only mode.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${studentName} from the database?`)) {
      deleteStudent(studentId);
      onDataUpdated();
    }
  };

  const handleRunBulkImport = () => {
    if (isStrictReadOnly) {
      alert('Action Blocked: Cannot bulk import in read-only mode.');
      return;
    }
    if (!csvContent.trim()) return;
    const targetClass = selectedClassFilter !== 'all' ? selectedClassFilter : classes[0]?.id;
    const res = bulkImportPupilsFromCSV(csvContent, targetClass);
    setBulkResult(res);
    if (res.added > 0) {
      setCsvContent('');
      onDataUpdated();
    }
  };

  const handleDownloadSampleCSV = () => {
    const sample = `Name,RollNumber,Gender,ParentName,ParentPhone,ParentEmail,DateOfBirth
Oliver Reed,G4-15,Male,Arthur Reed,+234 803 123 4567,arthur.reed@gmail.com,2016-04-18
Sophia Martinez,G4-16,Female,Carlos Martinez,+234 802 345 6789,carlos.m@hotmail.com,2016-07-22
Liam O'Connor,G4-17,Male,Deirdre O'Connor,+234 805 987 6543,deirdre@yahoo.com,2016-09-10`;
    downloadCSVFile(sample, 'AttendIQ_Pupil_Import_Template.csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Pupil Directory & Enrollment Hub</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Pupils Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage pupil records, registrations, class promotions, and bulk CSV admissions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStaffDatabase && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStaffDatabase();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-semibold transition cursor-pointer border border-white/15"
                title="Switch to Faculty & Staff Database"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Staff Database &rarr;</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
              title="Close Modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Primary Tabs Bar - 4 Spacious Tabs with High Contrast */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-4 sm:px-6 overflow-x-auto shrink-0 min-h-[50px] items-stretch gap-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('pupils')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'pupils'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>All Pupils ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4 text-amber-500" />
            <span>Move & Promote Pupils</span>
          </button>

          <button
            onClick={() => setActiveTab('add_pupil')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'add_pupil'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Enroll Pupil</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk_import')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'bulk_import'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bulk CSV Import</span>
          </button>
        </div>

        {/* TAB 1: ALL PUPILS */}
        {activeTab === 'pupils' && (
          <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
            {/* Search and Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search pupil name, roll number, parent..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Class Filter */}
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Classes ({students.length})</option>
                  {classes.map((c) => {
                    const count = students.filter((s) => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('add_pupil')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Enroll Pupil</span>
                </button>
              </div>
            </div>

            {/* Pupils Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No pupils found matching your criteria</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Pupil Name</th>
                        <th className="px-4 py-3">Roll No.</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Parent / Guardian</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((s) => {
                        const pupilClass = classes.find((c) => c.id === s.classId);
                        const isBirthday = isStudentBirthdayToday(s.dateOfBirth);
                        const age = getStudentAgeToday(s.dateOfBirth);

                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                            onClick={() => onSelectStudentProfile(s)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={s.photoUrl}
                                  alt={s.name}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                    <span>{s.name}</span>
                                    {isBirthday && (
                                      <span className="text-[10px] text-amber-500" title="Birthday Today!">
                                        🎂
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {s.gender} &bull; {age ? `${age} yrs` : 'DOB pending'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                              {s.rollNumber}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                                {pupilClass?.name || 'Unassigned'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {s.parentName}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500">
                              {s.parentPhone}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectStudentProfile(s)}
                                  className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                                  title="View Full Pupil Dossier"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePupil(s.id, s.name)}
                                  disabled={isStrictReadOnly}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-30"
                                  title="Delete Pupil"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MOVE & PROMOTE PUPILS */}
        {activeTab === 'transfer' && (
          <div className="min-h-0 flex-1 flex flex-col overflow-y-auto p-5 sm:p-6 space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Class Transfer & Academic Promotion Hub</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Promote students to the next grade or transfer between arms/sections.
                </p>
              </div>
            </div>

            {transferSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{transferSuccessMsg}</span>
              </div>
            )}

            {/* Class Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  1. Source Class (Move From):
                </label>
                <select
                  value={transferSourceClass}
                  onChange={(e) => {
                    setTransferSourceClass(e.target.value);
                    setSelectedPupilIdsToMove([]);
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {classes.map((c) => {
                    const count = students.filter((s) => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({count} pupils)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  2. Destination Class (Promote / Move To):
                </label>
                <select
                  value={transferTargetClass}
                  onChange={(e) => setTransferTargetClass(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  {classes.map((c) => {
                    const count = students.filter((s) => s.classId === c.id).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({count} pupils)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Pupils List in Source Class */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Select Pupils in Source Class:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const ids = students.filter((s) => s.classId === transferSourceClass).map((s) => s.id);
                      setSelectedPupilIdsToMove(ids);
                    }}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Select All
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPupilIdsToMove([])}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {students
                  .filter((s) => s.classId === transferSourceClass)
                  .map((s) => {
                    const isChecked = selectedPupilIdsToMove.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                          isChecked
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPupilIdsToMove((prev) => [...prev, s.id]);
                            } else {
                              setSelectedPupilIdsToMove((prev) => prev.filter((id) => id !== s.id));
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <img
                          src={s.photoUrl}
                          alt={s.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{s.rollNumber}</p>
                        </div>
                      </label>
                    );
                  })}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  disabled={selectedPupilIdsToMove.length === 0 || transferSourceClass === transferTargetClass || isStrictReadOnly}
                  onClick={() => {
                    if (isStrictReadOnly) return;
                    bulkMoveStudentsToClass(selectedPupilIdsToMove, transferTargetClass);
                    const destName = classes.find((c) => c.id === transferTargetClass)?.name || 'target class';
                    setTransferSuccessMsg(`Successfully moved ${selectedPupilIdsToMove.length} pupil(s) to ${destName}!`);
                    setSelectedPupilIdsToMove([]);
                    setTimeout(() => setTransferSuccessMsg(null), 5000);
                    onDataUpdated();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Execute Move / Promotion ({selectedPupilIdsToMove.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ENROLL NEW PUPIL */}
        {activeTab === 'add_pupil' && (
          <form onSubmit={handleCreatePupil} className="min-h-0 p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Enroll New Pupil Registration Form</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Adebayo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Roll / Admission Number</label>
                <input
                  type="text"
                  placeholder="Leave blank for automatic generation"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Assigned Class Section *</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. & Mrs. Adebayo"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Parent WhatsApp / Phone</label>
                <input
                  type="tel"
                  placeholder="+234 803 123 4567"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Parent Email</label>
                <input
                  type="email"
                  placeholder="parent@gmail.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('pupils')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isStrictReadOnly}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                Enroll Pupil
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: BULK CSV IMPORT */}
        {activeTab === 'bulk_import' && (
          <div className="min-h-0 p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bulk Pupil CSV Import</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quickly upload or paste a roster of pupils to enroll simultaneously
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            <textarea
              rows={8}
              placeholder="Paste comma-separated pupil records here (Name, RollNumber, Gender, ParentName, ParentPhone, ParentEmail, DateOfBirth)..."
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              className="w-full font-mono text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {bulkResult && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-bold">Successfully imported {bulkResult.added} pupil(s)!</p>
                {bulkResult.errors.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 text-[11px] text-rose-600">
                    {bulkResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!csvContent.trim() || isStrictReadOnly}
                onClick={handleRunBulkImport}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition cursor-pointer shadow-xs disabled:opacity-40"
              >
                Execute Bulk Import
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Pupil Database Synchronized &bull; {students.length} Enrolled Pupils</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStaffDatabase && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStaffDatabase();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
              >
                Go to Staff Database &rarr;
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold hover:bg-slate-700 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
