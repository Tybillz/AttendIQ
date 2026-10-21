'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  Search,
  Filter,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  User,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Download,
} from 'lucide-react';
import { AuditLogEntry, AuditActionType } from '@/types/attendance';
import { revertAuditAction, downloadCSVFile } from '@/lib/storage';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLogEntry[];
  onDataUpdated: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  onDataUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'warnings' | 'attendance' | 'grades' | 'unlocks'>('all');
  const [revertSuccessMsg, setRevertSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filtered logs
  const filteredLogs = auditLogs.filter((log) => {
    if (selectedFilter === 'warnings' && log.severity === 'info') return false;
    if (selectedFilter === 'attendance' && !log.action.includes('ATTENDANCE')) return false;
    if (selectedFilter === 'grades' && !log.action.includes('GRADE')) return false;
    if (selectedFilter === 'unlocks' && !log.action.includes('SESSION')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.targetName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        (log.className && log.className.toLowerCase().includes(q)) ||
        (log.subject && log.subject.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const criticalCount = auditLogs.filter((l) => l.severity === 'critical' || l.severity === 'warning').length;
  const gradeModCount = auditLogs.filter((l) => l.action === 'GRADE_MODIFIED').length;
  const attendanceOverwriteCount = auditLogs.filter((l) => l.action === 'ATTENDANCE_OVERWRITTEN').length;

  const handleRevert = (log: AuditLogEntry) => {
    if (
      confirm(
        `DISASTER RECOVERY OVERRIDE:\n\nAre you sure you want to revert this change for ${log.targetName} back to its previous value (${log.oldValue || 'original'})?\n\nThis administrative action will be recorded in the security audit trail.`
      )
    ) {
      const res = revertAuditAction(log.id, { id: 'admin-1', name: 'School Administration' });
      if (res.success) {
        setRevertSuccessMsg(res.message);
        setTimeout(() => setRevertSuccessMsg(null), 4000);
        onDataUpdated();
      } else {
        alert(res.message);
      }
    }
  };

  const handleExportAuditCSV = () => {
    let csv = 'Timestamp,Actor Role,Staff Name,Action,Target Type,Target Name,Class,Subject,Date,Old Value,New Value,Severity,Details\n';
    auditLogs.forEach((l) => {
      csv += `"${l.timestamp}","${l.actorRole}","${l.actorName}","${l.action}","${l.targetType}","${l.targetName}","${l.className || ''}","${l.subject || ''}","${l.dateStr || ''}","${l.oldValue || ''}","${l.newValue || ''}","${l.severity}","${l.details.replace(/"/g, '""')}"\n`;
    });
    downloadCSVFile(csv, `AttendIQ_Security_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-950 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Staff Activity & Anti-Tamper Security Audit Log
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Non-Repudiation Active
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Immutable chronological log of all attendance markings, score modifications, session unlocks, and rollbacks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAuditCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition"
              title="Export complete security audit trail to CSV"
            >
              <Download className="h-3.5 w-3.5" /> Export Audit Log
            </button>
            <button
              onClick={onClose}
              className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* KPI Alert Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-slate-50 border-b border-slate-200">
          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> Total Monitored Events
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900">{auditLogs.length}</span>
              <span className="text-[10px] text-slate-500 font-mono">100% Tracked</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-amber-700 block mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Flagged Alterations
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-600">{criticalCount}</span>
              <span className="text-[10px] text-amber-700/80 font-medium">Warnings/Critical</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-rose-700 block mb-1 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Overwritten Records
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-rose-600">{attendanceOverwriteCount}</span>
              <span className="text-[10px] text-rose-700/80 font-medium">Rollback Capable</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-emerald-700 block mb-1 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Time-Lock Enforcement
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-emerald-700">Cutoff Enforced</span>
              <span className="text-[10px] text-emerald-800 font-mono">Past Days Frozen</span>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {revertSuccessMsg && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{revertSuccessMsg}</span>
            </div>
            <button
              onClick={() => setRevertSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by teacher, pupil, class, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white border border-slate-300 w-full text-slate-900 placeholder-slate-400 focus:outline-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap rounded-xl bg-slate-100 p-0.5 text-xs border border-slate-200">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                selectedFilter === 'all'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Events ({auditLogs.length})
            </button>
            <button
              onClick={() => setSelectedFilter('warnings')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                selectedFilter === 'warnings'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚠️ Warnings & Alerts ({criticalCount})
            </button>
            <button
              onClick={() => setSelectedFilter('attendance')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                selectedFilter === 'attendance'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setSelectedFilter('grades')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                selectedFilter === 'grades'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grade Changes ({gradeModCount})
            </button>
            <button
              onClick={() => setSelectedFilter('unlocks')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                selectedFilter === 'unlocks'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin Unlocks
            </button>
          </div>
        </div>

        {/* Audit Log Entries List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-semibold text-slate-700">No audit events match your active search or filter criteria.</p>
              <p className="text-[11px] text-slate-500 mt-1">All standard staff operations are tracked automatically.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isCritical = log.severity === 'critical';
              const isWarning = log.severity === 'warning';

              return (
                <div
                  key={log.id}
                  className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isCritical
                      ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                      : isWarning
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Left: Event Details & Actor */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>

                      <span className="text-xs font-bold text-slate-900">
                        {log.targetName}
                      </span>

                      {log.className && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({log.className})
                        </span>
                      )}

                      {log.subject && (
                        <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {log.subject}
                        </span>
                      )}

                      {log.dateStr && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {log.dateStr}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      {log.details}
                    </p>

                    {/* Old Value vs New Value Indicator */}
                    {(log.oldValue || log.newValue) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                        {log.oldValue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                            Previous: {log.oldValue}
                          </span>
                        )}
                        {log.oldValue && log.newValue && (
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {log.newValue && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            New: {log.newValue}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        Staff: <strong className="text-slate-700">{log.actorName}</strong> ({log.actorRole})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {log.formattedTime}
                      </span>
                    </div>
                  </div>

                  {/* Right: Rollback Action Button */}
                  {log.canRevert && (
                    <div className="shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={() => handleRevert(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 font-bold text-xs transition active:scale-95 shadow-xs"
                        title="Rollback this modification to previous value"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                        <span>Revert Change</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Anti-Tamper Watchdog Active • Time-Locks strictly enforced across all classrooms</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
