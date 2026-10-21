'use client';

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Bell,
  Clock,
  ShieldAlert,
  Save,
  CheckCircle2,
  Smartphone,
  Mail,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { AlertSettings } from '@/types/attendance';
import { saveAlertSettings } from '@/lib/storage';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AlertSettings;
  onSettingsUpdated: (newSettings: AlertSettings) => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
}) => {
  const [formData, setFormData] = useState<AlertSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAlertSettings(formData);
    onSettingsUpdated(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Parent Alert & Automation Settings</h3>
              <p className="text-xs text-slate-300">
                Configure chronic absence triggers, auto-notifications, and end-of-day policies
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: High Absence Alert Threshold */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>High Absence Alert Threshold</span>
            </div>
            <p className="text-xs text-amber-800 mb-3">
              Trigger notifications to parents and flag students on the school administration dashboard when total absences reach this count.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Absences Trigger Count
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.chronicAbsenceThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, chronicAbsenceThreshold: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-600 font-medium">days</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Within Rolling Window
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={formData.windowDays}
                    onChange={(e) =>
                      setFormData({ ...formData, windowDays: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-800"
                  />
                  <span className="text-xs text-slate-600 font-medium">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: School Roll Call Schedule Policy (Accommodates Schools That Mark Late) */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" /> School Roll Call Schedule Policy
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Customizable Cutoff
              </span>
            </div>
            <p className="text-xs text-indigo-900/80 mb-3">
              Set your school&apos;s attendance recording routine. Accommodates morning assembly, break-time sync, or end-of-day paper book encoding:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              {/* Option A: Early Morning */}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    rollCallSchedulePolicy: 'early_morning',
                    rollCallCutoffTime: '08:15',
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition ${
                  formData.rollCallSchedulePolicy === 'early_morning'
                    ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 block">Early Morning</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Cutoff: 08:15 AM</span>
                <span className="text-[9px] text-slate-400 block mt-1">Strict assembly check</span>
              </button>

              {/* Option B: Mid-Morning Break */}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    rollCallSchedulePolicy: 'mid_morning',
                    rollCallCutoffTime: '11:30',
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition ${
                  formData.rollCallSchedulePolicy === 'mid_morning'
                    ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 block">Recess / Break</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Cutoff: 11:30 AM</span>
                <span className="text-[9px] text-slate-400 block mt-1">After 1st & 2nd periods</span>
              </button>

              {/* Option C: Flexible / All-Day */}
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    rollCallSchedulePolicy: 'flexible_all_day',
                    rollCallCutoffTime: '15:30',
                  })
                }
                className={`p-2.5 rounded-xl border text-left transition ${
                  formData.rollCallSchedulePolicy === 'flexible_all_day'
                    ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white/70 hover:bg-white'
                }`}
              >
                <span className="font-bold text-xs text-slate-900 block">Flexible All-Day</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Cutoff: 03:30 PM</span>
                <span className="text-[9px] text-slate-400 block mt-1">Zero false late flags</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-xs">
              <span className="text-slate-600 font-medium">Custom Cutoff Time:</span>
              <input
                type="time"
                value={formData.rollCallCutoffTime || '11:30'}
                onChange={(e) => setFormData({ ...formData, rollCallCutoffTime: e.target.value })}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800"
              />
            </div>
          </div>

          {/* Section 3: Parent Notification Timing */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-1 flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-indigo-600" />
              Parent Absence & Tardiness Alerts
            </label>
            <p className="text-xs text-slate-500 mb-2.5">
              Choose how alerts are triggered (safe for schools marking mid-day or late):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col transition ${
                  formData.notificationTiming === 'immediate'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Instant
                  </span>
                  <input
                    type="radio"
                    name="timing"
                    checked={formData.notificationTiming === 'immediate'}
                    onChange={() => setFormData({ ...formData, notificationTiming: 'immediate' })}
                    className="text-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Auto-sends right when pupil is marked absent
                </span>
              </label>

              <label
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col transition ${
                  formData.notificationTiming === 'manual_only'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Manual 1-Click
                  </span>
                  <input
                    type="radio"
                    name="timing"
                    checked={formData.notificationTiming === 'manual_only'}
                    onChange={() => setFormData({ ...formData, notificationTiming: 'manual_only' })}
                    className="text-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Teacher clicks WhatsApp button when appropriate
                </span>
              </label>

              <label
                className={`p-3 rounded-2xl border cursor-pointer flex flex-col transition ${
                  formData.notificationTiming === 'next_morning'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-sky-500" /> Next Morning
                  </span>
                  <input
                    type="radio"
                    name="timing"
                    checked={formData.notificationTiming === 'next_morning'}
                    onChange={() => setFormData({ ...formData, notificationTiming: 'next_morning' })}
                    className="text-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 leading-tight">
                  Batched morning digest delivered at 7:00 AM
                </span>
              </label>
            </div>
          </div>

          {/* Section 4: End-of-Day Automatic Absent Tagging */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Automatic Absent Tagging Cutoff
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Any pupils not marked present by this time are auto-flagged absent.
                </span>
              </div>
              <input
                type="time"
                value={formData.autoAbsentCutoffTime}
                onChange={(e) =>
                  setFormData({ ...formData, autoAbsentCutoffTime: e.target.value })
                }
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800"
              />
            </div>
          </div>

          {/* Section 4: Notification Channels */}
          <div>
            <span className="text-xs font-bold text-slate-900 block mb-2">
              Notification Channels & Recipients
            </span>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <MessageSquare className="h-4 w-4 text-emerald-600" /> WhatsApp Notifications to Parents
                </span>
                <input
                  type="checkbox"
                  checked={formData.whatsappEnabled ?? true}
                  onChange={(e) => setFormData({ ...formData, whatsappEnabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <Smartphone className="h-4 w-4 text-sky-600" /> Auto-send SMS to Parents
                </span>
                <input
                  type="checkbox"
                  checked={formData.smsEnabled}
                  onChange={(e) => setFormData({ ...formData, smsEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <Mail className="h-4 w-4 text-sky-600" /> Auto-send Email to Parents
                </span>
                <input
                  type="checkbox"
                  checked={formData.emailEnabled}
                  onChange={(e) => setFormData({ ...formData, emailEnabled: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-medium">
                  <ShieldAlert className="h-4 w-4 text-amber-600" /> Auto-notify School Administration on Threshold Exceeded
                </span>
                <input
                  type="checkbox"
                  checked={formData.notifyAdminOnThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, notifyAdminOnThreshold: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Preferences saved!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Settings sync automatically</span>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
              >
                <Save className="h-4 w-4" /> Save Configuration
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
