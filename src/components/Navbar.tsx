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
  WifiOff,
  CheckCircle2,
  X,
  Building,
  Key,
} from 'lucide-react';
import { AlertSettings, Teacher, ClassSection } from '@/types/attendance';
import { flushOfflineQueue } from '@/lib/storage';
import {
  getSchoolBranding,
  getLicenseStatus,
  SchoolBranding,
  LicenseStatusResult,
} from '@/lib/licensing';

interface NavbarProps {
  currentRole: 'teacher' | 'gate' | 'admin';
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
  onSwitchToTeacher?: (teacherId?: string) => void;
  onSwitchToGate?: () => void;
  onSwitchToAdmin?: (passcode: string) => { success: boolean; message: string };
  onOpenWhitelabelModal?: (tab?: 'branding' | 'licensing') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
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
  onSwitchToTeacher,
  onSwitchToGate,
  onSwitchToAdmin,
  onOpenWhitelabelModal,
}) => {
  const [todayStr, setTodayStr] = React.useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [isOnline, setIsOnline] = React.useState<boolean>(true);
  const [syncNotice, setSyncNotice] = React.useState<string | null>(null);

  // School Whitelabel & License State
  const [branding, setBranding] = React.useState<SchoolBranding>(getSchoolBranding());
  const [licenseStatus, setLicenseStatus] = React.useState<LicenseStatusResult>(getLicenseStatus());

  // Admin PIN / Passcode Verification Modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = React.useState('');
  const [adminModalError, setAdminModalError] = React.useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = React.useState(false);

  const handleVerifyAdminPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminModalError(null);
    if (!adminPasscodeInput.trim()) {
      setAdminModalError('Please enter the Admin Master Passcode.');
      return;
    }
    if (onSwitchToAdmin) {
      setIsVerifyingPin(true);
      const res = onSwitchToAdmin(adminPasscodeInput.trim());
      setIsVerifyingPin(false);
      if (res.success) {
        setAdminPasscodeInput('');
        setIsAdminModalOpen(false);
      } else {
        setAdminModalError(res.message || 'Incorrect Passcode. Access denied.');
      }
    }
  };

  React.useEffect(() => {
    const handleBranding = () => {
      setBranding(getSchoolBranding());
      setLicenseStatus(getLicenseStatus());
    };
    const handleLicense = () => {
      setLicenseStatus(getLicenseStatus());
    };
    window.addEventListener('attendiq:branding-updated', handleBranding);
    window.addEventListener('attendiq:license-updated', handleLicense);

    try {
      setIsOnline(navigator.onLine);
      const handleOnline = () => {
        setIsOnline(true);
        flushOfflineQueue().then(({ synced }) => {
          if (synced > 0) {
            setSyncNotice(`Synced ${synced} updates!`);
            setTimeout(() => setSyncNotice(null), 4000);
          }
        });
      };
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      setTodayStr(new Date().toISOString().split('T')[0]);
      const savedTheme = localStorage.getItem('attend_iq_theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
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
      window.removeEventListener('attendiq:branding-updated', handleBranding);
      window.removeEventListener('attendiq:license-updated', handleLicense);
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
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        localStorage.setItem('attend_iq_theme', 'light');
        document.documentElement.classList.remove('dark');
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 text-lg overflow-hidden shrink-0">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.schoolName} className="h-full w-full object-contain p-0.5" />
              ) : branding.crestEmoji ? (
                <span className="text-xl select-none">{branding.crestEmoji}</span>
              ) : (
                <GraduationCap className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent tracking-tight">
                  AttendIQ
                </span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 hidden sm:inline-block">
                  {branding.shortName || 'School Portal'}
                </span>
                {onOpenWhitelabelModal && (
                  <button
                    onClick={() => onOpenWhitelabelModal('licensing')}
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 transition ${licenseStatus.badgeColor} hover:opacity-85 cursor-pointer shadow-2xs`}
                    title={`AttendIQ Subscription: ${licenseStatus.statusLabel} (${licenseStatus.validUntilFormatted}). Click to view or renew.`}
                  >
                    <Key className="h-2.5 w-2.5" />
                    <span>{licenseStatus.planName.toUpperCase()} • {licenseStatus.daysRemaining > 0 ? `${licenseStatus.daysRemaining}d` : 'EXPIRED'}</span>
                  </button>
                )}
                {!isOnline && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1 animate-pulse">
                    <WifiOff className="h-3 w-3" /> Offline Mode (Local Cache)
                  </span>
                )}
                {syncNotice && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {syncNotice}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                {branding.schoolName}, {branding.branchLocation} • {branding.currentTerm}
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

                {/* Switch to Admin Console Button (Protected with Master Passcode) */}
                <button
                  onClick={() => {
                    setAdminPasscodeInput('');
                    setAdminModalError(null);
                    setIsAdminModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs border border-slate-700 transition"
                  title="Switch to Admin Console (Requires Master Passcode)"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin Console</span>
                </button>

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

                {/* Switch to Admin Console Button (Protected with Master Passcode) */}
                <button
                  onClick={() => {
                    setAdminPasscodeInput('');
                    setAdminModalError(null);
                    setIsAdminModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs border border-slate-700 transition"
                  title="Switch to Admin Console (Requires Master Passcode)"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin Console</span>
                </button>

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

                {onSwitchToTeacher && (
                  <button
                    onClick={() => onSwitchToTeacher()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition"
                    title="Authorized Administrator Access to Staff Console (Teacher View)"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Staff Console</span>
                  </button>
                )}


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
              className={`p-2 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                isDarkMode
                  ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-amber-400/40 text-amber-300 hover:border-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-gradient-to-r from-indigo-50 to-sky-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm'
              }`}
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Eye-Care Theme'}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-indigo-700" />}
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

          </div>
        </div>
      </div>

      {/* Admin Passcode Verification Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95">
            <div className="h-1.5 w-full absolute top-0 left-0 bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Admin Verification</h3>
                  <span className="text-[11px] text-slate-500 font-medium">Principal & Management Access</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdminModalOpen(false);
                  setAdminPasscodeInput('');
                  setAdminModalError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Enter your Master Administration Passcode to return to the Principal & Management Console.
            </p>

            {adminModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{adminModalError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAdminPasscode} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Master Passcode
                </label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    maxLength={10}
                    value={adminPasscodeInput}
                    onChange={(e) => {
                      setAdminPasscodeInput(e.target.value);
                      if (adminModalError) setAdminModalError(null);
                    }}
                    placeholder="Enter Passcode"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminModalOpen(false);
                    setAdminPasscodeInput('');
                    setAdminModalError(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPin || !adminPasscodeInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isVerifyingPin ? 'Verifying...' : 'Unlock Console'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
