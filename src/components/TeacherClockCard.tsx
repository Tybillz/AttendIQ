'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Smartphone,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getPerimeterConfig,
  syncPerimeterConfigFromCloud,
  getDailyEntranceCode,
  getTeacherRecordForDate,
  getTeacherDeviceLock,
  clockInTeacher,
  clockOutTeacher,
  checkSchoolPerimeter,
} from '@/lib/teacherAttendance';
import { getHardwareDeviceProfile, HardwareProfile } from '@/lib/hardwareFingerprint';
import { Teacher, ClassSection, TeacherClockRecord, TeacherDeviceLock } from '@/types/attendance';

interface TeacherClockCardProps {
  teacher: Teacher;
  activeClass?: ClassSection;
  selectedDate: string;
  onRecordUpdated?: () => void;
}

export const TeacherClockCard: React.FC<TeacherClockCardProps> = ({
  teacher,
  activeClass,
  selectedDate,
  onRecordUpdated,
}) => {
  const [record, setRecord] = useState<TeacherClockRecord | undefined>(undefined);
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isInsidePerimeter, setIsInsidePerimeter] = useState<boolean | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [perimeterConfig, setPerimeterConfig] = useState(getPerimeterConfig());
  const [hardwareProfile, setHardwareProfile] = useState<HardwareProfile | null>(null);
  const [deviceLock, setDeviceLock] = useState<TeacherDeviceLock | undefined>(undefined);

  const digitInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Refresh record, perimeter config, and device lock when teacher or date changes
  useEffect(() => {
    loadRecord();
    setPerimeterConfig(getPerimeterConfig());
    setDeviceLock(getTeacherDeviceLock(teacher.id));

    syncPerimeterConfigFromCloud().then((conf) => {
      setPerimeterConfig(conf);
    });

    getHardwareDeviceProfile().then((profile) => {
      setHardwareProfile(profile);
    });
  }, [teacher.id, selectedDate]);

  const loadRecord = () => {
    const existing = getTeacherRecordForDate(teacher.id, selectedDate);
    setRecord(existing);
  };

  // Request browser GPS position
  const detectLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCoords(userCoords);
        setAccuracy(pos.coords.accuracy);

        const check = checkSchoolPerimeter(
          userCoords.lat,
          userCoords.lng,
          perimeterConfig,
          pos.coords.accuracy
        );

        setIsInsidePerimeter(check.isInside);
        setDistanceMeters(check.distanceMeters);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          err.code === 1
            ? 'Location permission denied. Please allow location access in your browser to verify school perimeter.'
            : 'Could not acquire precise GPS signal. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  // Run location check once on mount
  useEffect(() => {
    detectLocation();
  }, [perimeterConfig.schoolLat, perimeterConfig.schoolLng, perimeterConfig.radiusMeters]);

  // Handle 4-digit code typing
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const cleanChar = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);
    setFeedback(null);

    // Auto advance to next box
    if (cleanChar && index < 3) {
      digitInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitInputs.current[index - 1]?.focus();
    }
  };

  // Handle Clock-In submission
  const handleClockIn = () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 4) {
      setFeedback({ type: 'error', message: 'Please enter all 4 digits of today’s entrance code.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    const result = clockInTeacher(
      teacher.id,
      teacher.name,
      activeClass?.name || 'Classroom Teacher',
      selectedDate,
      fullCode,
      coords || undefined,
      accuracy,
      hardwareProfile || undefined
    );

    setActionLoading(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setRecord(result.record);
      setDeviceLock(getTeacherDeviceLock(teacher.id));
      setDigits(['', '', '', '']);
      onRecordUpdated?.();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Handle Clock-Out submission
  const handleClockOut = () => {
    if (!confirm('Are you sure you want to clock out for today?')) return;

    setActionLoading(true);
    const result = clockOutTeacher(teacher.id, selectedDate);
    setActionLoading(false);

    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setRecord(result.record);
      onRecordUpdated?.();
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Today's entrance code generated for this date
  const expectedCode = getDailyEntranceCode(selectedDate, perimeterConfig);

  const isClockedIn = Boolean(record?.clockInTime);
  const isClockedOut = Boolean(record?.clockOutTime);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/80 relative">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Teacher Info & Status */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800/80 flex items-center gap-1.5">
              <Smartphone className="h-3 w-3 text-indigo-400" /> Personal Device Clock-In
            </span>
            {deviceLock ? (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                hardwareProfile && deviceLock.deviceFingerprint === hardwareProfile.fingerprint
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                  : 'bg-rose-950/90 text-rose-300 border-rose-700/80'
              }`}>
                {hardwareProfile && deviceLock.deviceFingerprint === hardwareProfile.fingerprint
                  ? `🔒 Paired: ${deviceLock.deviceName}`
                  : `🛑 Mismatched Device: Locked to ${deviceLock.deviceName}`}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                🔓 Unpaired (First clock-in pairs phone)
              </span>
            )}
            <span className="text-xs text-slate-400">
              • Resumption: <strong className="text-slate-200">{perimeterConfig.resumptionTime}</strong>
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>{teacher.name}</span>
              {isClockedIn && !isClockedOut && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  record?.status === 'on_time'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {record?.status === 'on_time' ? '✓ On-Time Arrival' : '⚠️ Late Arrival'}
                </span>
              )}
              {isClockedOut && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  🏁 Departure Clocked Out
                </span>
              )}
            </h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              {activeClass?.name ? `${activeClass.name} • ` : ''}Date: <strong>{selectedDate}</strong>
            </p>
          </div>

          {/* GPS School Perimeter Status Pill */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold border transition ${
              gpsLoading
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : isInsidePerimeter
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                : isInsidePerimeter === false
                ? 'bg-rose-950/70 text-rose-300 border-rose-700/60'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <MapPin className={`h-3 w-3 ${isInsidePerimeter ? 'text-emerald-400' : 'text-rose-400'}`} />
              {gpsLoading ? (
                <span>Locating school GPS perimeter...</span>
              ) : isInsidePerimeter ? (
                <span>
                  Within School Parameter ({distanceMeters !== null ? `${distanceMeters}m from center` : 'Verified'})
                </span>
              ) : isInsidePerimeter === false ? (
                <span>
                  Outside School Grounds ({distanceMeters}m away • Allowed: {perimeterConfig.radiusMeters}m)
                </span>
              ) : (
                <span>GPS Unverified</span>
              )}
            </div>

            <button
              onClick={detectLocation}
              disabled={gpsLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh GPS location"
            >
              <RefreshCw className={`h-3 w-3 ${gpsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {gpsError && (
            <p className="text-[11px] text-amber-300/90 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{gpsError}</span>
            </p>
          )}

          {isInsidePerimeter === false && (
            <p className="text-[10px] text-slate-400">
              ℹ️ Note: School perimeter coordinates can only be configured by the School Administrator.
            </p>
          )}
        </div>

        {/* Right: Clock In / Clock Out Controls */}
        <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-indigo-900/40 min-w-[280px] sm:min-w-[320px]">
          {!isClockedIn ? (
            <div className="space-y-3">
              {/* Daily rotating code indicator */}
              <div className="bg-indigo-950/70 border border-indigo-800/60 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">
                    Today's Clock-In Code
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono tracking-widest text-white">
                      {expectedCode}
                    </span>
                    <span className="text-[9px] text-indigo-300/80 bg-indigo-900/60 px-1.5 py-0.5 rounded">
                      Rotates Daily
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const chars = expectedCode.split('');
                    setDigits(chars);
                    setFeedback(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow-xs"
                  title="Quick fill today's code"
                >
                  Fill Code
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Enter 4-Digit Daily Code:
                </label>
                <span className="text-[10px] text-slate-400">Valid for {selectedDate}</span>
              </div>

              {/* 4-Digit Box Inputs */}
              <div className="flex items-center justify-center gap-2.5">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      digitInputs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-2xl font-black text-white bg-slate-900/90 border-2 border-indigo-700/60 rounded-xl focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 focus:outline-none transition font-mono shadow-inner"
                    placeholder="•"
                  />
                ))}
              </div>

              {/* Clock In Submit Button */}
              <button
                onClick={handleClockIn}
                disabled={actionLoading || digits.join('').length !== 4}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg ${
                  digits.join('').length === 4
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20 active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {actionLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Clock In to School</span>
                  </>
                )}
              </button>
            </div>
          ) : !isClockedOut ? (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/40 rounded-xl">
                <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
                  <span>Clocked In Today</span>
                  <span className="font-mono font-bold text-white text-sm">{record?.clockInTime}</span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Arrival Status:</span>
                  <strong className={record?.status === 'on_time' ? 'text-emerald-400' : 'text-amber-400'}>
                    {record?.status === 'on_time' ? 'On-Time (Before cutoff)' : 'Late Arrival'}
                  </strong>
                </div>
              </div>

              {/* Clock Out Button */}
              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-600/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Clock Out (Departure)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-3 bg-slate-900/90 border border-slate-700/60 rounded-xl text-center">
              <div className="inline-flex p-2 bg-sky-950 text-sky-400 rounded-xl mb-1">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-white">Daily Shift Logged</p>
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <p>Arrival: <strong className="text-white">{record?.clockInTime}</strong></p>
                <p>Departure: <strong className="text-white">{record?.clockOutTime}</strong></p>
                <p>Total: <strong className="text-sky-300">{record?.hoursWorked || '6.5'} hours</strong></p>
              </div>
            </div>
          )}

          {feedback && (
            <div
              className={`mt-2.5 p-2 rounded-xl text-[11px] font-semibold text-center ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
              }`}
            >
              {feedback.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
