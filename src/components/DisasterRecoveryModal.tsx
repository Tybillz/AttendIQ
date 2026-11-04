'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  ShieldAlert,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  History,
  Users,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileJson,
  Sparkles,
  Database,
  ArrowRight,
} from 'lucide-react';
import { SchoolBackupSnapshot } from '@/types/attendance';
import {
  getSnapshots,
  createSnapshot,
  rollbackToSnapshot,
  deleteSnapshot,
  exportFullSchoolBackupJSON,
  restoreSchoolFromJSON,
  downloadCSVFile,
} from '@/lib/storage';

interface DisasterRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const DisasterRecoveryModal: React.FC<DisasterRecoveryModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [snapshots, setSnapshots] = useState<SchoolBackupSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'offline'>('timeline');
  const [manualReason, setManualReason] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [selectedSnapshotForRollback, setSelectedSnapshotForRollback] = useState<SchoolBackupSnapshot | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // File import state
  const [importedJsonContent, setImportedJsonContent] = useState('');
  const [previewParsedData, setPreviewParsedData] = useState<{
    pupilsCount: number;
    classesCount: number;
    teachersCount: number;
    sessionsCount: number;
    exportedAt?: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
      setStatusMessage(null);
      setSelectedSnapshotForRollback(null);
      setImportedJsonContent('');
      setPreviewParsedData(null);
      setFileError(null);
    }
  }, [isOpen]);

  const loadSnapshots = () => {
    const list = getSnapshots();
    setSnapshots(list);
  };

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' | 'warning' = 'success', duration = 4500) => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, duration);
  };

  const handleTakeManualSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = manualReason.trim() || 'Manual Administrator Snapshot';
    const snap = createSnapshot(reason, 'manual');
    setManualReason('');
    loadSnapshots();
    showFeedback(`✓ Snapshot created successfully: "${snap.reason}"`);
    if (onDataRestored) onDataRestored();
  };

  const handleExecuteRollback = () => {
    if (!selectedSnapshotForRollback) return;
    setIsProcessing(true);

    setTimeout(() => {
      const result = rollbackToSnapshot(selectedSnapshotForRollback.id);
      setIsProcessing(false);

      if (result.success) {
        showFeedback(
          `✓ System successfully rolled back to state from ${selectedSnapshotForRollback.formattedTime}! (${selectedSnapshotForRollback.stats.students} pupils restored)`,
          'success',
          6000
        );
        setSelectedSnapshotForRollback(null);
        loadSnapshots();
        if (onDataRestored) onDataRestored();
      } else {
        showFeedback(`Rollback failed: ${result.error || 'Unknown error'}`, 'error');
      }
    }, 250);
  };

  const handleDeleteSingleSnapshot = (id: string, reason: string) => {
    if (confirm(`Delete snapshot record "${reason}"? This snapshot point will no longer be available for rollback.`)) {
      deleteSnapshot(id);
      loadSnapshots();
      showFeedback('Snapshot removed from archives.');
    }
  };

  const handleDownloadSingleSnapshotJSON = (snap: SchoolBackupSnapshot) => {
    const jsonStr = JSON.stringify(snap, null, 2);
    const dateSlug = snap.timestamp.split('T')[0] || 'snapshot';
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AttendIQ_Snapshot_${dateSlug}_${snap.id.slice(-6)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback('Snapshot JSON downloaded.');
  };

  const handleDownloadFullDatabaseBackup = () => {
    const jsonStr = exportFullSchoolBackupJSON();
    const today = new Date().toISOString().split('T')[0];
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Innovative_International_School_Complete_Backup_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback('✓ Complete School Database Backup (.json) downloaded to your computer!');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setImportedJsonContent(text);
        setFileError(null);

        const parsed = JSON.parse(text);
        if (!parsed || !parsed.data) {
          setFileError('Invalid file: Expected an AttendIQ database backup containing a "data" object.');
          setPreviewParsedData(null);
          return;
        }

        const data = parsed.data;
        setPreviewParsedData({
          pupilsCount: Array.isArray(data.students) ? data.students.length : 0,
          classesCount: Array.isArray(data.classes) ? data.classes.length : 0,
          teachersCount: Array.isArray(data.teachers) ? data.teachers.length : 0,
          sessionsCount: Array.isArray(data.sessions) ? data.sessions.length : 0,
          exportedAt: parsed.exportedAt || undefined,
        });
      } catch (err: any) {
        setFileError(`Could not parse JSON file: ${err?.message || 'Syntax error'}`);
        setPreviewParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteExternalRestore = () => {
    if (!importedJsonContent.trim()) return;
    if (
      !confirm(
        'Are you sure you want to restore this database? A safety snapshot of your current data will be automatically saved first, but all active tables will be overwritten with the contents of this file.'
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const result = restoreSchoolFromJSON(importedJsonContent);
      setIsProcessing(false);

      if (result.success && result.counts) {
        showFeedback(
          `✓ Disaster recovery successful! Restored ${result.counts.students} pupils, ${result.counts.classes} classes, and ${result.counts.teachers} teachers from file.`,
          'success',
          6000
        );
        setImportedJsonContent('');
        setPreviewParsedData(null);
        loadSnapshots();
        if (onDataRestored) onDataRestored();
      } else {
        showFeedback(`Restore failed: ${result.error || 'Unknown error'}`, 'error');
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">Disaster Recovery & System Rollback</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Zero Data Loss Engine
                </span>
              </div>
              <p className="text-xs text-slate-300">
                1-Click state rollback, automated deletion snapshots, and offline flash drive backups.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Feedback Notice */}
        {statusMessage && (
          <div
            className={`px-6 py-3 text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Rolling Rollback Points ({snapshots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('offline')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'offline'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Offline Backup (.json) & Emergency Restore</span>
          </button>
        </div>

        {/* Tab 1: Rolling Rollback Points */}
        {activeTab === 'timeline' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Take Manual Snapshot Form */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-indigo-600" /> Capture Immediate Snapshot
                </span>
                <span className="text-[11px] text-indigo-700 font-medium">
                  Preserves current school state before major administrative changes
                </span>
              </div>
              <form onSubmit={handleTakeManualSnapshot} className="flex flex-col sm:flex-row gap-2 mt-2">
                <input
                  type="text"
                  placeholder="e.g. Before 2nd Term Promotions, Before Staff Reassignment..."
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-white border border-indigo-300 text-slate-900 focus:outline-indigo-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  <Camera className="h-3.5 w-3.5" /> Take Snapshot Now
                </button>
              </form>
            </div>

            {/* List of Rollback Snapshots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Historical Rollback Points (Auto & Manual)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Last {snapshots.length} automatic points preserved
                </span>
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Historical Snapshots Yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    The system automatically takes a snapshot whenever an admin deletes a class, removes a pupil, or performs bulk imports. You can also click &ldquo;Take Snapshot Now&rdquo; above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {snapshots.map((snap) => {
                    const isAuto = snap.triggerType === 'auto';
                    return (
                      <div
                        key={snap.id}
                        className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isAuto
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isAuto ? '🤖 Auto-Protected' : '👤 Manual Backup'}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {snap.reason}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-700">{snap.formattedTime}</span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-slate-400" /> {snap.stats.students} Pupils
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-slate-400" /> {snap.stats.classes} Classes
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 text-slate-400" /> {snap.stats.teachers} Staff
                            </span>
                            {snap.stats.sessions > 0 && (
                              <>
                                <span>&bull;</span>
                                <span>{snap.stats.sessions} Attendance Records</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSelectedSnapshotForRollback(snap)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Roll back database to this exact moment"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Roll Back</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadSingleSnapshotJSON(snap)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Download JSON snapshot"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSingleSnapshot(snap.id, snap.reason)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete this snapshot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Offline Disaster Recovery (.json) */}
        {activeTab === 'offline' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Card A: Download Complete Database */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Download Full Institutional Database Backup
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Export all pupils, assigned classrooms, staff profiles, past attendance sessions, Nigerian term report marks, and parent WhatsApp phone numbers into a single portable <code className="font-bold text-indigo-700">.json</code> file. Keep this safe on an external flash drive or school PC.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadFullDatabaseBackup}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Download Full School Backup (.json)</span>
              </button>
            </div>

            {/* Card B: Restore from Backup File */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-950">
                    Emergency Disaster Recovery: Restore From Backup File
                  </h4>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  If computer hard drives were replaced or local browser storage was cleared, select your previously saved <code className="font-bold">.json</code> backup to restore the complete school directory in seconds.
                </p>
              </div>

              {/* File input */}
              <div className="bg-white p-4 rounded-xl border border-amber-300/80 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Select AttendIQ Backup File (.json):
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />

                {fileError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}

                {previewParsedData && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-900 block flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Valid Backup File Detected:
                    </span>
                    <div className="flex items-center gap-4 text-xs font-semibold text-emerald-800 flex-wrap">
                      <span>👥 {previewParsedData.pupilsCount} Pupils</span>
                      <span>🏫 {previewParsedData.classesCount} Classes</span>
                      <span>🎓 {previewParsedData.teachersCount} Staff</span>
                      <span>📋 {previewParsedData.sessionsCount} Sessions</span>
                      {previewParsedData.exportedAt && (
                        <span className="text-[11px] text-emerald-700 font-mono">
                          Exported: {new Date(previewParsedData.exportedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExecuteExternalRestore}
                    disabled={!previewParsedData || isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-40 cursor-pointer active:scale-95"
                  >
                    <Upload className="h-4 w-4" />
                    <span>
                      {isProcessing ? 'Restoring Database...' : 'Execute Full Restore from File'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Shield className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Pre-Rollback Safety Guarantee: A snapshot of today&apos;s data is always captured before any rollback occurs.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Rollback */}
      {selectedSnapshotForRollback && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-bold text-base text-slate-900">
                Confirm System Rollback?
              </h4>
              <p className="text-xs text-slate-500">
                You are about to roll back the entire school database to this historical point:
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">
                &ldquo;{selectedSnapshotForRollback.reason}&rdquo;
              </div>
              <div className="text-slate-500 text-[11px]">
                Captured: {selectedSnapshotForRollback.formattedTime}
              </div>
              <div className="text-indigo-700 font-semibold text-[11px] pt-1 border-t border-slate-200">
                Will restore: {selectedSnapshotForRollback.stats.students} pupils &bull; {selectedSnapshotForRollback.stats.classes} classes &bull; {selectedSnapshotForRollback.stats.teachers} staff
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-snug">
              🛡️ <strong>Safety Guarantee:</strong> An automatic snapshot of your <em>current state right now</em> will be created first, so you can always undo this rollback if needed.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSnapshotForRollback(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isProcessing ? 'Rolling back...' : 'Yes, Roll Back Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

