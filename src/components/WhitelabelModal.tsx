'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Building,
  Upload,
  Trash2,
  Image as ImageIcon,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  SchoolBranding,
  getSchoolBranding,
  saveSchoolBranding,
} from '@/lib/licensing';

interface WhitelabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandingUpdated?: () => void;
}

export const WhitelabelModal: React.FC<WhitelabelModalProps> = ({
  isOpen,
  onClose,
  onBrandingUpdated,
}) => {
  const [branding, setBranding] = useState<SchoolBranding>(getSchoolBranding());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBranding(getSchoolBranding());
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSchoolBranding(branding);
    setBranding(updated);
    setSaveSuccess(true);
    onBrandingUpdated?.();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCrestUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Image size exceeds 8MB. Please choose a smaller image.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize to max 384x384 for ultra-crisp display on high-DPI screens and compact storage
        const canvas = document.createElement('canvas');
        const MAX_DIM = 384;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setBranding((prev) => ({ ...prev, logoUrl: dataUrl }));
        } else {
          const rawUrl = event.target?.result as string;
          setBranding((prev) => ({ ...prev, logoUrl: rawUrl }));
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        alert('Could not process this image file. Please try another image.');
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCrest = () => {
    setBranding((prev) => ({ ...prev, logoUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
                  School Branding &amp; Institutional Identity
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  School Settings
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Configure official school name, motto, crest logo, and principal endorsement seal
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
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
                Live Whitelabel Preview (How it appears to staff, parents &amp; on terminal report cards)
              </span>
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-sm shrink-0 overflow-hidden bg-slate-900/60 p-1">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.schoolName} className="w-full h-full object-contain" />
                  ) : (
                    <span>{branding.crestEmoji || '🎓'}</span>
                  )}
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

            {/* School Crest & Institutional Badge Upload Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                    Official School Crest / Institutional Badge
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Upload your official school badge or crest. Used on Student ID cards, end-of-term report sheets, portal navigation, and WhatsApp summary alerts.
                  </p>
                </div>
                {branding.logoUrl && (
                  <span className="self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Custom Crest Active
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Crest Display Box */}
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center shadow-inner overflow-hidden relative shrink-0 p-1.5 group">
                  {branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt="School Crest"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-4xl select-none flex items-center justify-center">
                      {branding.crestEmoji || '🎓'}
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2.5 text-center sm:text-left w-full">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleCrestUpload}
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{branding.logoUrl ? 'Change School Crest' : 'Upload School Crest / Badge'}</span>
                    </button>

                    {branding.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCrest}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Custom Crest</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    PNG (transparent background), SVG, or high-res JPG recommended. Auto-optimized for crisp print &amp; digital scaling.
                  </p>

                  {/* Quick Preset Symbols */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap justify-center sm:justify-start text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-500 text-[10px]">Or choose fallback symbol:</span>
                    {['🎓', '🏛️', '🌟', '🦅', '📖', '👑', '🌿', '🦁'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setBranding({ ...branding, crestEmoji: emoji })}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm border transition ${
                          branding.crestEmoji === emoji
                            ? 'bg-indigo-100 border-indigo-400 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-100'
                        }`}
                        title={`Select ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
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
                  placeholder="e.g. Knowledge, Integrity &amp; Excellence"
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
                <label className="font-bold text-slate-800 block mb-1">School Crest Emoji / Custom Symbol</label>
                <input
                  type="text"
                  value={branding.crestEmoji || '🎓'}
                  onChange={(e) => setBranding({ ...branding, crestEmoji: e.target.value })}
                  placeholder="🎓 or 🏛️ or 🌟"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 text-lg"
                />
                <span className="text-[10px] text-slate-400">Used as fallback icon if no image crest is uploaded</span>
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
        </div>
      </div>
    </div>
  );
};
