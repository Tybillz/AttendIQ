'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  BookOpen,
  Camera,
  FolderPlus,
  GraduationCap,
  Phone,
  Mail,
  UserPlus,
  Check,
  ExternalLink,
  ArrowRightLeft,
  Award,
} from 'lucide-react';
import { Student, ClassSection, Teacher } from '@/types/attendance';
import {
  addStudent,
  deleteStudent,
  moveStudentToClass,
  bulkMoveStudentsToClass,
  addClass,
  deleteClass,
  addTeacher,
  deleteTeacher,
  setPermanentClassTeacher,
  assignTeacherToClass,
  unassignTeacherFromClass,
  reassignClassTeacher,
  getSchoolSubjects,
  addSchoolSubject,
  deleteSchoolSubject,
  assignSubjectToTeacher,
  unassignSubjectFromTeacher,
  setTeacherPrimarySubject,
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
  defaultTab?: 'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers' | 'transfer' | 'subjects';
  isLicenseLocked?: boolean;
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
}) => {
  const isStrictReadOnly = isLicenseLocked || isLicenseWriteRestricted();
  const [activeTab, setActiveTab] = useState<'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers' | 'transfer' | 'subjects'>(defaultTab);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Curriculum & Subjects State
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>(getSchoolSubjects());
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [subjectSuccessMsg, setSubjectSuccessMsg] = useState<string | null>(null);

  const handleAddSubjectSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStrictReadOnly) return;
    const name = newSubjectInput.trim();
    if (!name) return;
    const ok = addSchoolSubject(name);
    if (ok) {
      setSchoolSubjects(getSchoolSubjects());
      setSubjectSuccessMsg(`Subject "${name}" added to school curriculum!`);
      setNewSubjectInput('');
      setTimeout(() => setSubjectSuccessMsg(null), 3500);
      onDataUpdated();
    } else {
      alert(`Subject "${name}" already exists in the curriculum.`);
    }
  };

  const handleDeleteSubjectAction = (subjectName: string) => {
    if (isStrictReadOnly) return;
    if (confirm(`Remove subject "${subjectName}" from the curriculum? It will also be unassigned from any teachers.`)) {
      deleteSchoolSubject(subjectName);
      setSchoolSubjects(getSchoolSubjects());
      setSubjectSuccessMsg(`Subject "${subjectName}" removed.`);
      setTimeout(() => setSubjectSuccessMsg(null), 3500);
      onDataUpdated();
    }
  };

  const handleAssignSubjectToTeacherAction = (teacherId: string, subjectName: string) => {
    if (isStrictReadOnly) return;
    assignSubjectToTeacher(teacherId, subjectName);
    onDataUpdated();
  };

  const handleUnassignSubjectFromTeacherAction = (teacherId: string, subjectName: string) => {
    if (isStrictReadOnly) return;
    unassignSubjectFromTeacher(teacherId, subjectName);
    onDataUpdated();
  };

  const handleSetPrimarySubjectAction = (teacherId: string, subjectName: string) => {
    if (isStrictReadOnly) return;
    setTeacherPrimarySubject(teacherId, subjectName);
    onDataUpdated();
  };

  // Transfer & Promotion state
  const [transferSourceClass, setTransferSourceClass] = useState<string>(classes[0]?.id || '');
  const [transferTargetClass, setTransferTargetClass] = useState<string>(classes[1]?.id || classes[0]?.id || '');
  const [selectedPupilsForTransfer, setSelectedPupilsForTransfer] = useState<string[]>([]);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);

  const handleQuickMovePupil = (studentId: string, studentName: string, newClassId: string) => {
    if (isStrictReadOnly) {
      alert('Action blocked: System is in read-only mode.');
      return;
    }
    const success = moveStudentToClass(studentId, newClassId, 'admin', 'School Administrator');
    if (success) {
      const targetName = classes.find((c) => c.id === newClassId)?.name || 'Unassigned';
      setQuickNotice(`✅ Moved "${studentName}" to ${targetName} successfully!`);
      setTimeout(() => setQuickNotice(null), 3500);
      onDataUpdated();
    }
  };

  const handleExecuteBulkTransfer = () => {
    if (isStrictReadOnly) {
      alert('Action blocked: System is in read-only mode.');
      return;
    }
    if (!transferTargetClass) {
      alert('Please select a destination class.');
      return;
    }
    if (selectedPupilsForTransfer.length === 0) {
      alert('Please select at least one pupil to move.');
      return;
    }
    const result = bulkMoveStudentsToClass(
      selectedPupilsForTransfer,
      transferTargetClass,
      'admin',
      'School Administrator'
    );
    if (result.successCount > 0) {
      setTransferNotice(`🎉 Successfully moved and promoted ${result.successCount} pupil(s) to ${result.targetClassName}!`);
      setSelectedPupilsForTransfer([]);
      setTimeout(() => setTransferNotice(null), 4500);
      onDataUpdated();
    }
  };

  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Add Pupil form
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [dob, setDob] = useState('2016-05-15');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Add Class form
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState('Grade 4');
  const [newRoom, setNewRoom] = useState('Room 201');
  const [newTeacherId, setNewTeacherId] = useState(teachers[0]?.id || '');

  // CSV Bulk Import
  const [csvContent, setCsvContent] = useState('');
  const [bulkResult, setBulkResult] = useState<{ added: number; errors: string[] } | null>(null);

  // Teacher management state
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tSubject, setTSubject] = useState('Class Teacher');
  const [tClassId, setTClassId] = useState('');
  const [tSearchQuery, setTSearchQuery] = useState('');
  const [teacherSuccessMsg, setTeacherSuccessMsg] = useState('');

  if (!isOpen) return null;

  const filteredStudents = students.filter((s) => {
    if (selectedClassFilter !== 'all' && s.classId !== selectedClassFilter) return false;
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

  const handleCreatePupil = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('⛔ Action Blocked: Cannot add pupils in strict read-only mode.');
      return;
    }
    if (!name.trim()) return;

    const defaultAvatar =
      photoUrl ||
      `https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&h=200&fit=crop&crop=face`;

    addStudent({
      name: name.trim(),
      rollNumber: rollNumber.trim() || `ROLL-${Date.now().toString().slice(-4)}`,
      gender,
      photoUrl: defaultAvatar,
      classId: classId || classes[0]?.id,
      dateOfBirth: dob,
      parentName: parentName.trim() || 'Parent / Guardian',
      parentPhone: parentPhone.trim() || '+1 (555) 000-0000',
      parentEmail: parentEmail.trim() || 'parent@school.edu',
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

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('⛔ Action Blocked: Cannot add classes in strict read-only mode.');
      return;
    }
    if (!newClassName.trim()) return;

    const teacher = teachers.find((t) => t.id === newTeacherId);

    addClass({
      name: newClassName.trim(),
      grade: newGrade,
      room: newRoom,
      teacherId: newTeacherId,
      teacherName: teacher ? teacher.name : 'Class Teacher',
      scheduleTime: '08:15 AM - 02:45 PM',
    });

    setNewClassName('');
    setActiveTab('classes');
    onDataUpdated();
  };

  const handleDeleteClass = (classId: string, className: string) => {
    if (isStrictReadOnly) {
      alert('⛔ Action Blocked: Cannot delete classes in strict read-only mode.');
      return;
    }
    const pupilCount = students.filter((s) => s.classId === classId).length;
    const msg = pupilCount > 0
      ? `Are you sure you want to delete class "${className}"?\n\n⚠️ Warning: There are currently ${pupilCount} enrolled pupils in this class. Their records will NOT be deleted, but they will be moved to "Unassigned" in the school directory so you can reassign them.`
      : `Are you sure you want to delete class "${className}"?`;

    if (confirm(msg)) {
      deleteClass(classId);
      onDataUpdated();
    }
  };

  const handleRunBulkImport = () => {
    if (isStrictReadOnly) {
      alert('⛔ Action Blocked: Cannot bulk import pupils in strict read-only mode.');
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
Oliver Reed,G4-15,Male,Arthur Reed,+1 (555) 345-0912,arthur.reed@gmail.com,2016-04-18
Sophia Martinez,G4-16,Female,Carlos Martinez,+1 (555) 871-3321,carlos.m@hotmail.com,2016-07-22
Liam O'Connor,G4-17,Male,Deirdre O'Connor,+1 (555) 201-4411,deirdre@yahoo.com,2016-09-10`;
    downloadCSVFile(sample, 'AttendIQ_Pupil_Import_Template.csv');
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('⛔ Action Blocked: Cannot add teachers in strict read-only mode.');
      return;
    }
    if (!tName.trim()) return;

    addTeacher({
      name: tName.trim(),
      phone: tPhone.trim() || '+234 800 000 0000',
      email: tEmail.trim() || `${tName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@apexcrest.edu.ng`,
      subject: tSubject.trim() || 'Class Teacher',
      assignedClassIds: tClassId ? [tClassId] : [],
      avatarUrl: `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face`,
    });

    setTeacherSuccessMsg(`Teacher "${tName}" successfully registered & added to roster!`);
    setTimeout(() => setTeacherSuccessMsg(''), 4500);
    setTName('');
    setTPhone('');
    setTEmail('');
    setTClassId('');
    onDataUpdated();
  };

  const handleSetPermanentClass = (teacherId: string, classId: string) => {
    if (isStrictReadOnly) return;
    setPermanentClassTeacher(classId, teacherId);
    onDataUpdated();
  };

  const handleAddTeachingClass = (teacherId: string, classId: string) => {
    if (isStrictReadOnly) return;
    assignTeacherToClass(teacherId, classId);
    onDataUpdated();
  };

  const handleRemoveTeachingClass = (teacherId: string, classId: string) => {
    if (isStrictReadOnly) return;
    unassignTeacherFromClass(teacherId, classId);
    onDataUpdated();
  };

  const handleReassign = (classId: string, teacherId: string) => {
    if (isStrictReadOnly) return;
    setPermanentClassTeacher(classId, teacherId);
    onDataUpdated();
  };

  const handleDeleteTeacherAction = (teacherId: string, teacherName: string) => {
    if (isStrictReadOnly) return;
    if (confirm(`Remove teacher "${teacherName}" from staff database? Their assigned classes will become unassigned.`)) {
      deleteTeacher(teacherId);
      onDataUpdated();
    }
  };

  const handleDeletePupil = (studentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to delete ${studentName} from the database?`)) {
      deleteStudent(studentId);
      onDataUpdated();
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!tSearchQuery.trim()) return true;
    const q = tSearchQuery.toLowerCase();
    const assignedClasses = classes.filter((c) => t.assignedClassIds?.includes(c.id) || c.teacherId === t.id);
    const classNames = assignedClasses.map((c) => c.name.toLowerCase()).join(' ');
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.phone || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      ((t.subject || '').toLowerCase().includes(q)) ||
      classNames.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">School Database & Staff Manager</h3>
              <p className="text-xs text-slate-300">
                Enroll pupils, employ teachers, assign classes, and manage school records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pupils')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pupils'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" /> All Pupils ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'transfer'
                ? 'border-amber-500 text-amber-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4 text-amber-600" /> Move & Promote Pupils
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-indigo-600" /> Teachers & Staff ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Classes & Sections ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'subjects'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 text-emerald-600" /> Curriculum & Subjects ({schoolSubjects.length})
          </button>
          <button
            onClick={() => setActiveTab('add_pupil')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'add_pupil'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="h-4 w-4" /> Enroll Pupil
          </button>
          <button
            onClick={() => setActiveTab('bulk_import')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bulk_import'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="h-4 w-4" /> Bulk CSV Import
          </button>
        </div>

        {/* TAB 1: ALL PUPILS LIST */}
        {activeTab === 'pupils' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {quickNotice && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
                <span>{quickNotice}</span>
                <button onClick={() => setQuickNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-mono">✕</button>
              </div>
            )}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search pupil name, roll #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 w-52 sm:w-64"
                  />
                </div>

                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-700"
                >
                  <option value="all">All Classes & Grades</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs transition cursor-pointer"
                  title="Move or promote pupils between classes"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Move / Promote Pupils
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('add_pupil')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Enroll Pupil
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white border-b border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Pupil</th>
                      <th className="py-2.5 px-3">Roll #</th>
                      <th className="py-2.5 px-3">Class (Click to Move)</th>
                      <th className="py-2.5 px-3">Parent Contact</th>
                      <th className="py-2.5 px-3 text-center">Academic Standing</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => {
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={s.photoUrl}
                                alt={s.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 block">{s.name}</span>
                                  {isStudentBirthdayToday(s.dateOfBirth) && (
                                    <span className="text-[10px] font-black bg-gradient-to-r from-pink-500 to-rose-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 border border-pink-300 animate-pulse">
                                      🎂 Birthday Today! {getStudentAgeToday(s.dateOfBirth) ? `(${getStudentAgeToday(s.dateOfBirth)} yrs)` : ''} 🎉
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {s.gender} • DOB: {s.dateOfBirth}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                            {s.rollNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={s.classId}
                              disabled={isStrictReadOnly}
                              onChange={(e) => handleQuickMovePupil(s.id, s.name, e.target.value)}
                              className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:border-indigo-500 focus:outline-indigo-600 text-slate-800 cursor-pointer shadow-2xs transition"
                              title="Click to move pupil to another class"
                            >
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                              <option value="unassigned">Unassigned</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <span className="block font-medium text-slate-800">{s.parentName}</span>
                            <span className="text-[10px] text-slate-500">{s.parentPhone}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active Scholar
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  onClose();
                                  onSelectStudentProfile(s);
                                }}
                                className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                                title="Open Full Profile"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePupil(s.id, s.name)}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Student"
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
            </div>
          </div>
        )}

        {/* TAB 2: ENROLL NEW PUPIL */}
        {activeTab === 'add_pupil' && (
          <form onSubmit={handleCreatePupil} className="p-6 overflow-y-auto flex-1 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Pupil Registration Form</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Samuel Adeyemi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Roll Number</label>
                <input
                  type="text"
                  placeholder="e.g. G4-15"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Class Assignment</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female')}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Photo Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Oluwaseun Adeyemi"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Phone (for SMS)</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2831"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Email</label>
                <input
                  type="email"
                  placeholder="e.g. parent@gmail.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('pupils')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm"
              >
                Save Pupil to Roster
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: BULK CSV IMPORT */}
        {activeTab === 'bulk_import' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Bulk Pupil CSV Import</h4>
                <p className="text-xs text-slate-500">
                  Upload multiple pupils at once with auto-generated roll numbers and guardian details.
                </p>
              </div>
              <button
                onClick={handleDownloadSampleCSV}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100"
              >
                <Download className="h-3.5 w-3.5" /> Download Template CSV
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Assign Imported Pupils to Class
              </label>
              <select
                value={selectedClassFilter === 'all' ? classes[0]?.id : selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 w-full sm:w-72"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Paste CSV Contents (or drag .csv file)
              </label>
              <textarea
                rows={8}
                placeholder={`Name,RollNumber,Gender,ParentName,ParentPhone,ParentEmail,DateOfBirth\nOliver Reed,G4-15,Male,Arthur Reed,+1 (555) 345-0912,arthur.reed@gmail.com,2016-04-18`}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full text-xs font-mono p-3 rounded-2xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
              />
            </div>

            {bulkResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  bulkResult.added > 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {bulkResult.added > 0 && `✓ Successfully enrolled ${bulkResult.added} pupil(s)!`}
                {bulkResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc list-inside text-rose-700">
                    {bulkResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCsvContent('')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleRunBulkImport}
                disabled={!csvContent.trim()}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm disabled:opacity-40"
              >
                Execute Import
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: CLASSES & SECTIONS */}
        {activeTab === 'classes' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Manage School Sections & Rooms</h4>
                <p className="text-xs text-slate-500">Assign teachers and configure schedules</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('teachers')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                <GraduationCap className="h-3.5 w-3.5" /> View Teacher Database
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classes.map((c) => {
                const count = students.filter((s) => s.classId === c.id).length;
                return (
                  <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{c.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            {count} Pupils
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(c.id, c.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title={`Delete class section "${c.name}"`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{c.room} &bull; {c.grade}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{c.scheduleTime}</p>
                    </div>

                    {/* Permanent Class Teacher (Homeroom) */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Award className="h-3 w-3 text-amber-600" /> Permanent Class Teacher (Homeroom)
                      </label>
                      <select
                        value={c.teacherId || ''}
                        onChange={(e) => handleReassign(c.id, e.target.value)}
                        className="w-full text-xs font-bold px-2 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-900 focus:outline-amber-600 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- No Permanent Teacher Assigned --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || 'Staff Member'} {t.permanentClassId && t.permanentClassId !== c.id ? `(Perm: ${classes.find(cl => cl.id === t.permanentClassId)?.name || 'Other'})` : ''}
                          </option>
                        ))}
                      </select>

                      {/* Subject Teachers taking lessons in this class */}
                      {(() => {
                        const subjectTeachers = teachers.filter((t) => t.assignedClassIds?.includes(c.id) && t.id !== c.teacherId);
                        return (
                          <div className="mt-2 pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Subject Teachers ({subjectTeachers.length}):
                            </span>
                            {subjectTeachers.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {subjectTeachers.map((st) => (
                                  <span key={st.id} className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
                                    {st.name} <span className="text-slate-400">({st.subject || 'Subject'})</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No additional subject teachers</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Class Form */}
            <form onSubmit={handleCreateClass} className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <FolderPlus className="h-4 w-4 text-indigo-600" /> Create New Class Section
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Class Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary 6 - Emerald"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Grade Level</label>
                  <input
                    type="text"
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Assigned Teacher</label>
                  <select
                    value={newTeacherId}
                    onChange={(e) => setNewTeacherId(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || 'Staff Member'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                >
                  Add Class Section
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: TEACHERS & STAFF ROSTER */}
        {activeTab === 'teachers' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  School Teachers & Staff Roster
                </h4>
                <p className="text-xs text-slate-500">
                  Employ new teachers, assign or reassign class sections, and manage staff contact records.
                </p>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search teachers by name, phone..."
                  value={tSearchQuery}
                  onChange={(e) => setTSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 w-full sm:w-64"
                />
              </div>
            </div>

            {teacherSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{teacherSuccessMsg}</span>
              </div>
            )}

            {/* Form: Employ New Teacher */}
            <form onSubmit={handleCreateTeacher} className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 border border-indigo-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-indigo-600" />
                  Employ / Register New Teacher
                </h5>
                <span className="text-[11px] font-medium text-slate-400">Linked to Academic Registrar & Result Management Hub</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Teacher Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mrs. Ngozi Eze"
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Phone / WhatsApp No.
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +234 803 123 4567"
                    value={tPhone}
                    onChange={(e) => setTPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ngozi.eze@apexcrest.edu.ng"
                    value={tEmail}
                    onChange={(e) => setTEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Initial Class Assignment
                  </label>
                  <select
                    value={tClassId}
                    onChange={(e) => setTClassId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 focus:outline-indigo-500 text-slate-800"
                  >
                    <option value="">-- Unassigned / Subject Teacher --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-700">Subject / Specialty:</label>
                  <input
                    type="text"
                    placeholder="e.g. Class Teacher, Basic Science, English"
                    value={tSubject}
                    onChange={(e) => setTSubject(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-white border border-slate-300 focus:outline-indigo-500 w-56"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-xs active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Employ Teacher
                </button>
              </div>
            </form>

            {/* Teacher Roster Cards Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Employed Teaching Staff ({filteredTeachers.length})</span>
                <span>Reassign classes instantly via the dropdown on each teacher</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTeachers.map((teacher) => {
                  const teacherClasses = classes.filter(
                    (c) => teacher.assignedClassIds?.includes(c.id) || c.teacherId === teacher.id
                  );
                  const cleanPhone = (teacher?.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <div
                      key={teacher.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              teacher.avatarUrl ||
                              `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face`
                            }
                            alt={teacher.name || 'Teacher'}
                            className="h-11 w-11 rounded-full object-cover border-2 border-indigo-200 shadow-2xs"
                          />
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {teacher.name || 'Unnamed Teacher'}
                            </h5>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {teacher.subject || 'Class Teacher'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTeacherAction(teacher.id, teacher.name || 'this teacher')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Teacher from School Database"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Contact Information */}
                      <div className="space-y-1 mb-3 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" /> WhatsApp / Phone:
                          </span>
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                            >
                              {teacher.phone}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">No phone recorded</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3 text-slate-400" /> Email:
                          </span>
                          <span className="text-slate-700 font-mono text-[10px]">
                            {teacher.email || 'No email recorded'}
                          </span>
                        </div>
                      </div>

                      {/* 1. Permanent Homeroom Class (Form Master) */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                            <Award className="h-3 w-3 text-amber-600" /> Permanent Homeroom Class:
                          </span>
                          {teacher.permanentClassId ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Form Master
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 italic">None</span>
                          )}
                        </div>
                        <select
                          value={teacher.permanentClassId || ''}
                          onChange={(e) => handleSetPermanentClass(teacher.id, e.target.value)}
                          className="w-full text-xs font-bold px-2.5 py-1.5 rounded-xl bg-amber-50/60 border border-amber-300 text-slate-900 cursor-pointer focus:outline-amber-600 shadow-2xs mb-1"
                        >
                          <option value="">-- No Permanent Homeroom Assigned --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.teacherId && c.teacherId !== teacher.id ? `(Current: ${c.teacherName})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Assigned Curriculum Subjects (What this teacher teaches) */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-emerald-600" /> Assigned Subjects:
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {teacher.subjects?.length || 0} subject(s)
                          </span>
                        </div>

                        {/* Subject badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {teacher.subjects && teacher.subjects.length > 0 ? (
                            teacher.subjects.map((subj) => {
                              const isPrimary = teacher.subject === subj;
                              return (
                                <span
                                  key={subj}
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isPrimary
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-slate-100 text-slate-800 border-slate-200'
                                  }`}
                                  title={isPrimary ? 'Primary Teaching Specialization (Click ★ to toggle)' : 'Click ★ to make primary specialization'}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimarySubjectAction(teacher.id, subj)}
                                    className={`cursor-pointer hover:scale-110 transition ${
                                      isPrimary ? 'text-amber-500 font-black' : 'text-slate-400 hover:text-amber-500'
                                    }`}
                                    title={isPrimary ? 'Primary Specialization' : 'Set as primary'}
                                  >
                                    ★
                                  </button>
                                  <span>{subj}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignSubjectFromTeacherAction(teacher.id, subj)}
                                    className="text-slate-400 hover:text-rose-600 rounded-full hover:bg-white/80 p-0.5 transition cursor-pointer"
                                    title={`Unassign ${subj} from ${teacher.name}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No subjects assigned yet</span>
                          )}
                        </div>

                        {/* Dropdown to assign another subject to this teacher */}
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignSubjectToTeacherAction(teacher.id, e.target.value);
                            }
                          }}
                          className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-300 text-slate-800 cursor-pointer focus:outline-emerald-500 shadow-2xs"
                        >
                          <option value="">+ Assign Subject to {teacher.name}...</option>
                          {schoolSubjects.map((s) => {
                            const isAssigned = teacher.subjects?.includes(s);
                            return (
                              <option key={s} value={s} disabled={isAssigned}>
                                {s} {isAssigned ? '(Assigned)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* 3. Subject Teaching Classes (Where this teacher teaches their subjects) */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-indigo-600" /> Subject Teaching Classes:
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {teacherClasses.length} assigned
                          </span>
                        </div>

                        {/* Badges of all assigned classes */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {teacherClasses.length > 0 ? (
                            teacherClasses.map((ac) => {
                              const isPermanent = ac.id === teacher.permanentClassId;
                              return (
                                <span
                                  key={ac.id}
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isPermanent
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                  }`}
                                  title={isPermanent ? 'Permanent Homeroom Class' : 'Subject Teaching Class'}
                                >
                                  {isPermanent ? `★ ${ac.name}` : ac.name}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTeachingClass(teacher.id, ac.id)}
                                    className="text-slate-400 hover:text-rose-600 rounded-full hover:bg-white/80 p-0.5 transition cursor-pointer"
                                    title={`Unassign from ${ac.name}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No teaching classes assigned</span>
                          )}
                        </div>

                        {/* Dropdown to assign other classes for subject teaching without interfering */}
                        <div>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAddTeachingClass(teacher.id, e.target.value);
                              }
                            }}
                            className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 cursor-pointer focus:outline-indigo-500 shadow-2xs"
                          >
                            <option value="">+ Assign Teaching Class to {teacher.name}...</option>
                            {classes.map((c) => {
                              const isCurrent = teacher.assignedClassIds?.includes(c.id);
                              return (
                                <option key={c.id} value={c.id} disabled={isCurrent}>
                                  {c.name} {isCurrent ? '(Already Assigned)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          <span className="text-[9px] text-slate-400 block mt-1 leading-tight">
                            💡 Teaching a subject here does not replace or interfere with the permanent class teacher.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MOVE & PROMOTE PUPILS */}
        {activeTab === 'transfer' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
            {/* Header info */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                  <span>Class Transfer & Academic Promotion Engine</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Move individual or entire groups of pupils from one classroom/grade to another with full audit tracking.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full border border-amber-300 self-start sm:self-auto">
                Total School Pupils: {students.length}
              </span>
            </div>

            {transferNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
                <span>{transferNotice}</span>
                <button onClick={() => setTransferNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-mono">✕</button>
              </div>
            )}

            {/* Selection controls */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Source Class */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    1. Source Classroom (Moving From):
                  </label>
                  <select
                    value={transferSourceClass}
                    onChange={(e) => {
                      setTransferSourceClass(e.target.value);
                      setSelectedPupilsForTransfer([]);
                    }}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-white border border-slate-300 focus:outline-indigo-600 text-slate-900 cursor-pointer shadow-2xs"
                  >
                    {classes.map((c) => {
                      const count = students.filter((s) => s.classId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({count} pupils enrolled)
                        </option>
                      );
                    })}
                    <option value="unassigned">
                      Unassigned Pupils ({students.filter((s) => s.classId === 'unassigned').length} pupils)
                    </option>
                  </select>
                </div>

                {/* Target Class */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    2. Destination Classroom (Moving To):
                  </label>
                  <select
                    value={transferTargetClass}
                    onChange={(e) => setTransferTargetClass(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 rounded-xl bg-white border border-indigo-300 focus:outline-indigo-600 text-slate-900 cursor-pointer shadow-2xs"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.id === transferSourceClass}>
                        {c.name} {c.id === transferSourceClass ? '(Current Source)' : ''}
                      </option>
                    ))}
                    <option value="unassigned" disabled={transferSourceClass === 'unassigned'}>
                      Unassigned Pool
                    </option>
                  </select>
                </div>
              </div>

              {/* Action Toolbar */}
              {(() => {
                const sourcePupils = students.filter((s) => s.classId === transferSourceClass);
                const isAllSelected = sourcePupils.length > 0 && selectedPupilsForTransfer.length === sourcePupils.length;
                const targetName = classes.find((c) => c.id === transferTargetClass)?.name || 'Target Class';

                return (
                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isAllSelected) {
                            setSelectedPupilsForTransfer([]);
                          } else {
                            setSelectedPupilsForTransfer(sourcePupils.map((s) => s.id));
                          }
                        }}
                        disabled={sourcePupils.length === 0}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer disabled:opacity-50"
                      >
                        {isAllSelected ? 'Deselect All' : `Select All (${sourcePupils.length}) Pupils`}
                      </button>
                      <span className="text-xs font-semibold text-slate-600">
                        {selectedPupilsForTransfer.length} of {sourcePupils.length} selected
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isStrictReadOnly || selectedPupilsForTransfer.length === 0 || transferSourceClass === transferTargetClass}
                      onClick={handleExecuteBulkTransfer}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>Move {selectedPupilsForTransfer.length} Pupil(s) to {targetName}</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Pupils List in Source Class */}
            {(() => {
              const sourcePupils = students.filter((s) => s.classId === transferSourceClass);
              const sourceName = classes.find((c) => c.id === transferSourceClass)?.name || 'Selected Class';

              if (sourcePupils.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-xs font-medium">
                    No pupils are currently enrolled in {sourceName}. Select another source classroom above.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Pupils in {sourceName} to Move:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {sourcePupils.map((s) => {
                      const isSelected = selectedPupilsForTransfer.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPupilsForTransfer((prev) => prev.filter((id) => id !== s.id));
                            } else {
                              setSelectedPupilsForTransfer((prev) => [...prev, s.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 select-none ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer pointer-events-none"
                          />
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 block truncate">{s.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 block">Roll: {s.rollNumber}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 7: CURRICULUM & SUBJECTS REGISTRY */}
        {activeTab === 'subjects' && (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
            {/* Header info */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <span>Institutional Curriculum & Subjects Registry</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Add, remove, and manage curriculum subjects taught at the school, and allocate which teachers take each subject.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full border border-emerald-300 self-start sm:self-auto">
                Total Subjects: {schoolSubjects.length}
              </span>
            </div>

            {subjectSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
                <span>{subjectSuccessMsg}</span>
                <button onClick={() => setSubjectSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-mono">✕</button>
              </div>
            )}

            {/* Form: Add New Subject */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <form onSubmit={handleAddSubjectSubmit} className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Add New Subject to Curriculum:
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Enter subject name (e.g. Further Mathematics, Economics, Chemistry, Physics)..."
                    value={newSubjectInput}
                    onChange={(e) => setNewSubjectInput(e.target.value)}
                    className="flex-1 text-xs font-bold px-3 py-2.5 rounded-xl bg-white border border-slate-300 focus:outline-emerald-600 text-slate-900 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={isStrictReadOnly || !newSubjectInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Subject</span>
                  </button>
                </div>
              </form>

              {/* Quick preset recommendations */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  1-Click Standard Subject Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Further Mathematics',
                    'Physics',
                    'Chemistry',
                    'Biology',
                    'Economics',
                    'Literature in English',
                    'Government',
                    'Geography',
                    'Yoruba Language',
                    'Hausa Language',
                    'Igbo Language',
                    'History',
                    'Music & Creative Arts',
                  ]
                    .filter((preset) => !schoolSubjects.some((s) => s.toLowerCase() === preset.toLowerCase()))
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          addSchoolSubject(preset);
                          setSchoolSubjects(getSchoolSubjects());
                          setSubjectSuccessMsg(`Added "${preset}" to curriculum!`);
                          setTimeout(() => setSubjectSuccessMsg(null), 3500);
                          onDataUpdated();
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 transition cursor-pointer shadow-2xs flex items-center gap-1"
                      >
                        <Plus className="h-2.5 w-2.5 text-emerald-600" />
                        <span>{preset}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Guidance Banner: Explaining Subjects are Assigned to Teachers */}
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
              <div className="flex items-start sm:items-center gap-2.5">
                <BookOpen className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold">Official School Curriculum Catalog</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Add or retire subjects offered across all classes. In ResultIQ, subjects are assigned directly to teachers from the <strong>Teachers &amp; Staff</strong> tab.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('teachers')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition cursor-pointer text-xs shrink-0 self-start sm:self-auto shadow-2xs"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Go to Teachers &amp; Assign Subjects &rarr;</span>
              </button>
            </div>

            {/* Grid of registered subjects */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>Active School Subjects ({schoolSubjects.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">Catalog view • Delete subjects or review assigned staff</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schoolSubjects.map((subj) => {
                  const assignedTeachers = teachers.filter(
                    (t) => t.subjects?.includes(subj) || t.subject === subj
                  );

                  return (
                    <div
                      key={subj}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 leading-tight">{subj}</h5>
                              <span className="text-[10px] text-slate-400">
                                {assignedTeachers.length} teacher(s) currently teaching
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSubjectAction(subj)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title={`Delete "${subj}" from curriculum`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Informative List of teachers assigned to teach this subject */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Staff Teaching {subj}:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {assignedTeachers.length > 0 ? (
                              assignedTeachers.map((t) => (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200"
                                >
                                  <span>{t.name}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-amber-700 font-medium italic">
                                Not assigned to any teacher yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick link to assign this subject to teachers */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveTab('teachers')}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Manage staff on Teachers tab &rarr;</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
