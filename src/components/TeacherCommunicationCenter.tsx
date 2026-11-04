'use client';

import React, { useState } from 'react';
import {
  FileQuestion,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { StaffQuery, StaffAnnouncement, Teacher } from '@/types/attendance';
import { submitStaffQueryReply, acknowledgeStaffAnnouncement } from '@/lib/storage';
import { isLicenseWriteRestricted } from '@/lib/licensing';

interface TeacherCommunicationCenterProps {
  teacher: Teacher;
  queries: StaffQuery[];
  announcements: StaffAnnouncement[];
  activeSubTab: 'queries' | 'announcements';
  onSubTabChange: (tab: 'queries' | 'announcements') => void;
  onDataUpdated: () => void;
  isLicenseLocked?: boolean;
}

export const TeacherCommunicationCenter: React.FC<TeacherCommunicationCenterProps> = ({
  teacher,
  queries,
  announcements,
  activeSubTab,
  onSubTabChange,
  onDataUpdated,
  isLicenseLocked = false,
}) => {
  const isStrictReadOnly = isLicenseLocked || isLicenseWriteRestricted();
  // Queries state
  const [selectedQueryForReply, setSelectedQueryForReply] = useState<StaffQuery | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);

  // Expanded cards state
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);
  const [expandedAncId, setExpandedAncId] = useState<string | null>(null);

  const teacherQueries = queries.filter((q) => q.teacherId === teacher.id);
  const pendingQueriesCount = teacherQueries.filter((q) => q.status === 'pending_reply').length;

  const unacknowledgedAncCount = announcements.filter(
    (a) => !a.acknowledgedByTeacherIds?.includes(teacher.id)
  ).length;

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStrictReadOnly) {
      alert('⛔ Action Blocked: Cannot submit query replies in read-only mode.');
      return;
    }
    if (!selectedQueryForReply || !replyText.trim()) return;

    setReplySubmitting(true);
    const result = submitStaffQueryReply(
      selectedQueryForReply.id,
      replyText.trim(),
      typeof navigator !== 'undefined' ? `${navigator.userAgent.slice(0, 30)}` : 'Teacher Portal'
    );
    setReplySubmitting(false);

    if (result.success) {
      setReplySuccessMessage(result.message);
      setReplyText('');
      setTimeout(() => {
        setSelectedQueryForReply(null);
        setReplySuccessMessage(null);
        onDataUpdated();
      }, 1500);
    }
  };

  const handleAcknowledge = (ancId: string) => {
    if (isStrictReadOnly) return;
    acknowledgeStaffAnnouncement(ancId, teacher.id);
    onDataUpdated();
  };

  const getCategoryBadge = (cat: StaffQuery['category']) => {
    switch (cat) {
      case 'lateness':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Punctuality & Lateness</span>;
      case 'absence':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Unexcused Absence</span>;
      case 'academic_records':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">Academic Records & Grades</span>;
      case 'insubordination':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">Staff Conduct</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">General Administrative</span>;
    }
  };

  const getStatusBadge = (status: StaffQuery['status']) => {
    switch (status) {
      case 'pending_reply':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs animate-pulse flex items-center gap-1 border border-rose-400">
            <Clock className="h-2.5 w-2.5" /> Action Required (Pending Reply)
          </span>
        );
      case 'replied':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5 text-sky-600" /> Explanation Submitted (Under Review)
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Resolved / Explanation Accepted
          </span>
        );
      case 'warning_issued':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-700" /> Administrative Warning Issued
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: StaffAnnouncement['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider animate-pulse flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> Urgent Directive
          </span>
        );
      case 'important':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> Important Notice
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wider">
            General Circular
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSubTabChange('queries')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              activeSubTab === 'queries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            <span>My Official Queries</span>
            {pendingQueriesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {pendingQueriesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSubTabChange('announcements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
              activeSubTab === 'announcements'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>School Announcements & Circulars</span>
            {unacknowledgedAncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                {unacknowledgedAncCount} new
              </span>
            )}
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          {activeSubTab === 'queries'
            ? `${teacherQueries.length} Total Disciplinary Records`
            : `${announcements.length} School Circulars Broadcasted`}
        </span>
      </div>

      {/* VIEW 1: MY QUERIES */}
      {activeSubTab === 'queries' && (
        <div className="space-y-4">
          {teacherQueries.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Exemplary Standing — No Queries</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                You have zero pending or past queries from School Management. Your record with Innovative International Secondary School is in excellent standing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teacherQueries.map((query) => {
                const isExpanded = expandedQueryId === query.id;
                const isPending = query.status === 'pending_reply';

                return (
                  <div
                    key={query.id}
                    className={`bg-white rounded-3xl border transition shadow-xs overflow-hidden ${
                      isPending ? 'border-rose-300 ring-1 ring-rose-500/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Header Strip */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {query.queryNumber}
                          </span>
                          {getCategoryBadge(query.category)}
                          {getStatusBadge(query.status)}
                        </div>
                        <h4 className="text-base font-black text-slate-900 pt-1">{query.title}</h4>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Issued by: <strong className="text-slate-700">{query.issuedBy}</strong></span>
                          <span>Incident Date: <strong className="text-slate-700">{query.incidentDate}</strong></span>
                          <span>
                            Reply Deadline: <strong className={isPending ? 'text-rose-600 font-bold' : 'text-slate-700'}>{query.replyDeadline}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQueryForReply(query);
                              setReplyText('');
                              setReplySuccessMessage(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Submit Formal Reply</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedQueryId(isExpanded ? null : query.id)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Query Statement & Description */}
                    <div className="p-5 space-y-4 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                          Official Query Directive & Statement:
                        </span>
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 leading-relaxed font-medium">
                          {query.description}
                        </div>
                      </div>

                      {/* Display Staff Reply if already submitted */}
                      {query.staffReply && (
                        <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 text-sky-950 space-y-1.5 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px] font-bold text-sky-800">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                              <span>Your Submitted Written Explanation</span>
                            </span>
                            <span className="text-slate-500 font-normal">
                              Submitted: {new Date(query.staffReply.repliedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed italic bg-white/70 p-3 rounded-xl border border-sky-100">
                            &ldquo;{query.staffReply.explanation}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Display Admin Resolution if decided */}
                      {query.adminDecision && (
                        <div className={`p-4 rounded-2xl border space-y-1.5 animate-in fade-in ${
                          query.adminDecision.decision === 'explanation_accepted'
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                            : 'bg-amber-50/80 border-amber-200 text-amber-950'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1.5">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>Management Review & Resolution ({query.adminDecision.decision.replace('_', ' ').toUpperCase()})</span>
                            </span>
                            <span className="text-slate-500 font-normal">
                              Resolved: {new Date(query.adminDecision.decidedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white/80 p-3 rounded-xl">
                            {query.adminDecision.notes}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Reviewed by: <strong>{query.adminDecision.decidedBy}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SCHOOL ANNOUNCEMENTS & CIRCULARS */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
              <Bell className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No School Announcements</h3>
              <p className="text-xs text-slate-500 mt-1">There are currently no circulars broadcasted from Management.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map((anc) => {
                const isAcknowledged = anc.acknowledgedByTeacherIds?.includes(teacher.id);
                const isExpanded = expandedAncId === anc.id;

                return (
                  <div
                    key={anc.id}
                    className={`bg-white rounded-3xl border p-5 shadow-xs transition ${
                      !isAcknowledged ? 'border-indigo-300 ring-1 ring-indigo-500/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {getPriorityBadge(anc.priority)}
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {anc.category.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(anc.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h4 className="text-base font-black text-slate-900">{anc.title}</h4>

                        <p className="text-xs text-slate-500">
                          Published by: <strong className="text-slate-700">{anc.publishedBy}</strong> &bull; Audience: <strong>All Staff</strong>
                        </p>

                        <div className="pt-2">
                          <p className={`text-xs text-slate-800 leading-relaxed font-medium ${!isExpanded ? 'line-clamp-3' : ''}`}>
                            {anc.content}
                          </p>
                          {anc.content.length > 200 && (
                            <button
                              type="button"
                              onClick={() => setExpandedAncId(isExpanded ? null : anc.id)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-1 cursor-pointer"
                            >
                              {isExpanded ? 'Show less' : 'Read full memorandum →'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right Action: Acknowledge Button */}
                      <div className="shrink-0 self-start md:self-center">
                        {isAcknowledged ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Acknowledged</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(anc.id)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Acknowledge / Mark as Read</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FORMAL QUERY REPLY MODAL */}
      {selectedQueryForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-rose-600 uppercase">
                  {selectedQueryForReply.queryNumber} &bull; Formal Disciplinary Reply
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedQueryForReply.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQueryForReply(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700">Directive from Management:</span>
              <p className="text-slate-800 italic">&ldquo;{selectedQueryForReply.description}&rdquo;</p>
              <div className="text-[10px] text-slate-500 pt-1">
                Deadline to reply: <strong>{selectedQueryForReply.replyDeadline}</strong>
              </div>
            </div>

            {replySuccessMessage ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{replySuccessMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReply} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Your Formal Written Explanation:
                  </label>
                  <textarea
                    rows={5}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                    placeholder="Provide a factual, clear explanation addressing the directive above..."
                    className="w-full text-xs p-3 rounded-2xl bg-slate-50 border border-slate-300 focus:outline-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQueryForReply(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={replySubmitting || !replyText.trim()}
                    className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{replySubmitting ? 'Submitting...' : 'Submit Written Reply'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

