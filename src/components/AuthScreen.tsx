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
} from 'lucide-react';
import { Teacher, ClassSection } from '@/types/attendance';
import { loginAsTeacher, loginAsAdmin, loginAsGate, AuthSession, getPortalCredentials, syncCredentialsFromCloud, wasSessionTimedOut, clearSessionTimedOut } from '@/lib/auth';
import { getTeachers, getClasses, syncDataFromCloud } from '@/lib/storage';

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
  const [tab, setTab] = useState<'teacher' | 'admin' | 'gate'>('teacher');
  const [teacherList, setTeacherList] = useState<Teacher[]>(initialTeachers);
  const [classList, setClassList] = useState<ClassSection[]>(initialClasses);
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-indigo-100/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-indigo-300/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-sky-200/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-300/80 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* School Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center border-b border-indigo-900/60">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">AttendIQ School Portal</h1>
          <p className="text-xs text-indigo-200/80 mt-1">
            Apex Crest Academy • Abuja, Nigeria
          </p>
        </div>

        {/* Portal Role Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('teacher');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'teacher'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Class Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('admin');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
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
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              tab === 'gate'
                ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Gate Post</span>
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
          ) : (
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
            <span>Apex Crest Academy • Secure Cloud Portal Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};
