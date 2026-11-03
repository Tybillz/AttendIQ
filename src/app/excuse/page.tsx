'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Calendar,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  ShieldCheck,
  Building,
  Search,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { Student, ParentExcuse, ClassSection } from '@/types/attendance';
import { getStudents, getClasses, addParentExcuse, syncDataFromCloud } from '@/lib/storage';
import { generateWhatsAppUrl } from '@/lib/notifications';
import { getSchoolBranding, SchoolBranding } from '@/lib/licensing';

export default function ParentExcusePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reasonCategory, setReasonCategory] = useState<ParentExcuse['reasonCategory']>('Illness / Medical');
  const [explanation, setExplanation] = useState('');
  const [doctorClinicName, setDoctorClinicName] = useState('');
  const [medicalNoteAttached, setMedicalNoteAttached] = useState(false);
  const [submittedExcuse, setSubmittedExcuse] = useState<ParentExcuse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branding, setBranding] = useState<SchoolBranding>(getSchoolBranding());

  useEffect(() => {
    const handleBranding = () => setBranding(getSchoolBranding());
    window.addEventListener('attendiq:branding-updated', handleBranding);
    return () => window.removeEventListener('attendiq:branding-updated', handleBranding);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);

    // Load initial student list and classes
    const initialStudents = getStudents();
    const initialClasses = getClasses();
    setStudents(initialStudents);
    setClasses(initialClasses);

    // Check URL parameters for direct child linking (e.g. ?id=SAM-04 or ?search=Adeleke)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('id');
      const urlSearch = params.get('search') || params.get('name');

      if (urlId) {
        const match = initialStudents.find(
          (s) => s.id === urlId || s.rollNumber.toLowerCase() === urlId.toLowerCase()
        );
        if (match) {
          setSelectedStudentId(match.id);
          setParentName(match.parentName || '');
          setParentPhone(match.parentPhone || '');
        }
      } else if (urlSearch) {
        setSearchQuery(urlSearch);
      }
    }

    // Live sync from cloud
    syncDataFromCloud().then(() => {
      const live = getStudents();
      const liveClasses = getClasses();
      setStudents(live);
      setClasses(liveClasses);

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('id');
        if (urlId) {
          const match = live.find(
            (s) => s.id === urlId || s.rollNumber.toLowerCase() === urlId.toLowerCase()
          );
          if (match) {
            setSelectedStudentId(match.id);
            setParentName(match.parentName || '');
            setParentPhone(match.parentPhone || '');
          }
        }
      }
    });
  }, []);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudentId(student.id);
    setParentName(student.parentName || '');
    setParentPhone(student.parentPhone || '');
    setSearchQuery('');
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudentId('');
    setSearchQuery('');
  };

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const selectedStudentClass = useMemo(() => {
    if (!selectedStudent) return null;
    return classes.find((c) => c.id === selectedStudent.classId);
  }, [classes, selectedStudent]);

  // Fast filtered students search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) {
      return students.slice(0, 8); // show first 8 as quick suggestions
    }
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const studentClass = classes.find((c) => c.id === s.classId);
      return (
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (studentClass && studentClass.name.toLowerCase().includes(q))
      );
    });
  }, [students, classes, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert("Please search and select your child first.");
      return;
    }
    if (!explanation.trim() || !parentName.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    const student = students.find((s) => s.id === selectedStudentId);

    const newExcuse = addParentExcuse({
      studentId: selectedStudentId,
      studentName: student?.name || 'Pupil',
      classId: student?.classId || 'class-default',
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || startDate || new Date().toISOString().split('T')[0],
      reasonCategory,
      explanation: explanation.trim(),
      doctorClinicName: doctorClinicName.trim() || undefined,
      medicalNoteAttached,
    });

    setIsSubmitting(false);
    setSubmittedExcuse(newExcuse);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200 py-10 px-4 sm:px-6 relative">
      <div className="max-w-2xl mx-auto">
        {/* Navigation back to main portal */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-indigo-200/80 shadow-2xs transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to School Portal</span>
          </Link>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {branding.schoolName} • Parent Portal
          </span>
        </div>

        {submittedExcuse ? (
          /* Confirmation Screen */
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Absence Notice Submitted Successfully
            </h2>
            <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
              Your child&apos;s absence note has been transmitted to the Class Teacher and School Administration. The daily attendance roll call will automatically tag <strong>{submittedExcuse.studentName}</strong> as <strong>Excused</strong>.
            </p>

            <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Notice Reference:</span>
                <span className="font-mono font-bold text-indigo-700">{submittedExcuse.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pupil Name:</span>
                <span className="font-bold text-slate-900">{submittedExcuse.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason Category:</span>
                <span className="font-semibold text-slate-900">{submittedExcuse.reasonCategory}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Absence Dates:</span>
                <span className="font-semibold text-slate-900">
                  {submittedExcuse.startDate} {submittedExcuse.endDate !== submittedExcuse.startDate ? `to ${submittedExcuse.endDate}` : '(Single Day)'}
                </span>
              </div>
              {submittedExcuse.doctorClinicName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Medical Clinic:</span>
                  <span className="font-semibold text-slate-900">{submittedExcuse.doctorClinicName}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={generateWhatsAppUrl(
                  branding.contactPhone.replace(/\D/g, '') || '+2348091123344',
                  `*${branding.schoolName} Parent Absence Note*\nPupil: ${submittedExcuse.studentName}\nRef: ${submittedExcuse.id}\nReason: ${submittedExcuse.reasonCategory}\nDate: ${submittedExcuse.startDate}\nExplanation: ${submittedExcuse.explanation}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Share with Teacher via WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setSubmittedExcuse(null);
                  setSelectedStudentId('');
                  setExplanation('');
                  setDoctorClinicName('');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Submit Another Notice
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/60">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white">
                    Parent Absence & Doctor&apos;s Note Portal
                  </h1>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    {branding.schoolName} • Official Student Welfare & Attendance Registry
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {/* SMART CHILD SEARCH & SELECTION SECTION */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600" />
                    Select Your Child (Pupil) *
                  </span>
                  {selectedStudent && (
                    <button
                      type="button"
                      onClick={handleClearSelectedStudent}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      Change Child
                    </button>
                  )}
                </label>

                {selectedStudent ? (
                  /* Verified Selected Child Card */
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-slate-50 border-2 border-emerald-500/30 shadow-xs flex items-center justify-between gap-4 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={selectedStudent.photoUrl}
                          alt={selectedStudent.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-xs"
                        />
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                          ✓
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900 truncate">
                            {selectedStudent.name}
                          </h4>
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                            {selectedStudentClass?.name || 'Class Arm'}
                          </span>
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            Roll #{selectedStudent.rollNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Registered Guardian: <strong>{selectedStudent.parentName}</strong> {selectedStudent.parentPhone ? `(${selectedStudent.parentPhone})` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedStudent}
                      className="shrink-0 p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition text-xs font-bold"
                      title="Clear and search for another child"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  /* Live Search Input & Results */
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="h-4 w-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by child's name, surname, or roll # (e.g. Samuel, Adeleke, 004)..."
                        autoFocus
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-50 border border-slate-300 font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition shadow-2xs placeholder:text-slate-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Instant Search Results Dropdown List */}
                    <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-2 max-h-56 overflow-y-auto space-y-1.5 shadow-inner">
                      <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>{searchQuery ? `Matching Results (${filteredStudents.length})` : 'Quick Pupil Suggestions'}</span>
                        <span className="text-indigo-600">Tap your child to select</span>
                      </div>

                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s) => {
                          const sClass = classes.find((c) => c.id === s.classId);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleStudentSelect(s)}
                              className="w-full p-2.5 rounded-xl bg-white hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 transition text-left flex items-center justify-between gap-3 group cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={s.photoUrl}
                                  alt={s.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 transition truncate">
                                      {s.name}
                                    </span>
                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                      {sClass?.name || 'Class'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>Roll: <strong>#{s.rollNumber}</strong></span>
                                    <span>•</span>
                                    <span>Parent: {s.parentName}</span>
                                  </div>
                                </div>
                              </div>

                              <span className="text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0">
                                Select &rarr;
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          <p className="font-semibold text-slate-600">No pupil found matching &ldquo;{searchQuery}&rdquo;</p>
                          <p className="text-[11px] mt-1">Please check spelling or search by Admission/Roll Number.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    Absence Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    Absence End Date (Expected Return) *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reason Category Pills */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-2">
                  Absence Classification *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'Illness / Medical',
                      'Doctor Appointment',
                      'Family Emergency',
                      'Travel / Official',
                      'Religious Observance',
                      'Other',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setReasonCategory(cat)}
                      className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition ${
                        reasonCategory === cat
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-500'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medical Clinic / Doctor Details (Optional) */}
              {(reasonCategory === 'Illness / Medical' || reasonCategory === 'Doctor Appointment') && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Building className="h-4 w-4 text-indigo-600" />
                    <span>Medical / Clinic Information (Optional)</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Attending Hospital, Clinic, or Doctor Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. National Hospital Abuja / Dr. Bello Clinic"
                      value={doctorClinicName}
                      onChange={(e) => setDoctorClinicName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={medicalNoteAttached}
                      onChange={(e) => setMedicalNoteAttached(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>I confirm a physical or electronic medical certificate was issued by the physician.</span>
                  </label>
                </div>
              )}

              {/* Explanation Textarea */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Detailed Reason / Statement *
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Please state symptoms, medical advice, or specific context for the Class Teacher..."
                  required
                  className="w-full p-3 text-xs rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Parent Contact Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    Parent / Guardian Full Name *
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    required
                    placeholder="e.g. Mr. Aliyu Shittu"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    Contact Telephone Number *
                  </label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    required
                    placeholder="e.g. +234 803 123 4567"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedStudentId}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Transmitting Notice...' : 'Submit Official Absence Notice'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
