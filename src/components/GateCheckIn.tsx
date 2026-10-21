'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  Search,
  CheckCircle2,
  Phone,
  Send,
  AlertTriangle,
  UserCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  Printer,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Student, ClassSection } from '@/types/attendance';

export interface GateArrivalEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  parentPhone: string;
  parentName: string;
  arrivalTime: string;
  date: string;
  reason: string;
  notifiedViaWhatsApp: boolean;
}

interface GateCheckInProps {
  students: Student[];
  classes: ClassSection[];
  selectedDate: string;
  onDataUpdated: () => void;
}

export const GateCheckIn: React.FC<GateCheckInProps> = ({
  students,
  classes,
  selectedDate,
  onDataUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [selectedReason, setSelectedReason] = useState('Traffic Delay');
  const [arrivals, setArrivals] = useState<GateArrivalEntry[]>(() => {
    try {
      const stored = localStorage.getItem(`attend_iq_gate_arrivals_${selectedDate}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Live digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save arrivals to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(`attend_iq_gate_arrivals_${selectedDate}`, JSON.stringify(arrivals));
    } catch {}
  }, [arrivals, selectedDate]);

  const reasonsList = [
    'Traffic Delay (Highway / Express)',
    'Heavy Morning Rain',
    'School Bus / Transit Breakdown',
    'Family Emergency',
    'Medical / Hospital Appointment',
    'Woke Up Late / Unspecified',
  ];

  const handleLogArrival = (student: Student) => {
    // Check if already logged today
    if (arrivals.some((a) => a.studentId === student.id)) {
      alert(`${student.name} is already logged in today's gate register.`);
      return;
    }

    const cls = classes.find((c) => c.id === student.classId);
    const nowTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const newEntry: GateArrivalEntry = {
      id: `gate-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      className: cls?.name || 'Class',
      parentPhone: student.parentPhone,
      parentName: student.parentName,
      arrivalTime: nowTime,
      date: selectedDate,
      reason: selectedReason,
      notifiedViaWhatsApp: false,
    };

    const updated = [newEntry, ...arrivals];
    setArrivals(updated);

    setNotificationStatus(`✓ Gate entry recorded for ${student.name} at ${nowTime}`);
    setTimeout(() => setNotificationStatus(null), 4000);
    setSearchQuery('');
  };

  const getWhatsAppLink = (entry: GateArrivalEntry) => {
    const cleanPhone = entry.parentPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `*Apex Crest Academy, Abuja (FCT)*\n` +
      `*Gate Arrival & Safety Notification*\n\n` +
      `Dear ${entry.parentName},\n` +
      `This is to confirm that your child/ward *${entry.studentName}* (${entry.className}) safely arrived at the school gate today at *${entry.arrivalTime}*.\n` +
      `• Recorded Reason: ${entry.reason}\n\n` +
      `Thank you for entrusting us with their safety.\n` +
      `_Apex Crest Academy School Security Post_`
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  const markNotified = (id: string) => {
    setArrivals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notifiedViaWhatsApp: true } : a))
    );
  };

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
    return false; // Only show when user searches or filters
  });

  return (
    <div className="space-y-6">
      {/* Security Gate Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Security Post & Gate Register
              </span>
              <span className="text-xs text-amber-200/80">
                Apex Crest Academy Gate 1
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Gate Check-In & Late Arrival Logger
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Replace physical paper late registers. Instant timestamped logging with 1-click WhatsApp arrival confirmation to parents for maximum safety.
            </p>
          </div>

          {/* Live Gate Clock Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-0.5">
              Current Live Gate Time
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-white block">
              {currentTimeStr || '08:00:00 AM'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center justify-end gap-1 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Security Checkpoint Active
            </span>
          </div>
        </div>
      </div>

      {notificationStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notificationStatus}</span>
        </div>
      )}

      {/* Main Gate Logging Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Search & Log Pupil */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-600" />
                Find Pupil Arriving at Gate
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Type the pupil's name or roll number to log arrival
              </p>
            </div>

            {/* Late Reason Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Reason for Delay:
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-indigo-500 cursor-pointer"
              >
                {reasonsList.map((r, i) => (
                  <option key={i} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search pupil name (e.g. Chukwuebuka, Amina)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500 focus:bg-white"
              />
            </div>

            {/* Search Results List */}
            {searchQuery.trim() && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 shadow-inner">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No pupils found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const cls = classes.find((c) => c.id === student.classId);
                    const alreadyLogged = arrivals.some((a) => a.studentId === student.id);

                    return (
                      <div
                        key={student.id}
                        className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {student.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {cls?.name} &bull; Roll #{student.rollNumber}
                            </span>
                          </div>
                        </div>

                        {alreadyLogged ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                            Logged ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLogArrival(student)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs active:scale-95 transition shrink-0 flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" /> Log In Gate
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Quick Info Box for Gatekeeper */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 text-amber-950 text-xs space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="h-4 w-4 text-amber-600" /> Gatekeeper Instructions
            </h4>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              1. All pupils arriving after 08:00 AM must be checked in here before entering classroom blocks.
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              2. Click the green <strong>"Send WhatsApp Notice"</strong> button beside each pupil to give parents instant reassurance that their child entered the school premises safely.
            </p>
          </div>
        </div>

        {/* Right Column: Today's Gate Register Log */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Today's Gate Register ({arrivals.length} Logged)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological record of pupils admitted through the gate
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Gate Sheet
                </button>
              </div>
            </div>

            {arrivals.length === 0 ? (
              <div className="p-12 text-center my-auto">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">
                  No late arrivals logged yet today
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  When pupils arrive past 08:00 AM, search their name on the left to timestamp their entry.
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[550px] pr-1">
                {arrivals.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900">
                          {entry.studentName}
                        </span>
                        <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200/60">
                          {entry.className}
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {entry.arrivalTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Reason: <span className="text-slate-800">{entry.reason}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Parent: {entry.parentName} ({entry.parentPhone})
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <a
                        href={getWhatsAppLink(entry)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => markNotified(entry.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition ${
                          entry.notifiedViaWhatsApp
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                        }`}
                        title="Send arrival confirmation directly to parent WhatsApp"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{entry.notifiedViaWhatsApp ? 'Notified ✓' : 'Send WhatsApp'}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
