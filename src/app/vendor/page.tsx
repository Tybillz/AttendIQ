'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Key, ShieldCheck, ArrowLeft } from 'lucide-react';
import { VendorLicensingModal } from '@/components/VendorLicensingModal';
import { getSchoolBranding } from '@/lib/licensing';

export default function VendorPage() {
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const branding = getSchoolBranding();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const p = passcode.trim();
    if (p === 'vendor2026' || p === 'admin123' || p === 'resultiq' || p === 'resultiq2026') {
      setIsUnlocked(true);
      setError(null);
    } else {
      setError('Invalid Vendor Master Passcode. Access denied.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      {!isUnlocked ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base font-serif text-white">ResultIQ™ Licensing Authority</h1>
              <p className="text-xs text-slate-400">Proprietor &amp; Vendor Key Generation Console</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block mb-1">
                Vendor Master Passcode:
              </label>
              <input
                type="password"
                required
                placeholder="Enter vendor passcode (vendor2026)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md"
            >
              Unlock Vendor Console &rarr;
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Result Portal</span>
            </Link>
          </div>
        </div>
      ) : (
        <VendorLicensingModal
          isOpen={true}
          onClose={() => setIsUnlocked(false)}
          currentSchoolName={branding.schoolName}
        />
      )}
    </div>
  );
}
