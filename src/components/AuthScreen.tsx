'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Lock,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  Clock,
  Key,
  Unlock,
  Copy,
  Check,
  Zap,
  RefreshCw,
  Ban,
  Share2,
  FileText,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { Teacher, ClassSection } from '@/types/attendance';
import { loginAsTeacher, loginAsAdmin, loginAsGate, AuthSession, getPortalCredentials, syncCredentialsFromCloud, wasSessionTimedOut, clearSessionTimedOut } from '@/lib/auth';
import { getTeachers, getClasses, syncDataFromCloud } from '@/lib/storage';
import {
  getSchoolBranding,
  SchoolBranding,
  LicensePlanType,
  LicenseStatusResult,
  RevokedKeyEntry,
  generateLicenseKey,
  activateLicenseKey,
  getLicenseStatus,
  getRevocationBlacklist,
  revokeCurrentLicense,
  revokeLicenseByKey,
  restoreRevokedLicense,
} from '@/lib/licensing';

interface AuthScreenProps {
  teachers: Teacher[];
  classes: ClassSection[];
  onLoginSuccess: (session: AuthSession) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  teachers: initialTeachers,
  classes: initialClasses,
  onLoginSuccess,
}) => {
  const [tab, setTab] = useState<'teacher' | 'admin' | 'gate' | 'vendor'>('teacher');
  const [teacherList, setTeacherList] = useState<Teacher[]>(initialTeachers);
  const [classList, setClassList] = useState<ClassSection[]>(initialClasses);
  const [branding, setBranding] = useState<SchoolBranding>(getSchoolBranding());

  // Vendor Master Portal State
  const [vendorUnlocked, setVendorUnlocked] = useState<boolean>(false);
  const [vendorPin, setVendorPin] = useState<string>('');
  const [vendorPinError, setVendorPinError] = useState<string>('');
  const [vendorSubTab, setVendorSubTab] = useState<'generator' | 'revocations'>('generator');

  // Key Generator State
  const [genSchoolName, setGenSchoolName] = useState<string>('');
  const [genPlanType, setGenPlanType] = useState<LicensePlanType>('term');
  const [genDurationMonths, setGenDurationMonths] = useState<number>(4);
  const [genPupilQuota, setGenPupilQuota] = useState<number>(500);
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedSlip, setCopiedSlip] = useState<boolean>(false);
  const [directAppliedNotice, setDirectAppliedNotice] = useState<string | null>(null);

  // Revocations Authority State
  const [currentLicenseStatus, setCurrentLicenseStatus] = useState<LicenseStatusResult>(getLicenseStatus());
  const [revocationReasonInput, setRevocationReasonInput] = useState<string>('Payment Default / Commercial Rental Terminated');
  const [manualRevokeKey, setManualRevokeKey] = useState<string>('');
  const [manualRevokeReason, setManualRevokeReason] = useState<string>('Contract Breach / Key Revoked by Licensor');
  const [manualRevokeSchoolName, setManualRevokeSchoolName] = useState<string>('');
  const [revocationList, setRevocationList] = useState<RevokedKeyEntry[]>([]);
  const [revocationActionFeedback, setRevocationActionFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const handleBranding = () => {
      const b = getSchoolBranding();
      setBranding(b);
      setCurrentLicenseStatus(getLicenseStatus(b.schoolName));
    };
    const handleLicense = () => {
      setCurrentLicenseStatus(getLicenseStatus());
      setRevocationList(getRevocationBlacklist());
    };
    window.addEventListener('attendiq:branding-updated', handleBranding);
    window.addEventListener('attendiq:license-updated', handleLicense);
    return () => {
      window.removeEventListener('attendiq:branding-updated', handleBranding);
      window.removeEventListener('attendiq:license-updated', handleLicense);
    };
  }, []);
  
  const defaultTeacherId = initialTeachers.find((t) => t.name.includes('Danladi'))?.id || initialTeachers[0]?.id || '';
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(defaultTeacherId);
  
  const [pin, setPin] = useState<string>('');
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [gatePasscode, setGatePasscode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [timedOutNotice, setTimedOutNotice] = useState<boolean>(false);

  // Sync latest teachers, enrolled staff, and PINs from cloud on mount
  useEffect(() => {
    if (wasSessionTimedOut()) {
      setTimedOutNotice(true);
    }
    const refreshLocalData = () => {
      const localTeachers = getTeachers();
      const localClasses = getClasses();
      if (localTeachers.length > 0) setTeacherList(localTeachers);
      if (localClasses.length > 0) setClassList(localClasses);
    };
    refreshLocalData();

    syncDataFromCloud().then((cloudData) => {
      if (cloudData.teachers && cloudData.teachers.length > 0) {
        setTeacherList(cloudData.teachers);
        if (!selectedTeacherId && cloudData.teachers.length > 0) {
          setSelectedTeacherId(cloudData.teachers[0].id);
        }
      }
      if (cloudData.classes && cloudData.classes.length > 0) {
        setClassList(cloudData.classes);
      }
    });

    syncCredentialsFromCloud();

    window.addEventListener('attend-iq-storage-update', refreshLocalData);
    return () => {
      window.removeEventListener('attend-iq-storage-update', refreshLocalData);
    };
  }, []);

  const handleTeacherChange = (newTeacherId: string) => {
    setSelectedTeacherId(newTeacherId);
    setError(null);
    setPin(''); // Completely clear PIN field for security
  };

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let res = loginAsTeacher(selectedTeacherId, pin);
    if (!res.success) {
      // If failed locally, re-sync credentials and teachers live from cloud in case PIN or teacher was updated on admin laptop
      await Promise.all([syncCredentialsFromCloud(), syncDataFromCloud()]);
      res = loginAsTeacher(selectedTeacherId, pin);
    }
    setLoading(false);

    if (res.success && res.session) {
      onLoginSuccess(res.session);
    } else {
      setError(res.message);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = loginAsAdmin(adminPasscode);
    setLoading(false);

    if (res.success && res.session) {
      onLoginSuccess(res.session);
    } else {
      setError(res.message);
    }
  };

  const handleGateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = loginAsGate(gatePasscode);
    setLoading(false);

    if (res.success && res.session) {
      onLoginSuccess(res.session);
    } else {
      setError(res.message);
    }
  };

  const handleUnlockVendor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = vendorPin.trim().toLowerCase();
    if (cleanPin === '9009' || cleanPin === 'attendiq') {
      setVendorUnlocked(true);
      setVendorPinError('');
      if (!genSchoolName) {
        setGenSchoolName(branding.schoolName || 'Lead British International School');
      }
      setRevocationList(getRevocationBlacklist());
      setCurrentLicenseStatus(getLicenseStatus());
    } else {
      setVendorPinError('Invalid Vendor Master Passkey. Access Denied.');
    }
  };

  const handleGenerateKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const school = genSchoolName.trim() || branding.schoolName || 'AttendIQ Client School';
    const key = generateLicenseKey(school, genPlanType, genDurationMonths, genPupilQuota);
    setGeneratedKey(key);
    setCopiedKey(false);
    setCopiedSlip(false);
    setDirectAppliedNotice(null);
  };

  const handleCopyGeneratedKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyWhatsAppReceipt = () => {
    if (!generatedKey) return;
    const quotaLabel = genPupilQuota === 99999 ? 'Unlimited Pupils' : `${genPupilQuota.toLocaleString()} Pupils`;
    const slip = `*AttendIQ™ Commercial Software License Receipt*
━━━━━━━━━━━━━━━━━━━━━━━━
🏫 *Licensee School*: ${genSchoolName.trim() || branding.schoolName}
📜 *License Plan*: ${genPlanType.toUpperCase()} (${genDurationMonths} Months)
👥 *Pupil Quota*: ${quotaLabel}
📅 *Issue Date*: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
🔑 *Cryptographic License Key*:
\`${generatedKey}\`
━━━━━━━━━━━━━━━━━━━━━━━━
*Activation Instructions*:
1. Log into AttendIQ Admin / Principal Portal.
2. Click the School Crest / Settings ➔ "School Whitelabel & Commercial Licensing".
3. Select "License & Subscription" tab and paste your key.
4. Click "Verify & Activate License" to unlock all institutional features.

_Thank you for choosing AttendIQ Multi-Tenant Enterprise._`;

    navigator.clipboard.writeText(slip);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleDirectApplyToCurrent = () => {
    if (!generatedKey) return;
    const targetSchool = genSchoolName.trim() || branding.schoolName;
    const res = activateLicenseKey(generatedKey, targetSchool);
    if (res.success) {
      setDirectAppliedNotice(`✓ Successfully applied to ${targetSchool}!`);
      setCurrentLicenseStatus(getLicenseStatus());
      setTimeout(() => setDirectAppliedNotice(null), 3500);
    } else {
      setDirectAppliedNotice(`Activation failed: ${res.message}`);
    }
  };

  const handleExecuteKillSwitch = () => {
    const reason = revocationReasonInput.trim() || 'Commercial Subscription Terminated by Software Licensor';
    const res = revokeCurrentLicense(reason);
    setRevocationActionFeedback(res);
    setRevocationList(getRevocationBlacklist());
    setCurrentLicenseStatus(getLicenseStatus());
  };

  const handleManualRevokeKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRevokeKey.trim()) return;
    const res = revokeLicenseByKey(
      manualRevokeKey.trim(),
      manualRevokeReason.trim() || 'Revoked by Vendor Licensor',
      manualRevokeSchoolName.trim() || undefined
    );
    setRevocationActionFeedback(res);
    setManualRevokeKey('');
    setManualRevokeSchoolName('');
    setRevocationList(getRevocationBlacklist());
    setCurrentLicenseStatus(getLicenseStatus());
  };

  const handleRestoreKey = (key: string) => {
    const res = restoreRevokedLicense(key);
    setRevocationActionFeedback(res);
    setRevocationList(getRevocationBlacklist());
    setCurrentLicenseStatus(getLicenseStatus());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-indigo-100/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-indigo-300/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-sky-200/40 rounded-full blur-[140px] pointer-events-none" />

      <div className={`w-full ${tab === 'vendor' ? 'max-w-xl' : 'max-w-md'} bg-white rounded-3xl shadow-xl border border-slate-300/80 overflow-hidden relative z-10 transition-all duration-300 animate-in fade-in zoom-in-95`}>
        {/* School Header */}
        <div className={`p-6 text-white text-center border-b transition-colors ${
          tab === 'vendor'
            ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-amber-900/60'
            : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/60'
        }`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-2xl ${
            tab === 'vendor'
              ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/30'
              : 'bg-gradient-to-tr from-indigo-500 to-sky-400 shadow-indigo-500/30'
          }`}>
            {tab === 'vendor' ? (
              <Key className="h-7 w-7 text-white" />
            ) : branding.crestEmoji ? (
              <span>{branding.crestEmoji}</span>
            ) : (
              <GraduationCap className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">
            {tab === 'vendor' ? 'Vendor Master Portal & Licensor Authority' : branding.schoolName}
          </h1>
          <p className="text-xs text-indigo-200/80 mt-1">
            {tab === 'vendor'
              ? 'Commercial Token Generation • Revocations & Kill-Switch Authority'
              : `${branding.branchLocation} • AttendIQ Portal`}
          </p>
        </div>

        {/* Portal Role Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setTab('teacher');
              setError(null);
            }}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              tab === 'teacher'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('admin');
              setError(null);
            }}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              tab === 'admin'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Principal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('gate');
              setError(null);
            }}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              tab === 'gate'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Gate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('vendor');
              setError(null);
            }}
            className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 shrink-0 ${
              tab === 'vendor'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 hover:text-amber-950 bg-amber-500/10'
            }`}
            title="Software Licensor Key Issuance & Revocation Authority"
          >
            <Key className="h-3.5 w-3.5" />
            <span>Licensor</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6">
          {timedOutNotice && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-900 shadow-xs animate-in fade-in duration-200">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-950">Inactivity Auto-Logout</p>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  You were logged out after 30 minutes of inactivity to safeguard school attendance & pupil records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTimedOutNotice(false);
                  clearSessionTimedOut();
                }}
                className="text-amber-500 hover:text-amber-900 font-bold px-1 text-sm transition"
              >
                ✕
              </button>
            </div>
          )}

          {tab === 'teacher' ? (
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Your Teacher Profile:
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {teacherList.map((t) => {
                    const assignedCls = classList.find(
                      (c) => t.assignedClassIds?.includes(c.id) || c.teacherId === t.id
                    );
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} {assignedCls ? `— ${assignedCls.name}` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  You will only see your assigned pupils, roll call, and subject records.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Enter Your 4-Digit Login PIN:</span>
                  <span className="text-[10px] text-slate-400 font-medium">Confidential Access</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-center text-xl tracking-[0.3em] font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-300"
                    required
                  />
                  <KeyRound className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  PINs are assigned privately by the School Administrator.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <span>Enter Classroom Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : tab === 'admin' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-2xl mb-3 flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-900">
                    <p className="font-bold">Principal & School Management Console</p>
                    <p className="text-[11px] text-indigo-700/80 mt-0.5">
                      Full administrative access to all classes, teachers, student broadsheet, and chronic absence alerts.
                    </p>
                  </div>
                </div>

                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Enter Management Passcode:</span>
                  <span className="text-[10px] text-slate-400 font-medium">Administrator</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-center text-xl tracking-[0.3em] font-black text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-300"
                    required
                  />
                  <Lock className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-white font-bold text-sm shadow-md shadow-slate-900/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <span>Access Management Console</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : tab === 'gate' ? (
            <form onSubmit={handleGateLogin} className="space-y-4">
              <div>
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl mb-3 flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold">Gate Security Post</p>
                    <p className="text-[11px] text-amber-700/80 mt-0.5">
                      Fast physical gatekeeper scanner and late-arrival register.
                    </p>
                  </div>
                </div>

                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Enter Gate Security Passcode:</span>
                  <span className="text-[10px] text-slate-400 font-medium">Gatehouse</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={gatePasscode}
                    onChange={(e) => setGatePasscode(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-mono text-center text-xl tracking-[0.3em] font-black text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-300"
                    required
                  />
                  <Lock className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <span>Access Gate Terminal</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            /* TAB 4: VENDOR MASTER PORTAL & REVOCATIONS AUTHORITY */
            <div className="space-y-4">
              {!vendorUnlocked ? (
                /* Master PIN Gate */
                <form onSubmit={handleUnlockVendor} className="space-y-4 text-center py-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 mx-auto flex items-center justify-center border border-amber-500/30 shadow-inner">
                    <Lock className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Software Licensor Authority Required
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Enter your master passkey (Default: <code className="font-mono font-bold text-amber-700">9009</code>) to issue verifiable school licenses or execute revocation kill-switches.
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto space-y-2">
                    <input
                      type="password"
                      autoFocus
                      placeholder="Enter Master Passkey"
                      value={vendorPin}
                      onChange={(e) => {
                        setVendorPin(e.target.value);
                        setVendorPinError('');
                      }}
                      className="w-full text-center px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-base font-mono tracking-widest font-black focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                    {vendorPinError && (
                      <p className="text-xs font-bold text-rose-600">{vendorPinError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full max-w-xs mx-auto py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 active:scale-98 transition cursor-pointer"
                  >
                    <Unlock className="h-4 w-4" />
                    Unlock Licensor Master Console
                  </button>

                  <p className="text-[11px] text-slate-400">
                    Proprietor console is separated from school administration for commercial security.
                  </p>
                </form>
              ) : (
                /* Unlocked Licensor Master Console */
                <div className="space-y-4">
                  {/* Top Bar with Lock button */}
                  <div className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          Licensor Master Authority Active
                        </h4>
                        <p className="text-[10px] text-amber-700">
                          Cryptographic Token Issuance & Revocations Engine
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendorUnlocked(false)}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition"
                    >
                      Lock Console
                    </button>
                  </div>

                  {/* Sub-tab pills */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => setVendorSubTab('generator')}
                      className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                        vendorSubTab === 'generator'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Issue License Key</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVendorSubTab('revocations')}
                      className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                        vendorSubTab === 'revocations'
                          ? 'bg-white text-rose-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Ban className="h-3.5 w-3.5 text-rose-600" />
                      <span>Revocations Authority {revocationList.length > 0 && `(${revocationList.length})`}</span>
                    </button>
                  </div>

                  {/* SUBTAB 1: LICENSE GENERATOR */}
                  {vendorSubTab === 'generator' && (
                    <div className="space-y-4 animate-in fade-in">
                      <form onSubmit={handleGenerateKey} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                        <div>
                          <label className="font-bold text-slate-800 block mb-1">
                            Client School Legal Name (Licensee) *
                          </label>
                          <input
                            type="text"
                            required
                            value={genSchoolName}
                            onChange={(e) => setGenSchoolName(e.target.value)}
                            placeholder="e.g. Lead British International School"
                            className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-slate-400">
                            Key is cryptographically bound to this exact school name
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-bold text-slate-800 block mb-1">
                              Rental Tier *
                            </label>
                            <select
                              value={genPlanType}
                              onChange={(e) => {
                                const p = e.target.value as LicensePlanType;
                                setGenPlanType(p);
                                if (p === 'trial') setGenDurationMonths(1);
                                else if (p === 'term') setGenDurationMonths(4);
                                else if (p === 'annual') setGenDurationMonths(12);
                                else if (p === 'enterprise') setGenDurationMonths(24);
                              }}
                              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="term">Academic Term (4 Months / 1 Term)</option>
                              <option value="annual">Full School Year (12 Months / 3 Terms)</option>
                              <option value="trial">Prospective Trial (1 Month)</option>
                              <option value="enterprise">Multi-Year Enterprise (24 Months)</option>
                            </select>
                          </div>

                          <div>
                            <label className="font-bold text-slate-800 block mb-1">
                              Duration (Months) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="36"
                              value={genDurationMonths}
                              onChange={(e) => setGenDurationMonths(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="font-bold text-slate-800 block mb-1">
                              Student Population Quota Cap *
                            </label>
                            <select
                              value={genPupilQuota}
                              onChange={(e) => setGenPupilQuota(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value={250}>Starter Tier (Up to 250 Pupils)</option>
                              <option value={500}>Growth Tier (Up to 500 Pupils)</option>
                              <option value={1000}>Standard School (Up to 1,000 Pupils)</option>
                              <option value={99999}>Mega Campus (Unlimited Pupils)</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wide shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Generate Signed License Token</span>
                        </button>
                      </form>

                      {/* Generated Key Result Box */}
                      {generatedKey && (
                        <div className="p-4 bg-slate-950 text-white rounded-2xl border border-amber-500/40 space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Cryptographically Signed Token Ready
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              Valid for {genSchoolName || branding.schoolName}
                            </span>
                          </div>

                          <div className="p-3 bg-black/80 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 break-all select-all font-bold">
                            {generatedKey}
                          </div>

                          {directAppliedNotice && (
                            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs text-center font-bold">
                              {directAppliedNotice}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-bold">
                            <button
                              type="button"
                              onClick={handleCopyGeneratedKey}
                              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-1.5 transition"
                            >
                              {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                              <span>{copiedKey ? 'Copied Key!' : 'Copy Key'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleCopyWhatsAppReceipt}
                              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition"
                              title="Copy structured invoice receipt for WhatsApp/Email"
                            >
                              {copiedSlip ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                              <span>{copiedSlip ? 'Receipt Copied!' : 'WhatsApp Slip'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDirectApplyToCurrent}
                              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition"
                              title="Directly activate this key on this current browser instance"
                            >
                              <Zap className="h-3.5 w-3.5 text-amber-300" />
                              <span>1-Click Apply</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBTAB 2: REVOCATIONS AUTHORITY */}
                  {vendorSubTab === 'revocations' && (
                    <div className="space-y-4 animate-in fade-in">
                      {/* Action feedback */}
                      {revocationActionFeedback && (
                        <div
                          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
                            revocationActionFeedback.success
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border border-rose-200 text-rose-800'
                          }`}
                        >
                          <span>{revocationActionFeedback.message}</span>
                          <button
                            type="button"
                            onClick={() => setRevocationActionFeedback(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Current Active School License Status Card */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            Current Institution License
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              currentLicenseStatus.status === 'revoked'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : currentLicenseStatus.isExpired
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {currentLicenseStatus.status === 'revoked'
                              ? '⛔ REVOKED'
                              : currentLicenseStatus.isExpired
                              ? 'EXPIRED'
                              : 'ACTIVE'}
                          </span>
                        </div>

                        <div className="text-xs">
                          <p className="font-black text-slate-900">{currentLicenseStatus.schoolName}</p>
                          <p className="text-[11px] text-slate-500">
                            {currentLicenseStatus.planName} • Valid Until {currentLicenseStatus.validUntilFormatted}
                          </p>
                          {currentLicenseStatus.isRevoked && (
                            <p className="text-[11px] text-rose-600 font-bold mt-1">
                              Revocation Reason: {currentLicenseStatus.revocationReason}
                            </p>
                          )}
                        </div>

                        {/* Kill Switch or Restore Current */}
                        {currentLicenseStatus.status === 'revoked' ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreKey('')}
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Restore & Re-authorize School Access</span>
                          </button>
                        ) : (
                          <div className="space-y-2 pt-2 border-t border-slate-200">
                            <label className="text-[11px] font-bold text-slate-700 block">
                              Emergency Kill-Switch Reason:
                            </label>
                            <input
                              type="text"
                              value={revocationReasonInput}
                              onChange={(e) => setRevocationReasonInput(e.target.value)}
                              placeholder="e.g. Non-Payment of Termly Subscription / Contract Breach"
                              className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                            <button
                              type="button"
                              onClick={handleExecuteKillSwitch}
                              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                            >
                              <Ban className="h-4 w-4" />
                              <span>Execute Kill-Switch (Revoke Current License)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Manual Key Revocation Form */}
                      <form onSubmit={handleManualRevokeKey} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3 text-xs">
                        <div className="flex items-center gap-2 text-rose-900 font-bold">
                          <Ban className="h-4 w-4 text-rose-600" />
                          <span>Blacklist & Revoke Specific License Key</span>
                        </div>
                        <p className="text-[11px] text-rose-800">
                          Revoking a key prevents any device or browser from activating or continuing to run under this key.
                        </p>

                        <div className="space-y-2">
                          <input
                            type="text"
                            required
                            placeholder="Paste License Key (e.g. ATTIQ-APEX-TERM-202610...)"
                            value={manualRevokeKey}
                            onChange={(e) => setManualRevokeKey(e.target.value)}
                            className="w-full px-3 py-2 bg-white rounded-xl border border-rose-200 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                          <input
                            type="text"
                            placeholder="Revocation Reason (e.g. Payment Default / Cheque Returned)"
                            value={manualRevokeReason}
                            onChange={(e) => setManualRevokeReason(e.target.value)}
                            className="w-full px-3 py-2 bg-white rounded-xl border border-rose-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Blacklist & Revoke Key</span>
                        </button>
                      </form>

                      {/* Revocation Blacklist Ledger */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Ban className="h-3.5 w-3.5 text-rose-600" />
                            Revocation Blacklist Ledger ({revocationList.length})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Instant unblock upon payment
                          </span>
                        </div>

                        {revocationList.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic text-center py-2">
                            No keys currently blacklisted. All issued keys are in good standing.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {revocationList.map((item) => (
                              <div
                                key={item.key}
                                className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-mono text-[11px] font-black text-rose-700 truncate select-all">
                                    {item.key}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {item.schoolName ? `${item.schoolName} • ` : ''}{item.reason}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreKey(item.key)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold shrink-0 transition"
                                  title="Un-revoke and restore access for this key"
                                >
                                  Restore Key
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parent Absence Notice Portal Link */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link
              href="/excuse"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl border border-indigo-200/80 transition"
            >
              <span>Are you a Parent reporting an absence? Submit note here &rarr;</span>
            </Link>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100/60 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>{branding.schoolName} • Secure Cloud Portal Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};
