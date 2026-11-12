'use client';

import React, { useState, useEffect } from 'react';
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
  Ban,
  Undo2,
  CheckCircle2,
  FileText,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  generateSignedLicenseKey,
  LicensePlanType,
  activateLicenseKey,
  getLicenseStatus,
  LicenseStatusResult,
  getSchoolLicense,
  SchoolLicense,
  vendorProvisionSchoolLicense,
  revokeCurrentLicense,
  restoreRevokedLicense,
  revokeLicenseByKey,
  getRevocationBlacklist,
  RevokedKeyEntry,
  getSchoolBranding,
} from '@/lib/licensing';

interface VendorLicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchoolName: string;
  onLicenseActivated?: () => void;
}

function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function addMonthsToString(dateStr: string, months: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
    const dt = new Date(y, m - 1 + months, d || 1);
    return dt.toISOString().split('T')[0];
  } catch {
    return getTodayString();
  }
}

function addDaysToString(dateStr: string, days: number): string {
  try {
    const dt = new Date(dateStr);
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().split('T')[0];
  } catch {
    return getTodayString();
  }
}

export const VendorLicensingModal: React.FC<VendorLicensingModalProps> = ({
  isOpen,
  onClose,
  currentSchoolName,
  onLicenseActivated,
}) => {
  // Active license state from system
  const [activeLicense, setActiveLicense] = useState<SchoolLicense | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResult | null>(null);
  const [blacklist, setBlacklist] = useState<RevokedKeyEntry[]>([]);

  // Provisioning form states
  const [targetSchool, setTargetSchool] = useState<string>(currentSchoolName || 'Corona Secondary School');
  const [validFrom, setValidFrom] = useState<string>(getTodayString());
  const [validUntil, setValidUntil] = useState<string>(addMonthsToString(getTodayString(), 12));
  const [planType, setPlanType] = useState<LicensePlanType>('annual');
  const [maxPupils, setMaxPupils] = useState<number>(1000);
  const [maxStaff, setMaxStaff] = useState<number>(100);
  const [vendorNotes, setVendorNotes] = useState<string>('');

  // Revocation workflow states
  const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = useState<boolean>(false);
  const [revocationReason, setRevocationReason] = useState<string>('Commercial subscription expired or payment default');
  const [manualRevokeKey, setManualRevokeKey] = useState<string>('');
  const [manualRevokeReason, setManualRevokeReason] = useState<string>('Revoked by vendor authority');

  // Operation feedback states
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Standalone Key Generation State (for off-premise export)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedActiveKey, setCopiedActiveKey] = useState<boolean>(false);

  // Tab navigation inside Vendor Portal
  const [vendorTab, setVendorTab] = useState<'provision' | 'status' | 'revocations'>('provision');

  const refreshLicenseData = () => {
    const current = getSchoolLicense();
    setActiveLicense(current);
    setLicenseStatus(getLicenseStatus());
    setBlacklist(getRevocationBlacklist());
  };

  useEffect(() => {
    if (isOpen) {
      refreshLicenseData();
      const brand = getSchoolBranding();
      if (brand?.schoolName && !targetSchool) {
        setTargetSchool(brand.schoolName);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Preset Date Calculation
  const applyPreset = (preset: 'term' | 'annual' | 'enterprise' | 'trial') => {
    setPlanType(preset);
    const start = validFrom || getTodayString();
    if (preset === 'term') {
      setValidUntil(addMonthsToString(start, 4));
      setMaxPupils(500);
      setMaxStaff(50);
    } else if (preset === 'annual') {
      setValidUntil(addMonthsToString(start, 12));
      setMaxPupils(1000);
      setMaxStaff(100);
    } else if (preset === 'enterprise') {
      setValidUntil(addMonthsToString(start, 24));
      setMaxPupils(99999);
      setMaxStaff(250);
    } else if (preset === 'trial') {
      setValidUntil(addDaysToString(start, 30));
      setMaxPupils(250);
      setMaxStaff(25);
    }
  };

  // 1. DIRECT PROVISION ACTION
  const handleDirectProvision = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);

    const school = targetSchool.trim();
    if (!school) {
      setActionFeedback({ type: 'error', message: 'Please enter a valid school name.' });
      return;
    }
    if (!validFrom || !validUntil) {
      setActionFeedback({ type: 'error', message: 'Start date and expiry date are both required.' });
      return;
    }
    if (validUntil <= validFrom) {
      setActionFeedback({ type: 'error', message: 'Expiry date must be after start date.' });
      return;
    }

    try {
      const res = vendorProvisionSchoolLicense({
        schoolName: school,
        validFrom,
        validUntil,
        planType,
        maxPupils,
        maxStaff,
        vendorNotes: vendorNotes.trim() || undefined,
        updateBrandingSchoolName: true,
      });

      refreshLicenseData();
      onLicenseActivated?.();
      setActionFeedback({
        type: 'success',
        message: `🎉 Success! System is now licensed to "${school}" from ${validFrom} until ${validUntil} (${planType.toUpperCase()} Plan).`,
      });
      setVendorTab('status');
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Provisioning failed.',
      });
    }
  };

  // 2. GENERATE STANDALONE KEY (For Remote Schools)
  const handleGenerateStandalone = (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);

    const school = targetSchool.trim();
    if (!school) {
      setActionFeedback({ type: 'error', message: 'Please enter a school name to sign the key.' });
      return;
    }

    const { licenseKey } = generateSignedLicenseKey(
      school,
      planType,
      planType === 'term' ? 4 : planType === 'annual' ? 12 : planType === 'enterprise' ? 24 : 1,
      maxPupils,
      maxStaff
    );

    setGeneratedKey(licenseKey);
    setCopiedKey(false);
    setActionFeedback({
      type: 'info',
      message: `Signed license key generated for "${school}". You can copy or share this via WhatsApp.`,
    });
  };

  // 3. REVOKE ACTIVE LICENSE
  const handleRevokeActive = () => {
    if (!activeLicense) return;
    const res = revokeCurrentLicense(revocationReason.trim() || 'Commercial Subscription Suspended by Licensor');
    refreshLicenseData();
    setIsRevokeConfirmOpen(false);
    setActionFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
    onLicenseActivated?.();
  };

  // 4. RESTORE ACTIVE LICENSE
  const handleRestoreActive = () => {
    if (!activeLicense) return;
    const res = restoreRevokedLicense(activeLicense.licenseKey);
    refreshLicenseData();
    setActionFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
    onLicenseActivated?.();
  };

  // 5. MANUAL REMOTE REVOCATION
  const handleManualRevoke = (e: React.FormEvent) => {
    e.preventDefault();
    const key = manualRevokeKey.trim().toUpperCase();
    if (!key) return;
    const res = revokeLicenseByKey(key, manualRevokeReason.trim() || 'Revoked by Vendor Console');
    setManualRevokeKey('');
    refreshLicenseData();
    setActionFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
    onLicenseActivated?.();
  };

  // 6. RESTORE KEY FROM BLACKLIST
  const handleRestoreBlacklistedKey = (key: string) => {
    const res = restoreRevokedLicense(key);
    refreshLicenseData();
    setActionFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
    onLicenseActivated?.();
  };

  // Copy helpers
  const copyToClipboard = (text: string, isGenerated: boolean) => {
    navigator.clipboard.writeText(text);
    if (isGenerated) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      setCopiedActiveKey(true);
      setTimeout(() => setCopiedActiveKey(false), 2500);
    }
  };

  const handleShareWhatsApp = (key: string) => {
    const msg = `🔑 *OFFICIAL RESULTIQ™ COMMERCIAL LICENSE*\n\n` +
      `• *Client Institution:* ${targetSchool.toUpperCase()}\n` +
      `• *License Tier:* ${planType.toUpperCase()}\n` +
      `• *Valid From:* ${validFrom}\n` +
      `• *Valid Until (Expiry):* ${validUntil}\n` +
      `• *Enrolled Student Quota:* ${maxPupils.toLocaleString()}\n` +
      `• *License Key:* \`${key}\`\n\n` +
      `*Licensor Note:*\nThis system has been provisioned and authorized by ResultIQ Licensing Authority.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-3xl w-full overflow-hidden my-auto animate-fadeIn">
        {/* Vendor Header */}
        <div className="bg-slate-950 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg font-serif tracking-tight text-white">
                  Vendor Licensing &amp; School Governance Authority
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 uppercase hidden sm:inline">
                  Proprietor Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent licensor console to provision dates, assign plans, and enforce revocations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close Vendor Console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {actionFeedback && (
          <div
            className={`px-6 py-3 text-xs font-semibold flex items-center justify-between border-b ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : actionFeedback.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200'
            }`}
          >
            <span>{actionFeedback.message}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-slate-500 hover:text-slate-900 text-sm ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Nav Tabs */}
        <div className="bg-slate-900 px-6 pt-3 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVendorTab('provision')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 ${
              vendorTab === 'provision'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>License A School</span>
          </button>

          <button
            type="button"
            onClick={() => setVendorTab('status')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 ${
              vendorTab === 'status'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active License Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setVendorTab('revocations')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer flex items-center gap-2 ${
              vendorTab === 'revocations'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>Revocations &amp; Kill-Switch ({blacklist.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: PROVISION / LICENSE A SCHOOL */}
          {vendorTab === 'provision' && (
            <div className="space-y-6">
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200 text-xs text-amber-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Vendor Direct Provisioning
                </p>
                <p className="text-amber-900/80 leading-relaxed">
                  Enter the school name, set the start and expiry dates, select quota, and click &ldquo;Deploy Now&rdquo;. The system will immediately bind to the institution and start the licensed period.
                </p>
              </div>

              <form onSubmit={handleDirectProvision} className="space-y-5">
                {/* Target School Name */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                    School Name (Bound to License):
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
                      placeholder="e.g. Corona Secondary School, Victoria Island"
                      className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Quick License Duration Presets:
                    </label>
                    <span className="text-[11px] text-slate-500">Auto-sets expiry date &amp; quota</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('term')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        planType === 'term'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] text-indigo-600 font-mono uppercase">Academic</div>
                      <div>1 Term (4 Mo)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('annual')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        planType === 'annual'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] text-emerald-600 font-mono uppercase">Full Year</div>
                      <div>1 Year (12 Mo)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('enterprise')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        planType === 'enterprise'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] text-purple-600 font-mono uppercase">Enterprise</div>
                      <div>2 Years (24 Mo)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset('trial')}
                      className={`p-2 rounded-xl border text-xs font-bold transition text-left cursor-pointer ${
                        planType === 'trial'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="text-[10px] text-amber-600 font-mono uppercase">Demo Pass</div>
                      <div>30-Day Trial</div>
                    </button>
                  </div>
                </div>

                {/* Explicit Start Date & Expiry Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Start Date (Valid From):</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-500" />
                      <span>Expiry Date (Valid Until):</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Plan Tier & Quotas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                      Plan Tier:
                    </label>
                    <select
                      value={planType}
                      onChange={(e) => setPlanType(e.target.value as LicensePlanType)}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                    >
                      <option value="term">Termly Plan (4 Months)</option>
                      <option value="annual">Annual Plan (12 Months)</option>
                      <option value="enterprise">Multi-Year Enterprise</option>
                      <option value="trial">Evaluation Pass (30 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                      Student Quota:
                    </label>
                    <select
                      value={maxPupils}
                      onChange={(e) => setMaxPupils(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                    >
                      <option value="250">250 Students</option>
                      <option value="500">500 Students</option>
                      <option value="1000">1,000 Students</option>
                      <option value="2500">2,500 Students</option>
                      <option value="99999">Unlimited (Enterprise)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                      Staff Quota:
                    </label>
                    <select
                      value={maxStaff}
                      onChange={(e) => setMaxStaff(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                    >
                      <option value="25">25 Teachers</option>
                      <option value="50">50 Teachers</option>
                      <option value="100">100 Teachers</option>
                      <option value="250">250 Teachers</option>
                      <option value="99999">Unlimited</option>
                    </select>
                  </div>
                </div>

                {/* Vendor Internal Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-1.5">
                    Vendor Commercial Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={vendorNotes}
                    onChange={(e) => setVendorNotes(e.target.value)}
                    placeholder="e.g. Term invoice #INV-2026-990 verified. Paid via wire."
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-slate-900 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>🚀 License This School &amp; Deploy Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateStandalone}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    title="Generate cryptographic key string for remote WhatsApp/Email distribution"
                  >
                    <Key className="w-4 h-4 text-indigo-600" />
                    <span>Generate Standalone Key</span>
                  </button>
                </div>
              </form>

              {/* Standalone Generated Key Box (if requested) */}
              {generatedKey && (
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Cryptographic Product Key Generated
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                      Signed &amp; Valid
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-amber-200 font-mono text-xs sm:text-sm font-bold text-slate-900 break-all select-all shadow-inner">
                    {generatedKey}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedKey, true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied to Clipboard!' : 'Copy Key'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(generatedKey)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Send via WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE LICENSE OVERVIEW & REVOCATION STATUS */}
          {vendorTab === 'status' && (
            <div className="space-y-6">
              {activeLicense && licenseStatus ? (
                <div className="space-y-5">
                  {/* Hero Status Card */}
                  <div
                    className={`p-5 rounded-2xl border space-y-4 shadow-xs ${
                      licenseStatus.isRevoked
                        ? 'bg-rose-50/90 border-rose-300'
                        : licenseStatus.isExpired
                        ? 'bg-amber-50/90 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200/80">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
                          Current Licensed Institution
                        </span>
                        <h3 className="text-base font-bold text-slate-950 font-serif">
                          {activeLicense.schoolName}
                        </h3>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-black uppercase px-3 py-1 rounded-full border shadow-xs inline-flex items-center gap-1.5 ${
                            licenseStatus.isRevoked
                              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                              : licenseStatus.isExpired
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : licenseStatus.isExpiringSoon
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {licenseStatus.isRevoked ? (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              <span>⛔ LICENSE REVOKED</span>
                            </>
                          ) : licenseStatus.isExpired ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>EXPIRED</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ACTIVE ({licenseStatus.daysRemaining} Days Left)</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Plan Tier</span>
                        <span className="font-bold text-slate-900 uppercase">{activeLicense.planType}</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Valid From</span>
                        <span className="font-bold text-slate-900 font-mono">{activeLicense.validFrom || 'Initial'}</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Valid Until</span>
                        <span className="font-bold text-slate-900 font-mono">{activeLicense.validUntil}</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Capacity</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {activeLicense.maxPupils.toLocaleString()} Students
                        </span>
                      </div>
                    </div>

                    {/* Key display */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Cryptographic Key:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeLicense.licenseKey, false)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedActiveKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedActiveKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-xs text-slate-800 break-all select-all font-semibold">
                        {activeLicense.licenseKey}
                      </div>
                    </div>

                    {/* Revocation Warning Box if revoked */}
                    {licenseStatus.isRevoked && (
                      <div className="p-3.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-950 text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Access Frozen by Licensor:</span>
                        </p>
                        <p className="leading-relaxed">
                          Reason: <strong>{licenseStatus.revocationReason || 'Commercial Rental Terminated'}</strong>
                        </p>
                        <p className="text-[11px] text-rose-800">
                          The school cannot record scores, edit rosters, or export continuous assessments until reinstated.
                        </p>
                      </div>
                    )}

                    {/* Vendor Control Actions for Current License */}
                    <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3">
                      {licenseStatus.isRevoked ? (
                        <button
                          type="button"
                          onClick={handleRestoreActive}
                          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                        >
                          <Undo2 className="w-4 h-4" />
                          <span>✅ Restore &amp; Re-authorize School License</span>
                        </button>
                      ) : (
                        <>
                          {!isRevokeConfirmOpen ? (
                            <button
                              type="button"
                              onClick={() => setIsRevokeConfirmOpen(true)}
                              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                              <span>⛔ Revoke / Suspend School License</span>
                            </button>
                          ) : (
                            <div className="w-full bg-rose-50 border border-rose-300 rounded-xl p-3.5 space-y-3 animate-fadeIn">
                              <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                                <ShieldAlert className="w-4 h-4 text-rose-600" />
                                <span>Confirm License Revocation Kill-Switch:</span>
                              </div>
                              <input
                                type="text"
                                value={revocationReason}
                                onChange={(e) => setRevocationReason(e.target.value)}
                                placeholder="Enter reason (e.g. Non-payment of subscription, contract cancelled)"
                                className="w-full text-xs p-2 rounded-lg border border-rose-300 bg-white text-slate-900 focus:outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleRevokeActive}
                                  className="py-2 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
                                >
                                  Yes, Revoke Access Now
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsRevokeConfirmOpen(false)}
                                  className="py-2 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No active license found in storage.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVOCATIONS AUTHORITY & BLACKLIST */}
          {vendorTab === 'revocations' && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1">
                <p className="font-bold text-xs flex items-center gap-2 text-amber-400">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Central Revocation Blacklist</span>
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Keys listed on the blacklist are instantly rejected across the application. When a school default occurs or a client terminates their service contract, revoking their license locks the gradebook in audit mode.
                </p>
              </div>

              {/* Manual Revoke Key Form */}
              <form onSubmit={handleManualRevoke} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                  Manual Remote Key Revocation:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={manualRevokeKey}
                    onChange={(e) => setManualRevokeKey(e.target.value)}
                    placeholder="Enter License Key (RIQ-...)"
                    className="text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none"
                  />
                  <input
                    type="text"
                    value={manualRevokeReason}
                    onChange={(e) => setManualRevokeReason(e.target.value)}
                    placeholder="Revocation Reason"
                    className="text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Blacklist &amp; Revoke Key</span>
                </button>
              </form>

              {/* Blacklist Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Active Blacklist Log ({blacklist.length} Keys Revoked):
                </h4>
                {blacklist.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No keys are currently revoked. All authorized licenses are in good standing.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    {blacklist.map((entry, idx) => (
                      <div key={idx} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                              {entry.key}
                            </span>
                            {entry.schoolName && (
                              <span className="font-bold text-slate-800">
                                {entry.schoolName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Reason: <span className="font-semibold text-slate-700">{entry.reason}</span> &bull; Revoked: {new Date(entry.revokedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestoreBlacklistedKey(entry.key)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shrink-0"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium">Direct Licensor Root Authority &bull; ResultIQ Platform</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-800 cursor-pointer shadow-xs"
          >
            Close Authority Console
          </button>
        </div>
      </div>
    </div>
  );
};
