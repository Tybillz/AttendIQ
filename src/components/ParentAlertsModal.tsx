'use client';

import React, { useState } from 'react';
import {
  X,
  Bell,
  Smartphone,
  Mail,
  ShieldAlert,
  Send,
  CheckCircle2,
  Filter,
  Search,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { ParentAlert, Student } from '@/types/attendance';
import { addParentAlert } from '@/lib/storage';
import { generateWhatsAppUrl, generateSmsUrl, sendLiveNotification } from '@/lib/notifications';

interface ParentAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: ParentAlert[];
  students: Student[];
  onAlertsUpdated: () => void;
}

export const ParentAlertsModal: React.FC<ParentAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  students,
  onAlertsUpdated,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'chronic' | 'daily'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual broadcast composer
  const [showComposer, setShowComposer] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [customMessage, setCustomMessage] = useState('');
  const [sendChannel, setSendChannel] = useState<'WhatsApp' | 'SMS' | 'Both' | 'Email'>('WhatsApp');
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((alt) => {
    if (filterType === 'chronic' && alt.type !== 'chronic_threshold_exceeded') return false;
    if (filterType === 'daily' && alt.type !== 'absence_notice') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alt.studentName.toLowerCase().includes(q) ||
        alt.parentName.toLowerCase().includes(q) ||
        alt.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSendManualAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMessage.trim()) return;

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    addParentAlert({
      studentId: student.id,
      studentName: student.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      type: 'absence_notice',
      channel: sendChannel,
      message: customMessage.trim(),
      triggerReason: 'Administrative manual broadcast',
    });

    // If WhatsApp is chosen, open WhatsApp directly with prefilled message
    if ((sendChannel === 'WhatsApp' || sendChannel === 'Both') && student.parentPhone) {
      const waUrl = generateWhatsAppUrl(student.parentPhone, customMessage.trim());
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    // Trigger backend notification dispatch
    sendLiveNotification({
      studentName: student.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      message: customMessage.trim(),
      channel: sendChannel,
      type: 'absence_notice',
    }).catch(() => {});

    setCustomMessage('');
    setShowComposer(false);
    setSendSuccess(true);
    onAlertsUpdated();
    setTimeout(() => setSendSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Parent & School Alerts Hub</h3>
              <p className="text-xs text-slate-300">
                Live audit trail of all automated SMS & Email absence notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, parent, note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 focus:outline-indigo-500 w-48 sm:w-60"
              />
            </div>

            <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterType === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                All ({alerts.length})
              </button>
              <button
                onClick={() => setFilterType('chronic')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterType === 'chronic' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                High Absence ({alerts.filter((a) => a.type === 'chronic_threshold_exceeded').length})
              </button>
              <button
                onClick={() => setFilterType('daily')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterType === 'daily' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Daily ({alerts.filter((a) => a.type === 'absence_notice').length})
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowComposer(!showComposer)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
          >
            <Send className="h-3 w-3" />
            <span>Compose Notice</span>
          </button>
        </div>

        {/* Compose Manual Notice Accordion */}
        {showComposer && (
          <form
            onSubmit={handleSendManualAlert}
            className="p-4 bg-indigo-50/70 border-b border-indigo-200 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-bold text-indigo-900">Send Direct Notification to Parent</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Select Pupil
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber}) - Parent: {s.parentName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Dispatch Channel
                </label>
                <div className="flex gap-1.5">
                  {(['WhatsApp', 'SMS', 'Both', 'Email'] as const).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => setSendChannel(channel)}
                      className={`text-[11px] px-2 py-1.5 rounded-lg border font-semibold flex-1 transition ${
                        sendChannel === channel
                          ? channel === 'WhatsApp'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Notice Message Content
              </label>
              <textarea
                rows={2}
                placeholder="Enter alert text to dispatch to parent's phone or email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg bg-white border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Send Notice Now
              </button>
            </div>
          </form>
        )}

        {sendSuccess && (
          <div className="px-4 py-2 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 border-b border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Alert successfully dispatched to parent via SMS gateway!
          </div>
        )}

        {/* Alerts List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  alt.type === 'chronic_threshold_exceeded'
                    ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {alt.type === 'chronic_threshold_exceeded' ? (
                      <span className="p-1.5 rounded-lg bg-rose-500 text-white">
                        <ShieldAlert className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                        {alt.channel === 'Email' ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Smartphone className="h-4 w-4" />
                        )}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{alt.studentName}</span>
                        <span className="text-[11px] text-slate-500">
                          Parent: {alt.parentName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Sent via {alt.channel} • {new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Delivered
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed font-mono">
                  &ldquo;{alt.message}&rdquo;
                </div>

                <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Trigger: {alt.triggerReason}</span>
                  <span>Recipient: {alt.parentPhone || alt.parentEmail}</span>
                </div>

                {alt.parentPhone && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <a
                      href={generateWhatsAppUrl(alt.parentPhone, alt.message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>WhatsApp Parent</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                    </a>
                    <a
                      href={generateSmsUrl(alt.parentPhone, alt.message)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      <Smartphone className="h-3 w-3" />
                      <span>SMS</span>
                    </a>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No parent notifications match the filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
