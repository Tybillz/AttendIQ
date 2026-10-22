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
} from 'lucide-react';
import { Student, ClassSection, Teacher } from '@/types/attendance';
import {
  addStudent,
  deleteStudent,
  addClass,
  addTeacher,
  deleteTeacher,
  reassignClassTeacher,
  bulkImportPupilsFromCSV,
  downloadCSVFile,
} from '@/lib/storage';
import { calculateStudentAttendanceMetrics } from '@/lib/academicCalculations';

interface PupilDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassSection[];
  teachers: Teacher[];
  onDataUpdated: () => void;
  onSelectStudentProfile: (student: Student) => void;
  defaultTab?: 'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers';
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
}) => {
  const [activeTab, setActiveTab] = useState<'pupils' | 'add_pupil' | 'bulk_import' | 'classes' | 'teachers'>(defaultTab);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleRunBulkImport = () => {
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

  const handleReassign = (classId: string, teacherId: string) => {
    reassignClassTeacher(classId, teacherId);
    onDataUpdated();
  };

  const handleDeleteTeacherAction = (teacherId: string, teacherName: string) => {
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
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" /> All Pupils ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-indigo-600" /> Teachers & Staff ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Classes & Sections ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('add_pupil')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'add_pupil'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="h-4 w-4" /> Enroll Pupil
          </button>
          <button
            onClick={() => setActiveTab('bulk_import')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bulk_import'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="h-4 w-4" /> Bulk CSV Import
          </button>
        </div>

        {/* TAB 1: ALL PUPILS LIST */}
        {activeTab === 'pupils' && (
          <div className="flex-1 flex flex-col overflow-hidden">
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
                </select>
              </div>

              <button
                onClick={() => setActiveTab('add_pupil')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Enroll Pupil
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Pupil</th>
                      <th className="py-2.5 px-3 font-semibold">Roll #</th>
                      <th className="py-2.5 px-3 font-semibold">Class</th>
                      <th className="py-2.5 px-3 font-semibold">Parent Contact</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Attendance Rate</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((s) => {
                      const cName = classes.find((c) => c.id === s.classId)?.name || s.classId;
                      const { attendanceRate: rate } = calculateStudentAttendanceMetrics(s);

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
                                <span className="font-bold text-slate-900 block">{s.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {s.gender} • DOB: {s.dateOfBirth}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                            {s.rollNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{cName}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <span className="block font-medium text-slate-800">{s.parentName}</span>
                            <span className="text-[10px] text-slate-500">{s.parentPhone}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                rate >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rate >= 80
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {rate}% ({s.totalPresent}P / {s.totalAbsent}A)
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
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {count} Pupils
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{c.room} &bull; {c.grade}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{c.scheduleTime}</p>
                    </div>

                    {/* Interactive Teacher Assignment Selector */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Assigned Class Teacher
                      </label>
                      <select
                        value={c.teacherId || ''}
                        onChange={(e) => handleReassign(c.id, e.target.value)}
                        className="w-full text-xs font-bold px-2 py-1.5 rounded-xl bg-white border border-slate-300 text-indigo-950 focus:outline-indigo-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- No Teacher Assigned --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name || 'Staff Member'} {t.phone ? `(${t.phone})` : ''}
                          </option>
                        ))}
                      </select>
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
                <span className="text-[11px] font-medium text-slate-400">Linked to Nigerian Classroom Attendance Portal</span>
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

                      {/* Assigned Classroom & 1-Click Reassignment */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Assigned Class(es):
                          </span>
                          {teacherClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {teacherClasses.map((ac) => (
                                <span
                                  key={ac.id}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200"
                                >
                                  {ac.name}
                                  <button
                                    type="button"
                                    onClick={() => handleReassign(ac.id, '')}
                                    className="text-indigo-400 hover:text-rose-600 rounded-full hover:bg-white/80 p-0.5 transition"
                                    title={`Unassign from ${ac.name}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </div>

                        <div className="shrink-0">
                          <label className="text-[10px] font-bold text-slate-500 block sm:text-right mb-0.5">
                            Assign Class:
                          </label>
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleReassign(e.target.value, teacher.id);
                              }
                            }}
                            className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 cursor-pointer focus:outline-indigo-500"
                          >
                            <option value="">+ Assign Class...</option>
                            {classes.map((c) => {
                              const isCurrent = teacherClasses.some((tc) => tc.id === c.id);
                              return (
                                <option key={c.id} value={c.id} disabled={isCurrent}>
                                  {c.name} {isCurrent ? '(Assigned)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
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
