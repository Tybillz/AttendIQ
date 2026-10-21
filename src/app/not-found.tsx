'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the AttendIQ main screen
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl mb-3 shadow-lg shadow-indigo-500/30">
        🎓
      </div>
      <h2 className="text-lg font-bold text-slate-900">Redirecting to AttendIQ Portal...</h2>
      <p className="text-xs text-slate-500 mt-1">Taking you to the School Attendance Roll Call</p>
      <a
        href="/"
        className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
      >
        Go to AttendIQ
      </a>
    </div>
  );
}
