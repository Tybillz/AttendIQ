'use client';

import React, { useState, useMemo } from 'react';
import {
  Home,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Building2,
  FileSpreadsheet,
  Award,
  Bell,
  MessageSquare,
  Search,
  MoreHorizontal,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  Settings,
  Lock,
  ArrowRight,
  Sparkles,
  School,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  Plus,
  Filter,
  ArrowUpDown,
  Trash2,
  Eye,
  Camera,
  Mail,
  Phone,
  Check,
  X,
  Upload,
  UserPlus,
  SlidersHorizontal,
} from 'lucide-react';
import { Student, ClassSection, Teacher, SchoolSubjectItem, SchoolSubjectLevel } from '@/types/attendance';
import { SchoolBranding, saveSchoolBranding } from '@/lib/licensing';
import { AuthSession } from '@/lib/auth';
import {
  PRESET_TEACHER_AVATARS,
  getDefaultTeacherAvatar,
  addTeacher,
  deleteTeacher,
  updateTeacherAvatar,
  addStudent,
  deleteStudent,
  addClass,
  deleteClass,
  getSchoolSubjectItems,
  addSchoolSubject,
  deleteSchoolSubject,
  assignSubjectToTeacher,
  setPermanentClassTeacher,
} from '@/lib/storage';
import { generateWhatsAppUrl } from '@/lib/notifications';

export interface LamaSchoolDashboardProps {
  students: Student[];
  teachers: Teacher[];
  classes: ClassSection[];
  branding: SchoolBranding;
  authSession: AuthSession | null;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  onOpenTeacherLogin: () => void;
  onOpenAdminLogin: () => void;
  onLogout: () => void;
  onOpenPupilDatabase?: (tab?: 'pupils' | 'add_pupil' | 'bulk_import' | 'transfer') => void;
  onOpenStaffDatabase?: (tab?: 'teachers' | 'classes' | 'subjects') => void;
  onOpenBranding?: () => void;
  onOpenAuditLogs?: () => void;
  onDataUpdated: () => void;
  onSelectStudentProfile?: (student: Student) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  children?: React.ReactNode;
}

export const LamaSchoolDashboard: React.FC<LamaSchoolDashboardProps> = ({
  students,
  teachers,
  classes,
  branding,
  authSession,
  activeNavTab,
  setActiveNavTab,
  onOpenTeacherLogin,
  onOpenAdminLogin,
  onLogout,
  onDataUpdated,
  onSelectStudentProfile,
  theme,
  toggleTheme,
  children,
}) => {
  // Global search & date
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(11);

  // Sub-filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [parentSubTab, setParentSubTab] = useState<'portal' | 'directory'>('portal');

  // Modals inside Lama Dev UI
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('English Language');
  const [newTeacherHomeroom, setNewTeacherHomeroom] = useState('');

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentClass, setNewStudentClass] = useState(classes[0]?.id || '');
  const [newStudentGender, setNewStudentGender] = useState<'Male' | 'Female'>('Male');
  const [newStudentParentName, setNewStudentParentName] = useState('');
  const [newStudentParentPhone, setNewStudentParentPhone] = useState('');
  const [newStudentParentEmail, setNewStudentParentEmail] = useState('');

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTeacherId, setNewClassTeacherId] = useState('');

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectLevel, setNewSubjectLevel] = useState<SchoolSubjectLevel>('all');

  // Teacher photo edit modal
  const [photoEditingTeacher, setPhotoEditingTeacher] = useState<Teacher | null>(null);
  const [photoTab, setPhotoTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [presetGenderFilter, setPresetGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Calculate metrics
  const totalStudents = students.length || 18;
  const totalTeachers = teachers.length || 3;
  const totalClasses = classes.length || 16;
  const uniqueParents = new Set(
    students.map((s) => s.parentEmail || s.parentPhone).filter(Boolean)
  ).size || 14;

  const boysCount = students.filter(
    (s) => (s.gender || '').toLowerCase() === 'male' || (s.gender || '').toLowerCase() === 'm'
  ).length || Math.round(totalStudents * 0.55);
  const girlsCount = totalStudents - boysCount;
  const boysPercentage = Math.round((boysCount / totalStudents) * 100) || 55;
  const girlsPercentage = 100 - boysPercentage;

  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.phone || '').includes(q)
      );
    });
  }, [teachers, searchQuery]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchClass = selectedClassFilter === 'all' || s.classId === selectedClassFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        (s.parentName || '').toLowerCase().includes(q) ||
        (s.parentEmail || '').toLowerCase().includes(q);
      return matchClass && matchQuery;
    });
  }, [students, selectedClassFilter, searchQuery]);

  // Subjects
  const allSubjects = useMemo(() => {
    return getSchoolSubjectItems();
  }, [teachers]);

  // Handlers
  const handleSaveNewTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;
    try {
      addTeacher({
        name: newTeacherName.trim(),
        email: newTeacherEmail.trim() || '',
        phone: newTeacherPhone.trim() || '',
        subject: newTeacherSubject.trim(),
        assignedClassIds: newTeacherHomeroom ? [newTeacherHomeroom] : [],
        permanentClassId: newTeacherHomeroom || undefined,
      });
      setIsAddTeacherOpen(false);
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPhone('');
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add teacher');
    }
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from teaching staff?`)) {
      deleteTeacher(id);
      onDataUpdated();
    }
  };

  const handleUpdateTeacherPhoto = (url: string) => {
    if (!photoEditingTeacher) return;
    updateTeacherAvatar(photoEditingTeacher.id, url);
    setPhotoEditingTeacher(null);
    setCustomPhotoUrl('');
    onDataUpdated();
  };

  const handleSaveNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    try {
      addStudent({
        name: newStudentName.trim(),
        rollNumber: newStudentRoll.trim() || `S-${Date.now().toString().slice(-4)}`,
        classId: newStudentClass,
        gender: newStudentGender,
        photoUrl: '',
        dateOfBirth: '2016-01-01',
        parentName: newStudentParentName.trim() || 'Parent/Guardian',
        parentPhone: newStudentParentPhone.trim() || '',
        parentEmail: newStudentParentEmail.trim() || '',
        academicRecords: [],
        behavioralNotes: [],
      });
      setIsAddStudentOpen(false);
      setNewStudentName('');
      setNewStudentRoll('');
      setNewStudentParentName('');
      setNewStudentParentPhone('');
      setNewStudentParentEmail('');
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add student');
    }
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      deleteStudent(id);
      onDataUpdated();
    }
  };

  const handleSaveNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      addClass({
        name: newClassName.trim(),
        grade: 'Primary',
        room: 'Block A',
        teacherId: newClassTeacherId || '',
        teacherName: teachers.find((t) => t.id === newClassTeacherId)?.name || 'Unassigned',
        scheduleTime: '08:00 AM - 02:00 PM',
      });
      setIsAddClassOpen(false);
      setNewClassName('');
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add class');
    }
  };

  const handleSaveNewSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      addSchoolSubject(newSubjectName.trim(), newSubjectLevel);
      setIsAddSubjectOpen(false);
      setNewSubjectName('');
      onDataUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to add subject');
    }
  };

  // Announcements list
  const announcements = [
    {
      id: 'ann-1',
      title: 'Second Term Continuous Assessment (CA2)',
      date: '18 Nov 2026',
      desc: 'All subject teachers must submit CA1 & CA2 continuous assessment marks into the portal by Friday.',
      bg: 'bg-[#EDF9FD]',
      border: 'border-[#C3EBFA]',
      tag: 'Academic',
    },
    {
      id: 'ann-2',
      title: 'Parent-Teacher Consultation & Academic Review',
      date: '25 Nov 2026',
      desc: 'Parents are invited to review student terminal progression with Form Masters via the online parent portal.',
      bg: 'bg-[#F1F0FF]',
      border: 'border-[#CFCEFF]',
      tag: 'PTA',
    },
    {
      id: 'ann-3',
      title: 'Terminal Examination Broadsheet Endorsement',
      date: '02 Dec 2026',
      desc: 'Principal and Form Masters will sign off on master broadsheets. Digital report cards will be unlocked for download.',
      bg: 'bg-[#FEFCE8]',
      border: 'border-[#FAE27C]',
      tag: 'Examinations',
    },
  ];

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#0b1329] text-slate-100' : 'bg-[#F7F8FA] text-slate-800'} font-sans`}>
      {/* ─────────────────────────────────────────────────────────────
          1. LEFT SIDEBAR (LAMA DEV ICONIC MENU)
          ───────────────────────────────────────────────────────────── */}
      <aside className={`w-[16%] md:w-[8%] lg:w-[16%] xl:w-[15%] p-4 ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'} border-r flex flex-col justify-between shrink-0 transition-all duration-300`}>
        <div className="space-y-6">
          {/* Logo & School Name */}
          <div
            onClick={() => setActiveNavTab('home')}
            className="flex items-center justify-center lg:justify-start gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0 group-hover:scale-105 transition">
              {branding.crestEmoji || '🎓'}
            </div>
            <div className="hidden lg:block min-w-0">
              <h1 className="text-sm font-black tracking-tight truncate leading-tight">
                {branding.schoolName || 'ResultIQ'}
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                School Management
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6">
            {/* Group 1: MENU */}
            <div>
              <span className="hidden lg:block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                MENU
              </span>
              <div className="space-y-1">
                {/* 1. Home / Dashboard */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('home')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'home'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Dashboard Overview"
                >
                  <Home className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Home</span>
                </button>

                {/* 2. Teachers */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('teachers')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'teachers'
                      ? 'bg-[#FAE27C] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Teachers List & Class Assignments"
                >
                  <GraduationCap className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Teachers</span>
                </button>

                {/* 3. Students */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('students')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'students'
                      ? 'bg-[#CFCEFF] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Students & Pupils Directory"
                >
                  <Users className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Students</span>
                </button>

                {/* 4. Parents / Result Checker Portal */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('parents')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'parents'
                      ? 'bg-[#EDF9FD] text-slate-900 font-bold border border-[#C3EBFA] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Parent Portal & Terminal Results"
                >
                  <UserCheck className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Parents</span>
                </button>

                {/* 5. Subjects */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('subjects')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'subjects'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="School Curriculum & Subjects"
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Subjects</span>
                </button>

                {/* 6. Classes */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('classes')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'classes'
                      ? 'bg-[#F1F0FF] text-slate-900 font-bold border border-[#CFCEFF] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Classes & Form Masters"
                >
                  <Building2 className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Classes</span>
                </button>

                {/* 7. Subject Gradebook */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('gradebook')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'gradebook'
                      ? 'bg-[#FAE27C] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Continuous Assessment Score Entry"
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Gradebook</span>
                </button>

                {/* 8. Homeroom Broadsheet */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('broadsheet')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'broadsheet'
                      ? 'bg-[#FAE27C] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Form Master Broadsheet & Results"
                >
                  <Award className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Broadsheet</span>
                </button>
              </div>
            </div>

            {/* Group 2: OTHER */}
            <div>
              <span className="hidden lg:block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                OTHER
              </span>
              <div className="space-y-1">
                {/* Announcements */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('announcements')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'announcements'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="School Circulars & Announcements"
                >
                  <Bell className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Announcements</span>
                </button>

                {/* School Whitelabel & Branding */}
                <button
                  type="button"
                  onClick={() => setActiveNavTab('settings')}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'settings'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="School Branding & Configuration"
                >
                  <Settings className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Settings</span>
                </button>

                {/* Sign Out / Staff Login */}
                {authSession ? (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Sign Out of Faculty Console"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="hidden lg:block">Sign Out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenTeacherLogin}
                    className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                    title="Staff & Teacher Login"
                  >
                    <Lock className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span className="hidden lg:block">Staff Login</span>
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 hidden lg:block">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {authSession ? (authSession.role === 'admin' ? 'A' : 'T') : 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold block truncate">
                {authSession
                  ? authSession.role === 'admin'
                    ? 'Principal / Admin'
                    : authSession.teacherName || 'Faculty'
                  : 'Parent / Guest'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {authSession ? (authSession.role === 'admin' ? 'Administrator' : 'Teaching Staff') : 'Public Portal'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. RIGHT MAIN CONTENT AREA
          ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* ── TOP NAVBAR ── */}
        <header className={`p-4 ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'} border-b flex items-center justify-between sticky top-0 z-20`}>
          {/* Search Bar */}
          <div className="flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-slate-300 dark:ring-slate-700 px-3 py-1.5 w-[200px] md:w-[280px] bg-slate-50 dark:bg-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search teachers, pupils, classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-xs placeholder:text-slate-400 border-none focus:ring-0 p-0"
            />
          </div>

          {/* Right Action Icons & Profile Info */}
          <div className="flex items-center gap-4">
            {/* Session / Term Badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#EDF9FD] text-slate-700 border border-[#C3EBFA]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {branding.currentTerm || 'Second Term 2026/2027'}
            </span>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Announcements Notification Icon */}
            <button
              type="button"
              onClick={() => setActiveNavTab('announcements')}
              className="relative w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              title="School Announcements"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            {/* Staff / Admin Quick Switch Buttons (when unauthenticated) */}
            {!authSession ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenTeacherLogin}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Teacher Login
                </button>
                <button
                  type="button"
                  onClick={onOpenAdminLogin}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer shadow-xs"
                >
                  Admin Login
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="flex flex-col text-right">
                  <span className="text-xs leading-tight font-bold truncate max-w-[120px]">
                    {authSession.role === 'admin' ? 'Administrator' : authSession.teacherName || 'Faculty'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {authSession.role === 'admin' ? 'Principal' : 'Teacher'}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-300 dark:ring-indigo-700 shadow-xs">
                  {authSession.role === 'admin' ? 'ADM' : 'TCH'}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── CONDITIONAL WORKSPACE BODY ── */}
        <div className="p-4 sm:p-6 flex-1">
          {/* ══════════════════════════════════════════════════════════
              PAGE 1: HOME (LAMA DEV ICONIC DASHBOARD OVERVIEW)
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'home' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* ── LEFT SECTION (2/3 WIDTH): USER CARDS + CHARTS ── */}
              <div className="w-full lg:w-2/3 flex flex-col gap-6">
                {/* 1. THE 4 PASTEL USER CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Card 1: Students (LamaPurple) */}
                  <div
                    onClick={() => setActiveNavTab('students')}
                    className="rounded-2xl bg-[#CFCEFF] p-4 flex-1 min-w-[130px] shadow-xs hover:shadow-md transition cursor-pointer text-slate-900"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-700 font-bold">
                        2026/27
                      </span>
                      <MoreHorizontal className="w-4 h-4 text-slate-700" />
                    </div>
                    <h2 className="text-2xl font-black my-3 tracking-tight">{totalStudents}</h2>
                    <h3 className="capitalize text-xs font-bold text-slate-700">Total Students</h3>
                  </div>

                  {/* Card 2: Teachers (LamaYellow) */}
                  <div
                    onClick={() => setActiveNavTab('teachers')}
                    className="rounded-2xl bg-[#FAE27C] p-4 flex-1 min-w-[130px] shadow-xs hover:shadow-md transition cursor-pointer text-slate-900"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-700 font-bold">
                        2026/27
                      </span>
                      <MoreHorizontal className="w-4 h-4 text-slate-700" />
                    </div>
                    <h2 className="text-2xl font-black my-3 tracking-tight">{totalTeachers}</h2>
                    <h3 className="capitalize text-xs font-bold text-slate-700">Employed Teachers</h3>
                  </div>

                  {/* Card 3: Parents (LamaSkyLight) */}
                  <div
                    onClick={() => setActiveNavTab('parents')}
                    className="rounded-2xl bg-[#EDF9FD] border border-[#C3EBFA] p-4 flex-1 min-w-[130px] shadow-xs hover:shadow-md transition cursor-pointer text-slate-900"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-700 font-bold">
                        2026/27
                      </span>
                      <MoreHorizontal className="w-4 h-4 text-slate-700" />
                    </div>
                    <h2 className="text-2xl font-black my-3 tracking-tight">{uniqueParents}</h2>
                    <h3 className="capitalize text-xs font-bold text-slate-700">Registered Parents</h3>
                  </div>

                  {/* Card 4: Staff / Classes (LamaPurpleLight) */}
                  <div
                    onClick={() => setActiveNavTab('classes')}
                    className="rounded-2xl bg-[#F1F0FF] border border-[#CFCEFF] p-4 flex-1 min-w-[130px] shadow-xs hover:shadow-md transition cursor-pointer text-slate-900"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-700 font-bold">
                        2026/27
                      </span>
                      <MoreHorizontal className="w-4 h-4 text-slate-700" />
                    </div>
                    <h2 className="text-2xl font-black my-3 tracking-tight">{totalClasses}</h2>
                    <h3 className="capitalize text-xs font-bold text-slate-700">Classes &amp; Sections</h3>
                  </div>
                </div>

                {/* 2. CHARTS SECTION (COUNT CHART + ATTENDANCE CHART) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* COUNT CHART: BOYS VS GIRLS DONUT (1/3 COL) */}
                  <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'} border shadow-xs flex flex-col justify-between`}>
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold">Students (Gender)</h3>
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="relative w-full h-[180px] flex items-center justify-center my-2">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F0FF" strokeWidth="12" />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#C3EBFA"
                          strokeWidth="12"
                          strokeDasharray={`${boysPercentage * 2.38} 238`}
                          strokeDashoffset="0"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke="#FAE27C"
                          strokeWidth="12"
                          strokeDasharray={`${girlsPercentage * 2.38} 238`}
                          strokeDashoffset={`-${boysPercentage * 2.38}`}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800 dark:text-white">{totalStudents}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Total</span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-8 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="w-3 h-3 bg-[#C3EBFA] rounded-full mx-auto mb-1"></div>
                        <h4 className="text-xs font-black">{boysCount}</h4>
                        <p className="text-[10px] text-slate-400">Boys ({boysPercentage}%)</p>
                      </div>
                      <div>
                        <div className="w-3 h-3 bg-[#FAE27C] rounded-full mx-auto mb-1"></div>
                        <h4 className="text-xs font-black">{girlsCount}</h4>
                        <p className="text-[10px] text-slate-400">Girls ({girlsPercentage}%)</p>
                      </div>
                    </div>
                  </div>

                  {/* ATTENDANCE BAR CHART: WEEKLY RECORD (2/3 COL) */}
                  <div className={`md:col-span-2 p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'} border shadow-xs flex flex-col justify-between`}>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h3 className="text-sm font-bold">Weekly Attendance</h3>
                        <p className="text-[11px] text-slate-400">Monday &ndash; Friday pupil presence tracking</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#C3EBFA]"></span>
                          <span className="text-[11px] text-slate-500">Present</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FAE27C]"></span>
                          <span className="text-[11px] text-slate-500">Absent</span>
                        </span>
                      </div>
                    </div>

                    <div className="h-[180px] flex items-end justify-between gap-4 px-2 pt-4">
                      {[
                        { day: 'Mon', present: 94, absent: 6 },
                        { day: 'Tue', present: 88, absent: 12 },
                        { day: 'Wed', present: 96, absent: 4 },
                        { day: 'Thu', present: 90, absent: 10 },
                        { day: 'Fri', present: 85, absent: 15 },
                      ].map((item) => (
                        <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div className="w-full max-w-[40px] flex items-end justify-center gap-1.5 h-full">
                            <div
                              style={{ height: `${item.present * 0.9}%` }}
                              className="w-3.5 bg-[#C3EBFA] rounded-t-md hover:opacity-85 transition"
                              title={`Present: ${item.present}%`}
                            ></div>
                            <div
                              style={{ height: `${item.absent * 2}%` }}
                              className="w-3.5 bg-[#FAE27C] rounded-t-md hover:opacity-85 transition"
                              title={`Absent: ${item.absent}%`}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-400">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. QUICK SHORTCUT BANNER FOR PARENT RESULTS */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                        Parent &amp; Guardian Notice
                      </span>
                      <span className="text-xs text-indigo-300 font-semibold">Zero Scratch Cards Required</span>
                    </div>
                    <h3 className="text-base font-bold text-white">
                      Terminal Examination Result Checking Portal
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Parents can instantly sign in using their registered email and one-time access passcode to inspect verified terminal dossiers and download stamp-endorsed report cards.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('parents')}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
                  >
                    <span>Check Student Result</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── RIGHT SECTION (1/3 WIDTH): CALENDAR & ANNOUNCEMENTS ── */}
              <div className="w-full lg:w-1/3 flex flex-col gap-6">
                {/* 1. ACADEMIC EVENT CALENDAR */}
                <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'} border shadow-xs`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold">Academic Calendar</h3>
                    <div className="flex items-center gap-1 text-slate-400">
                      <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">November 2026</span>
                      <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <span key={i} className="text-[11px] font-bold text-slate-400 py-1">
                        {d}
                      </span>
                    ))}
                    {calendarDays.map((day) => {
                      const isSelected = selectedCalendarDate === day;
                      const hasEvent = [4, 11, 18, 25].includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedCalendarDate(day)}
                          className={`h-8 rounded-lg flex flex-col items-center justify-center font-medium transition cursor-pointer relative ${
                            isSelected
                              ? 'bg-[#C3EBFA] text-slate-900 font-bold'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{day}</span>
                          {hasEvent && !isSelected && (
                            <span className="w-1 h-1 bg-amber-500 rounded-full absolute bottom-1"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. ANNOUNCEMENTS LIST */}
                <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'} border shadow-xs space-y-4`}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold">Announcements</h3>
                    <button
                      onClick={() => setActiveNavTab('announcements')}
                      className="text-[11px] text-slate-400 hover:underline cursor-pointer font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-3.5 rounded-xl ${ann.bg} border ${ann.border} text-slate-900 space-y-1.5`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                            {ann.tag}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md shadow-2xs">
                            {ann.date}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold leading-snug">{ann.title}</h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{ann.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAGE 2: TEACHERS LIST (LAMA DEV /list/teachers)
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'teachers' && (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">All Teachers</h2>
                    <span className="text-xs font-bold bg-[#FAE27C] text-slate-900 px-2.5 py-0.5 rounded-full">
                      {filteredTeachers.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Employed academic faculty and homeroom form masters</p>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddTeacherOpen(true)}
                    className="w-9 h-9 sm:w-auto px-3.5 py-2 rounded-full bg-[#FAE27C] hover:bg-[#ebce58] text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Add New Teacher"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Teacher</span>
                  </button>
                </div>
              </div>

              {/* Teachers Table Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8FA] dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Info</th>
                        <th className="py-3.5 px-4 hidden md:table-cell">Teacher ID</th>
                        <th className="py-3.5 px-4">Subject Specialty</th>
                        <th className="py-3.5 px-4 hidden lg:table-cell">Homeroom Class</th>
                        <th className="py-3.5 px-4 hidden xl:table-cell">Teaching Classes</th>
                        <th className="py-3.5 px-4 hidden sm:table-cell">WhatsApp / Phone</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTeachers.map((teacher, idx) => {
                        const homeroomClass = classes.find((c) => c.id === teacher.permanentClassId || c.teacherId === teacher.id);
                        const teachingClasses = classes.filter((c) => teacher.assignedClassIds?.includes(c.id));
                        const cleanPhone = (teacher.phone || '').replace(/[^0-9]/g, '');

                        return (
                          <tr key={teacher.id} className="hover:bg-[#F1F0FF]/40 dark:hover:bg-slate-800/50 transition">
                            {/* Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative group shrink-0">
                                  <img
                                    src={teacher.avatarUrl || getDefaultTeacherAvatar(teacher.name)}
                                    alt={teacher.name}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-700 cursor-pointer"
                                    onClick={() => setPhotoEditingTeacher(teacher)}
                                    title="Click to change profile picture"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPhotoEditingTeacher(teacher)}
                                    className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                                    title="Change Photo"
                                  >
                                    <Camera className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block">
                                    {teacher.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                                    {teacher.email || 'No email registered'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Teacher ID */}
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 hidden md:table-cell">
                              TCH-{(idx + 1).toString().padStart(3, '0')}
                            </td>

                            {/* Subjects */}
                            <td className="py-3 px-4">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-[#EDF9FD] border border-[#C3EBFA] text-slate-800 font-semibold text-[11px]">
                                {teacher.subject || 'Faculty Instructor'}
                              </span>
                            </td>

                            {/* Homeroom Class */}
                            <td className="py-3 px-4 hidden lg:table-cell">
                              {homeroomClass ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEFCE8] border border-[#FAE27C] text-amber-900 font-bold text-[11px]">
                                  <span>🏆</span>
                                  <span>{homeroomClass.name}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">None</span>
                              )}
                            </td>

                            {/* Teaching Classes */}
                            <td className="py-3 px-4 hidden xl:table-cell">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {teachingClasses.length > 0 ? (
                                  teachingClasses.map((c) => (
                                    <span key={c.id} className="px-2 py-0.5 rounded-md bg-[#F1F0FF] text-slate-700 text-[10px] font-semibold">
                                      {c.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">None</span>
                                )}
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="py-3 px-4 hidden sm:table-cell">
                              {cleanPhone ? (
                                <a
                                  href={generateWhatsAppUrl(cleanPhone, `Hello ${teacher.name}, greeting from ${branding.schoolName}`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-medium text-[11px] hover:underline"
                                >
                                  <span>{teacher.phone}</span>
                                  <ExternalLink className="w-3 h-3 text-emerald-500" />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Not provided</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPhotoEditingTeacher(teacher)}
                                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                                  title="Change Profile Picture"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                  title="Delete Teacher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredTeachers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No teachers found matching &quot;{searchQuery}&quot;.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAGE 3: STUDENTS LIST (LAMA DEV /list/students)
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'students' && (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">All Students</h2>
                    <span className="text-xs font-bold bg-[#CFCEFF] text-slate-900 px-2.5 py-0.5 rounded-full">
                      {filteredStudents.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Enrolled scholars across all academic class sections</p>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                  {/* Class Filter Dropdown */}
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="all">All Classes ({students.length})</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsAddStudentOpen(true)}
                    className="px-3.5 py-2 rounded-full bg-[#FAE27C] hover:bg-[#ebce58] text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Enroll New Scholar"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Student</span>
                  </button>
                </div>
              </div>

              {/* Students Table Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8FA] dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Info</th>
                        <th className="py-3.5 px-4">Student ID</th>
                        <th className="py-3.5 px-4">Class</th>
                        <th className="py-3.5 px-4 hidden md:table-cell">Gender</th>
                        <th className="py-3.5 px-4 hidden lg:table-cell">Parent / Guardian</th>
                        <th className="py-3.5 px-4 hidden sm:table-cell">Parent Phone</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((student) => {
                        const studentClass = classes.find((c) => c.id === student.classId);

                        return (
                          <tr key={student.id} className="hover:bg-[#F1F0FF]/40 dark:hover:bg-slate-800/50 transition">
                            {/* Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {student.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block">
                                    {student.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    Enrolled Scholar
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Student ID / Roll */}
                            <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {student.rollNumber}
                            </td>

                            {/* Class */}
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-[#F1F0FF] border border-[#CFCEFF] text-slate-800 font-bold text-[11px]">
                                {studentClass?.name || 'Class'}
                              </span>
                            </td>

                            {/* Gender */}
                            <td className="py-3 px-4 hidden md:table-cell capitalize text-slate-600 dark:text-slate-300">
                              {student.gender || 'Scholar'}
                            </td>

                            {/* Parent */}
                            <td className="py-3 px-4 hidden lg:table-cell">
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[160px]">
                                  {student.parentName || 'Parent'}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                                  {student.parentEmail || 'No email registered'}
                                </span>
                              </div>
                            </td>

                            {/* Parent Phone */}
                            <td className="py-3 px-4 hidden sm:table-cell font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {student.parentPhone || '—'}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onSelectStudentProfile && (
                                  <button
                                    type="button"
                                    onClick={() => onSelectStudentProfile(student)}
                                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                                    title="View Student Dossier"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(student.id, student.name)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No students found matching your search.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAGE 4: PARENTS (PORTAL + DIRECTORY)
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'parents' && (
            <div className="space-y-6">
              {/* Top Sub-Nav Ribbon */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Parents &amp; Guardians Center
                  </h2>
                  <p className="text-xs text-slate-400">
                    Official parent result verification and guardian communications
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setParentSubTab('portal')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      parentSubTab === 'portal'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Result Verification Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => setParentSubTab('directory')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      parentSubTab === 'directory'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Guardians Directory ({uniqueParents})
                  </button>
                </div>
              </div>

              {parentSubTab === 'portal' ? (
                <div>{children}</div>
              ) : (
                /* Directory of Parents Table */
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F8FA] dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3.5 px-4">Parent / Guardian</th>
                          <th className="py-3.5 px-4">Linked Student(s)</th>
                          <th className="py-3.5 px-4">Email (Portal Username)</th>
                          <th className="py-3.5 px-4">Phone Number</th>
                          <th className="py-3.5 px-4 text-right">Portal Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {Array.from(
                          new Map(students.map((s) => [s.parentEmail || s.parentPhone, s])).values()
                        ).map((s, idx) => {
                          const linked = students.filter(
                            (item) => item.parentEmail === s.parentEmail && s.parentEmail
                          );

                          return (
                            <tr key={idx} className="hover:bg-[#F1F0FF]/40 dark:hover:bg-slate-800/50 transition">
                              <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                {s.parentName || 'Parent / Guardian'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {linked.map((ch) => (
                                    <span key={ch.id} className="px-2 py-0.5 rounded-md bg-[#EDF9FD] text-slate-800 text-[10px] font-semibold border border-[#C3EBFA]">
                                      {ch.name} ({classes.find((c) => c.id === ch.classId)?.name || 'Class'})
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                                {s.parentEmail || '—'}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                                {s.parentPhone || '—'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Active
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAGE 5: SUBJECTS & CURRICULUM (LAMA DEV /list/subjects)
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Curriculum &amp; Subjects</h2>
                    <span className="text-xs font-bold bg-[#C3EBFA] text-slate-900 px-2.5 py-0.5 rounded-full">
                      {allSubjects.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Accredited school subjects and assigned faculty instructors</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-[#FAE27C] hover:bg-[#ebce58] text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs self-end sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Subject</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8FA] dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Subject Name</th>
                        <th className="py-3.5 px-4">Applicable Level</th>
                        <th className="py-3.5 px-4">Assigned Teachers</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allSubjects.map((sub, idx) => {
                        const assignedInstructors = teachers.filter(
                          (t) =>
                            t.subject?.toLowerCase() === sub.name.toLowerCase() ||
                            (Array.isArray(t.subjects) && t.subjects.some((s) => s.toLowerCase() === sub.name.toLowerCase()))
                        );

                        return (
                          <tr key={idx} className="hover:bg-[#F1F0FF]/40 dark:hover:bg-slate-800/50 transition">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {sub.name}
                            </td>
                            <td className="py-3 px-4 capitalize">
                              <span className="px-2.5 py-1 rounded-lg bg-[#EDF9FD] border border-[#C3EBFA] text-slate-800 font-semibold text-[11px]">
                                {sub.level || 'All Levels'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                {assignedInstructors.length > 0 ? (
                                  assignedInstructors.map((t) => (
                                    <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEFCE8] text-amber-900 text-[10px] font-bold border border-[#FAE27C]">
                                      <span>👨‍🏫</span>
                                      <span>{t.name}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">No teacher assigned</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove ${sub.name} from curriculum?`)) {
                                    deleteSchoolSubject(sub.name);
                                    onDataUpdated();
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                                title="Delete Subject"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* ══════════════════════════════════════════════════════════
              PAGE 6: CLASSES & SECTIONS (LAMA DEV /list/classes)
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'classes' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Classes &amp; Sections</h2>
                    <span className="text-xs font-bold bg-[#F1F0FF] text-slate-900 px-2.5 py-0.5 rounded-full border border-[#CFCEFF]">
                      {classes.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Class sections and assigned Homeroom Form Masters</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-[#FAE27C] hover:bg-[#ebce58] text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs self-end sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Class</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F8FA] dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Class Name</th>
                        <th className="py-3.5 px-4">Form Master / Class Teacher</th>
                        <th className="py-3.5 px-4">Enrolled Pupils</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {classes.map((cls) => {
                        const classTeacher = teachers.find((t) => t.id === cls.teacherId || t.permanentClassId === cls.id);
                        const enrolledCount = students.filter((s) => s.classId === cls.id).length;

                        return (
                          <tr key={cls.id} className="hover:bg-[#F1F0FF]/40 dark:hover:bg-slate-800/50 transition">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {cls.name}
                            </td>
                            <td className="py-3 px-4">
                              {classTeacher ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={classTeacher.avatarUrl || getDefaultTeacherAvatar(classTeacher.name)}
                                    alt={classTeacher.name}
                                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300"
                                  />
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {classTeacher.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 dark:text-white">{enrolledCount}</span> Pupils
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassFilter(cls.id);
                                    setActiveNavTab('students');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 font-bold text-[11px] hover:bg-indigo-100 transition cursor-pointer"
                                >
                                  View Pupils
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete class ${cls.name}?`)) {
                                      deleteClass(cls.id);
                                      onDataUpdated();
                                    }
                                  }}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                  title="Delete Class"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

          {/* ══════════════════════════════════════════════════════════
              PAGE 7 & 8: GRADEBOOK & BROADSHEET
              ══════════════════════════════════════════════════════════ */}
          {(activeNavTab === 'gradebook' || activeNavTab === 'broadsheet') && (
            <div>{children}</div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAGE 9: ANNOUNCEMENTS
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'announcements' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Notice Board &amp; Announcements</h2>
                  <p className="text-xs text-slate-400">Official circulars, assessment dates, and school bulletins</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {announcements.map((ann) => (
                  <div key={ann.id} className={`p-5 rounded-2xl ${ann.bg} border ${ann.border} text-slate-900 space-y-3 shadow-xs`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-white/80 px-2 py-0.5 rounded">
                        {ann.tag}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full shadow-2xs">
                        {ann.date}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{ann.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PAGE 10: SETTINGS & SCHOOL BRANDING
              ══════════════════════════════════════════════════════════ */}
          {activeNavTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">School Configuration &amp; Branding</h2>
                <p className="text-xs text-slate-400">Institutional details printed on official terminal report cards</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">School Name:</label>
                  <input
                    type="text"
                    value={branding.schoolName}
                    onChange={(e) => {
                      saveSchoolBranding({ schoolName: e.target.value });
                      onDataUpdated();
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Motto:</label>
                  <input
                    type="text"
                    value={branding.motto}
                    onChange={(e) => {
                      saveSchoolBranding({ motto: e.target.value });
                      onDataUpdated();
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Location / Address:</label>
                  <input
                    type="text"
                    value={branding.branchLocation}
                    onChange={(e) => {
                      saveSchoolBranding({ branchLocation: e.target.value });
                      onDataUpdated();
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Active Academic Term:</label>
                  <select
                    value={branding.currentTerm}
                    onChange={(e) => {
                      saveSchoolBranding({ currentTerm: e.target.value });
                      onDataUpdated();
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Second Term (Lent) 2026/2027">Second Term (Lent) 2026/2027</option>
                    <option value="First Term (Harmattan) 2026/2027">First Term (Harmattan) 2026/2027</option>
                    <option value="Third Term (Trinity) 2025/2026">Third Term (Trinity) 2025/2026</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW TEACHER
          ───────────────────────────────────────────────────────────── */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#FAE27C] text-slate-900">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Add New Teacher</h3>
              </div>
              <button onClick={() => setIsAddTeacherOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewTeacher} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Chinedu Eze"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address:</label>
                <input
                  type="email"
                  placeholder="e.g. c.eze@apexcrestacademy.edu.ng"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">WhatsApp / Phone:</label>
                <input
                  type="text"
                  placeholder="e.g. +234 803 123 4567"
                  value={newTeacherPhone}
                  onChange={(e) => setNewTeacherPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Subject Specialty:</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={newTeacherSubject}
                  onChange={(e) => setNewTeacherSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Permanent Homeroom Class:</label>
                <select
                  value={newTeacherHomeroom}
                  onChange={(e) => setNewTeacherHomeroom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">None (Subject Teacher Only)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW STUDENT
          ───────────────────────────────────────────────────────────── */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#CFCEFF] text-slate-900">
                  <Users className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Enroll New Student</h3>
              </div>
              <button onClick={() => setIsAddStudentOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Student Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chukwuebuka Obi"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Roll / Admission #:</label>
                  <input
                    type="text"
                    placeholder="e.g. P4-01"
                    value={newStudentRoll}
                    onChange={(e) => setNewStudentRoll(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Gender:</label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Enrolled Class:</label>
                <select
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Parent / Guardian Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Emeka Obi"
                  value={newStudentParentName}
                  onChange={(e) => setNewStudentParentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Parent Email (Portal Login):</label>
                <input
                  type="email"
                  placeholder="e.g. emeka.obi@gmail.com"
                  value={newStudentParentEmail}
                  onChange={(e) => setNewStudentParentEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Parent Phone Number:</label>
                <input
                  type="text"
                  placeholder="e.g. +234 803 123 4567"
                  value={newStudentParentPhone}
                  onChange={(e) => setNewStudentParentPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW CLASS
          ───────────────────────────────────────────────────────────── */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#F1F0FF] text-slate-900">
                  <Building2 className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Add New Class</h3>
              </div>
              <button onClick={() => setIsAddClassOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewClass} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Class Section Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary 6A or JSS 1B"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Form Master Teacher:</label>
                <select
                  value={newClassTeacherId}
                  onChange={(e) => setNewClassTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW SUBJECT
          ───────────────────────────────────────────────────────────── */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#C3EBFA] text-slate-900">
                  <BookOpen className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Add School Subject</h3>
              </div>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewSubject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Further Mathematics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Applicable Level:</label>
                <select
                  value={newSubjectLevel}
                  onChange={(e) => setNewSubjectLevel(e.target.value as SchoolSubjectLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="all">All Levels</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  <option value="nursery">Nursery School</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CHANGE TEACHER PROFILE PHOTO
          ───────────────────────────────────────────────────────────── */}
      {photoEditingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={photoEditingTeacher.avatarUrl || getDefaultTeacherAvatar(photoEditingTeacher.name)}
                  alt={photoEditingTeacher.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-400"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Change Profile Picture</h3>
                  <p className="text-[11px] text-slate-400">{photoEditingTeacher.name}</p>
                </div>
              </div>
              <button onClick={() => setPhotoEditingTeacher(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Choose Academic Portrait:
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-1">
                {PRESET_TEACHER_AVATARS.map((preset) => {
                  const isCurrent = (photoEditingTeacher.avatarUrl || '') === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleUpdateTeacherPhoto(preset.url)}
                      className={`relative flex flex-col items-center gap-1 p-1 rounded-2xl border-2 transition cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 scale-105'
                          : 'border-transparent hover:border-indigo-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-12 h-12 rounded-full object-cover shadow-2xs" />
                      <span className="text-[9px] text-slate-500 truncate w-full text-center">
                        {preset.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom URL Option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  Or enter custom Image URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs"
                  />
                  <button
                    type="button"
                    disabled={!customPhotoUrl.trim()}
                    onClick={() => handleUpdateTeacherPhoto(customPhotoUrl.trim())}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
