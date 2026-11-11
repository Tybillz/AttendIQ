'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Student, ClassSection, Teacher } from '@/types/attendance';
import { SchoolBranding } from '@/lib/licensing';
import { AuthSession } from '@/lib/auth';

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
  onOpenPupilDatabase: (tab?: 'pupils' | 'add_pupil' | 'bulk_import' | 'transfer') => void;
  onOpenStaffDatabase: (tab?: 'teachers' | 'classes' | 'subjects') => void;
  onOpenBranding: () => void;
  onOpenAuditLogs: () => void;
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
  onOpenPupilDatabase,
  onOpenStaffDatabase,
  onOpenBranding,
  onOpenAuditLogs,
  theme,
  toggleTheme,
  children,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(11);

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

  // Calendar days
  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);

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
                Portal Management
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
                  onClick={() => {
                    setActiveNavTab('teachers');
                    onOpenStaffDatabase('teachers');
                  }}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'teachers'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Teachers & Staff Manager"
                >
                  <GraduationCap className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Teachers</span>
                </button>

                {/* 3. Students */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveNavTab('students');
                    onOpenPupilDatabase('pupils');
                  }}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'students'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Pupils & Students Directory"
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
                      ? 'bg-[#CFCEFF] text-slate-900 font-bold shadow-2xs'
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
                  onClick={() => {
                    setActiveNavTab('subjects');
                    onOpenStaffDatabase('subjects');
                  }}
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
                  onClick={() => {
                    setActiveNavTab('classes');
                    onOpenStaffDatabase('classes');
                  }}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeNavTab === 'classes'
                      ? 'bg-[#C3EBFA] text-slate-900 font-bold shadow-2xs'
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
                {/* School Whitelabel & Branding */}
                <button
                  type="button"
                  onClick={onOpenBranding}
                  className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="School Branding & Whitelabel"
                >
                  <Settings className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Settings</span>
                </button>

                {/* Result Access Logs */}
                <button
                  type="button"
                  onClick={onOpenAuditLogs}
                  className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Security & Verification Audit Logs"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
                  <span className="hidden lg:block">Audit Logs</span>
                </button>

                {/* Sign Out / Switch Portal */}
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
              placeholder="Search pupils, classes, subjects..."
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
              onClick={() => setActiveNavTab('home')}
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
          {/* A. If not on Home tab, render the active module (Parent Portal, Gradebook, Broadsheet, etc.) */}
          {activeNavTab !== 'home' ? (
            <div>{children}</div>
          ) : (
            /* B. LAMA DEV ICONIC DASHBOARD OVERVIEW (HOME) */
            <div className="flex flex-col lg:flex-row gap-6">
              {/* ── LEFT SECTION (2/3 WIDTH): USER CARDS + CHARTS ── */}
              <div className="w-full lg:w-2/3 flex flex-col gap-6">
                {/* 1. THE 4 PASTEL USER CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Card 1: Students (LamaPurple) */}
                  <div
                    onClick={() => onOpenPupilDatabase('pupils')}
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
                    onClick={() => onOpenStaffDatabase('teachers')}
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
                    onClick={() => onOpenStaffDatabase('classes')}
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

                    {/* Donut Chart Visual SVG */}
                    <div className="relative w-full h-[180px] flex items-center justify-center my-2">
                      <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                        {/* Background circle */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F0FF" strokeWidth="12" />
                        {/* Boys arc (LamaSky: #C3EBFA) */}
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
                        {/* Girls arc (LamaYellow: #FAE27C) */}
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

                    {/* Bottom Legend */}
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
                      {/* Legend */}
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

                    {/* Bar Chart Visualization */}
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
                            {/* Present Bar */}
                            <div
                              style={{ height: `${item.present * 0.9}%` }}
                              className="w-3.5 bg-[#C3EBFA] rounded-t-md hover:opacity-85 transition"
                              title={`Present: ${item.present}%`}
                            ></div>
                            {/* Absent Bar */}
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

                {/* 3. QUICK SHORTCUT BANNER FOR PARENT RESULTS & GRADEBOOK */}
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

                  {/* Calendar Days Grid */}
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
                    <span className="text-[11px] text-slate-400 hover:underline cursor-pointer font-semibold">
                      View All
                    </span>
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
        </div>
      </main>
    </div>
  );
};
