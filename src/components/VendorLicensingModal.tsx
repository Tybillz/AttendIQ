'use client';

import React, { useState } from 'react';
import {
  Key,
  ShieldCheck,
  Building,
  Copy,
  Check,
  Share2,
  Calendar,
  Users,
  Award,
  AlertTriangle,
  X,
  Sparkles,
  Lock,
  RefreshCw,
} from 'lucide-react';
import {
  generateSignedLicenseKey,
  LicensePlanType,
  activateLicenseKey,
  getLicenseStatus,
  LicenseStatusResult,
  revokeLicenseByKey,
  getRevocationBlacklist,
} from '@/lib/licensing';

interface VendorLicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchoolName: string;
  onLicenseActivated?: () => void;
}

export const VendorLicensingModal: React.FC<VendorLicensingModalProps> = ({
  isOpen,
  onClose,
  currentSchoolName,
  onLicenseActivated,
}) => {
  const [targetSchool, setTargetSchool] = useState<string>(currentSchoolName || 'Corona Secondary School');
  const [planType, setPlanType] = useState<LicensePlanType>('term');
  const [durationMonths, setDurationMonths] = useState<number>(4);
  const [maxPupils, setMaxPupils] = useState<number>(500);
  const [maxStaff, setMaxStaff] = useState<number>(50);

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activationFeedback, setActivationFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSchool.trim()) return;

    const { licenseKey } = generateSignedLicenseKey(
      targetSchool.trim(),
      planType,
      durationMonths,
      maxPupils,
      maxStaff
    );
    setGeneratedKey(licenseKey);
    setCopied(false);
    setActivationFeedback(null);
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleApplyToThisPortal = () => {
    if (!generatedKey) return;
    const res = activateLicenseKey(generatedKey, targetSchool);
    setActivationFeedback(res);
    if (res.success) {
      onLicenseActivated?.();
    }
  };

  const handleShareWhatsApp = () => {
    if (!generatedKey) return;
    const msg = `🔑 *OFFICIAL RESULTIQ™ COMMERCIAL LICENSE KEY*\n\n` +
      `• *Institution:* ${targetSchool.toUpperCase()}\n` +
      `• *Plan:* ${planType.toUpperCase()} LICENSE (${durationMonths} Months)\n` +
      `• *Capacity:* ${maxPupils.toLocaleString()} Enrolled Students\n` +
      `• *License Key:* \`${generatedKey}\`\n\n` +
      `*Activation Instructions:*\n` +
      `1. Log in to your ResultIQ Portal as Principal/Administrator.\n` +
      `2. Click "School Branding & License" in the Staff Console.\n` +
      `3. Go to "License & Subscription" tab, paste this key, and click "Activate License".\n\n` +
      `*ResultIQ Systems Licensor Support*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base font-serif tracking-tight text-white">
                  Vendor Licensing Authority
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 uppercase">
                  Proprietor Console
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate tamper-evident, cryptographically signed product licenses for client schools.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Target School Name */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                Client School Name (Bound Strictly to License):
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={targetSchool}
                  onChange={(e) => setTargetSchool(e.target.value)}
                  placeholder="e.g. Corona Secondary School"
                  className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The school must have this exact legal name in their branding settings to activate.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Plan Type */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                  Plan Tier:
                </label>
                <select
                  value={planType}
                  onChange={(e) => {
                    const plan = e.target.value as LicensePlanType;
                    setPlanType(plan);
                    if (plan === 'term') setDurationMonths(4);
                    else if (plan === 'annual') setDurationMonths(12);
                    else if (plan === 'enterprise') setDurationMonths(24);
                    else setDurationMonths(1);
                  }}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                >
                  <option value="term">Termly Plan (4 Months)</option>
                  <option value="annual">Annual Plan (12 Months)</option>
                  <option value="enterprise">Enterprise (24 Months)</option>
                  <option value="trial">Evaluation Trial (1 Month)</option>
                </select>
              </div>

              {/* Student Quota */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                  Student Quota:
                </label>
                <select
                  value={maxPupils}
                  onChange={(e) => setMaxPupils(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                >
                  <option value="250">250 Students (Small)</option>
                  <option value="500">500 Students (Standard)</option>
                  <option value="1000">1,000 Students (Medium)</option>
                  <option value="2500">2,500 Students (Large)</option>
                  <option value="99999">Unlimited (Enterprise)</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                  Duration (Months):
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(parseInt(e.target.value, 10) || 1)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Generate Signed License Key</span>
              </button>
            </div>
          </form>

          {/* Generated Key Result */}
          {generatedKey && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Cryptographic License Key Generated
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Signed & Valid
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-200 font-mono text-xs sm:text-sm font-bold text-slate-900 break-all select-all shadow-inner">
                {generatedKey}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Key'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyToThisPortal}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Activate on this Portal Now</span>
                </button>
              </div>

              {activationFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-medium ${
                    activationFeedback.success
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {activationFeedback.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
