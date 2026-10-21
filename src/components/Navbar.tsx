'use client';

import React from 'react';
import {
  GraduationCap,
  Bell,
  Sliders,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Download,
  Smartphone,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { AlertSettings, Teacher, ClassSection } from '@/types/attendance';

interface NavbarProps {
  currentRole: 'teacher' | 'gate' | 'admin';
  onRoleChange: (role: 'teacher' | 'gate' | 'admin') => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  alertCount: number;
  onOpenAlertsModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenDatabaseModal: (tab?: 'pupils' | 'teachers' | 'classes') => void;
  alertSettings: AlertSettings;
  teachers?: Teacher[];
  currentTeacherId?: string;
  onSelectTeacherId?: (teacherId: string) => void;
  classes?: ClassSection[];
  onOpenAuditModal?: () => void;
  auditWarningCount?: number;
  onLogout?: () => void;
  activeTeacher?: Teacher;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  selectedDate,
  onDateChange,
  alertCount,
  onOpenAlertsModal,
  onOpenSettingsModal,
  onOpenDatabaseModal,
  alertSettings,
  teachers = [],
  currentTeacherId,
  onSelectTeacherId,
  classes = [],
  onOpenAuditModal,
  auditWarningCount = 0,
  onLogout,
  activeTeacher,
}) => {
  const [todayStr, setTodayStr] = React.useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(true);

  React.useEffect(() => {
    try {
      setTodayStr(new Date().toISOString().split('T')[0]);
      const savedTheme = localStorage.getItem('attend_iq_theme');
      if (savedTheme === 'light') {
        setIsDarkMode(false);
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      } else {
        setIsDarkMode(true);
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      }
    } catch {}

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install AttendIQ on your phone/tablet:\n\n• On iOS (iPhone/iPad Safari): Tap the Share button, then tap "Add to Home Screen".\n• On Android (Chrome): Tap the 3 dots menu, then tap "Install app" or "Add to Home screen".');
    }
  };

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    try {
      if (nextDark) {
        localStorage.setItem('attend_iq_theme', 'dark');
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        localStorage.setItem('attend_iq_theme', 'light');
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }
    } catch {}
  };

  const isToday = todayStr ? selectedDate === todayStr : true;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent tracking-tight">
                  AttendIQ
                </span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 hidden sm:inline-block">
                  School Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Apex Crest Academy, Abuja (FCT) • First Term (2026/2027 Session)
              </p>
            </div>
          </div>

          {/* Role Switcher Pill & Access Management */}
          {/* Role Switcher Pill & Access Management */}
          <div className="flex items-center gap-2">
            {currentRole === 'teacher' ? (
              <div className="flex items-center gap-2">
                {/* Active Teacher Profile Badge */}
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shadow-xs">
                    {activeTeacher?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'T'}
                  </div>
                  <div>
                    <span className="font-bold text-indigo-950 block leading-tight text-xs">
                      {activeTeacher?.name || 'Class Teacher'}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold block">
                      {classes.find((c) => c.teacherId === activeTeacher?.id || activeTeacher?.assignedClassIds?.includes(c.id))?.name || 'Classroom Teacher'}
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition border border-slate-200"
                    title="Sign Out of Teacher Workspace"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                )}
              </div>
            ) : currentRole === 'gate' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950 text-white font-bold text-xs shadow-xs border border-amber-800">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  <span>Gate Security Post</span>
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition border border-slate-200"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs border border-slate-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Principal Console</span>
                </div>

                <button
                  onClick={() => onRoleChange('teacher')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition"
                  title="Switch to Teacher Attendance Portal"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Teacher View</span>
                </button>

                <button
                  onClick={() => onRoleChange('gate')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition"
                  title="Switch to Gate Security Register"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Gate Register</span>
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs transition border border-slate-200"
                    title="Exit Principal Console"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons & Date */}
          <div className="flex items-center gap-2">
            {/* Date Picker */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs">
              <Calendar className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              />
              {!isToday && (
                <button
                  onClick={() => onDateChange(new Date().toISOString().split('T')[0])}
                  className="ml-2 text-[10px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition"
                  title="Jump to Today"
                >
                  Today
                </button>
              )}
            </div>

            {/* Dark Gradient / Light Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                isDarkMode
                  ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 border-amber-400/30 text-amber-300 hover:border-amber-400 shadow-sm shadow-amber-500/10'
                  : 'bg-gradient-to-r from-indigo-50 to-sky-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
              }`}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Eye-Care Gradient'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Management Database Actions (Visible in Admin Mode) */}
            {currentRole === 'admin' && (
              <>
                {/* Teachers & Staff Database */}
                <button
                  onClick={() => onOpenDatabaseModal('teachers')}
                  className="p-2 rounded-lg text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold bg-white"
                  title="Manage Teachers & Staff Roster"
                >
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  <span className="hidden lg:inline">Teachers ({teachers.length})</span>
                </button>

                {/* Pupils Database */}
                <button
                  onClick={() => onOpenDatabaseModal('pupils')}
                  className="p-2 rounded-lg text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition-colors hidden sm:flex items-center gap-1.5 text-xs font-bold bg-white"
                  title="Pupils & Classes Manager"
                >
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span className="hidden lg:inline">Pupils</span>
                </button>

                {/* Security Audit Trail & Anti-Tamper Log */}
                {onOpenAuditModal && (
                  <button
                    onClick={onOpenAuditModal}
                    className="relative p-2 rounded-lg text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-bold bg-white"
                    title="Staff Activity & Anti-Tamper Security Audit Trail"
                  >
                    <ShieldAlert className="h-4 w-4 text-indigo-600" />
                    <span className="hidden lg:inline">Audit Trail</span>
                    {auditWarningCount > 0 && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                  </button>
                )}

                {/* Parent Alerts Center */}
                <button
                  onClick={onOpenAlertsModal}
                  className="relative p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                  title="Parent SMS & Email Alerts"
                >
                  <Bell className="h-4 w-4" />
                  {alertCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </button>

                {/* Settings & Thresholds */}
                <button
                  onClick={onOpenSettingsModal}
                  className="p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                  title="Alert Thresholds & Automation"
                >
                  <Sliders className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Install Mobile / PWA App Button */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-xs transition"
                title="Install AttendIQ on Phone/Tablet"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
