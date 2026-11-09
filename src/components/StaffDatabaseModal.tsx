'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  GraduationCap,
  Plus,
  Trash2,
  BookOpen,
  X,
  Phone,
  Mail,
  Camera,
  CheckCircle,
  Copy,
  ExternalLink,
  Search,
  Upload,
  Sparkles,
  Link as LinkIcon,
  Check,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Student, ClassSection, Teacher, SchoolSubjectItem } from '@/types/attendance';
import {
  addClass,
  deleteClass,
  addTeacher,
  updateTeacher,
  updateTeacherAvatar,
  deleteTeacher,
  getSchoolSubjects,
  getSchoolSubjectItems,
  getSubjectLevel,
  addSchoolSubject,
  deleteSchoolSubject,
  assignSubjectToTeacher,
  unassignSubjectFromTeacher,
  setPermanentClassTeacher,
  assignTeacherToClass,
  unassignTeacherFromClass,
  PRESET_TEACHER_AVATARS,
  getDefaultTeacherAvatar,
} from '@/lib/storage';
import { isLicenseWriteRestricted, getSchoolBranding } from '@/lib/licensing';
import { generateWhatsAppUrl } from '@/lib/notifications';
import { getPortalCredentials, savePortalCredentials, generateRandomPin } from '@/lib/auth';

interface StaffDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassSection[];
  students: Student[];
  onDataUpdated: () => void;
  defaultTab?: 'teachers' | 'classes' | 'subjects';
  isLicenseLocked?: boolean;
  onOpenPupilDatabase?: () => void;
}

export const StaffDatabaseModal: React.FC<StaffDatabaseModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  students,
  onDataUpdated,
  defaultTab = 'teachers',
  isLicenseLocked = false,
  onOpenPupilDatabase,
}) => {
  const isStrictReadOnly = isLicenseLocked || isLicenseWriteRestricted();
  const [activeTab, setActiveTab] = useState<'teachers' | 'classes' | 'subjects'>(defaultTab);
  const [tSearchQuery, setTSearchQuery] = useState('');

  // Curriculum & Subjects State
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>(getSchoolSubjects());
  const [schoolSubjectItems, setSchoolSubjectItems] = useState<SchoolSubjectItem[]>(getSchoolSubjectItems());
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectLevel, setNewSubjectLevel] = useState<'all' | 'nursery' | 'primary' | 'secondary'>('all');
  const [subjectSuccessMsg, setSubjectSuccessMsg] = useState('');

  // Add Teacher form
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tSubject, setTSubject] = useState('');
  const [tClassId, setTClassId] = useState('');
  const [tSelectedAvatar, setTSelectedAvatar] = useState<string>('');
  const [teacherSuccessMsg, setTeacherSuccessMsg] = useState('');

  // Add Class form
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState('Grade 4');
  const [newRoom, setNewRoom] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');

  // Teacher Photo Editor Dialog State
  const [photoEditingTeacher, setPhotoEditingTeacher] = useState<Teacher | null>(null);
  const [photoTab, setPhotoTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [presetGenderFilter, setPresetGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [photoToastMsg, setPhotoToastMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newTeacherFileInputRef = useRef<HTMLInputElement | null>(null);

  // WhatsApp credential dispatch alert
  const [newlyEmployedTeacherNotice, setNewlyEmployedTeacherNotice] = useState<{
    teacher: Teacher;
    pin: string;
    waUrl: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    setSchoolSubjects(getSchoolSubjects());
    setSchoolSubjectItems(getSchoolSubjectItems());
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Photo Upload via FileReader
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isForNewTeacher: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('File is too large. Please select an image under 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isForNewTeacher) {
        setTSelectedAvatar(result);
      } else {
        setUploadedDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTeacherPhoto = (avatarUrlToSave: string) => {
    if (!photoEditingTeacher) return;
    if (isStrictReadOnly) {
      alert('Action Blocked: System is in read-only mode.');
      return;
    }

    updateTeacherAvatar(photoEditingTeacher.id, avatarUrlToSave);
    onDataUpdated();
    setPhotoToastMsg(`Profile photo updated for ${photoEditingTeacher.name}!`);
    setTimeout(() => {
      setPhotoToastMsg('');
      setPhotoEditingTeacher(null);
      setUploadedDataUrl(null);
      setCustomPhotoUrl('');
    }, 1200);
  };

  // WhatsApp Credentials Message
  const formatTeacherWhatsAppInvite = (teacher: Teacher, pin: string) => {
    const branding = getSchoolBranding();
    const schoolName = branding?.schoolName || 'AttendIQ Academy';
    const assignedClasses = classes
      .filter((c) => teacher.assignedClassIds?.includes(c.id) || c.teacherId === teacher.id)
      .map((c) => c.name)
      .join(', ') || 'Pending Class Assignment';

    const subjectsList = teacher.subjects && teacher.subjects.length > 0
      ? teacher.subjects.join(', ')
      : (teacher.subject || 'Class Teacher');

    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}` : 'https://resultiq.vercel.app';

    return (
      `*WELCOME TO ${schoolName.toUpperCase()} ACADEMIC STAFF PORTAL* 🎓\n\n` +
      `Hello *${teacher.name}*,\n` +
      `You have been registered as an academic faculty member at *${schoolName}*.\n\n` +
      `🔑 *YOUR OFFICIAL PORTAL LOGIN CREDENTIALS:*\n` +
      `• *Staff Full Name:* ${teacher.name}\n` +
      `• *Registered Email:* ${teacher.email || 'Not specified'}\n` +
      `• *Login Security PIN / Password:* *${pin}*\n` +
      `• *Department / Specialty:* ${subjectsList}\n` +
      `• *Assigned Classes:* ${assignedClasses}\n\n` +
      `🌐 *Result & Attendance Portal Link:*\n` +
      `${portalUrl}\n\n` +
      `*How to Log In:*\n` +
      `1. Open the portal link above.\n` +
      `2. Tap on *Staff & Admin Login*.\n` +
      `3. Enter your email (${teacher.email}) or select your name.\n` +
      `4. Enter your 4-digit PIN: *${pin}* to access your class registers & gradebook.\n\n` +
      `_Please keep your login credentials safe and confidential._`
    );
  };

  const handleSendTeacherWhatsAppCredentials = (teacher: Teacher) => {
    const creds = getPortalCredentials();
    let pin = creds.teacherPins[teacher.id];
    if (!pin) {
      pin = generateRandomPin();
      creds.teacherPins[teacher.id] = pin;
      savePortalCredentials(creds);
    }

    const message = formatTeacherWhatsAppInvite(teacher, pin);
    const waUrl = generateWhatsAppUrl(teacher.phone || '', message);

    if (teacher.phone && teacher.phone.replace(/[^0-9]/g, '').length >= 10) {
      window.open(waUrl, '_blank');
    }

    setNewlyEmployedTeacherNotice({
      teacher,
      pin,
      waUrl,
    });
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('Action Blocked: Cannot add teachers in strict read-only mode.');
      return;
    }
    if (!tName.trim()) return;

    const chosenAvatar = tSelectedAvatar || getDefaultTeacherAvatar(tName);

    const created = addTeacher({
      name: tName.trim(),
      phone: tPhone.trim() || '+234 800 000 0000',
      email: tEmail.trim() || `${tName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@apexcrest.edu.ng`,
      subject: tSubject.trim() || 'Class Teacher',
      assignedClassIds: tClassId ? [tClassId] : [],
      avatarUrl: chosenAvatar,
    });

    const creds = getPortalCredentials();
    const pin = creds.teacherPins[created.id] || '1234';
    const message = formatTeacherWhatsAppInvite(created, pin);
    const waUrl = generateWhatsAppUrl(created.phone, message);

    setNewlyEmployedTeacherNotice({
      teacher: created,
      pin,
      waUrl,
    });

    if (tPhone.trim() && tPhone.replace(/[^0-9]/g, '').length >= 10) {
      window.open(waUrl, '_blank');
    }

    setTeacherSuccessMsg(`Teacher "${tName}" successfully registered! 4-Digit Login PIN: ${pin}`);
    setTimeout(() => setTeacherSuccessMsg(''), 6000);
    setTName('');
    setTPhone('');
    setTEmail('');
    setTClassId('');
    setTSelectedAvatar('');
    onDataUpdated();
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('Action Blocked: Cannot add classes in strict read-only mode.');
      return;
    }
    if (!newClassName.trim()) return;

    const teacher = teachers.find((t) => t.id === newTeacherId);

    addClass({
      name: newClassName.trim(),
      grade: newGrade,
      room: newRoom,
      teacherId: newTeacherId,
      teacherName: teacher ? teacher.name : 'Class Teacher',
      scheduleTime: '08:15 AM - 02:45 PM',
    });

    setNewClassName('');
    setNewRoom('');
    setNewTeacherId('');
    setActiveTab('classes');
    onDataUpdated();
  };

  const handleDeleteClass = (classId: string, className: string) => {
    if (isStrictReadOnly) {
      alert('Action Blocked: Cannot delete classes in strict read-only mode.');
      return;
    }
    const pupilCount = students.filter((s) => s.classId === classId).length;
    const msg = pupilCount > 0
      ? `Are you sure you want to delete class "${className}"?\n\n⚠️ Warning: There are currently ${pupilCount} enrolled pupils in this class. They will remain in the database but moved to "Unassigned" status.`
      : `Are you sure you want to delete class "${className}"?`;

    if (confirm(msg)) {
      deleteClass(classId);
      onDataUpdated();
    }
  };

  const handleDeleteTeacherAction = (teacherId: string, teacherName: string) => {
    if (isStrictReadOnly) return;
    if (confirm(`Remove teacher "${teacherName}" from staff database? Their assigned classes will become unassigned.`)) {
      deleteTeacher(teacherId);
      onDataUpdated();
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!tSearchQuery.trim()) return true;
    const q = tSearchQuery.toLowerCase();
    const assignedClasses = classes.filter((c) => t.assignedClassIds?.includes(c.id) || c.teacherId === t.id);
    const classNames = assignedClasses.map((c) => c.name.toLowerCase()).join(' ');
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.phone || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      ((t.subject || '').toLowerCase().includes(q)) ||
      classNames.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Faculty & Staff Database</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Staff Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Employ teachers, change staff avatars, assign homerooms, and configure school curriculum
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPupilDatabase && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPupilDatabase();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-semibold transition cursor-pointer border border-white/15"
                title="Switch to Pupil Directory & Enrollment Hub"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Pupil Database &rarr;</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
              title="Close Modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Primary Tabs Bar - High Contrast & Spacious */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-4 sm:px-6 overflow-x-auto shrink-0 min-h-[50px] items-stretch gap-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'teachers'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Teachers & Staff Roster</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
              {teachers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Classes & Sections</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {classes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'subjects'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 font-extrabold shadow-xs rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Curriculum & Subjects</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold">
              {schoolSubjects.length}
            </span>
          </button>
        </div>

        {/* Newly Employed Teacher WhatsApp Credentials Notice */}
        {newlyEmployedTeacherNotice && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/30 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  New Teacher Successfully Registered &bull; {newlyEmployedTeacherNotice.teacher.name}
                </h5>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Portal Login PIN: <strong className="font-mono text-xs">{newlyEmployedTeacherNotice.pin}</strong> &bull; Email: {newlyEmployedTeacherNotice.teacher.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    formatTeacherWhatsAppInvite(
                      newlyEmployedTeacherNotice.teacher,
                      newlyEmployedTeacherNotice.pin
                    )
                  );
                  alert('Teacher login credentials copied to clipboard!');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 transition cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Details</span>
              </button>
              {newlyEmployedTeacherNotice.waUrl && (
                <a
                  href={newlyEmployedTeacherNotice.waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Send via WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setNewlyEmployedTeacherNotice(null)}
                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: TEACHERS & STAFF ROSTER */}
        {activeTab === 'teachers' && (
          <div className="min-h-0 p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>School Teachers & Faculty Roster</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Employ new teachers, change staff profile photos, and assign class sections
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search teachers by name, phone, email..."
                  value={tSearchQuery}
                  onChange={(e) => setTSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Employ / Register New Teacher Form */}
            <form
              onSubmit={handleCreateTeacher}
              className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Employ / Register New Teacher</span>
                </h5>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  Automatic login PIN & WhatsApp dispatch
                </span>
              </div>

              {teacherSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{teacherSuccessMsg}</span>
                </div>
              )}

              {/* Avatar Picker for New Teacher */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="relative group shrink-0">
                  <img
                    src={tSelectedAvatar || getDefaultTeacherAvatar(tName || 'Staff')}
                    alt="Teacher Avatar Preview"
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => newTeacherFileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition cursor-pointer"
                    title="Upload photo from device"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={newTeacherFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoFileUpload(e, true)}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Teacher Profile Picture:
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Select a preset educator photo or tap the camera badge to upload a custom picture.
                  </p>
                  
                  {/* Preset quick pickers */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_TEACHER_AVATARS.slice(0, 7).map((p) => {
                      const isSelected = tSelectedAvatar === p.url;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setTSelectedAvatar(p.url)}
                          className={`relative rounded-full shrink-0 transition-transform cursor-pointer ${
                            isSelected ? 'ring-2 ring-indigo-600 scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={p.label}
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/30 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Teacher Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mrs. Ngozi Eze"
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone / WhatsApp No.
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +234 803 123 4567"
                    value={tPhone}
                    onChange={(e) => setTPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ngozi.eze@apexcrest.edu.ng"
                    value={tEmail}
                    onChange={(e) => setTEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Initial Class Assignment
                  </label>
                  <select
                    value={tClassId}
                    onChange={(e) => setTClassId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Unassigned / Subject Teacher --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.grade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex-1 max-w-sm">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Subject / Specialty:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, English Language, Physics"
                    value={tSubject}
                    onChange={(e) => setTSubject(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isStrictReadOnly}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition cursor-pointer shadow-xs disabled:opacity-50 self-end sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Employ Teacher</span>
                </button>
              </div>
            </form>

            {/* Employed Staff Roster Cards Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Employed Teaching Staff ({filteredTeachers.length})</span>
                <span className="text-[11px] text-slate-500">Tap teacher photo to change profile picture</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTeachers.map((teacher) => {
                  const teacherClasses = classes.filter(
                    (c) => teacher.assignedClassIds?.includes(c.id) || c.teacherId === teacher.id
                  );
                  const cleanPhone = (teacher?.phone || '').replace(/[^0-9]/g, '');

                  return (
                    <div
                      key={teacher.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {/* Avatar with Change Photo Button */}
                        <div className="flex items-center gap-3">
                          <div className="relative group shrink-0">
                            <img
                              src={teacher.avatarUrl || getDefaultTeacherAvatar(teacher.name)}
                              alt={teacher.name || 'Teacher'}
                              className="h-12 w-12 rounded-full object-cover border-2 border-indigo-300 dark:border-indigo-600 shadow-2xs group-hover:opacity-85 transition cursor-pointer"
                              onClick={() => {
                                setPhotoEditingTeacher(teacher);
                                setPhotoTab('preset');
                              }}
                              title="Click to change teacher photo"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoEditingTeacher(teacher);
                                setPhotoTab('preset');
                              }}
                              className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow-md hover:bg-indigo-700 transition cursor-pointer"
                              title="Change Photo"
                            >
                              <Camera className="h-3 w-3" />
                            </button>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                {teacher.name || 'Unnamed Teacher'}
                              </h5>
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoEditingTeacher(teacher);
                                  setPhotoTab('preset');
                                }}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                              >
                                Change photo
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {teacher.subject || 'Academic Faculty'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTeacherAction(teacher.id, teacher.name)}
                          disabled={isStrictReadOnly}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-30"
                          title="Remove Teacher"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 mb-3 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Phone className="h-3 w-3 text-slate-400" /> WhatsApp / Phone:
                          </span>
                          {cleanPhone.length >= 10 ? (
                            <button
                              type="button"
                              onClick={() => handleSendTeacherWhatsAppCredentials(teacher)}
                              className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                              title="Send login PIN & credentials via WhatsApp"
                            >
                              <span>{teacher.phone}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          ) : (
                            <span className="font-mono text-slate-500">{teacher.phone || 'None'}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Mail className="h-3 w-3 text-slate-400" /> Email:
                          </span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                            {teacher.email || 'None'}
                          </span>
                        </div>
                      </div>

                      {/* Permanent Homeroom Class */}
                      <div className="mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                            🏆 PERMANENT HOMEROOM CLASS:
                          </span>
                          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            Form Master
                          </span>
                        </div>
                        <select
                          value={teacher.permanentClassId || ''}
                          disabled={isStrictReadOnly}
                          onChange={(e) => {
                            if (e.target.value) {
                              setPermanentClassTeacher(e.target.value, teacher.id);
                              onDataUpdated();
                            }
                          }}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">-- No Permanent Homeroom Assigned --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.grade})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Assigned Subjects */}
                      <div className="mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ASSIGNED SUBJECTS:
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {(teacher.subjects || []).length} subject(s)
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                          {(teacher.subjects && teacher.subjects.length > 0
                            ? teacher.subjects
                            : [teacher.subject || 'Class Teacher']
                          ).map((subj) => (
                            <span
                              key={subj}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold"
                            >
                              <span>{subj}</span>
                              <button
                                type="button"
                                disabled={isStrictReadOnly}
                                onClick={() => {
                                  unassignSubjectFromTeacher(teacher.id, subj);
                                  onDataUpdated();
                                }}
                                className="text-emerald-500 hover:text-emerald-800 dark:hover:text-emerald-100 cursor-pointer"
                                title="Remove Subject"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Add Subject Dropdown */}
                        <select
                          value=""
                          disabled={isStrictReadOnly}
                          onChange={(e) => {
                            if (e.target.value) {
                              assignSubjectToTeacher(teacher.id, e.target.value);
                              onDataUpdated();
                            }
                          }}
                          className="w-full text-[11px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">+ Assign Subject to {teacher.name}...</option>
                          {schoolSubjects
                            .filter((s) => !(teacher.subjects || []).includes(s))
                            .map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Subject Teaching Classes */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            SUBJECT TEACHING CLASSES:
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {teacherClasses.length} assigned
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                          {teacherClasses.map((c) => {
                            const isHomeroom = teacher.permanentClassId === c.id;
                            return (
                              <span
                                key={c.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                                  isHomeroom
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                }`}
                              >
                                {isHomeroom && <span>★</span>}
                                <span>{c.name}</span>
                                {!isHomeroom && (
                                  <button
                                    type="button"
                                    disabled={isStrictReadOnly}
                                    onClick={() => {
                                      unassignTeacherFromClass(teacher.id, c.id);
                                      onDataUpdated();
                                    }}
                                    className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
                                  >
                                    &times;
                                  </button>
                                )}
                              </span>
                            );
                          })}
                        </div>

                        {/* Add Teaching Class Dropdown */}
                        <select
                          value=""
                          disabled={isStrictReadOnly}
                          onChange={(e) => {
                            if (e.target.value) {
                              assignTeacherToClass(teacher.id, e.target.value);
                              onDataUpdated();
                            }
                          }}
                          className="w-full text-[11px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                        >
                          <option value="">+ Assign Teaching Class to {teacher.name}...</option>
                          {classes
                            .filter((c) => !teacher.assignedClassIds?.includes(c.id))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.grade})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* WhatsApp Dispatch Button */}
                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleSendTeacherWhatsAppCredentials(teacher)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                        >
                          <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Send Login Credentials via WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLASSES & SECTIONS */}
        {activeTab === 'classes' && (
          <div className="min-h-0 p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>School Class Sections & Rooms</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure grade levels, homerooms, and assign permanent form masters
                </p>
              </div>
            </div>

            {/* Add Class Section Form */}
            <form
              onSubmit={handleCreateClass}
              className="p-4 sm:p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-3"
            >
              <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Create New Class Section</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary 4B"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Grade Level
                  </label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Creche">Creche</option>
                    <option value="KG 1">KG 1</option>
                    <option value="KG 2">KG 2</option>
                    <option value="Nursery 1">Nursery 1</option>
                    <option value="Nursery 2">Nursery 2</option>
                    <option value="Primary 1">Primary 1</option>
                    <option value="Primary 2">Primary 2</option>
                    <option value="Primary 3">Primary 3</option>
                    <option value="Primary 4">Primary 4</option>
                    <option value="Primary 5">Primary 5</option>
                    <option value="Primary 6">Primary 6</option>
                    <option value="JSS 1">JSS 1</option>
                    <option value="JSS 2">JSS 2</option>
                    <option value="JSS 3">JSS 3</option>
                    <option value="SSS 1">SSS 1</option>
                    <option value="SSS 2">SSS 2</option>
                    <option value="SSS 3">SSS 3</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Permanent Form Master
                  </label>
                  <select
                    value={newTeacherId}
                    onChange={(e) => setNewTeacherId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isStrictReadOnly}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Class Section</span>
                </button>
              </div>
            </form>

            {/* Classes Table */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Class Name</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Room</th>
                    <th className="px-4 py-3">Enrolled Pupils</th>
                    <th className="px-4 py-3">Permanent Form Master</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classes.map((c) => {
                    const pupilCount = students.filter((s) => s.classId === c.id).length;
                    const assignedTeacher = teachers.find((t) => t.id === c.teacherId);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {c.grade}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {c.room || 'Main Hall'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                            {pupilCount} pupils
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={c.teacherId || ''}
                            disabled={isStrictReadOnly}
                            onChange={(e) => {
                              setPermanentClassTeacher(c.id, e.target.value);
                              onDataUpdated();
                            }}
                            className="text-xs px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <option value="">-- Unassigned --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(c.id, c.name)}
                            disabled={isStrictReadOnly}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-30"
                            title="Delete Class"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CURRICULUM & SUBJECTS */}
        {activeTab === 'subjects' && (
          <div className="min-h-0 p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Curriculum & School Subjects Registry</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure official school subjects, academic levels, and teacher allocation
                </p>
              </div>
            </div>

            {subjectSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{subjectSuccessMsg}</span>
              </div>
            )}

            {/* Add New Subject Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isStrictReadOnly) return;
                const name = newSubjectName.trim();
                if (!name) return;
                const ok = addSchoolSubject(name, newSubjectLevel);
                if (ok) {
                  setSchoolSubjects(getSchoolSubjects());
                  setSchoolSubjectItems(getSchoolSubjectItems());
                  setSubjectSuccessMsg(`"${name}" added to curriculum registry!`);
                  setNewSubjectName('');
                  setTimeout(() => setSubjectSuccessMsg(''), 4000);
                  onDataUpdated();
                } else {
                  alert('Subject already exists in registry.');
                }
              }}
              className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-3"
            >
              <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Add New Curriculum Subject</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Further Mathematics, Agricultural Science, Yoruba"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Academic Level
                  </label>
                  <select
                    value={newSubjectLevel}
                    onChange={(e) => setNewSubjectLevel(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">All School Levels</option>
                    <option value="nursery">Nursery / Early Years</option>
                    <option value="primary">Primary School</option>
                    <option value="secondary">Secondary School</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isStrictReadOnly}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register Subject</span>
                </button>
              </div>
            </form>

            {/* Quick Preset Packs */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1-Click Preset Subject Packs:
              </h5>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'Nursery Pack', items: ['Letter Work & Phonics', 'Number Work & Counting', 'Rhymes & Songs', 'Health Habits', 'Handwriting & Coloring'], level: 'nursery' },
                  { name: 'Primary Pack', items: ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Civic Education', 'Agricultural Science', 'Home Economics'], level: 'primary' },
                  { name: 'Secondary Pack', items: ['Chemistry', 'Physics', 'Biology', 'Economics', 'Commerce', 'Financial Accounting', 'Literature-in-English', 'Government'], level: 'secondary' },
                ].map((pack) => (
                  <button
                    key={pack.name}
                    type="button"
                    disabled={isStrictReadOnly}
                    onClick={() => {
                      let added = 0;
                      pack.items.forEach((item) => {
                        if (addSchoolSubject(item, pack.level as any)) added++;
                      });
                      setSchoolSubjects(getSchoolSubjects());
                      setSchoolSubjectItems(getSchoolSubjectItems());
                      setSubjectSuccessMsg(`Added ${added} new subjects from ${pack.name}!`);
                      setTimeout(() => setSubjectSuccessMsg(''), 4000);
                      onDataUpdated();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    <span>Import {pack.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Registry List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {schoolSubjects.map((subj) => {
                const assignedTeachers = teachers.filter((t) => (t.subjects || []).includes(subj));
                const level = getSubjectLevel(subj);

                return (
                  <div
                    key={subj}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h6 className="text-xs font-bold text-slate-900 dark:text-white">{subj}</h6>
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          {level.toUpperCase()}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isStrictReadOnly) return;
                          if (confirm(`Remove "${subj}" from school curriculum?`)) {
                            deleteSchoolSubject(subj);
                            setSchoolSubjects(getSchoolSubjects());
                            setSchoolSubjectItems(getSchoolSubjectItems());
                            onDataUpdated();
                          }
                        }}
                        disabled={isStrictReadOnly}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-30"
                        title="Remove Subject"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {assignedTeachers.length > 0 ? (
                        <span>
                          Taught by: <strong className="text-slate-800 dark:text-slate-200">{assignedTeachers.map((t) => t.name).join(', ')}</strong>
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">No teacher assigned yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Academic Registry Synchronized &bull; {teachers.length} Active Staff</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPupilDatabase && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPupilDatabase();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
              >
                Go to Pupil Database &rarr;
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold hover:bg-slate-700 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHANGE TEACHER PHOTO MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      {photoEditingTeacher && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Change Teacher Photo</h4>
                  <p className="text-xs text-indigo-200">{photoEditingTeacher.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhotoEditingTeacher(null);
                  setUploadedDataUrl(null);
                  setCustomPhotoUrl('');
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Toast feedback */}
            {photoToastMsg && (
              <div className="p-3 bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{photoToastMsg}</span>
              </div>
            )}

            {/* Current Photo Preview Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <img
                src={
                  uploadedDataUrl ||
                  customPhotoUrl ||
                  photoEditingTeacher.avatarUrl ||
                  getDefaultTeacherAvatar(photoEditingTeacher.name)
                }
                alt={photoEditingTeacher.name}
                className="w-16 h-16 rounded-full object-cover border-3 border-indigo-500 shadow-md"
              />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Preview Photo</span>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">{photoEditingTeacher.name}</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">{photoEditingTeacher.subject || 'Faculty Member'}</p>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPhotoTab('preset')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  photoTab === 'preset'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Academic Portraits
              </button>
              <button
                type="button"
                onClick={() => setPhotoTab('upload')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  photoTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => setPhotoTab('url')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  photoTab === 'url'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Image URL
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-5 max-h-80 overflow-y-auto">
              {/* TAB 1: PRESET PORTRAITS */}
              {photoTab === 'preset' && (
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    {(['all', 'male', 'female'] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setPresetGenderFilter(filter)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                          presetGenderFilter === filter
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'all' ? 'All Portraits' : `${filter} Educators`}
                      </button>
                    ))}
                  </div>

                  {/* Portraits Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {PRESET_TEACHER_AVATARS.filter((p) =>
                      presetGenderFilter === 'all' ? true : p.gender === presetGenderFilter
                    ).map((preset) => {
                      const isCurrent = (photoEditingTeacher.avatarUrl || '') === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSaveTeacherPhoto(preset.url)}
                          className={`relative group flex flex-col items-center gap-1 p-1 rounded-2xl border-2 transition-all cursor-pointer ${
                            isCurrent
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 shadow-md scale-105'
                              : 'border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:scale-105'
                          }`}
                          title={`Select ${preset.label}`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-14 h-14 rounded-full object-cover shadow-xs"
                          />
                          {isCurrent && (
                            <span className="absolute top-1 right-1 p-0.5 rounded-full bg-indigo-600 text-white">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="text-[9px] text-center text-slate-500 dark:text-slate-400 truncate w-full">
                            {preset.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: UPLOAD FROM DEVICE */}
              {photoTab === 'upload' && (
                <div className="space-y-4 text-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 transition cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to select an image from your device
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        PNG, JPG, WebP supported (max 3MB)
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoFileUpload(e, false)}
                      className="hidden"
                    />
                  </div>

                  {uploadedDataUrl && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={uploadedDataUrl}
                          alt="Uploaded Preview"
                          className="w-10 h-10 rounded-full object-cover border border-emerald-400"
                        />
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Photo ready to apply!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveTeacherPhoto(uploadedDataUrl)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-xs"
                      >
                        Apply Photo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: IMAGE URL */}
              {photoTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Web Image URL:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={customPhotoUrl}
                        onChange={(e) => setCustomPhotoUrl(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={!customPhotoUrl.trim()}
                        onClick={() => handleSaveTeacherPhoto(customPhotoUrl.trim())}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {customPhotoUrl && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                      <img
                        src={customPhotoUrl}
                        alt="URL Preview"
                        className="w-12 h-12 rounded-full object-cover border border-indigo-400"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        Live Preview of image URL
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const def = getDefaultTeacherAvatar(photoEditingTeacher.name);
                  handleSaveTeacherPhoto(def);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Reset to default avatar
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhotoEditingTeacher(null);
                  setUploadedDataUrl(null);
                  setCustomPhotoUrl('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
