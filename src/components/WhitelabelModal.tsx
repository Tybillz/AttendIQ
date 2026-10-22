'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  School,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Users,
  Eye,
  Check,
} from 'lucide-react';
import {
  SchoolBranding,
  getSchoolBranding,
  saveSchoolBranding,
  getSchoolLicense,
  getLicenseStatus,
  activateLicenseKey,
  generateSignedLicenseKey,
  LicensePlanType,
  LicenseStatusResult,
} from '@/lib/licensing';

interface WhitelabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandingUpdated?: () => void;
  defaultTab?: 'branding' | 'licensing' | 'vendor';
}

export const WhitelabelModal: React.FC<WhitelabelModalProps> = ({
  isOpen,
  onClose,
  onBrandingUpdated,
  defaultTab = 'branding',
}) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'licensing' | 'vendor'>(defaultTab);
  
  // Branding state
  const [branding, setBranding] = useState<SchoolBranding>(getSchoolBranding());
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Licensing state
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusResult>(getLicenseStatus());
  const [licenseInput, setLicenseInput] = useState('');
  const [activationFeedback, setActivationFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  
  // Vendor Master Portal State
  const [vendorUnlocked, setVendorUnlocked] = useState(false);
  const [vendorPin, setVendorPin] = useState('');
  const [vendorPinError, setVendorPinError] = useState(false);
  
  // Vendor Key Generator State
  const [genSchoolName, setGenSchoolName] = useState(branding.schoolName);
  const [genPlanType, setGenPlanType] = useState<LicensePlanType>('term');
  const [genDurationMonths, setGenDurationMonths] = useState<number>(4);
  const [genPupilQuota, setGenPupilQuota] = useState<number>(500);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultTab) {
        setActiveTab(defaultTab);
      }
      const current = getSchoolBranding();
      setBranding(current);
      setGenSchoolName(current.schoolName);
      setLicenseStatus(getLicenseStatus());
      setActivationFeedback(null);
      setSaveSuccess(false);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSchoolBranding(branding);
    setBranding(updated);
    setLicenseStatus(getLicenseStatus(updated.schoolName));
    setSaveSuccess(true);
    onBrandingUpdated?.();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    setIsActivating(true);
    setActivationFeedback(null);

    const res = activateLicenseKey(licenseInput, branding.schoolName);
    setIsActivating(false);
    setActivationFeedback(res);

    if (res.success) {
      setLicenseStatus(getLicenseStatus(branding.schoolName));
      setLicenseInput('');
      onBrandingUpdated?.();
    }
  };

  const handleUnlockVendor = (e: React.FormEvent) => {
    e.preventDefault();
    // Default master passkey for vendor license generation: 9009 or AttendIQ
    if (vendorPin.trim() === '9009' || vendorPin.trim().toLowerCase() === 'attendiq') {
      setVendorUnlocked(true);
      setVendorPinError(false);
    } else {
      setVendorPinError(true);
    }
  };

  const handleGenerateKey = () => {
    const { licenseKey } = generateSignedLicenseKey(
      genSchoolName,
      genPlanType,
      genDurationMonths,
      genPupilQuota,
      Math.round(genPupilQuota / 10)
    );
    setGeneratedKey(licenseKey);
    setCopiedKey(false);
  };

  const handleCopyGeneratedKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  School Whitelabel & Commercial Licensing
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Customise institutional brand identity and manage school subscription rentals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('branding')}
            className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <School className="h-4 w-4" />
            <span>School Identity & Whitelabel</span>
          </button>

          <button
            onClick={() => setActiveTab('licensing')}
            className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === 'licensing'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>License & Subscription ({licenseStatus.status === 'active' ? 'Active' : 'Renewal Needed'})</span>
          </button>

          <button
            onClick={() => setActiveTab('vendor')}
            className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ml-auto ${
              activeTab === 'vendor'
                ? 'border-amber-600 text-amber-700 font-black'
                : 'border-transparent text-amber-600/80 hover:text-amber-700'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <span>Vendor Key Generator (Master Portal)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SCHOOL BRANDING & WHITELABEL */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSaveBranding} className="space-y-6">
              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>School branding saved successfully! All report cards, headers, and portal screens updated.</span>
                </div>
              )}

              {/* Live Preview Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-800/50 shadow-md">
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block mb-2">
                  Live Whitelabel Preview (How it appears to staff, parents & on terminal report cards)
                </span>
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-sm shrink-0">
                    {branding.crestEmoji || '🎓'}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      {branding.schoolName || 'Your School Name'}
                    </h3>
                    <p className="text-xs text-indigo-200">
                      {branding.branchLocation || 'City, State'} • {branding.motto || 'Excellence & Distinction'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Principal: <strong className="text-slate-200">{branding.principalName}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-800 block mb-1">Official School Name *</label>
                  <input
                    type="text"
                    required
                    value={branding.schoolName}
                    onChange={(e) => setBranding({ ...branding, schoolName: e.target.value })}
                    placeholder="e.g. Corona Secondary School"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">Printed on official terminal report cards and transcripts</span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Short Name / Acronym *</label>
                  <input
                    type="text"
                    required
                    value={branding.shortName}
                    onChange={(e) => setBranding({ ...branding, shortName: e.target.value })}
                    placeholder="e.g. Corona or CSS"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400">Used for badges, mobile navbar, and SMS headers</span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Campus / Branch Location *</label>
                  <input
                    type="text"
                    required
                    value={branding.branchLocation}
                    onChange={(e) => setBranding({ ...branding, branchLocation: e.target.value })}
                    placeholder="e.g. Lekki Phase 1, Lagos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">School Motto / Slogan</label>
                  <input
                    type="text"
                    value={branding.motto}
                    onChange={(e) => setBranding({ ...branding, motto: e.target.value })}
                    placeholder="e.g. Knowledge, Integrity & Excellence"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 italic"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Principal / Head of School Sign-off *</label>
                  <input
                    type="text"
                    required
                    value={branding.principalName}
                    onChange={(e) => setBranding({ ...branding, principalName: e.target.value })}
                    placeholder="e.g. Dr. (Mrs.) Victoria Adebayo, TRCN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                  <span className="text-[10px] text-slate-400">Appears on end-of-term report card endorsements</span>
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">School Crest Emoji / Symbol</label>
                  <input
                    type="text"
                    value={branding.crestEmoji || '🎓'}
                    onChange={(e) => setBranding({ ...branding, crestEmoji: e.target.value })}
                    placeholder="🎓 or 🏛️ or 🌟"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 text-lg"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Administrative Contact Phone</label>
                  <input
                    type="tel"
                    value={branding.contactPhone}
                    onChange={(e) => setBranding({ ...branding, contactPhone: e.target.value })}
                    placeholder="+234 803 123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">Official Registry Email</label>
                  <input
                    type="email"
                    value={branding.contactEmail}
                    onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                    placeholder="registry@school.edu.ng"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">Physical School Address</label>
                  <input
                    type="text"
                    value={branding.address}
                    onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                    placeholder="Plot 104, Diplomatic Crescent, Maitama Extension, Abuja"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save School Branding</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LICENSE & SUBSCRIPTION STATUS */}
          {activeTab === 'licensing' && (
            <div className="space-y-6">
              {/* Active License Details Card */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Current Subscription Plan
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {licenseStatus.planName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Licensed To: <strong className="text-slate-800">{licenseStatus.schoolName}</strong>
                    </p>
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${licenseStatus.badgeColor}`}>
                    {licenseStatus.statusLabel}
                  </span>
                </div>

                {/* Quota & Dates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200/80">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Days Remaining</span>
                    <span className="text-lg font-black text-indigo-700">{licenseStatus.daysRemaining} Days</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Expiry Date</span>
                    <span className="text-sm font-bold text-slate-800 font-mono">{licenseStatus.validUntilFormatted}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Max Student Quota</span>
                    <span className="text-base font-bold text-slate-800">{licenseStatus.maxPupils.toLocaleString()} Pupils</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Max Staff Quota</span>
                    <span className="text-base font-bold text-slate-800">{licenseStatus.maxStaff.toLocaleString()} Staff</span>
                  </div>
                </div>

                {/* Progress bar of validity */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span>License Health</span>
                    <span>{licenseStatus.daysRemaining > 0 ? `${licenseStatus.daysRemaining} days active` : 'Expired'}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        licenseStatus.isExpired
                          ? 'bg-rose-500 w-full'
                          : licenseStatus.isExpiringSoon
                          ? 'bg-amber-500 w-1/4'
                          : 'bg-emerald-500 w-3/4'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Renewal / Key Activation Form */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Activate or Renew Product License Key
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the commercial license key provided by your AttendIQ software representative upon renewal or term subscription payment.
                </p>

                <form onSubmit={handleActivateLicense} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      required
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value.toUpperCase())}
                      placeholder="e.g. ATIQ-TERM-APEX-270215-E1A4-98F2"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 uppercase focus:outline-none focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={isActivating || !licenseInput.trim()}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isActivating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      <span>Activate License</span>
                    </button>
                  </div>

                  {activationFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold ${
                        activationFeedback.success
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-50 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {activationFeedback.message}
                    </div>
                  )}
                </form>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Commercial Software Licensing • AttendIQ Enterprise Platform</span>
                  <span>Need an invoice or renewal key? Contact AttendIQ Sales</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VENDOR MASTER LICENSE GENERATOR */}
          {activeTab === 'vendor' && (
            <div className="space-y-6">
              {!vendorUnlocked ? (
                /* Master PIN Gate */
                <form
                  onSubmit={handleUnlockVendor}
                  className="max-w-md mx-auto text-center p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Product Owner / Vendor Master Key Required
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      This console allows generating cryptographically signed license keys to rent AttendIQ out to client schools. Enter your Vendor Master Passkey to proceed.
                    </p>
                  </div>

                  <div>
                    <input
                      type="password"
                      autoFocus
                      value={vendorPin}
                      onChange={(e) => setVendorPin(e.target.value)}
                      placeholder="Enter Master Passkey (Default: 9009)"
                      className="w-full text-center tracking-widest text-sm font-mono font-bold px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-600"
                    />
                    {vendorPinError && (
                      <span className="text-[11px] text-rose-600 font-bold block mt-1">
                        Incorrect master passkey.
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                  >
                    Unlock Vendor Key Generator
                  </button>
                </form>
              ) : (
                /* Unlocked Generator Form */
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        Vendor License Issuance Engine Active
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Keys are cryptographically bound to the client school name and cannot be shared or pirated.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendorUnlocked(false)}
                      className="text-[11px] font-bold text-amber-800 hover:underline"
                    >
                      Lock Console
                    </button>
                  </div>

                  {/* Generator Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-5 rounded-3xl border border-slate-200">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-800 block mb-1">
                        Client School Full Name (Licensee) *
                      </label>
                      <input
                        type="text"
                        required
                        value={genSchoolName}
                        onChange={(e) => setGenSchoolName(e.target.value)}
                        placeholder="e.g. Lead British International School"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-amber-600"
                      />
                      <span className="text-[10px] text-slate-400">
                        License key is cryptographically bound to this exact school name
                      </span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Rental Tier / Duration *
                      </label>
                      <select
                        value={genPlanType}
                        onChange={(e) => {
                          const plan = e.target.value as LicensePlanType;
                          setGenPlanType(plan);
                          if (plan === 'trial') setGenDurationMonths(1);
                          else if (plan === 'term') setGenDurationMonths(4);
                          else if (plan === 'annual') setGenDurationMonths(12);
                          else if (plan === 'enterprise') setGenDurationMonths(24);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-amber-600"
                      >
                        <option value="term">Academic Term Rental (4 Months / 1 Term) — Recommended</option>
                        <option value="annual">Full School Year License (12 Months / 3 Terms)</option>
                        <option value="trial">Prospective School Trial Pass (1 Month)</option>
                        <option value="enterprise">Multi-Year Enterprise License (24 Months)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Student Population Cap *
                      </label>
                      <select
                        value={genPupilQuota}
                        onChange={(e) => setGenPupilQuota(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-amber-600"
                      >
                        <option value={250}>Starter Tier (Up to 250 Pupils)</option>
                        <option value={500}>Growth Tier (Up to 500 Pupils)</option>
                        <option value={1000}>Standard School (Up to 1,000 Pupils)</option>
                        <option value={99999}>Mega Campus (Unlimited Pupils)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Generate Authentic Signed License Key</span>
                      </button>
                    </div>
                  </div>

                  {/* Generated Output Box */}
                  {generatedKey && (
                    <div className="p-5 rounded-3xl bg-slate-900 text-white border border-amber-500/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                          Generated Signed License Key
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Valid for {genSchoolName}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between gap-3 font-mono text-xs font-bold text-emerald-400 select-all">
                        <span>{generatedKey}</span>
                        <button
                          type="button"
                          onClick={handleCopyGeneratedKey}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-sans flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                        >
                          {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1">
                        <p>
                          • <strong>Proprietor Invoice Receipt</strong>: Copy this key and send it to the school administration upon receipt of bank transfer or subscription fee.
                        </p>
                        <p>
                          • The school simply pastes this key into the <strong>"License & Subscription"</strong> tab to activate their instance immediately.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
