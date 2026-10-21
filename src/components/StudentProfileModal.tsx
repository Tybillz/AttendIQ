'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Award,
  BookOpen,
  AlertTriangle,
  Plus,
  Camera,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Save,
  Printer,
  QrCode,
  GraduationCap,
  Shield,
  Pencil,
  FileText,
} from 'lucide-react';
import { Student, TestExamRecord, BehavioralNote } from '@/types/attendance';
import { TerminalReportSheet } from './TerminalReportSheet';
import {
  updateStudent,
  addAcademicRecord,
  updateAcademicRecord,
  deleteAcademicRecord,
  updateBehavioralNote,
  deleteBehavioralNote,
  addParentAlert,
} from '@/lib/storage';
import { downloadStudentReportCardPDF } from '@/lib/pdfReportGenerator';
import { generateWhatsAppUrl } from '@/lib/notifications';

interface StudentProfileModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  classNameTitle: string;
  onStudentUpdated: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  classNameTitle,
  onStudentUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'academics' | 'attendance' | 'notes' | 'edit' | 'id_card' | 'terminal_report'>('academics');

  // New academic record state
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamSubject, setNewExamSubject] = useState('Mathematics');
  const [newExamScore, setNewExamScore] = useState<number>(85);
  const [newExamMax, setNewExamMax] = useState<number>(100);

  // Edit academic record state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editExamTitle, setEditExamTitle] = useState('');
  const [editExamSubject, setEditExamSubject] = useState('Mathematics');
  const [editExamScore, setEditExamScore] = useState<number>(80);
  const [editExamMax, setEditExamMax] = useState<number>(100);
  const [editExamDate, setEditExamDate] = useState('');
  const [editExamTerm, setEditExamTerm] = useState('First Term');

  // New note state
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<'positive' | 'concern' | 'neutral'>('neutral');

  // Edit note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editNoteType, setEditNoteType] = useState<'positive' | 'concern' | 'neutral'>('neutral');

  // Edit pupil state
  const [editName, setEditName] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editParentEmail, setEditParentEmail] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  // Quick SMS message state
  const [smsSentNotice, setSmsSentNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (student) {
      setEditName(student.name);
      setEditRoll(student.rollNumber);
      setEditParentName(student.parentName);
      setEditParentPhone(student.parentPhone);
      setEditParentEmail(student.parentEmail);
      setPhotoUrlInput(student.photoUrl);
      setSmsSentNotice(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const totalDays = student.totalPresent + student.totalAbsent;
  const attendanceRate = totalDays > 0 ? Math.round((student.totalPresent / totalDays) * 100) : 100;

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const percentage = Math.round((newExamScore / newExamMax) * 100);
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';

    addAcademicRecord(student.id, {
      title: newExamTitle.trim(),
      subject: newExamSubject,
      score: Number(newExamScore),
      maxScore: Number(newExamMax),
      grade,
      date: new Date().toISOString().split('T')[0],
      term: 'Fall Term',
    });

    setNewExamTitle('');
    setShowAddExam(false);
    onStudentUpdated();
  };

  const handleStartEditExam = (record: TestExamRecord) => {
    setEditingRecordId(record.id);
    setEditExamTitle(record.title);
    setEditExamSubject(record.subject);
    setEditExamScore(record.score);
    setEditExamMax(record.maxScore);
    setEditExamDate(record.date || new Date().toISOString().split('T')[0]);
    setEditExamTerm(record.term || 'First Term');
    setShowAddExam(false);
  };

  const handleUpdateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecordId || !editExamTitle.trim()) return;

    const percentage = Math.round((editExamScore / editExamMax) * 100);
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (percentage >= 75) grade = 'A';
    else if (percentage >= 65) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 45) grade = 'D';

    const updatedRecord: TestExamRecord = {
      id: editingRecordId,
      title: editExamTitle.trim(),
      subject: editExamSubject,
      score: Number(editExamScore),
      maxScore: Number(editExamMax),
      grade,
      date: editExamDate,
      term: editExamTerm,
    };

    updateAcademicRecord(student.id, updatedRecord);
    setEditingRecordId(null);
    onStudentUpdated();
  };

  const handleDeleteExam = (recordId: string, recordTitle: string) => {
    if (confirm(`Delete the academic record "${recordTitle}"? This will remove it from the student dossier.`)) {
      deleteAcademicRecord(student.id, recordId);
      if (editingRecordId === recordId) {
        setEditingRecordId(null);
      }
      onStudentUpdated();
    }
  };

  const handleStartEditNote = (note: BehavioralNote) => {
    setEditingNoteId(note.id);
    setEditNoteText(note.note);
    setEditNoteType(note.type);
    setShowAddNote(false);
  };

  const handleUpdateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoteId || !editNoteText.trim()) return;

    const updatedNote: BehavioralNote = {
      id: editingNoteId,
      date: new Date().toISOString().split('T')[0],
      author: 'Classroom Teacher',
      type: editNoteType,
      note: editNoteText.trim(),
    };

    updateBehavioralNote(student.id, updatedNote);
    setEditingNoteId(null);
    onStudentUpdated();
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Delete this observation note from the student dossier?')) {
      deleteBehavioralNote(student.id, noteId);
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
      }
      onStudentUpdated();
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: BehavioralNote = {
      id: `bn-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      author: 'Classroom Teacher',
      type: newNoteType,
      note: newNoteText.trim(),
    };

    const updated = {
      ...student,
      behavioralNotes: [newNote, ...(student.behavioralNotes || [])],
    };

    updateStudent(updated);
    setNewNoteText('');
    setShowAddNote(false);
    onStudentUpdated();
  };

  const handleSaveStudentDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Student = {
      ...student,
      name: editName.trim() || student.name,
      rollNumber: editRoll.trim() || student.rollNumber,
      parentName: editParentName.trim() || student.parentName,
      parentPhone: editParentPhone.trim() || student.parentPhone,
      parentEmail: editParentEmail.trim() || student.parentEmail,
      photoUrl: photoUrlInput.trim() || student.photoUrl,
    };

    updateStudent(updated);
    setActiveTab('academics');
    onStudentUpdated();
  };

  const handleSendDirectParentSMS = () => {
    addParentAlert({
      studentId: student.id,
      studentName: student.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      type: 'absence_notice',
      channel: 'SMS',
      message: `Dear ${student.parentName}, this is a notice from Apex Crest Academy regarding ${student.name}. Current attendance rate is ${attendanceRate}%.`,
      triggerReason: 'Teacher direct message from profile',
    });

    setSmsSentNotice(`SMS successfully dispatched to ${student.parentPhone}!`);
    setTimeout(() => setSmsSentNotice(null), 4000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrlInput(reader.result);
          const updated = { ...student, photoUrl: reader.result };
          updateStudent(updated);
          onStudentUpdated();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header Profile Banner */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Pupil Avatar with upload overlay */}
            <div className="relative group shrink-0">
              <img
                src={photoUrlInput || student.photoUrl}
                alt={student.name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
              />
              <label
                htmlFor="photo-upload-input"
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-xs text-white"
                title="Upload new photo"
              >
                <Camera className="h-5 w-5 mb-0.5" />
                Change
              </label>
              <input
                id="photo-upload-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                  Roll #{student.rollNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {classNameTitle}
                </span>
                {student.totalAbsent >= 3 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/80 text-white flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {student.totalAbsent} Days Absent
                  </span>
                ) : student.totalAbsent >= 2 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/80 text-white flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {student.totalAbsent} Days Absent
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/40 text-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Regular Attendance
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white">{student.name}</h2>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                <span>DOB: {student.dateOfBirth}</span>
                <span>Gender: {student.gender}</span>
                <span>Parent: {student.parentName}</span>
              </p>

              {/* Parent Contact bar with Quick SMS */}
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-200 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  {student.parentPhone}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-200 bg-white/10 px-2.5 py-1 rounded-lg">
                  <Mail className="h-3.5 w-3.5 text-sky-400" />
                  {student.parentEmail}
                </span>
                <button
                  onClick={handleSendDirectParentSMS}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-200 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-400/30 transition"
                >
                  <Send className="h-3 w-3" /> Send Parent SMS
                </button>

                {student.parentPhone && (
                  <a
                    href={generateWhatsAppUrl(
                      student.parentPhone,
                      `Hello ${student.parentName}, this is a notice from Apex Crest Academy regarding your child ${student.name} (${classNameTitle}). Current attendance compliance is ${attendanceRate}%.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 hover:text-white bg-emerald-600/40 hover:bg-emerald-600/60 px-2.5 py-1 rounded-lg border border-emerald-400/40 transition"
                  >
                    WhatsApp Parent
                  </a>
                )}
              </div>

              {smsSentNotice && (
                <div className="mt-2 text-xs font-semibold text-emerald-300 animate-in fade-in">
                  ✓ {smsSentNotice}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-[11px] text-slate-300 block">Total Present</span>
              <span className="text-xl font-bold text-emerald-400">{student.totalPresent} Days</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-[11px] text-slate-300 block">Total Absent</span>
              <span className="text-xl font-bold text-rose-400">{student.totalAbsent} Days</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-[11px] text-slate-300 block">Attendance Rate</span>
              <span className="text-xl font-bold text-sky-300">{attendanceRate}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-center">
              <span className="text-[11px] text-slate-300 block">Consecutive Missed</span>
              <span className="text-xl font-bold text-amber-300">
                {student.consecutiveAbsences > 0 ? `${student.consecutiveAbsences} Days` : 'None (Active)'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('academics')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'academics'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Academic Performance & Tests ({student.academicRecords?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="h-4 w-4" /> Behavioral Notes & Flags ({student.behavioralNotes?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" /> Edit Profile & Photo
          </button>
          <button
            onClick={() => setActiveTab('id_card')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'id_card'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="h-4 w-4 text-indigo-600" /> Printable Student ID Card & QR
          </button>
          <button
            onClick={() => setActiveTab('terminal_report')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'terminal_report'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4 text-emerald-600" /> Official Terminal Report Sheet
          </button>

          <div className="ml-auto flex items-center pr-2 py-1.5">
            <button
              type="button"
              onClick={() => downloadStudentReportCardPDF(student, { id: student.classId, name: classNameTitle } as any)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition shadow-xs cursor-pointer"
              title="Download official PDF report card with Apex Crest letterhead"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: ACADEMIC PERFORMANCE */}
          {activeTab === 'academics' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recorded Tests, Quizzes & Examinations</h3>
                  <p className="text-xs text-slate-500">Track grade progression and exam results</p>
                </div>
                <button
                  onClick={() => setShowAddExam(!showAddExam)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Record Test / Exam
                </button>
              </div>

              {/* Add Exam Form Dropdown */}
              {showAddExam && (
                <form
                  onSubmit={handleSaveExam}
                  className="mb-5 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 animate-in fade-in"
                >
                  <h4 className="text-xs font-bold text-indigo-900 mb-3">Add New Academic Record</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Exam / Assessment Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Midterm Science Assessment"
                        value={newExamTitle}
                        onChange={(e) => setNewExamTitle(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Subject</label>
                      <select
                        value={newExamSubject}
                        onChange={(e) => setNewExamSubject(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 focus:outline-indigo-500"
                      >
                        <option>Mathematics</option>
                        <option>Natural Science</option>
                        <option>English Language</option>
                        <option>History & Civics</option>
                        <option>Art & Music</option>
                        <option>Physical Education</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Score / Max</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newExamScore}
                          onChange={(e) => setNewExamScore(Number(e.target.value))}
                          className="w-16 text-xs px-2 py-2 rounded-lg bg-white border border-slate-300 text-center"
                        />
                        <span className="text-xs text-slate-500">/</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newExamMax}
                          onChange={(e) => setNewExamMax(Number(e.target.value))}
                          className="w-16 text-xs px-2 py-2 rounded-lg bg-white border border-slate-300 text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExam(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Save Score
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Existing Exam Record Form */}
              {editingRecordId && (
                <form
                  onSubmit={handleUpdateExam}
                  className="mb-5 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 animate-in fade-in"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Pencil className="h-3.5 w-3.5 text-indigo-600" /> Edit Academic Record
                    </h4>
                    <span className="text-[10px] text-indigo-600 font-medium">Correct score or details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Assessment Title
                      </label>
                      <input
                        type="text"
                        value={editExamTitle}
                        onChange={(e) => setEditExamTitle(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Subject</label>
                      <select
                        value={editExamSubject}
                        onChange={(e) => setEditExamSubject(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-indigo-500"
                      >
                        <option>Mathematics</option>
                        <option>English Language</option>
                        <option>Basic Science</option>
                        <option>Civic Education</option>
                        <option>Computer Studies / ICT</option>
                        <option>Agricultural Science</option>
                        <option>Social Studies</option>
                        <option>Chemistry</option>
                        <option>Physics</option>
                        <option>Biology</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Score / Max</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editExamScore}
                          onChange={(e) => setEditExamScore(Number(e.target.value))}
                          className="w-16 text-xs px-2 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-center font-bold"
                        />
                        <span className="text-xs text-slate-500">/</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editExamMax}
                          onChange={(e) => setEditExamMax(Number(e.target.value))}
                          className="w-16 text-xs px-2 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRecordId(null)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-sky-600 text-white rounded-lg hover:from-indigo-700 hover:to-sky-700 shadow-sm"
                    >
                      Update Record
                    </button>
                  </div>
                </form>
              )}

              {/* Exam Records Table */}
              {student.academicRecords && student.academicRecords.length > 0 ? (
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Assessment Title</th>
                        <th className="py-2.5 px-3 font-semibold">Subject</th>
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Score</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Grade</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {student.academicRecords.map((ar) => (
                        <tr key={ar.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-900">{ar.title}</td>
                          <td className="py-3 px-3 text-slate-700">{ar.subject}</td>
                          <td className="py-3 px-3 text-slate-500">{ar.date}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-900">
                            {ar.score}/{ar.maxScore}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                                ar.grade === 'A'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : ar.grade === 'B'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-300'
                                  : ar.grade === 'C'
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-300'
                                  : 'bg-rose-50 text-rose-800 border border-rose-300'
                              }`}
                            >
                              Grade {ar.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditExam(ar)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                                title="Edit this record (correct mistake)"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExam(ar.id, ar.title)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete this record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-700/60">
                  <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No test scores recorded yet for this pupil.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click &ldquo;Record Test / Exam&rdquo; above to log marks.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BEHAVIORAL NOTES & FLAGS */}
          {activeTab === 'notes' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Teacher Observations & Notes</h3>
                  <p className="text-xs text-slate-500">Document attendance patterns, behavioral notes, and praises</p>
                </div>
                <button
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Note
                </button>
              </div>

              {showAddNote && (
                <form
                  onSubmit={handleSaveNote}
                  className="mb-5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 animate-in fade-in"
                >
                  <h4 className="text-xs font-bold text-amber-900 mb-2">New Observation Note</h4>
                  <div className="mb-2">
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Note Category</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewNoteType('positive')}
                        className={`text-xs px-3 py-1 rounded-lg border font-medium ${
                          newNoteType === 'positive'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Positive Praise
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewNoteType('concern')}
                        className={`text-xs px-3 py-1 rounded-lg border font-medium ${
                          newNoteType === 'concern'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Concern / Tardy Flag
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewNoteType('neutral')}
                        className={`text-xs px-3 py-1 rounded-lg border font-medium ${
                          newNoteType === 'neutral'
                            ? 'bg-slate-700 text-white border-slate-700'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        General Note
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <textarea
                      rows={2}
                      placeholder="Write classroom observation or parent contact log..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      required
                      className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 focus:outline-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddNote(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Post Note
                    </button>
                  </div>
                </form>
              )}

              {student.behavioralNotes && student.behavioralNotes.length > 0 ? (
                <div className="space-y-3">
                  {student.behavioralNotes.map((note) => {
                    const isEditing = editingNoteId === note.id;

                    if (isEditing) {
                      return (
                        <form
                          key={note.id}
                          onSubmit={handleUpdateNote}
                          className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 animate-in fade-in"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                              <Pencil className="h-3.5 w-3.5" /> Edit Observation Note
                            </span>
                            <span className="text-[10px] text-slate-400">{note.date}</span>
                          </div>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setEditNoteType('positive')}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                                editNoteType === 'positive'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-900 text-slate-300 border-slate-700'
                              }`}
                            >
                              Positive Praise
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditNoteType('concern')}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                                editNoteType === 'concern'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-slate-900 text-slate-300 border-slate-700'
                              }`}
                            >
                              Concern / Flag
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditNoteType('neutral')}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
                                editNoteType === 'neutral'
                                  ? 'bg-slate-700 text-white border-slate-700'
                                  : 'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              General Note
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            required
                            className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-indigo-500 mb-2"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 shadow-sm"
                            >
                              Update Note
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={note.id}
                        className={`p-3.5 rounded-2xl border ${
                          note.type === 'concern'
                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-200'
                            : note.type === 'positive'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                          <span className="font-semibold text-slate-300">{note.author}</span>
                          <div className="flex items-center gap-2">
                            <span>{note.date}</span>
                            <button
                              onClick={() => handleStartEditNote(note)}
                              className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                              title="Edit this note"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete this note"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed">{note.note}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Award className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No behavioral notes logged yet.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDIT PROFILE */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveStudentDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Student Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editRoll}
                    onChange={(e) => setEditRoll(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Phone Number</label>
                  <input
                    type="text"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Email</label>
                  <input
                    type="email"
                    value={editParentEmail}
                    onChange={(e) => setEditParentEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Student Photo URL</label>
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('academics')}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="h-4 w-4" /> Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: PRINTABLE STUDENT ID CARD WITH QR CODE */}
          {activeTab === 'id_card' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    Official Student Identity Card & Digital Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Standard Nigerian private school student ID card with safety QR code for gate scanning.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition"
                >
                  <Printer className="h-4 w-4" /> Print ID Card
                </button>
              </div>

              {/* ID Card Graphic Container */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-4">
                {/* FRONT OF CARD */}
                <div className="w-[340px] h-[215px] rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-4 shadow-xl border-2 border-indigo-400/40 relative overflow-hidden flex flex-col justify-between">
                  {/* Subtle Watermark Crest */}
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

                  {/* Card Header */}
                  <div className="border-b border-white/20 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black tracking-wider uppercase text-white leading-tight">
                          Apex Crest Academy
                        </h4>
                        <p className="text-[8px] text-indigo-200 tracking-wider uppercase">Abuja (FCT), Nigeria &bull; Student ID</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-400/30">
                      2026/27
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex items-center gap-3.5 my-auto">
                    <img
                      src={photoUrlInput || student.photoUrl}
                      alt={student.name}
                      className="w-16 h-18 rounded-xl object-cover border-2 border-amber-400/80 shadow-md shrink-0"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <h5 className="text-xs font-black uppercase text-white truncate">{student.name}</h5>
                      <p className="text-[10px] text-amber-300 font-bold">{classNameTitle}</p>
                      <p className="text-[9px] text-slate-300">Roll: <span className="font-mono font-bold text-white">{student.rollNumber}</span></p>
                      <p className="text-[9px] text-slate-300">DOB: {student.dateOfBirth}</p>
                      <p className="text-[9px] text-slate-300">Gender: {student.gender}</p>
                    </div>

                    {/* Verification QR Code */}
                    <div className="ml-auto bg-white p-1.5 rounded-xl shadow-xs shrink-0 flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-950" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm8-2h8v8h-8V2zm2 2v4h4V4h-4zM2 12h8v8H2v-8zm2 2v4h4v-4H4zm11 1h2v2h-2v-2zm-3-3h2v2h-2v-2zm2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-6 0h2v2h-2v-2zm0-4h2v2h-2v-2z" />
                      </svg>
                      <span className="text-[7px] font-mono font-bold text-slate-700 mt-0.5">VERIFIED</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-white/20 pt-1 flex items-center justify-between text-[8px] text-slate-300">
                    <span>Bearer Signature</span>
                    <span className="font-serif italic text-indigo-200">Principal Signature: V. Adebayo</span>
                  </div>
                </div>

                {/* BACK OF CARD */}
                <div className="w-[340px] h-[215px] rounded-2xl bg-slate-900 text-white p-4 shadow-xl border-2 border-slate-700 relative overflow-hidden flex flex-col justify-between">
                  <div className="border-b border-slate-700 pb-1.5 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Emergency & Safety Notice
                    </span>
                  </div>

                  <div className="space-y-2 text-[10px] text-slate-300 my-auto">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Parent / Guardian:</span>
                      <span className="font-bold text-white">{student.parentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Emergency WhatsApp / Phone:</span>
                      <span className="font-mono font-bold text-emerald-400">{student.parentPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-bold uppercase">Campus Address:</span>
                      <span>Plot 104, Diplomatic Zone, Garki 2, Abuja (FCT)</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-700 pt-1.5 text-[8px] text-slate-400 text-center leading-tight">
                    This identity card remains the property of Apex Crest Academy. If found, please return to the school administration office or call {student.parentPhone}.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRINTABLE TERMINAL REPORT SHEET */}
          {activeTab === 'terminal_report' && (
            <TerminalReportSheet
              student={student}
              className={classNameTitle}
              totalSessionsHeld={60}
            />
          )}
        </div>
      </div>
    </div>
  );
};
